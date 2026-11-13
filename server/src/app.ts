import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import multer from "multer";
import { appCors, createAuth, sameOrigin, userOf } from "./auth.ts";
import { openStore } from "./db.ts";
import { isPremiumFigure, parseFigure, type FigureImageType, type FigureReader } from "./figure.ts";
import { BOOK_ID, PHOTO_FILE, bookDir, removeFiles } from "./files.ts";
import { logMailer, type Mailer } from "./mailer.ts";
import { testPayments, type Payments } from "./paymongo.ts";
import { accountRoutes, authRoutes, confirmations } from "./routes/auth.ts";
import { billingRoutes, planRoutes, webhookRoute } from "./routes/billing.ts";
import { bookRoutes, inviteRoutes } from "./routes/books.ts";
import { notificationRoutes, peopleRoutes } from "./routes/social.ts";
import { tripRoutes } from "./routes/trips.ts";
import type { TripPlanner } from "./itinerary.ts";
import type { PlaceSuggester } from "./trips.ts";
import { HttpError } from "./types.ts";
import { isCalendarDate, parseRoom } from "./validate.ts";

export interface AppConfig {
  dataDir: string;
  /** Payment provider. Defaults to the labelled test checkout. */
  payments?: Payments;
  /** Public address used in PayMongo return links and email confirmation links, e.g. https://ninre.app. Derived from the request when empty. */
  appUrl?: string;
  /** Number of proxies in front of the server, so the real visitor's address is used for rate limits. Defaults to 1. */
  trustProxy?: number;
  /** Sends email. Defaults to writing each email to the log instead of sending it. */
  mailer?: Mailer;
  /** Built web app to serve (client/dist). Skipped when the folder doesn't exist. */
  clientDir?: string;
  log?: (msg: string) => void;
  /** Reads a minifigure's look off a photo. Without one, figures can only be made by hand. */
  figures?: FigureReader | null;
  /** Suggests places to see when planning a trip. Without one, places are only added by hand. */
  places?: PlaceSuggester | null;
  /** NinRe AI, which plans whole trips day by day. Without one, trips are planned by hand. */
  planner?: TripPlanner | null;
}

const FIGURE_TYPES: FigureImageType[] = ["image/jpeg", "image/png", "image/webp"];
// The app shrinks photos before sending them; this is well inside what Claude accepts for one image.
const FIGURE_PHOTO_BYTES = 4 * 1024 * 1024;
const FIGURES_PER_DAY = 20;

const ORPHAN_AGE_MS = 24 * 3600 * 1000;
/** Read notifications are kept for three months. */
const NOTIFICATION_KEEP_MS = 90 * 864e5;

const securityHeaders: RequestHandler = (_req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    // On a computer the site shows itself inside a phone frame (an iframe of its own pages); other sites can't frame it.
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": [
      "default-src 'self'",
      // Place photos come from Wikipedia; the plan maps are drawn from OpenFreeMap's tiles in a web worker.
      // Wikipedia hands out photos from more than one host (thumb., upload.), so any of its own are allowed.
      "img-src 'self' data: blob: https://*.wikimedia.org",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "script-src 'self'",
      "connect-src 'self' https://en.wikipedia.org https://tiles.openfreemap.org",
      "worker-src 'self' blob:",
      "frame-ancestors 'self'",
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
  const sendConfirmation = confirmations(store, cfg.mailer ?? logMailer(log), cfg.appUrl, log);
  const app = express();

  app.disable("x-powered-by");
  // How many proxies stand in front: 1 for a single host's proxy, 2 for the website on Vercel in front of Render's.
  app.set("trust proxy", cfg.trustProxy ?? 1);
  app.use(securityHeaders);

  // The payment webhook verifies a signature over the raw body, so it comes before the JSON parser.
  app.use("/api/billing/webhook", express.raw({ type: "*/*", limit: "1mb" }), webhookRoute(store, payments, log));

  app.use(express.json({ limit: "256kb" }));
  app.use(["/api", "/uploads"], appCors);
  app.use("/api", sameOrigin(cfg.appUrl));

  app.get("/api/health", (_req, res) => void res.json({ ok: true }));
  app.use("/api/plans", planRoutes(payments));
  app.use("/api/auth", authRoutes(store, auth, sendConfirmation));
  app.get("/api/me", (req, res) => {
    const user = auth.userOf(req);
    res.set("Cache-Control", "no-store");
    if (!user) return void res.json({ user: null });
    res.json({ user, books: store.books.list(user.id), billing: store.billing.state(user.id) });
  });
  app.get("/api/dashboard", auth.requireUser, (req, res) => {
    const today = String(req.query.today ?? "");
    res.set("Cache-Control", "no-store").json(store.dashboard.get(userOf(res).id, isCalendarDate(today) ? today : new Date().toISOString().slice(0, 10)));
  });
  app.get("/api/library", auth.requireUser, (_req, res) => void res.set("Cache-Control", "no-store").json(store.library.get(userOf(res).id)));
  app.put("/api/library", auth.requireUser, (req, res) => {
    const id = userOf(res).id;
    const room = parseRoom(req.body);
    if (store.billing.activePlan(id).id === "free") {
      // Stylish figures need Plus or Crew. One already on the bookcase stays as it is after a subscription ends;
      // only a new or changed one is refused.
      const had = store.library.get(id).room;
      const kept = new Set([...had.decor.flatMap((d) => (d.fig ? [d.fig] : [])), ...had.figures].map((f) => JSON.stringify(parseFigure(f))));
      const all = [...room.decor.flatMap((d) => (d.fig ? [d.fig] : [])), ...room.figures];
      if (all.some((f) => isPremiumFigure(f) && !kept.has(JSON.stringify(f)))) {
        throw new HttpError(402, "Stylish outfits, hats and accessories for figures come with Plus and Crew.");
      }
    }
    res.json(store.library.save(id, room));
  });
  app.get("/api/library/photos", auth.requireUser, (_req, res) => void res.set("Cache-Control", "no-store").json(store.library.photos(userOf(res).id)));

  // A figure read off a photo. The photo stays in memory for the one request and is never saved.
  const figureUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: FIGURE_PHOTO_BYTES, files: 1, fields: 0 },
    fileFilter: (_req, file, cb) => (FIGURE_TYPES.includes(file.mimetype as FigureImageType) ? cb(null, true) : cb(new HttpError(415, "Use a JPG, PNG or WebP photo."))),
  });
  const figuresMade = new Map<string, { day: string; n: number }>();
  app.get("/api/figure", auth.requireUser, (_req, res) => void res.json({ fromPhoto: Boolean(cfg.figures) }));
  app.post("/api/figure", auth.requireUser, (req, res, next) => {
    if (!cfg.figures) return next(new HttpError(503, "Making figures from photos isn't set up on this server. You can still make one by hand."));
    const day = new Date().toISOString().slice(0, 10), id = userOf(res).id;
    const used = figuresMade.get(id);
    if (used && used.day === day && used.n >= FIGURES_PER_DAY) return next(new HttpError(429, `You can make ${FIGURES_PER_DAY} figures from photos a day. Try again tomorrow, or make one by hand.`));
    figureUpload.single("photo")(req, res, (err?: unknown) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") return next(new HttpError(413, "That photo is too large: use one under 4 MB."));
      next(err);
    });
  }, async (req, res) => {
    const f = req.file;
    if (!f) throw new HttpError(400, "Attach a photo in the `photo` field.");
    const fig = await cfg.figures!.read(f.buffer, f.mimetype as FigureImageType);
    if (!fig) throw new HttpError(422, "There's no one clear enough in that photo. Try one where a person is easy to see.");
    const day = new Date().toISOString().slice(0, 10), id = userOf(res).id;
    const used = figuresMade.get(id);
    figuresMade.set(id, { day, n: used && used.day === day ? used.n + 1 : 1 });
    res.json(fig);
  });
  app.use("/api/invites", inviteRoutes(store, auth.userOf, auth.requireUser));
  app.use("/api/account", auth.requireUser, accountRoutes(store, auth, uploadsDir, sendConfirmation));
  app.use("/api/billing", auth.requireUser, billingRoutes(store, payments, cfg.appUrl));
  app.use("/api/books", auth.requireUser, bookRoutes(store, uploadsDir));
  app.use("/api/people", auth.requireUser, peopleRoutes(store));
  app.use("/api/notifications", auth.requireUser, notificationRoutes(store));
  app.use("/api/trips", auth.requireUser, tripRoutes(store, cfg.places ?? null, cfg.planner ?? null));
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "No such endpoint.")));

  // Photos are private to the people in each book.
  app.get("/uploads/:bookId/:file", auth.requireViewer, (req, res, next) => {
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
    store.notifications.sweep(NOTIFICATION_KEEP_MS);
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
