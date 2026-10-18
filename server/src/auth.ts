import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type BinaryLike, type ScryptOptions } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Store } from "./db.ts";
import { HttpError, type Role, type User } from "./types.ts";

export const COOKIE = "ninre_session";
const SESSION_DAYS = 60;

const scrypt = (pw: BinaryLike, salt: BinaryLike, len: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scryptCb(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))));
const SCRYPT = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, 64, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [kind, n, r, p, salt, hash] = stored.split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const want = Buffer.from(hash, "base64");
  const got = await scrypt(password.normalize("NFKC"), Buffer.from(salt, "base64"), want.length, { N: Number(n), r: Number(r), p: Number(p) });
  return got.length === want.length && timingSafeEqual(got, want);
}

/** A stored hash to compare against when the email is unknown, so both paths take the same time. */
let decoy: Promise<string> | null = null;
export const decoyHash = () => (decoy ??= hashPassword(randomBytes(12).toString("hex")));

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

function readCookie(req: Request, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/** Counts attempts per key inside a sliding window. */
export function limiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    blocked(key: string): boolean {
      const h = hits.get(key);
      return Boolean(h && h.resetAt > Date.now() && h.count >= max);
    },
    hit(key: string) {
      const now = Date.now();
      const h = hits.get(key);
      const entry = h && h.resetAt > now ? h : { count: 0, resetAt: now + windowMs };
      entry.count++;
      hits.set(key, entry);
      if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    },
    clear(key: string) {
      hits.delete(key);
    },
  };
}

export type Auth = ReturnType<typeof createAuth>;

/** Email-and-password accounts. A session is a random token in an HTTP-only cookie; only its hash is stored. */
export function createAuth(store: Store) {
  function startSession(req: Request, res: Response, userId: string) {
    const token = randomBytes(32).toString("base64url");
    const maxAge = SESSION_DAYS * 864e5;
    store.sessions.create(tokenHash(token), userId, Date.now() + maxAge);
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: req.secure, maxAge, path: "/" });
  }

  function currentHash(req: Request): string | undefined {
    const token = readCookie(req, COOKIE);
    return token ? tokenHash(token) : undefined;
  }

  function userOf(req: Request): User | undefined {
    const h = currentHash(req);
    return h ? store.sessions.user(h) : undefined;
  }

  return {
    startSession,
    currentHash,
    userOf,

    endSession(req: Request, res: Response) {
      const h = currentHash(req);
      if (h) store.sessions.remove(h);
      res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/" });
    },

    /** Requires a signed-in person and puts them in res.locals.user. */
    requireUser: ((req, res, next) => {
      const user = userOf(req);
      if (!user) return void res.status(401).json({ error: "Log in to continue." });
      res.locals.user = user;
      next();
    }) as RequestHandler,
  };
}

export const userOf = (res: Response) => res.locals.user as User;
export const bookIdOf = (res: Response) => res.locals.bookId as string;
export const roleOf = (res: Response) => res.locals.role as Role;

/** Loads the signed-in person's role in the :bookId book. Non-members get a 404, so books stay private. */
export function requireMember(store: Store, need: Role | "any" = "any"): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const bookId = String(req.params.bookId ?? "");
    const role = store.books.role(bookId, userOf(res).id);
    if (!role) return next(new HttpError(404, "That book isn't on your shelf."));
    if (need === "owner" && role !== "owner") return next(new HttpError(403, "Only the book's owner can do that."));
    res.locals.bookId = bookId;
    res.locals.role = role;
    next();
  };
}

/**
 * Refuses state-changing requests sent from another site. The session cookie is SameSite=Lax,
 * so this is a second lock on the same door.
 */
export const sameOrigin: RequestHandler = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  const origin = req.headers.origin;
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch {
    // fall through to the refusal
  }
  res.status(403).json({ error: "That request came from another site." });
};
