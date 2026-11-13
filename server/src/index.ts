import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createApp } from "./app.ts";
import { claudeFigureReader } from "./figure.ts";
import { claudeTripPlanner } from "./itinerary.ts";
import { claudePlaceSuggester } from "./trips.ts";
import { logMailer, resendMailer } from "./mailer.ts";
import { paymongo, testPayments } from "./paymongo.ts";

const root = resolve(import.meta.dirname, "../..");
const dataDir = resolve(root, process.env.DATA_DIR || "data");
const port = Number(process.env.PORT) || 4000;
const log = (m: string) => console.error(m);

mkdirSync(dataDir, { recursive: true });

const secretKey = (process.env.PAYMONGO_SECRET_KEY ?? "").trim();
const payments = secretKey
  ? paymongo({
      secretKey,
      webhookSecret: (process.env.PAYMONGO_WEBHOOK_SECRET ?? "").trim(),
      methods: (process.env.PAYMONGO_METHODS || "card,gcash,paymaya").split(",").map((s) => s.trim()).filter(Boolean),
      log,
    })
  : testPayments();

// Confirmation emails go out through Resend when RESEND_API_KEY is set; otherwise their links are printed here.
const resendKey = (process.env.RESEND_API_KEY ?? "").trim();
const mailer = resendKey
  ? resendMailer({ apiKey: resendKey, from: (process.env.MAIL_FROM ?? "").trim() || "NinRe <onboarding@resend.dev>", log })
  : logMailer(log);

// Figures are read off photos by Claude when the server has Anthropic credentials; otherwise they're made by hand.
const hasClaude = Boolean((process.env.ANTHROPIC_API_KEY ?? "").trim());
const figures = hasClaude ? claudeFigureReader(log) : null;
// Places to see on a trip are suggested by Claude too; without it, people add them by hand.
const places = hasClaude ? claudePlaceSuggester(log) : null;
// NinRe AI plans whole trips with Claude as well.
const planner = hasClaude ? claudeTripPlanner(log) : null;

const { app, close } = createApp({
  dataDir,
  payments,
  mailer,
  figures,
  places,
  planner,
  appUrl: (process.env.APP_URL ?? "").trim().replace(/\/+$/, "") || undefined,
  clientDir: join(root, "client", "dist"),
  log,
});

const server = app.listen(port, () => {
  console.log(`NinRe is open on http://localhost:${port}`);
  console.log(`Data folder: ${dataDir}`);
  if (mailer.kind === "log") console.log("No RESEND_API_KEY set, so confirmation emails aren't sent: their links are printed here instead.");
  if (!figures) console.log("No ANTHROPIC_API_KEY set, so bookcase figures can't be made from photos (they can still be made by hand), and trips get no suggested places or NinRe AI plans.");
  if (payments.kind === "test") console.log("No PAYMONGO_SECRET_KEY set, so upgrades use the labelled test checkout and no money moves.");
  else if (!process.env.PAYMONGO_WEBHOOK_SECRET) console.log("PAYMONGO_WEBHOOK_SECRET is empty: payments are confirmed when people return from checkout, but webhooks are refused.");
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already taken by another program, so NinRe's API couldn't start.`);
    console.error(`Stop that program, or set PORT to a free port in .env (the web dev server follows PORT too).`);
  } else {
    console.error(`NinRe's API couldn't start: ${err.message}`);
  }
  process.exit(1);
});

function shutdown() {
  server.close(() => {
    close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
