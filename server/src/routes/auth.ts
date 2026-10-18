import { Router } from "express";
import { checkPassword, decoyHash, hashPassword, limiter, userOf, type Auth } from "../auth.ts";
import type { Store } from "../db.ts";
import { removeBookFiles } from "../files.ts";
import { HttpError } from "../types.ts";
import { parseEmail, parseName, parseNewPassword } from "../validate.ts";

const TOO_MANY = "Too many tries. Wait a few minutes and try again.";

/** Sign up, log in and out. */
export function authRoutes(store: Store, auth: Auth) {
  const r = Router();
  const logins = limiter(10, 10 * 60 * 1000);
  const signups = limiter(20, 60 * 60 * 1000);

  r.post("/signup", async (req, res) => {
    const ip = req.ip ?? "unknown";
    if (signups.blocked(ip)) throw new HttpError(429, TOO_MANY);
    const name = parseName(req.body?.name);
    const email = parseEmail(req.body?.email);
    const password = parseNewPassword(req.body?.password);
    signups.hit(ip);
    const user = store.users.create(email, name, await hashPassword(password));
    auth.startSession(req, res, user.id);
    res.status(201).json({ user });
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
    auth.startSession(req, res, found.id);
    const { passHash: _, ...user } = found;
    res.json({ user });
  });

  r.post("/logout", (req, res) => {
    auth.endSession(req, res);
    res.json({ ok: true });
  });

  return r;
}

/** The signed-in person's own details. */
export function accountRoutes(store: Store, auth: Auth, uploadsDir: string) {
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
