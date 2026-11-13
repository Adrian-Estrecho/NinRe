import { createHash, randomBytes } from "node:crypto";
import { Router, type Request } from "express";
import { checkPassword, decoyHash, hashPassword, limiter, userOf, type Auth } from "../auth.ts";
import type { Store } from "../db.ts";
import { removeBookFiles } from "../files.ts";
import { confirmationMail, type Mailer } from "../mailer.ts";
import { HttpError, type User } from "../types.ts";
import { parseEmail, parseName, parseNewPassword, parseProfile, parsePublicProfile, parseSettings, parseSignupDetails } from "../validate.ts";

const TOO_MANY = "Too many tries. Wait a few minutes and try again.";
const LINK_HOURS = 24;

export type Confirmations = ReturnType<typeof confirmations>;

/**
 * Sends the link that confirms an email address: to a new account's own address, or to the new address when someone
 * changes theirs. The link opens the website's /verify-email page, which hands the token to POST /api/auth/verify.
 * Returns whether the email went out; when it didn't, the person can ask for it again.
 */
export function confirmations(store: Store, mailer: Mailer, appUrl: string | undefined, log: (m: string) => void) {
  return async function send(req: Request, user: Pick<User, "id" | "name">, email: string): Promise<boolean> {
    const token = randomBytes(32).toString("base64url");
    store.verification.issue(user.id, email, createHash("sha256").update(token).digest("hex"), Date.now() + LINK_HOURS * 3600e3);
    const base = appUrl || `${req.protocol}://${req.get("host")}`;
    try {
      await mailer.send(confirmationMail(email, user.name, `${base}/verify-email?token=${token}`));
      return true;
    } catch (err) {
      log(`Couldn't send the confirmation email: ${(err as Error).message}`);
      return false;
    }
  };
}

/** Sign up, confirm the email, log in and out. */
export function authRoutes(store: Store, auth: Auth, sendConfirmation: Confirmations) {
  const r = Router();
  const logins = limiter(10, 10 * 60 * 1000);
  const signups = limiter(20, 60 * 60 * 1000);
  const verifies = limiter(30, 10 * 60 * 1000);
  const resends = limiter(5, 60 * 60 * 1000);

  r.post("/signup", async (req, res) => {
    const ip = req.ip ?? "unknown";
    if (signups.blocked(ip)) throw new HttpError(429, TOO_MANY);
    const name = parseName(req.body?.name);
    const email = parseEmail(req.body?.email);
    const password = parseNewPassword(req.body?.password);
    const profile = parseProfile(req.body?.profile);
    const details = parseSignupDetails(req.body ?? {});
    signups.hit(ip);
    const user = store.users.create(email, name, await hashPassword(password), profile, details);
    const emailSent = await sendConfirmation(req, user, user.email);
    // The apps get their session back to keep; the website's is in a cookie, and `session` is left out.
    // The account can't do anything but wait for its email to be confirmed until it is.
    res.status(201).json({ user, emailSent, session: auth.startSession(req, res, user.id) });
  });

  /** The link from the email. It needs no session: it's often opened in a different browser from the one that signed up. */
  r.post("/verify", (req, res) => {
    const ip = req.ip ?? "unknown";
    if (verifies.blocked(ip)) throw new HttpError(429, TOO_MANY);
    const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
    const user = /^[A-Za-z0-9_-]{20,100}$/.test(token) ? store.verification.use(createHash("sha256").update(token).digest("hex")) : undefined;
    if (!user) {
      verifies.hit(ip);
      throw new HttpError(400, "This link has expired or was already used. Log in to NinRe and send a new one.");
    }
    res.json({ email: user.email });
  });

  /** Sends the link again, to whoever is signed in and still waiting. */
  r.post("/verify/resend", async (req, res) => {
    const me = auth.userOf(req);
    if (!me) throw new HttpError(401, "Log in to continue.");
    if (me.verified) return void res.json({ emailSent: false, verified: true });
    if (resends.blocked(me.id)) throw new HttpError(429, "We've sent a few already. Wait a while, and check your spam folder.");
    resends.hit(me.id);
    res.json({ emailSent: await sendConfirmation(req, me, me.email), verified: false });
  });

  r.post("/login", async (req, res) => {
    const email = parseEmail(req.body?.email);
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const key = `${req.ip}|${email}`;
    if (logins.blocked(key)) throw new HttpError(429, TOO_MANY);
    const found = store.users.byEmail(email);
    const ok = await checkPassword(password, found?.passHash ?? (await decoyHash()));
    if (!found || !ok) {
      logins.hit(key);
      throw new HttpError(401, "That email and password don't match. Check both and try again.");
    }
    logins.clear(key);
    const session = auth.startSession(req, res, found.id);
    const { passHash: _, ...user } = found;
    res.json({ user, session });
  });

  r.post("/logout", (req, res) => {
    auth.endSession(req, res);
    res.json({ ok: true });
  });

  return r;
}

/** The signed-in person's own details. */
export function accountRoutes(store: Store, auth: Auth, uploadsDir: string, sendConfirmation: Confirmations) {
  const r = Router();
  const checks = limiter(10, 10 * 60 * 1000);

  async function confirm(userId: string, password: unknown) {
    if (checks.blocked(userId)) throw new HttpError(429, TOO_MANY);
    if (typeof password !== "string" || !(await checkPassword(password, store.users.passHash(userId)))) {
      checks.hit(userId);
      throw new HttpError(403, "That isn't your current password.");
    }
  }

  r.put("/", (req, res) => {
    res.json({ user: store.users.rename(userOf(res).id, parseName(req.body?.name)) });
  });

  r.get("/profile", (_req, res) => {
    res.set("Cache-Control", "no-store").json(store.users.profile(userOf(res).id));
  });

  /** Everything the settings screen shows about the account. */
  r.get("/settings", (_req, res) => {
    const me = userOf(res);
    res.set("Cache-Control", "no-store").json({ ...store.users.account(me.id, store.sessions.count(me.id)), pendingEmail: store.verification.pending(me.id) ?? null });
  });

  r.put("/profile", (req, res) => {
    res.json({ user: store.users.saveProfile(userOf(res).id, parsePublicProfile(req.body)) });
  });

  r.put("/settings", (req, res) => {
    res.json(store.users.saveSettings(userOf(res).id, parseSettings(req.body)));
  });

  /**
   * Changing the email: the old address keeps working until the new one is confirmed from the link sent to it, so
   * nobody is locked out by a typo. Answers with the account as it is now and the address waiting for confirmation.
   */
  r.put("/email", async (req, res) => {
    const me = userOf(res);
    const email = parseEmail(req.body?.email);
    await confirm(me.id, req.body?.password);
    if (email === me.email.toLowerCase()) return void res.json({ user: me, pendingEmail: null, emailSent: false });
    const taken = store.users.byEmail(email);
    if (taken?.verified) throw new HttpError(409, "There's already an account with that email.");
    const emailSent = await sendConfirmation(req, me, email);
    res.json({ user: me, pendingEmail: email, emailSent });
  });

  /** Signs out every other phone and browser. */
  r.post("/sessions/others", (req, res) => {
    const me = userOf(res);
    store.sessions.removeOthers(me.id, auth.currentHash(req) ?? "");
    res.json({ sessions: store.sessions.count(me.id) });
  });

  /** A copy of what the person has put into NinRe, as JSON. Photos are listed by address, not included. */
  r.get("/export", (_req, res) => {
    const me = userOf(res);
    const account = store.users.account(me.id, 0);
    const books = store.books.list(me.id).map((b) => store.books.get(b.id, me.id));
    res.set({ "Cache-Control": "no-store", "Content-Disposition": `attachment; filename="ninre-${me.username}.json"` }).json({
      exportedAt: new Date().toISOString(),
      account: { ...account.user, ...store.users.details(me.id), bio: account.bio, home: account.home, travel: account.travel, settings: account.settings },
      following: store.social.following(me.id).map(({ name, username }) => ({ name, username })),
      followers: store.social.followers(me.id).map(({ name, username }) => ({ name, username })),
      payments: store.billing.payments(me.id),
      library: store.library.get(me.id).room,
      books,
    });
  });

  r.put("/password", async (req, res) => {
    const me = userOf(res);
    await confirm(me.id, req.body?.current);
    store.users.setPassword(me.id, await hashPassword(parseNewPassword(req.body?.next)));
    store.sessions.removeOthers(me.id, auth.currentHash(req) ?? "");
    res.json({ ok: true });
  });

  r.delete("/", async (req, res) => {
    const me = userOf(res);
    await confirm(me.id, req.body?.password);
    const owned = store.users.remove(me.id);
    await Promise.all(owned.map((id) => removeBookFiles(uploadsDir, id)));
    auth.endSession(req, res);
    res.status(204).end();
  });

  return r;
}
