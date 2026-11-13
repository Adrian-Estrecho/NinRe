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

/**
 * Pages the phone apps load from: Capacitor serves the bundled client at localhost (any port, so the app can also be
 * previewed in a desktop browser). Cookies are SameSite=Lax, so a page on localhost never gets the website's session.
 */
export const isAppOrigin = (origin: string) => /^(https?|capacitor):\/\/localhost(:\d+)?$/.test(origin);

/** The phone apps say so on every request; they keep their session token themselves instead of in a cookie. */
const fromApp = (req: Request) => req.get("x-ninre-app") === "1";

function bearer(req: Request): string | undefined {
  const h = req.get("authorization");
  return h?.startsWith("Bearer ") ? h.slice(7).trim() || undefined : undefined;
}

/** What the apps keep after signing in: the token to send, and the key that lets their <img> tags load photos. */
export interface AppSession {
  token: string;
  photoKey: string;
}

/**
 * Email-and-password accounts. A session is a random token; only its hash is stored. The website keeps the token in an
 * HTTP-only cookie. The phone apps get it back in the response and send it as a bearer token, and since an image can't
 * send a header, they load photos with the token's hash as a key: it opens photos and nothing else.
 */
export function createAuth(store: Store) {
  /** Starts a session. For the apps it returns the token and photo key to keep; the website gets a cookie instead. */
  function startSession(req: Request, res: Response, userId: string): AppSession | undefined {
    const token = randomBytes(32).toString("base64url");
    const maxAge = SESSION_DAYS * 864e5;
    store.sessions.create(tokenHash(token), userId, Date.now() + maxAge);
    if (fromApp(req)) return { token, photoKey: tokenHash(token) };
    res.cookie(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: req.secure, maxAge, path: "/" });
    return undefined;
  }

  function currentHash(req: Request): string | undefined {
    const token = bearer(req) ?? readCookie(req, COOKIE);
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

    /** Like requireUser, but also accepts an app's photo key in ?k=, for photo files only. */
    requireViewer: ((req, res, next) => {
      const k = typeof req.query.k === "string" && /^[a-f0-9]{64}$/.test(req.query.k) ? req.query.k : undefined;
      const user = userOf(req) ?? (k ? store.sessions.user(k) : undefined);
      if (!user) return void res.status(401).json({ error: "Log in to continue." });
      res.locals.user = user;
      next();
    }) as RequestHandler,

    endSession(req: Request, res: Response) {
      const h = currentHash(req);
      if (h) store.sessions.remove(h);
      res.clearCookie(COOKIE, { httpOnly: true, sameSite: "lax", secure: req.secure, path: "/" });
    },

    /** Requires a signed-in person who has confirmed their email, and puts them in res.locals.user. */
    requireUser: ((req, res, next) => {
      const user = userOf(req);
      if (!user) return void res.status(401).json({ error: "Log in to continue." });
      if (!user.verified) return void res.status(403).json({ error: "Confirm your email to continue. We sent you a link.", code: "verify" });
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
  // The apps sign requests with a bearer token, which another site can't make a browser attach.
  if (!origin || isAppOrigin(origin)) return next();
  try {
    if (new URL(origin).host === req.headers.host) return next();
  } catch {
    // fall through to the refusal
  }
  res.status(403).json({ error: "That request came from another site." });
};

/** Lets the phone apps, which load from localhost, call the API across origins. Cookies are never involved. */
export const appCors: RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || !isAppOrigin(origin)) return next();
  res.set({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-NinRe-App",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  });
  if (req.method === "OPTIONS") return void res.status(204).end();
  next();
};
