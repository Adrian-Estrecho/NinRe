import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import multer from "multer";
import { createAuth, sameOrigin } from "./auth.ts";
import { openStore } from "./db.ts";
import { BOOK_ID, PHOTO_FILE, bookDir, removeFiles } from "./files.ts";
import { testPayments, type Payments } from "./paymongo.ts";
import { accountRoutes, authRoutes } from "./routes/auth.ts";
import { billingRoutes, planRoutes, webhookRoute } from "./routes/billing.ts";
import { bookRoutes, inviteRoutes } from "./routes/books.ts";
import { HttpError } from "./types.ts";

export interface AppConfig {
  dataDir: string;
  /** Payment provider. Defaults to the labelled test checkout. */
  payments?: Payments;
  /** Public address used in PayMongo return links, e.g. https://ninre.app. Derived from the request when empty. */
  appUrl?: string;
  /** Built web app to serve (client/dist). Skipped when the folder doesn't exist. */
  clientDir?: string;
  log?: (msg: string) => void;
}

const ORPHAN_AGE_MS = 24 * 3600 * 1000;

const securityHeaders: RequestHandler = (_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  });
  next();
};

export function createApp(cfg: AppConfig) {
  const log = cfg.log ?? (() => {});
  const uploadsDir = join(cfg.dataDir, "uploads");
  mkdirSync(uploadsDir, { recursive: true });

  const store = openStore(join(cfg.dataDir, "ninre.sqlite"));
  const auth = createAuth(store);
  const payments = cfg.payments ?? testPayments();
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(securityHeaders);

  // The payment webhook verifies a signature over the raw body, so it comes before the JSON parser.
  app.use("/api/billing/webhook", express.raw({ type: "*/*", limit: "1mb" }), webhookRoute(store, payments, log));

  app.use(express.json({ limit: "256kb" }));
  app.use("/api", sameOrigin);

  app.get("/api/health", (_req, res) => void res.json({ ok: true }));
  app.use("/api/plans", planRoutes(payments));
  app.use("/api/auth", authRoutes(store, auth));
  app.get("/api/me", (req, res) => {
    const user = auth.userOf(req);
    res.set("Cache-Control", "no-store");
    if (!user) return void res.json({ user: null });
    res.json({ user, books: store.books.list(user.id), billing: store.billing.state(user.id) });
  });
  app.use("/api/invites", inviteRoutes(store, auth.userOf, auth.requireUser));
  app.use("/api/account", auth.requireUser, accountRoutes(store, auth, uploadsDir));
  app.use("/api/billing", auth.requireUser, billingRoutes(store, payments, cfg.appUrl));
  app.use("/api/books", auth.requireUser, bookRoutes(store, uploadsDir));
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "No such endpoint.")));

  // Photos are private to the people in each book.
  app.get("/uploads/:bookId/:file", auth.requireUser, (req, res, next) => {
    const bookId = String(req.params.bookId), file = String(req.params.file);
    if (!BOOK_ID.test(bookId) || !PHOTO_FILE.test(file) || !store.books.role(bookId, res.locals.user.id)) return next(new HttpError(404, "Not found."));
    res.sendFile(join(bookDir(uploadsDir, bookId), file), { headers: { "Cache-Control": "private, max-age=31536000, immutable" } }, (err) => {
      if (err) next(new HttpError(404, "Not found."));
    });
  });

  if (cfg.clientDir && existsSync(join(cfg.clientDir, "index.html"))) {
    const index = join(cfg.clientDir, "index.html");
    app.use(express.static(cfg.clientDir, {
      index: false,
      maxAge: "1h",
      setHeaders: (res, path) => {
        if (/[\\/]assets[\\/]/.test(path)) res.set("Cache-Control", "public, max-age=31536000, immutable");
      },
    }));
    app.use((req, res, next) => (req.method === "GET" && !req.path.startsWith("/uploads/") ? res.set("Cache-Control", "no-cache").sendFile(index) : next()));
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) return void res.status(err.status).json({ error: err.message });
    if (err instanceof multer.MulterError) {
      const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return void res.status(status).json({ error: status === 413 ? "That photo is larger than 15 MB." : "The upload was malformed." });
    }
    if (err?.type === "entity.too.large") return void res.status(413).json({ error: "That's too long to save." });
    if (err?.type === "entity.parse.failed") return void res.status(400).json({ error: "The request wasn't valid JSON." });
    if (err?.status === 404 || err?.statusCode === 404) return void res.status(404).json({ error: "Not found." });
    log(`Unexpected error: ${err?.stack ?? err}`);
    res.status(500).json({ error: "Something went wrong on the server." });
  };
  app.use(onError);

  const sweep = () => {
    const byBook = new Map<string, string[]>();
    for (const { bookId, file } of store.pages.sweepOrphans(ORPHAN_AGE_MS)) byBook.set(bookId, [...(byBook.get(bookId) ?? []), file]);
    for (const [bookId, files] of byBook) removeFiles(uploadsDir, bookId, files).catch(() => {});
    store.sessions.sweep();
  };
  sweep();
  const timer = setInterval(sweep, 3600 * 1000);
  timer.unref();

  return {
    app,
    store,
    close() {
      clearInterval(timer);
      store.close();
    },
  };
}
