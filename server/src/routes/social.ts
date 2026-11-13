import { Router } from "express";
import { limiter, userOf } from "../auth.ts";
import type { Store } from "../db.ts";
import { HttpError } from "../types.ts";

/** Finding people, following them, and the friends list. */
export function peopleRoutes(store: Store) {
  const r = Router();
  const searches = limiter(60, 60 * 1000);
  const follows = limiter(60, 10 * 60 * 1000);

  r.get("/search", (req, res) => {
    const me = userOf(res);
    if (searches.blocked(me.id)) throw new HttpError(429, "That's a lot of searching. Wait a minute and try again.");
    searches.hit(me.id);
    const q = String(req.query.q ?? "").slice(0, 40);
    res.set("Cache-Control", "no-store").json({ people: store.social.search(me.id, q) });
  });

  /** Who the person follows and who follows them. Friends are the people on both lists. */
  r.get("/friends", (_req, res) => {
    const me = userOf(res);
    res.set("Cache-Control", "no-store").json({ following: store.social.following(me.id), followers: store.social.followers(me.id) });
  });

  r.post("/:userId/follow", (req, res) => {
    const me = userOf(res), them = String(req.params.userId);
    if (follows.blocked(me.id)) throw new HttpError(429, "Too many follows at once. Wait a few minutes and try again.");
    follows.hit(me.id);
    if (store.social.follow(me.id, them)) store.notifications.add(them, "follow", { actorId: me.id });
    res.json(store.social.person(me.id, them));
  });

  r.delete("/:userId/follow", (req, res) => {
    const me = userOf(res), them = String(req.params.userId);
    store.social.unfollow(me.id, them);
    res.json(store.social.person(me.id, them) ?? null);
  });

  /** Stops someone following you. They can follow again, and you'll be told. */
  r.delete("/:userId/follower", (req, res) => {
    const me = userOf(res), them = String(req.params.userId);
    store.social.unfollow(them, me.id);
    res.json(store.social.person(me.id, them) ?? null);
  });

  return r;
}

/** The notifications list, and answering a request to join a book. */
export function notificationRoutes(store: Store) {
  const r = Router();

  r.get("/", (_req, res) => {
    const me = userOf(res);
    res.set("Cache-Control", "no-store").json({ items: store.notifications.list(me.id), unread: store.notifications.unread(me.id) });
  });

  r.get("/count", (_req, res) => {
    res.set("Cache-Control", "no-store").json({ unread: store.notifications.unread(userOf(res).id) });
  });

  r.post("/read", (_req, res) => {
    store.notifications.markAllRead(userOf(res).id);
    res.json({ unread: 0 });
  });

  function request(id: string, userId: string) {
    const n = store.notifications.get(id, userId);
    if (!n || n.kind !== "book_invite") throw new HttpError(404, "That request isn't there any more.");
    if (n.state) throw new HttpError(409, "You've already answered this one.");
    if (!n.bookId) throw new HttpError(404, "That book was deleted.");
    return { ...n, bookId: n.bookId };
  }

  r.post("/:id/accept", (req, res) => {
    const me = userOf(res), id = String(req.params.id);
    const n = request(id, me.id);
    if (!store.books.role(n.bookId, me.id)) {
      const plan = store.billing.activePlan(store.books.ownerOf(n.bookId)!);
      if (store.books.memberCount(n.bookId) >= plan.members) {
        throw new HttpError(402, `This book is full. ${plan.name} fits ${plan.members} people in a book, so the owner needs to make room or upgrade first.`);
      }
      store.books.addMember(n.bookId, me.id);
      store.notifications.joined(n.bookId, me.id);
    }
    store.notifications.answer(id, "accepted");
    res.json({ bookId: n.bookId });
  });

  r.post("/:id/decline", (req, res) => {
    const me = userOf(res), id = String(req.params.id);
    request(id, me.id);
    store.notifications.answer(id, "declined");
    res.json({ ok: true });
  });

  return r;
}
