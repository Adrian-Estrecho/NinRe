import { randomBytes } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import { Router, type Request, type RequestHandler, type Response } from "express";
import multer from "multer";
import { bookIdOf, requireMember, roleOf, userOf } from "../auth.ts";
import type { Store } from "../db.ts";
import { DEFAULT_DESIGN, parseDesign } from "../design.ts";
import { IMAGE_TYPES, bookDir, looksLikeImage, removeBookFiles, removeFiles } from "../files.ts";
import { HttpError, type User } from "../types.ts";
import { MAX_NOTES_PER_PAGE, isObj, parseCover, parseNote, parsePageInput } from "../validate.ts";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const INVITE_DAYS = 14;

/** Limit reached: the client offers an upgrade on 402. */
const limitReached = (msg: string) => new HttpError(402, msg);

export function bookRoutes(store: Store, uploadsDir: string) {
  const r = Router();
  const member = requireMember(store);
  const owner = requireMember(store, "owner");

  /** What the book's owner's plan allows, and how much of it is used. */
  function allowance(bookId: string) {
    const ownerId = store.books.ownerOf(bookId)!;
    const state = store.billing.state(ownerId);
    return {
      plan: state.active.id,
      planName: state.active.name,
      members: state.active.members,
      photos: state.active.photos,
      photosUsed: state.usage.photos,
    };
  }

  /* ---------- Books ---------- */

  r.post("/", (req, res) => {
    const me = userOf(res);
    const plan = store.billing.activePlan(me.id);
    const owned = store.billing.state(me.id).usage.books;
    if (plan.books != null && owned >= plan.books) {
      throw limitReached(`${plan.name} includes ${plan.books} book${plan.books === 1 ? "" : "s"}. Upgrade to Plus for as many books as you like.`);
    }
    const cover = parseCover(isObj(req.body) ? req.body : {});
    const design = isObj(req.body) && req.body.design != null ? { ...parseDesign(req.body.design), coverPhoto: null } : DEFAULT_DESIGN;
    const id = store.books.create(me.id, cover, design);
    res.status(201).json(store.books.get(id, me.id));
  });

  r.get("/:bookId", member, (_req, res) => {
    const book = store.books.get(bookIdOf(res), userOf(res).id)!;
    res.set("Cache-Control", "no-store").json({ ...book, allowance: allowance(book.id) });
  });

  r.put("/:bookId/cover", member, (req, res) => {
    res.json(store.books.saveCover(bookIdOf(res), parseCover(req.body)));
  });

  r.put("/:bookId/design", member, (req, res) => {
    res.json(store.books.saveDesign(bookIdOf(res), parseDesign(req.body)));
  });

  r.delete("/:bookId", owner, async (_req, res) => {
    const id = bookIdOf(res);
    store.books.remove(id);
    await removeBookFiles(uploadsDir, id);
    res.status(204).end();
  });

  /* ---------- People and invites ---------- */

  r.get("/:bookId/people", member, (_req, res) => {
    const id = bookIdOf(res);
    res.set("Cache-Control", "no-store").json({
      members: store.books.members(id),
      invites: roleOf(res) === "owner" ? store.invites.list(id) : [],
      allowance: allowance(id),
    });
  });

  r.delete("/:bookId/people/:userId", member, (req, res) => {
    const id = bookIdOf(res), me = userOf(res), target = String(req.params.userId);
    if (target === me.id && roleOf(res) === "owner") throw new HttpError(400, "The owner can't leave their own book. Delete it instead.");
    if (target !== me.id && roleOf(res) !== "owner") throw new HttpError(403, "Only the book's owner can remove people.");
    store.books.removeMember(id, target);
    res.status(204).end();
  });

  r.post("/:bookId/invites", owner, (_req, res) => {
    const id = bookIdOf(res);
    const a = allowance(id);
    if (store.books.memberCount(id) >= a.members) {
      throw limitReached(`This book is full. ${a.planName} includes ${a.members} people per book. Upgrade to add more.`);
    }
    res.status(201).json(store.invites.create(id, userOf(res).id, INVITE_DAYS * 864e5));
  });

  r.delete("/:bookId/invites/:code", owner, (req, res) => {
    if (!store.invites.remove(bookIdOf(res), String(req.params.code))) throw new HttpError(404, "That invite link was already turned off.");
    res.status(204).end();
  });

  /* ---------- Photos ---------- */

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, _file, cb) => {
        const dir = bookDir(uploadsDir, String(req.params.bookId));
        mkdir(dir, { recursive: true }).then(() => cb(null, dir), (err) => cb(err, dir));
      },
      filename: (_req, file, cb) => cb(null, `${randomBytes(12).toString("hex")}.${IMAGE_TYPES[file.mimetype]}`),
    }),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 4 },
    fileFilter: (_req, file, cb) => {
      if (IMAGE_TYPES[file.mimetype]) cb(null, true);
      else cb(new HttpError(415, "Photos must be JPG, PNG or WebP."));
    },
  });

  // Send `width` and `height` fields before the `photo` file in the form.
  r.post("/:bookId/photos", member, (_req, res, next) => {
    const a = allowance(bookIdOf(res));
    if (a.photosUsed >= a.photos) {
      return next(limitReached(roleOf(res) === "owner"
        ? `Your ${a.planName} plan holds ${a.photos.toLocaleString("en-US")} photos and they're all used. Upgrade for more room.`
        : `This book's owner has used all ${a.photos.toLocaleString("en-US")} photos on their ${a.planName} plan. Ask them to upgrade for more room.`));
    }
    next();
  }, upload.single("photo"), async (req, res) => {
    const f = req.file;
    if (!f) throw new HttpError(400, "Attach a photo in the `photo` field.");
    const width = Number(req.body?.width), height = Number(req.body?.height);
    const okSize = [width, height].every((n) => Number.isInteger(n) && n > 0 && n <= 12000);
    if (!okSize || !(await looksLikeImage(f.path, f.mimetype))) {
      await unlink(f.path).catch(() => {});
      throw new HttpError(400, okSize ? "That file isn't a readable image." : "Send the photo's width and height.");
    }
    const id = f.filename.split(".")[0];
    res.status(201).json(store.pages.addPhoto(bookIdOf(res), userOf(res).id, id, f.filename, width, height, f.size));
  });

  /* ---------- Pages ---------- */

  r.post("/:bookId/pages", member, async (req, res) => {
    const id = bookIdOf(res);
    const { page, removedFiles } = store.pages.create(id, userOf(res).id, parsePageInput(req.body));
    await removeFiles(uploadsDir, id, removedFiles);
    res.status(201).json(page);
  });

  r.put("/:bookId/pages/:pageId", member, async (req, res) => {
    const id = bookIdOf(res);
    const out = store.pages.update(id, String(req.params.pageId), parsePageInput(req.body));
    if (!out) throw new HttpError(404, "That page isn't in the book any more.");
    await removeFiles(uploadsDir, id, out.removedFiles);
    res.json(out.page);
  });

  r.delete("/:bookId/pages/:pageId", member, async (req, res) => {
    const id = bookIdOf(res);
    const files = store.pages.remove(id, String(req.params.pageId));
    if (!files) throw new HttpError(404, "That page isn't in the book any more.");
    await removeFiles(uploadsDir, id, files);
    res.status(204).end();
  });

  /* ---------- Notes ---------- */

  r.post("/:bookId/pages/:pageId/notes", member, (req, res) => {
    const id = bookIdOf(res), pageId = String(req.params.pageId);
    if (!store.pages.get(id, pageId)) throw new HttpError(404, "That page isn't in the book any more.");
    if (store.notes.countOn(pageId) >= MAX_NOTES_PER_PAGE) throw new HttpError(400, `A page holds up to ${MAX_NOTES_PER_PAGE} notes.`);
    const n = parseNote(req.body);
    res.status(201).json(store.notes.create(id, pageId, userOf(res).id, n.text, n.color));
  });

  function ownNote(res: Response, pageId: string, noteId: string, allowOwner: boolean) {
    const note = store.notes.get(bookIdOf(res), pageId, noteId);
    if (!note) throw new HttpError(404, "That note isn't on the page any more.");
    const mine = note.authorId === userOf(res).id;
    if (!mine && !(allowOwner && roleOf(res) === "owner")) throw new HttpError(403, "Only the person who wrote a note can change it.");
  }

  r.put("/:bookId/pages/:pageId/notes/:noteId", member, (req, res) => {
    const pageId = String(req.params.pageId), noteId = String(req.params.noteId);
    ownNote(res, pageId, noteId, false);
    const n = parseNote(req.body);
    res.json(store.notes.update(bookIdOf(res), pageId, noteId, n.text, n.color));
  });

  r.delete("/:bookId/pages/:pageId/notes/:noteId", member, (req, res) => {
    const pageId = String(req.params.pageId), noteId = String(req.params.noteId);
    ownNote(res, pageId, noteId, true);
    res.json(store.notes.remove(bookIdOf(res), pageId, noteId));
  });

  return r;
}

/** Invite links: a public preview, and joining once signed in. */
export function inviteRoutes(store: Store, userOfReq: (req: Request) => User | undefined, requireUser: RequestHandler) {
  const r = Router();

  r.get("/:code", (req, res) => {
    const inv = store.invites.get(String(req.params.code));
    if (!inv) throw new HttpError(404, "This invite link has expired or was turned off. Ask for a new one.");
    const me = userOfReq(req);
    const ownerId = store.books.ownerOf(inv.bookId)!;
    const plan = store.billing.activePlan(ownerId);
    const members = store.books.members(inv.bookId);
    res.set("Cache-Control", "no-store").json({
      book: { title: inv.title, subtitle: inv.subtitle, design: { ...inv.design, coverPhoto: null }, members: members.map((m) => m.name) },
      inviter: inv.inviter,
      full: members.length >= plan.members,
      member: Boolean(me && members.some((m) => m.id === me.id)),
      bookId: me && members.some((m) => m.id === me.id) ? inv.bookId : null,
    });
  });

  r.post("/:code/accept", requireUser, (req, res) => {
    const inv = store.invites.get(String(req.params.code));
    if (!inv) throw new HttpError(404, "This invite link has expired or was turned off. Ask for a new one.");
    const me = userOf(res);
    if (!store.books.role(inv.bookId, me.id)) {
      const plan = store.billing.activePlan(store.books.ownerOf(inv.bookId)!);
      if (store.books.memberCount(inv.bookId) >= plan.members) {
        throw limitReached(`This book is full. ${plan.name} includes ${plan.members} people per book, so the owner needs to upgrade first.`);
      }
      store.books.addMember(inv.bookId, me.id);
    }
    res.json({ bookId: inv.bookId });
  });

  return r;
}

