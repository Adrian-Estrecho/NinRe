import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_DESIGN, readDesign, type Design } from "./design.ts";
import { PLANS, addMonths, isPlanId, type PlanId } from "./plans.ts";
import type { Trip, TripInput, TripPlace } from "./trips.ts";
import {
  BOOK_KINDS, DEFAULT_ROOM, EMPTY_PROFILE, HttpError, PAGE_LAYOUTS,
  type BillingState, type Book, type BookKind, type BookSummary, type BoardPhoto, type Cover, type Dashboard, type Library, type Member, type Memory, type Note, type Page, type PageInput, type PageLayout,
  type Payment, type Person, type Photo, type PlaceVisit, type Profile, type Role, type Room, type SignupDetails, type Subscription, type User,
  DEFAULT_SETTINGS, NOTIFICATION_KINDS,
  type AccountSettings, type Notification, type NotificationKind, type NotifyKind, type PublicPerson, type Settings,
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
  kind         TEXT NOT NULL DEFAULT 'journal',
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
  layout        TEXT NOT NULL DEFAULT '',
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
CREATE TABLE IF NOT EXISTS libraries (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  room        TEXT NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS follows (
  follower_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (follower_id, followee_id)
);
CREATE INDEX IF NOT EXISTS follows_by_followee ON follows (followee_id);
CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  actor_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
  book_id     TEXT REFERENCES books(id) ON DELETE CASCADE,
  page_id     TEXT,
  text        TEXT NOT NULL DEFAULT '',
  count       INTEGER NOT NULL DEFAULT 1,
  state       TEXT NOT NULL DEFAULT '',
  read_at     INTEGER,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_by_user ON notifications (user_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_by_book ON notifications (book_id, kind);
CREATE TABLE IF NOT EXISTS trips (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  start_date  TEXT NOT NULL DEFAULT '',
  end_date    TEXT NOT NULL DEFAULT '',
  places      TEXT NOT NULL DEFAULT '[]',
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS trips_by_user ON trips (user_id, updated_at);
`;

type Row = Record<string, unknown>;

export const newId = (prefix: string) => prefix + randomBytes(9).toString("hex");
const str = (v: unknown) => String(v ?? "");

const toUser = (r: Row): User => ({
  id: str(r.id), email: str(r.email), name: str(r.name), username: str(r.username), verified: r.email_verified_at != null, createdAt: Number(r.created_at),
});

/** Reads stored settings over the defaults, so settings added later start at their default. */
function readSettings(json: unknown): Settings {
  try {
    const s = JSON.parse(str(json) || "{}");
    return { ...DEFAULT_SETTINGS, ...s, notify: { ...DEFAULT_SETTINGS.notify, ...(s.notify ?? {}) } };
  } catch {
    return { ...DEFAULT_SETTINGS, notify: { ...DEFAULT_SETTINGS.notify } };
  }
}

/** A username to start from, made of the letters of a name: "Mara Santos" → "marasantos". */
export function usernameBase(name: string): string {
  const base = name.normalize("NFD").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
  return base.length >= 3 ? base : `traveller${base}`;
}
const toPhoto = (r: Row): Photo => ({
  id: str(r.id),
  url: `/uploads/${r.book_id}/${r.file}`,
  caption: str(r.caption),
  width: Number(r.width),
  height: Number(r.height),
});
// A diary or blog from before those kinds were taken out reads as a journal, so its writing still shows.
const toKind = (r: Row): BookKind => (BOOK_KINDS.includes(r.kind as BookKind) ? (r.kind as BookKind) : "journal");
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

  // Columns added since the first release, for databases made before them.
  for (const [table, column, def] of [
    ["books", "kind", "TEXT NOT NULL DEFAULT 'journal'"],
    ["pages", "layout", "TEXT NOT NULL DEFAULT ''"],
    ["users", "profile", "TEXT NOT NULL DEFAULT '{}'"],
    ["users", "username", "TEXT"],
    ["users", "bio", "TEXT NOT NULL DEFAULT ''"],
    ["users", "home", "TEXT NOT NULL DEFAULT ''"],
    ["users", "settings", "TEXT NOT NULL DEFAULT '{}'"],
    ["users", "last_name", "TEXT NOT NULL DEFAULT ''"],
    ["users", "age", "INTEGER"],
    ["users", "phone", "TEXT NOT NULL DEFAULT ''"],
    ["users", "terms_version", "TEXT NOT NULL DEFAULT ''"],
    ["users", "terms_at", "INTEGER"],
    ["trips", "days", "INTEGER NOT NULL DEFAULT 0"],
  ]) {
    if (!all(`PRAGMA table_info(${table})`).some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
  }
  // Email confirmation. Accounts made before it existed count as confirmed, so nobody already in is locked out.
  if (!all("PRAGMA table_info(users)").some((c) => c.name === "email_verified_at")) {
    db.exec("ALTER TABLE users ADD COLUMN email_verified_at INTEGER");
    db.exec("UPDATE users SET email_verified_at = created_at");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_tokens (
      token_hash  TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      email       TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      expires_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS email_tokens_by_user ON email_tokens (user_id);
  `);

  /** A free username near the one asked for: the name itself, then with a few digits after it. */
  function freeUsername(name: string): string {
    const base = usernameBase(name);
    if (!one("SELECT 1 FROM users WHERE username = ?", base)) return base;
    for (let digits = 2; ; digits++) {
      const tryName = base + String(randomBytes(4).readUInt32BE() % 10 ** digits).padStart(digits, "0");
      if (!one("SELECT 1 FROM users WHERE username = ?", tryName)) return tryName;
    }
  }

  // Accounts made before usernames get one from their name.
  for (const r of all("SELECT id, name FROM users WHERE username IS NULL OR username = ''")) {
    run("UPDATE users SET username = ? WHERE id = ?", freeUsername(str(r.name)), str(r.id));
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_by_username ON users (username)");

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
    create(email: string, name: string, passHash: string, profile: Profile = EMPTY_PROFILE, details?: SignupDetails): User {
      const existing = one("SELECT id, email_verified_at FROM users WHERE email = ?", email);
      if (existing?.email_verified_at != null) throw new HttpError(409, "There's already an account with that email. Log in instead.");
      const id = newId("u_");
      const now = Date.now();
      tx(() => {
        // An account whose email was never confirmed holds nothing yet, and may not even be the email owner's: the
        // person who can confirm the address gets it.
        if (existing) users.remove(str(existing.id));
        run("INSERT INTO users (id, email, name, username, pass_hash, profile, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          id, email, name, freeUsername(name), passHash, JSON.stringify(profile), now);
        if (details) {
          run("UPDATE users SET last_name = ?, age = ?, phone = ?, terms_version = ?, terms_at = ? WHERE id = ?",
            details.lastName, details.age, details.phone, details.termsVersion, now, id);
        }
      });
      return users.get(id)!;
    },
    /** The rest of what they gave when signing up, and when they agreed to which terms. */
    details(id: string): (Omit<SignupDetails, "age"> & { age: number | null; termsAt: number | null }) | undefined {
      const r = one("SELECT last_name, age, phone, terms_version, terms_at FROM users WHERE id = ?", id);
      if (!r) return undefined;
      return {
        lastName: str(r.last_name), age: r.age == null ? null : Number(r.age), phone: str(r.phone),
        termsVersion: str(r.terms_version), termsAt: r.terms_at == null ? null : Number(r.terms_at),
      };
    },
    /** What they answered while signing up. */
    profile(id: string): Profile {
      try {
        return { ...EMPTY_PROFILE, ...JSON.parse(str(one("SELECT profile FROM users WHERE id = ?", id)?.profile) || "{}") };
      } catch {
        return { ...EMPTY_PROFILE };
      }
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
    /** The account as its settings page shows it. */
    account(id: string, sessionCount: number): AccountSettings {
      const r = one("SELECT * FROM users WHERE id = ?", id)!;
      return { user: toUser(r), bio: str(r.bio), home: str(r.home), travel: users.profile(id), settings: readSettings(r.settings), sessions: sessionCount };
    },
    /** Saves the details other people see, and the travel answers from signing up. */
    saveProfile(id: string, p: { name: string; username: string; bio: string; home: string; travel: Profile }): User {
      const taken = one("SELECT id FROM users WHERE username = ?", p.username);
      if (taken && taken.id !== id) throw new HttpError(409, "That username is taken. Try another.");
      run("UPDATE users SET name = ?, username = ?, bio = ?, home = ?, profile = ? WHERE id = ?", p.name, p.username, p.bio, p.home, JSON.stringify(p.travel), id);
      return users.get(id)!;
    },
    settings(id: string): Settings {
      return readSettings(one("SELECT settings FROM users WHERE id = ?", id)?.settings);
    },
    saveSettings(id: string, s: Settings): Settings {
      run("UPDATE users SET settings = ? WHERE id = ?", JSON.stringify(s), id);
      return users.settings(id);
    },
    setEmail(id: string, email: string): User {
      const taken = one("SELECT id FROM users WHERE email = ?", email);
      if (taken && taken.id !== id) throw new HttpError(409, "There's already an account with that email.");
      run("UPDATE users SET email = ? WHERE id = ?", email, id);
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

  /** Links that confirm an email address. Only a hash of each token is kept, and a token only confirms the address it was sent to. */
  const verification = {
    issue(userId: string, email: string, tokenHash: string, expiresAt: number) {
      tx(() => {
        // Only the newest link works, so an old email lying around can't be used.
        run("DELETE FROM email_tokens WHERE user_id = ?", userId);
        run("INSERT INTO email_tokens (token_hash, user_id, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?)", tokenHash, userId, email, Date.now(), expiresAt);
      });
    },
    /**
     * Confirms the address the token was sent to. For a new account that's its own address; for a change of email
     * it's the new one, which only now replaces the old (so nobody is locked out while the link is on its way).
     * Returns the person, or undefined when the link is unknown, used, expired, or the address was taken meanwhile.
     */
    use(tokenHash: string): User | undefined {
      return tx(() => {
        const t = one("SELECT user_id, email, expires_at FROM email_tokens WHERE token_hash = ?", tokenHash);
        if (!t) return undefined;
        run("DELETE FROM email_tokens WHERE user_id = ?", str(t.user_id));
        if (Number(t.expires_at) < Date.now()) return undefined;
        const u = users.get(str(t.user_id));
        if (!u) return undefined;
        const email = str(t.email);
        if (u.email.toLowerCase() !== email.toLowerCase()) {
          const other = one("SELECT id, email_verified_at FROM users WHERE email = ? AND id != ?", email, u.id);
          if (other?.email_verified_at != null) return undefined;
          if (other) users.remove(str(other.id));
          run("UPDATE users SET email = ? WHERE id = ?", email, u.id);
        }
        run("UPDATE users SET email_verified_at = COALESCE(email_verified_at, ?) WHERE id = ?", Date.now(), u.id);
        return users.get(u.id);
      });
    },
    /** The address waiting to be confirmed in place of the current one, if a change of email is under way. */
    pending(userId: string): string | undefined {
      const t = one("SELECT e.email FROM email_tokens e JOIN users u ON u.id = e.user_id WHERE e.user_id = ? AND e.expires_at > ? AND lower(e.email) != lower(u.email)", userId, Date.now());
      return t ? str(t.email) : undefined;
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
    count: (userId: string) => count("SELECT COUNT(*) n FROM sessions WHERE user_id = ? AND expires_at > ?", userId, Date.now()),
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
      layout: PAGE_LAYOUTS.includes(r.layout as PageLayout) ? (r.layout as PageLayout) : "",
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
    create(ownerId: string, cover: Cover, design: Design = DEFAULT_DESIGN, kind: BookKind = "album"): string {
      return tx(() => {
        const id = newId("b_");
        const now = Date.now();
        run("INSERT INTO books (id, owner_id, title, subtitle, since, since_label, kind, design, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          id, ownerId, cover.title, cover.subtitle, cover.since, cover.sinceLabel, kind, JSON.stringify({ ...design, coverPhoto: null }), now, now);
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
          kind: toKind(r),
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
        kind: toKind(r),
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

    saveKind(bookId: string, kind: BookKind): BookKind {
      run("UPDATE books SET kind = ?, updated_at = ? WHERE id = ?", kind, Date.now(), bookId);
      return kind;
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
      tx(() => {
        if (!Number(run("DELETE FROM members WHERE book_id = ? AND user_id = ? AND role <> 'owner'", bookId, userId).changes)) return;
        // News from a book they've left would lead nowhere.
        run("DELETE FROM notifications WHERE user_id = ? AND book_id = ? AND kind <> 'book_invite'", userId, bookId);
      });
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
        run(`INSERT INTO pages (id, book_id, author_id, title, date, kind, layout, place_name, place_region, place_code, lat, lng, story, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          id, bookId, authorId, p.title, p.date, p.kind, p.layout, p.place.name, p.place.region, p.place.code, p.place.lat, p.place.lng, p.story, now, now);
        const removedFiles = setPhotos(bookId, id, p.photos);
        books.touch(bookId);
        return { page: pageOf(bookId, id)!, removedFiles };
      });
    },

    update(bookId: string, id: string, p: PageInput): { page: Page; removedFiles: string[] } | undefined {
      return tx(() => {
        if (!one("SELECT 1 FROM pages WHERE id = ? AND book_id = ?", id, bookId)) return undefined;
        run(`UPDATE pages SET title = ?, date = ?, kind = ?, layout = ?, place_name = ?, place_region = ?, place_code = ?, lat = ?, lng = ?, story = ?, updated_at = ?
          WHERE id = ?`, p.title, p.date, p.kind, p.layout, p.place.name, p.place.region, p.place.code, p.place.lat, p.place.lng, p.story, Date.now(), id);
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

  /* ---------- The signed-in home ---------- */

  /** Every page in the person's books, oldest first, with where it was set. */
  const placedPages = (userId: string) => all(`SELECT p.id, p.book_id, p.title, p.date, p.kind, p.place_name, p.place_region, p.lat, p.lng,
      (SELECT COUNT(*) FROM photos ph WHERE ph.page_id = p.id) photos
    FROM pages p JOIN members m ON m.book_id = p.book_id AND m.user_id = ? ORDER BY p.date, p.created_at`, userId);

  /** The places those pages were set in, latest visit first. */
  const placesOf = (rows: Row[]): PlaceVisit[] => {
    // Pages count as one place when they share a pin (to about a kilometre), or the same name when unpinned.
    const places = new Map<string, PlaceVisit>();
    for (const r of rows) {
      const lat = r.lat == null ? null : Number(r.lat), lng = r.lng == null ? null : Number(r.lng);
      const key = lat != null && lng != null ? `${lat.toFixed(2)},${lng.toFixed(2)}` : str(r.place_name).trim().toLowerCase();
      const date = str(r.date), bookId = str(r.book_id), pageId = str(r.id);
      const seen = places.get(key);
      if (seen) Object.assign(seen, { pages: seen.pages + 1, last: date, bookId, pageId });
      else places.set(key, { name: str(r.place_name), region: str(r.place_region), lat, lng, pages: 1, first: date, last: date, bookId, pageId });
    }
    return [...places.values()].sort((a, b) => b.last.localeCompare(a.last));
  };

  const dashboard = {
    /**
     * Totals, every place, and the pages from this day in earlier years, across every book the person writes in.
     * `today` is the person's own calendar date, because the server can't know their time zone.
     */
    get(userId: string, today: string): Dashboard {
      const titles = new Map(all("SELECT b.id, b.title FROM books b JOIN members m ON m.book_id = b.id AND m.user_id = ?", userId).map((r) => [str(r.id), str(r.title)]));
      const rows = placedPages(userId);
      const places = placesOf(rows);

      // This day in earlier years; failing that, within three days of it.
      const [ty, tm, td] = today.split("-").map(Number);
      const away = (date: string) => {
        const [, m, d] = date.split("-").map(Number);
        const days = Math.round((Date.UTC(ty, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 864e5);
        return days > 182 ? days - 365 : days < -182 ? days + 365 : days;
      };
      const earlier = rows.filter((r) => Number(str(r.date).slice(0, 4)) < ty);
      let match: Dashboard["onThisDay"]["match"] = "day";
      let picked = earlier.filter((r) => str(r.date).slice(5) === today.slice(5));
      if (!picked.length) {
        match = "week";
        picked = earlier.filter((r) => Math.abs(away(str(r.date))) <= 3);
      }
      if (!picked.length) match = "none";
      const memories = picked.reverse().slice(0, 6).map((r): Memory => {
        const ph = one("SELECT * FROM photos WHERE page_id = ? ORDER BY position LIMIT 1", str(r.id));
        const photo = ph && toPhoto(ph);
        return {
          bookId: str(r.book_id),
          bookTitle: titles.get(str(r.book_id)) ?? "",
          pageId: str(r.id),
          title: str(r.title),
          date: str(r.date),
          kind: str(r.kind),
          place: { name: str(r.place_name), region: str(r.place_region) },
          years: ty - Number(str(r.date).slice(0, 4)),
          photo: photo ? { url: photo.url, caption: photo.caption } : null,
        };
      });

      return {
        totals: {
          books: titles.size,
          pages: rows.length,
          photos: count("SELECT COUNT(*) n FROM photos ph JOIN members m ON m.book_id = ph.book_id AND m.user_id = ? WHERE ph.page_id IS NOT NULL", userId),
          places: places.length,
          people: count("SELECT COUNT(DISTINCT o.user_id) n FROM members m JOIN members o ON o.book_id = m.book_id WHERE m.user_id = ? AND o.user_id <> ?", userId, userId),
          since: rows.length ? str(rows[0].date) : null,
        },
        places,
        onThisDay: { match, pages: memories },
      };
    },
  };

  /* ---------- The library: the home's pinboard and the top of the bookcase ---------- */

  const BOARD_PHOTO_SQL = `SELECT ph.*, b.title book_title, p.title page_title FROM photos ph
    JOIN members m ON m.book_id = ph.book_id AND m.user_id = ? JOIN books b ON b.id = ph.book_id JOIN pages p ON p.id = ph.page_id`;
  const toBoardPhoto = (r: Row): BoardPhoto => ({
    ...toPhoto(r), bookId: str(r.book_id), bookTitle: str(r.book_title), pageId: str(r.page_id), pageTitle: str(r.page_title),
  });

  const library = {
    get(userId: string): Library {
      const r = one("SELECT room FROM libraries WHERE user_id = ?", userId);
      let room: Room = DEFAULT_ROOM;
      try {
        if (r) room = JSON.parse(str(r.room)) as Room;
        if (!Array.isArray(room.figures)) room = { ...room, figures: room.decor.flatMap((d) => (d.fig ? [d.fig] : [])) };
        if (!Array.isArray(room.magnets)) room = { ...room, magnets: [] };
      } catch {
        // A room that can't be read starts again from the default.
      }
      // A photo leaves the board when its page is deleted or the person leaves its book.
      const photos = room.photos.flatMap((p) => {
        const ph = one(`${BOARD_PHOTO_SQL} WHERE ph.id = ?`, userId, p.id);
        return ph ? [toBoardPhoto(ph)] : [];
      });
      const visible = new Set(photos.map((p) => p.id));
      // A country is earned by a page set there with a photo on it.
      const visits = placesOf(placedPages(userId).filter((r) => Number(r.photos) > 0));
      return { room: { ...room, photos: room.photos.filter((p) => visible.has(p.id)) }, photos, visits };
    },
    save(userId: string, room: Room): Library {
      for (const p of room.photos) {
        if (!one(`${BOARD_PHOTO_SQL} WHERE ph.id = ?`, userId, p.id)) throw new HttpError(400, "One of those photos isn't in any of your books.");
      }
      run(`INSERT INTO libraries (user_id, room, updated_at) VALUES (?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE SET room = excluded.room, updated_at = excluded.updated_at`, userId, JSON.stringify(room), Date.now());
      return library.get(userId);
    },
    /** Every photo on a page in the person's books, newest first, for pinning. */
    photos(userId: string): BoardPhoto[] {
      return all(`${BOARD_PHOTO_SQL} ORDER BY p.date DESC, ph.position LIMIT 600`, userId).map(toBoardPhoto);
    },
  };

  /* ---------- Friends: following someone, and friends who follow each other ---------- */

  // A person as someone else sees them. Pass the viewer's id twice before the query's own arguments.
  const PUBLIC = `u.id, u.name, u.username, u.bio, u.home,
    EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = u.id) AS following,
    EXISTS (SELECT 1 FROM follows f WHERE f.followee_id = ? AND f.follower_id = u.id) AS follows_you`;
  const toPublic = (r: Row): PublicPerson => ({
    id: str(r.id), name: str(r.name), username: str(r.username), bio: str(r.bio), home: str(r.home),
    following: Boolean(r.following), followsYou: Boolean(r.follows_you),
  });

  const social = {
    person(viewerId: string, id: string): PublicPerson | undefined {
      const r = one(`SELECT ${PUBLIC} FROM users u WHERE u.id = ?`, viewerId, viewerId, id);
      return r && toPublic(r);
    },
    /** Returns true when this is a new follow. */
    follow(followerId: string, followeeId: string): boolean {
      if (followerId === followeeId) throw new HttpError(400, "You can't follow yourself.");
      if (!users.get(followeeId)) throw new HttpError(404, "That person isn't on NinRe any more.");
      return Number(run("INSERT OR IGNORE INTO follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)", followerId, followeeId, Date.now()).changes) > 0;
    },
    unfollow(followerId: string, followeeId: string) {
      run("DELETE FROM follows WHERE follower_id = ? AND followee_id = ?", followerId, followeeId);
    },
    areFriends(a: string, b: string): boolean {
      return count("SELECT COUNT(*) n FROM follows WHERE (follower_id = ? AND followee_id = ?) OR (follower_id = ? AND followee_id = ?)", a, b, b, a) === 2;
    },
    /** The people someone follows. */
    following(userId: string): PublicPerson[] {
      return all(`SELECT ${PUBLIC} FROM follows x JOIN users u ON u.id = x.followee_id WHERE x.follower_id = ? ORDER BY u.name COLLATE NOCASE`, userId, userId, userId).map(toPublic);
    },
    /** The people who follow someone. */
    followers(userId: string): PublicPerson[] {
      return all(`SELECT ${PUBLIC} FROM follows x JOIN users u ON u.id = x.follower_id WHERE x.followee_id = ? ORDER BY x.created_at DESC`, userId, userId, userId).map(toPublic);
    },
    /**
     * Finds people by username or name. Someone who turned search off is found only by their exact username,
     * so a friend who knows it can still add them.
     */
    search(viewerId: string, q: string): PublicPerson[] {
      const term = q.trim().replace(/^@/, "").toLowerCase();
      if (term.length < 2) return [];
      const like = term.replace(/[\\%_]/g, (c) => "\\" + c);
      return all(`SELECT ${PUBLIC} FROM users u WHERE u.id <> ? AND (u.username = ?
        OR (COALESCE(json_extract(u.settings, '$.discoverable'), 1) <> 0 AND (u.username LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')))
        ORDER BY u.username = ? DESC, following DESC, follows_you DESC, u.username LIKE ? ESCAPE '\\' DESC, u.name COLLATE NOCASE LIMIT 20`,
      viewerId, viewerId, viewerId, term, `${like}%`, `%${like}%`, term, `${like}%`).map(toPublic);
    },
  };

  /* ---------- Notifications ---------- */

  // The setting that turns each kind off. A request to join a book has none: it waits on an answer.
  const NOTIFY_SETTING: Partial<Record<NotificationKind, NotifyKind>> = { follow: "follows", book_add: "books", join: "joins", page: "pages", note: "notes" };

  const toNotification = (r: Row): Notification => ({
    id: str(r.id),
    kind: (NOTIFICATION_KINDS as readonly string[]).includes(str(r.kind)) ? (r.kind as NotificationKind) : "follow",
    actor: r.actor_id == null ? null : { id: str(r.actor_id), name: str(r.actor_name) },
    actorFollowed: Boolean(r.actor_followed),
    book: r.book_id == null ? null : { id: str(r.book_id), title: str(r.book_title) },
    pageId: r.page_id == null ? null : str(r.page_id),
    text: str(r.text),
    count: Number(r.count),
    state: r.state === "accepted" || r.state === "declined" ? r.state : "",
    read: r.read_at != null,
    createdAt: Number(r.created_at),
  });

  const notifications = {
    /** Leaves a notification for someone, unless it's their own doing or they've turned that kind off. */
    add(userId: string, kind: NotificationKind, n: { actorId?: string | null; bookId?: string | null; pageId?: string | null; text?: string } = {}) {
      if (n.actorId && n.actorId === userId) return;
      const setting = NOTIFY_SETTING[kind];
      if (setting && !users.settings(userId).notify[setting]) return;
      const now = Date.now();
      // Following, unfollowing and following again leaves one notification, not three.
      if (kind === "follow") run("DELETE FROM notifications WHERE user_id = ? AND kind = 'follow' AND actor_id = ?", userId, n.actorId ?? null);
      // Several pages from one person in one book, while unread, read as one: "Mara added 3 pages to Bohol".
      if (kind === "page") {
        const prev = one("SELECT id FROM notifications WHERE user_id = ? AND kind = 'page' AND actor_id = ? AND book_id = ? AND read_at IS NULL", userId, n.actorId ?? null, n.bookId ?? null);
        if (prev) {
          run("UPDATE notifications SET count = count + 1, page_id = ?, text = ?, created_at = ? WHERE id = ?", n.pageId ?? null, (n.text ?? "").slice(0, 120), now, str(prev.id));
          return;
        }
      }
      run("INSERT INTO notifications (id, user_id, kind, actor_id, book_id, page_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        newId("t_"), userId, kind, n.actorId ?? null, n.bookId ?? null, n.pageId ?? null, (n.text ?? "").slice(0, 120), now);
    },
    /** Tells everyone else in the book about a new page. */
    pageAdded(bookId: string, authorId: string, pageId: string, title: string) {
      for (const m of membersOf(bookId)) notifications.add(m.id, "page", { actorId: authorId, bookId, pageId, text: title });
    },
    /** Tells a page's writer about a note left on it. */
    noteAdded(bookId: string, pageId: string, authorId: string, text: string) {
      const p = one("SELECT author_id FROM pages WHERE id = ?", pageId);
      if (p?.author_id != null) notifications.add(str(p.author_id), "note", { actorId: authorId, bookId, pageId, text: text.replace(/\s+/g, " ").slice(0, 80) });
    },
    /** Tells the owner someone joined their book. */
    joined(bookId: string, userId: string) {
      const owner = books.ownerOf(bookId);
      if (owner) notifications.add(owner, "join", { actorId: userId, bookId });
    },
    list(userId: string, limit = 50): Notification[] {
      return all(`SELECT n.*, u.name actor_name, b.title book_title,
          EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = n.user_id AND f.followee_id = n.actor_id) AS actor_followed
        FROM notifications n LEFT JOIN users u ON u.id = n.actor_id LEFT JOIN books b ON b.id = n.book_id
        WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT ?`, userId, limit).map(toNotification);
    },
    unread: (userId: string) => count("SELECT COUNT(*) n FROM notifications WHERE user_id = ? AND read_at IS NULL", userId),
    markAllRead(userId: string) {
      run("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL", Date.now(), userId);
    },
    get(id: string, userId: string) {
      const r = one("SELECT * FROM notifications WHERE id = ? AND user_id = ?", id, userId);
      return r && { kind: str(r.kind), bookId: r.book_id == null ? null : str(r.book_id), actorId: r.actor_id == null ? null : str(r.actor_id), state: str(r.state) };
    },
    answer(id: string, state: "accepted" | "declined") {
      run("UPDATE notifications SET state = ?, read_at = COALESCE(read_at, ?) WHERE id = ?", state, Date.now(), id);
    },
    /** Asks someone to join a book. Asking again just brings the request back to the top. */
    ask(bookId: string, ownerId: string, userId: string) {
      const prev = one("SELECT id FROM notifications WHERE user_id = ? AND kind = 'book_invite' AND book_id = ? AND state = ''", userId, bookId);
      if (prev) run("UPDATE notifications SET actor_id = ?, read_at = NULL, created_at = ? WHERE id = ?", ownerId, Date.now(), str(prev.id));
      else notifications.add(userId, "book_invite", { actorId: ownerId, bookId });
    },
    /** People asked to join a book who haven't answered yet. */
    asked(bookId: string): Person[] {
      return all(`SELECT u.id, u.name FROM notifications n JOIN users u ON u.id = n.user_id
        WHERE n.book_id = ? AND n.kind = 'book_invite' AND n.state = '' ORDER BY n.created_at`, bookId).map((r) => ({ id: str(r.id), name: str(r.name) }));
    },
    cancelAsk(bookId: string, userId: string): boolean {
      return Number(run("DELETE FROM notifications WHERE book_id = ? AND user_id = ? AND kind = 'book_invite' AND state = ''", bookId, userId).changes) > 0;
    },
    /** Read notifications older than this are let go. */
    sweep(olderThanMs: number) {
      run("DELETE FROM notifications WHERE read_at IS NOT NULL AND created_at < ?", Date.now() - olderThanMs);
    },
  };

  /* ---------- Trip plans ---------- */

  const toTrip = (r: Row): Trip => {
    let places: TripPlace[] = [];
    try {
      places = JSON.parse(str(r.places)) as TripPlace[];
    } catch {
      // Places that can't be read are left off rather than losing the trip.
    }
    return {
      id: str(r.id), destination: str(r.destination), start: str(r.start_date), end: str(r.end_date), days: Number(r.days ?? 0), places,
      createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
    };
  };

  const trips = {
    /** The person's trips, the one changed last first. */
    list(userId: string): Trip[] {
      return all("SELECT * FROM trips WHERE user_id = ? ORDER BY updated_at DESC", userId).map(toTrip);
    },
    count(userId: string): number {
      return count("SELECT COUNT(*) n FROM trips WHERE user_id = ?", userId);
    },
    get(userId: string, id: string): Trip {
      const r = one("SELECT * FROM trips WHERE id = ? AND user_id = ?", id, userId);
      if (!r) throw new HttpError(404, "That trip isn't in your plans.");
      return toTrip(r);
    },
    create(userId: string, t: TripInput): Trip {
      const id = newId("t_"), now = Date.now();
      run("INSERT INTO trips (id, user_id, destination, start_date, end_date, days, places, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        id, userId, t.destination, t.start, t.end, t.days, JSON.stringify(t.places), now, now);
      return trips.get(userId, id);
    },
    save(userId: string, id: string, t: TripInput): Trip {
      trips.get(userId, id);
      run("UPDATE trips SET destination = ?, start_date = ?, end_date = ?, days = ?, places = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        t.destination, t.start, t.end, t.days, JSON.stringify(t.places), Date.now(), id, userId);
      return trips.get(userId, id);
    },
    remove(userId: string, id: string) {
      trips.get(userId, id);
      run("DELETE FROM trips WHERE id = ? AND user_id = ?", id, userId);
    },
  };

  return {
    users,
    verification,
    sessions,
    billing,
    books,
    invites,
    pages,
    notes,
    dashboard,
    library,
    social,
    notifications,
    trips,
    close() {
      db.close();
    },
  };
}
