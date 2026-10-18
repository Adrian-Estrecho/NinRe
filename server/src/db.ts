import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_DESIGN, readDesign, type Design } from "./design.ts";
import { PLANS, addMonths, isPlanId, type PlanId } from "./plans.ts";
import {
  HttpError,
  type BillingState, type Book, type BookSummary, type Cover, type Member, type Note, type Page, type PageInput,
  type Payment, type Person, type Photo, type Role, type Subscription, type User,
} from "./types.ts";

export const DEFAULT_TITLE = "Our Book of Travels";
export const SINCE_LABELS = ["Together since", "Friends since", "Travelling since", "Married since"];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT NOT NULL,
  pass_hash   TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (user_id);
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL,
  paid_until  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  plan          TEXT NOT NULL,
  months        INTEGER NOT NULL,
  amount        INTEGER NOT NULL,
  provider      TEXT NOT NULL,
  provider_ref  TEXT,
  checkout_url  TEXT,
  status        TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  paid_at       INTEGER
);
CREATE INDEX IF NOT EXISTS payments_by_user ON payments (user_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS payments_by_ref ON payments (provider_ref) WHERE provider_ref IS NOT NULL;
CREATE TABLE IF NOT EXISTS books (
  id           TEXT PRIMARY KEY,
  owner_id     TEXT NOT NULL REFERENCES users(id),
  title        TEXT NOT NULL,
  subtitle     TEXT NOT NULL DEFAULT '',
  since        TEXT NOT NULL DEFAULT '',
  since_label  TEXT NOT NULL DEFAULT 'Together since',
  design       TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS books_by_owner ON books (owner_id);
CREATE TABLE IF NOT EXISTS members (
  book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (book_id, user_id)
);
CREATE INDEX IF NOT EXISTS members_by_user ON members (user_id);
CREATE TABLE IF NOT EXISTS invites (
  code        TEXT PRIMARY KEY,
  book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invites_by_book ON invites (book_id);
CREATE TABLE IF NOT EXISTS pages (
  id            TEXT PRIMARY KEY,
  book_id       TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  author_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  date          TEXT NOT NULL,
  kind          TEXT NOT NULL,
  place_name    TEXT NOT NULL,
  place_region  TEXT NOT NULL DEFAULT '',
  place_code    TEXT NOT NULL,
  lat           REAL,
  lng           REAL,
  story         TEXT NOT NULL DEFAULT '',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pages_by_book ON pages (book_id, date);
CREATE TABLE IF NOT EXISTS photos (
  id           TEXT PRIMARY KEY,
  book_id      TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  uploader_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  page_id      TEXT REFERENCES pages(id) ON DELETE CASCADE,
  file         TEXT NOT NULL,
  caption      TEXT NOT NULL DEFAULT '',
  width        INTEGER NOT NULL,
  height       INTEGER NOT NULL,
  bytes        INTEGER NOT NULL DEFAULT 0,
  position     INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS photos_by_page ON photos (page_id, position);
CREATE INDEX IF NOT EXISTS photos_by_book ON photos (book_id);
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  page_id     TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  author_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
  text        TEXT NOT NULL,
  color       TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notes_by_page ON notes (page_id, created_at);
`;

type Row = Record<string, unknown>;

export const newId = (prefix: string) => prefix + randomBytes(9).toString("hex");
const str = (v: unknown) => String(v ?? "");

const toUser = (r: Row): User => ({ id: str(r.id), email: str(r.email), name: str(r.name), createdAt: Number(r.created_at) });
const toPhoto = (r: Row): Photo => ({
  id: str(r.id),
  url: `/uploads/${r.book_id}/${r.file}`,
  caption: str(r.caption),
  width: Number(r.width),
  height: Number(r.height),
});
const toCover = (r: Row): Cover => ({ title: str(r.title), subtitle: str(r.subtitle), since: str(r.since), sinceLabel: str(r.since_label) });
const toPayment = (r: Row): Payment => ({
  id: str(r.id),
  plan: (isPlanId(r.plan) ? r.plan : "plus") as PlanId,
  months: Number(r.months),
  amount: Number(r.amount),
  provider: r.provider === "paymongo" ? "paymongo" : "test",
  status: r.status === "paid" ? "paid" : "pending",
  checkoutUrl: r.checkout_url == null ? null : str(r.checkout_url),
  createdAt: Number(r.created_at),
  paidAt: r.paid_at == null ? null : Number(r.paid_at),
});

export type Store = ReturnType<typeof openStore>;

export function openStore(file: string) {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;");
  db.exec(SCHEMA);

  const prepared = new Map<string, ReturnType<DatabaseSync["prepare"]>>();
  const q = (sql: string) => {
    let s = prepared.get(sql);
    if (!s) prepared.set(sql, (s = db.prepare(sql)));
    return s;
  };
  const one = (sql: string, ...args: (string | number | null)[]) => q(sql).get(...args) as Row | undefined;
  const all = (sql: string, ...args: (string | number | null)[]) => q(sql).all(...args) as Row[];
  const run = (sql: string, ...args: (string | number | null)[]) => q(sql).run(...args);
  const count = (sql: string, ...args: (string | number | null)[]) => Number((one(sql, ...args) as Row).n);

  let depth = 0;
  function tx<T>(fn: () => T): T {
    if (depth > 0) return fn();
    db.exec("BEGIN IMMEDIATE");
    depth++;
    try {
      const out = fn();
      db.exec("COMMIT");
      return out;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    } finally {
      depth--;
    }
  }

  const people = (ids: Iterable<string>): Map<string, Person> => {
    const map = new Map<string, Person>();
    for (const id of new Set(ids)) {
      const r = one("SELECT id, name FROM users WHERE id = ?", id);
      if (r) map.set(id, { id, name: str(r.name) });
    }
    return map;
  };

  /* ---------- Users and sessions ---------- */

  const users = {
    create(email: string, name: string, passHash: string): User {
      if (one("SELECT 1 FROM users WHERE email = ?", email)) throw new HttpError(409, "There's already an account with that email. Log in instead.");
      const id = newId("u_");
      run("INSERT INTO users (id, email, name, pass_hash, created_at) VALUES (?, ?, ?, ?, ?)", id, email, name, passHash, Date.now());
      return users.get(id)!;
    },
    get(id: string): User | undefined {
      const r = one("SELECT * FROM users WHERE id = ?", id);
      return r && toUser(r);
    },
    byEmail(email: string): (User & { passHash: string }) | undefined {
      const r = one("SELECT * FROM users WHERE email = ?", email);
      return r && { ...toUser(r), passHash: str(r.pass_hash) };
    },
    passHash(id: string): string {
      return str(one("SELECT pass_hash FROM users WHERE id = ?", id)?.pass_hash);
    },
    rename(id: string, name: string): User {
      run("UPDATE users SET name = ? WHERE id = ?", name, id);
      return users.get(id)!;
    },
    setPassword(id: string, passHash: string) {
      run("UPDATE users SET pass_hash = ? WHERE id = ?", passHash, id);
    },
    /** Deletes the account and every book it owns. Returns the ids of the deleted books, whose photo folders should go too. */
    remove(id: string): string[] {
      return tx(() => {
        const owned = all("SELECT id FROM books WHERE owner_id = ?", id).map((r) => str(r.id));
        for (const b of owned) run("DELETE FROM books WHERE id = ?", b);
        run("DELETE FROM users WHERE id = ?", id);
        return owned;
      });
    },
  };

  const sessions = {
    create(tokenHash: string, userId: string, expiresAt: number) {
      run("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)", tokenHash, userId, Date.now(), expiresAt);
    },
    user(tokenHash: string): User | undefined {
      const r = one("SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?", tokenHash, Date.now());
      return r && toUser(r);
    },
    remove(tokenHash: string) {
      run("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
    },
    removeOthers(userId: string, keepHash: string) {
      run("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?", userId, keepHash);
    },
    sweep() {
      run("DELETE FROM sessions WHERE expires_at < ?", Date.now());
    },
  };

  /* ---------- Plans and payments ---------- */

  function subscription(userId: string): Subscription {
    const r = one("SELECT plan, paid_until FROM subscriptions WHERE user_id = ?", userId);
    return r && isPlanId(r.plan) ? { plan: r.plan, paidUntil: Number(r.paid_until) } : { plan: "free", paidUntil: 0 };
  }

  const billing = {
    subscription,
    activePlan(userId: string) {
      const s = subscription(userId);
      return s.plan !== "free" && s.paidUntil > Date.now() ? PLANS[s.plan] : PLANS.free;
    },
    state(userId: string): BillingState {
      const s = subscription(userId);
      return {
        plan: s.plan,
        paidUntil: s.paidUntil,
        active: billing.activePlan(userId),
        usage: {
          books: count("SELECT COUNT(*) n FROM books WHERE owner_id = ?", userId),
          photos: count("SELECT COUNT(*) n FROM photos p JOIN books b ON b.id = p.book_id WHERE b.owner_id = ?", userId),
        },
      };
    },
    createPayment(p: { id: string; userId: string; plan: PlanId; months: number; amount: number; provider: "paymongo" | "test" }): Payment {
      run("INSERT INTO payments (id, user_id, plan, months, amount, provider, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)",
        p.id, p.userId, p.plan, p.months, p.amount, p.provider, Date.now());
      return billing.payment(p.id)!;
    },
    attachCheckout(id: string, ref: string, url: string) {
      run("UPDATE payments SET provider_ref = ?, checkout_url = ? WHERE id = ?", ref, url, id);
    },
    payment(id: string): Payment | undefined {
      const r = one("SELECT * FROM payments WHERE id = ?", id);
      return r && toPayment(r);
    },
    paymentFor(id: string, userId: string): (Payment & { ref: string | null }) | undefined {
      const r = one("SELECT * FROM payments WHERE id = ? AND user_id = ?", id, userId);
      return r && { ...toPayment(r), ref: r.provider_ref == null ? null : str(r.provider_ref) };
    },
    paymentIdByRef(ref: string): string | undefined {
      const r = one("SELECT id FROM payments WHERE provider_ref = ?", ref);
      return r && str(r.id);
    },
    payments(userId: string): Payment[] {
      return all("SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 24", userId).map(toPayment);
    },
    /**
     * Marks a payment paid and extends the plan. Safe to call more than once.
     * Paying for the plan already running adds months to its end. Switching plans starts the new
     * plan now and converts unused days of the old one into days of the new one at the price ratio.
     */
    markPaid(id: string): Payment | undefined {
      return tx(() => {
        const r = one("SELECT * FROM payments WHERE id = ?", id);
        if (!r) return undefined;
        const p = toPayment(r);
        if (p.status === "paid" || r.user_id == null) return p;
        const userId = str(r.user_id);
        const now = Date.now();
        const cur = subscription(userId);
        const left = Math.max(0, cur.paidUntil - now);
        let start = now;
        if (cur.plan === p.plan) start = now + left;
        else if (left > 0 && cur.plan !== "free") start = now + Math.round((left * PLANS[cur.plan].price) / PLANS[p.plan].price);
        const until = addMonths(start, p.months);
        run(`INSERT INTO subscriptions (user_id, plan, paid_until, updated_at) VALUES (?, ?, ?, ?)
          ON CONFLICT (user_id) DO UPDATE SET plan = excluded.plan, paid_until = excluded.paid_until, updated_at = excluded.updated_at`,
          userId, p.plan, until, now);
        run("UPDATE payments SET status = 'paid', paid_at = ? WHERE id = ?", now, id);
        return billing.payment(id);
      });
    },
  };

  /* ---------- Books and members ---------- */

  function membersOf(bookId: string): Member[] {
    return all(`SELECT u.id, u.name, m.role, m.joined_at FROM members m JOIN users u ON u.id = m.user_id
      WHERE m.book_id = ? ORDER BY m.role = 'owner' DESC, m.joined_at`, bookId)
      .map((r) => ({ id: str(r.id), name: str(r.name), role: r.role === "owner" ? "owner" : "editor", joinedAt: Number(r.joined_at) }));
  }

  function photosOfBook(bookId: string): Map<string, Photo[]> {
    const byPage = new Map<string, Photo[]>();
    for (const r of all("SELECT * FROM photos WHERE book_id = ? AND page_id IS NOT NULL ORDER BY position", bookId)) {
      const list = byPage.get(str(r.page_id)) ?? [];
      list.push(toPhoto(r));
      byPage.set(str(r.page_id), list);
    }
    return byPage;
  }

  function notesOf(rows: Row[], who: Map<string, Person>): Note[] {
    return rows.map((r) => ({
      id: str(r.id),
      pageId: str(r.page_id),
      author: r.author_id == null ? null : who.get(str(r.author_id)) ?? null,
      text: str(r.text),
      color: str(r.color),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    }));
  }

  function toPage(r: Row, photos: Photo[], notes: Note[], who: Map<string, Person>): Page {
    return {
      id: str(r.id),
      title: str(r.title),
      date: str(r.date),
      kind: str(r.kind),
      place: {
        name: str(r.place_name),
        region: str(r.place_region),
        code: str(r.place_code),
        lat: r.lat == null ? null : Number(r.lat),
        lng: r.lng == null ? null : Number(r.lng),
      },
      story: str(r.story),
      photos,
      notes,
      author: r.author_id == null ? null : who.get(str(r.author_id)) ?? null,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    };
  }

  function coverPhotoUrl(bookId: string, design: Design): string | null {
    const pick = design.coverPhoto
      ? one("SELECT * FROM photos WHERE id = ? AND book_id = ? AND page_id IS NOT NULL", design.coverPhoto, bookId)
      : undefined;
    return pick ? toPhoto(pick).url : null;
  }

  const books = {
    create(ownerId: string, cover: Cover, design: Design = DEFAULT_DESIGN): string {
      return tx(() => {
        const id = newId("b_");
        const now = Date.now();
        run("INSERT INTO books (id, owner_id, title, subtitle, since, since_label, design, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          id, ownerId, cover.title, cover.subtitle, cover.since, cover.sinceLabel, JSON.stringify({ ...design, coverPhoto: null }), now, now);
        run("INSERT INTO members (book_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)", id, ownerId, now);
        return id;
      });
    },

    role(bookId: string, userId: string): Role | undefined {
      const r = one("SELECT role FROM members WHERE book_id = ? AND user_id = ?", bookId, userId);
      return r ? (r.role === "owner" ? "owner" : "editor") : undefined;
    },

    ownerOf(bookId: string): string | undefined {
      const r = one("SELECT owner_id FROM books WHERE id = ?", bookId);
      return r && str(r.owner_id);
    },

    list(userId: string): BookSummary[] {
      return all(`SELECT b.*, m.role FROM books b JOIN members m ON m.book_id = b.id AND m.user_id = ? ORDER BY b.updated_at DESC`, userId).map((r) => {
        const id = str(r.id);
        const design = readDesign(str(r.design));
        const members = membersOf(id);
        const owner = members.find((m) => m.role === "owner");
        return {
          id,
          cover: toCover(r),
          design,
          role: r.role === "owner" ? "owner" : "editor",
          owner: owner ? { id: owner.id, name: owner.name } : { id: str(r.owner_id), name: "" },
          members: members.map((m) => ({ id: m.id, name: m.name })),
          counts: {
            pages: count("SELECT COUNT(*) n FROM pages WHERE book_id = ?", id),
            photos: count("SELECT COUNT(*) n FROM photos WHERE book_id = ? AND page_id IS NOT NULL", id),
          },
          coverPhotoUrl: coverPhotoUrl(id, design),
          updatedAt: Number(r.updated_at),
        } satisfies BookSummary;
      });
    },

    get(bookId: string, userId: string): Book | undefined {
      const r = one("SELECT b.*, m.role FROM books b JOIN members m ON m.book_id = b.id AND m.user_id = ? WHERE b.id = ?", userId, bookId);
      if (!r) return undefined;
      const pageRows = all("SELECT * FROM pages WHERE book_id = ? ORDER BY date, created_at", bookId);
      const noteRows = all("SELECT n.* FROM notes n JOIN pages p ON p.id = n.page_id WHERE p.book_id = ? ORDER BY n.created_at", bookId);
      const who = people([...pageRows, ...noteRows].map((x) => x.author_id).filter((v): v is string => typeof v === "string"));
      const photos = photosOfBook(bookId);
      const notesByPage = new Map<string, Note[]>();
      for (const n of notesOf(noteRows, who)) notesByPage.set(n.pageId, [...(notesByPage.get(n.pageId) ?? []), n]);
      return {
        id: bookId,
        cover: toCover(r),
        design: readDesign(str(r.design)),
        role: r.role === "owner" ? "owner" : "editor",
        ownerId: str(r.owner_id),
        members: membersOf(bookId),
        pages: pageRows.map((p) => toPage(p, photos.get(str(p.id)) ?? [], notesByPage.get(str(p.id)) ?? [], who)),
        updatedAt: Number(r.updated_at),
      };
    },

    saveCover(bookId: string, c: Cover): Cover {
      run("UPDATE books SET title = ?, subtitle = ?, since = ?, since_label = ?, updated_at = ? WHERE id = ?", c.title, c.subtitle, c.since, c.sinceLabel, Date.now(), bookId);
      return toCover(one("SELECT * FROM books WHERE id = ?", bookId)!);
    },

    saveDesign(bookId: string, d: Design): Design {
      if (d.coverPhoto && !one("SELECT 1 FROM photos WHERE id = ? AND book_id = ? AND page_id IS NOT NULL", d.coverPhoto, bookId)) {
        throw new HttpError(400, "That cover photo isn't on any page of this book.");
      }
      run("UPDATE books SET design = ?, updated_at = ? WHERE id = ?", JSON.stringify(d), Date.now(), bookId);
      return d;
    },

    touch(bookId: string) {
      run("UPDATE books SET updated_at = ? WHERE id = ?", Date.now(), bookId);
    },

    remove(bookId: string) {
      run("DELETE FROM books WHERE id = ?", bookId);
    },

    members: membersOf,
    memberCount: (bookId: string) => count("SELECT COUNT(*) n FROM members WHERE book_id = ?", bookId),
    addMember(bookId: string, userId: string) {
      run("INSERT OR IGNORE INTO members (book_id, user_id, role, joined_at) VALUES (?, ?, 'editor', ?)", bookId, userId, Date.now());
    },
    removeMember(bookId: string, userId: string) {
      run("DELETE FROM members WHERE book_id = ? AND user_id = ? AND role <> 'owner'", bookId, userId);
    },
  };

  /* ---------- Invites ---------- */

  const invites = {
    create(bookId: string, by: string, ttlMs: number) {
      const code = randomBytes(9).toString("base64url");
      const now = Date.now();
      run("INSERT INTO invites (code, book_id, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?)", code, bookId, by, now, now + ttlMs);
      return { code, createdAt: now, expiresAt: now + ttlMs };
    },
    list(bookId: string) {
      return all("SELECT code, created_at, expires_at FROM invites WHERE book_id = ? AND expires_at > ? ORDER BY created_at DESC", bookId, Date.now())
        .map((r) => ({ code: str(r.code), createdAt: Number(r.created_at), expiresAt: Number(r.expires_at) }));
    },
    remove(bookId: string, code: string): boolean {
      return Number(run("DELETE FROM invites WHERE book_id = ? AND code = ?", bookId, code).changes) > 0;
    },
    get(code: string) {
      const r = one(`SELECT i.code, i.book_id, i.expires_at, b.title, b.subtitle, b.design, u.name AS inviter
        FROM invites i JOIN books b ON b.id = i.book_id LEFT JOIN users u ON u.id = i.created_by WHERE i.code = ?`, code);
      if (!r || Number(r.expires_at) < Date.now()) return undefined;
      return { code: str(r.code), bookId: str(r.book_id), title: str(r.title), subtitle: str(r.subtitle), design: readDesign(str(r.design)), inviter: str(r.inviter) };
    },
  };

  /* ---------- Pages, photos and notes ---------- */

  function pageOf(bookId: string, id: string): Page | undefined {
    const r = one("SELECT * FROM pages WHERE id = ? AND book_id = ?", id, bookId);
    if (!r) return undefined;
    const noteRows = all("SELECT * FROM notes WHERE page_id = ? ORDER BY created_at", id);
    const who = people([r, ...noteRows].map((x) => x.author_id).filter((v): v is string => typeof v === "string"));
    const photos = all("SELECT * FROM photos WHERE page_id = ? ORDER BY position", id).map(toPhoto);
    return toPage(r, photos, notesOf(noteRows, who), who);
  }

  /** Attaches the listed photos to a page in order and returns the files of photos no longer on it. */
  function setPhotos(bookId: string, pageId: string, photos: PageInput["photos"]): string[] {
    const current = all("SELECT * FROM photos WHERE page_id = ?", pageId);
    photos.forEach((p, i) => {
      const row = one("SELECT * FROM photos WHERE id = ?", p.id);
      if (!row || row.book_id !== bookId || (row.page_id != null && row.page_id !== pageId)) {
        throw new HttpError(400, "One of the photos isn't available any more. Remove it and add it again.");
      }
      run("UPDATE photos SET page_id = ?, caption = ?, position = ? WHERE id = ?", pageId, p.caption, i, p.id);
    });
    const keep = new Set(photos.map((p) => p.id));
    return current.filter((r) => !keep.has(str(r.id))).map((r) => {
      run("DELETE FROM photos WHERE id = ?", str(r.id));
      return str(r.file);
    });
  }

  const pages = {
    get: pageOf,

    create(bookId: string, authorId: string, p: PageInput): { page: Page; removedFiles: string[] } {
      return tx(() => {
        const id = newId("p_");
        const now = Date.now();
        run(`INSERT INTO pages (id, book_id, author_id, title, date, kind, place_name, place_region, place_code, lat, lng, story, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id, bookId, authorId, p.title, p.date, p.kind, p.place.name, p.place.region, p.place.code, p.place.lat, p.place.lng, p.story, now, now);
        const removedFiles = setPhotos(bookId, id, p.photos);
        books.touch(bookId);
        return { page: pageOf(bookId, id)!, removedFiles };
      });
    },

    update(bookId: string, id: string, p: PageInput): { page: Page; removedFiles: string[] } | undefined {
      return tx(() => {
        if (!one("SELECT 1 FROM pages WHERE id = ? AND book_id = ?", id, bookId)) return undefined;
        run(`UPDATE pages SET title = ?, date = ?, kind = ?, place_name = ?, place_region = ?, place_code = ?, lat = ?, lng = ?, story = ?, updated_at = ?
          WHERE id = ?`, p.title, p.date, p.kind, p.place.name, p.place.region, p.place.code, p.place.lat, p.place.lng, p.story, Date.now(), id);
        const removedFiles = setPhotos(bookId, id, p.photos);
        books.touch(bookId);
        return { page: pageOf(bookId, id)!, removedFiles };
      });
    },

    /** Returns the files of the page's photos, or undefined when the page isn't in this book. */
    remove(bookId: string, id: string): string[] | undefined {
      return tx(() => {
        if (!one("SELECT 1 FROM pages WHERE id = ? AND book_id = ?", id, bookId)) return undefined;
        const files = all("SELECT file FROM photos WHERE page_id = ?", id).map((r) => str(r.file));
        run("DELETE FROM pages WHERE id = ?", id);
        books.touch(bookId);
        return files;
      });
    },

    addPhoto(bookId: string, uploaderId: string, id: string, file: string, width: number, height: number, bytes: number): Photo {
      run("INSERT INTO photos (id, book_id, uploader_id, page_id, file, caption, width, height, bytes, position, created_at) VALUES (?, ?, ?, NULL, ?, '', ?, ?, ?, 0, ?)",
        id, bookId, uploaderId, file, width, height, bytes, Date.now());
      return toPhoto(one("SELECT * FROM photos WHERE id = ?", id)!);
    },

    /** Removes uploads that never made it onto a page and returns their book folders and files. */
    sweepOrphans(olderThanMs: number): { bookId: string; file: string }[] {
      return tx(() => all("SELECT id, book_id, file FROM photos WHERE page_id IS NULL AND created_at < ?", Date.now() - olderThanMs).map((r) => {
        run("DELETE FROM photos WHERE id = ?", str(r.id));
        return { bookId: str(r.book_id), file: str(r.file) };
      }));
    },
  };

  const notes = {
    get(bookId: string, pageId: string, noteId: string) {
      const r = one("SELECT n.* FROM notes n JOIN pages p ON p.id = n.page_id WHERE n.id = ? AND n.page_id = ? AND p.book_id = ?", noteId, pageId, bookId);
      return r && { id: str(r.id), authorId: r.author_id == null ? null : str(r.author_id) };
    },
    countOn: (pageId: string) => count("SELECT COUNT(*) n FROM notes WHERE page_id = ?", pageId),
    create(bookId: string, pageId: string, authorId: string, text: string, color: string): Page {
      const now = Date.now();
      run("INSERT INTO notes (id, page_id, author_id, text, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", newId("n_"), pageId, authorId, text, color, now, now);
      books.touch(bookId);
      return pageOf(bookId, pageId)!;
    },
    update(bookId: string, pageId: string, noteId: string, text: string, color: string): Page {
      run("UPDATE notes SET text = ?, color = ?, updated_at = ? WHERE id = ?", text, color, Date.now(), noteId);
      books.touch(bookId);
      return pageOf(bookId, pageId)!;
    },
    remove(bookId: string, pageId: string, noteId: string): Page {
      run("DELETE FROM notes WHERE id = ?", noteId);
      books.touch(bookId);
      return pageOf(bookId, pageId)!;
    },
  };

  return {
    users,
    sessions,
    billing,
    books,
    invites,
    pages,
    notes,
    close() {
      db.close();
    },
  };
}
