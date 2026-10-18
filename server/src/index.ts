import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createApp } from "./app.ts";
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

const { app, close } = createApp({
  dataDir,
  payments,
  appUrl: (process.env.APP_URL ?? "").trim().replace(/\/+$/, "") || undefined,
  clientDir: join(root, "client", "dist"),
  log,
});

const server = app.listen(port, () => {
  console.log(`NinRe is open on http://localhost:${port}`);
  console.log(`Data folder: ${dataDir}`);
  if (payments.kind === "test") console.log("No PAYMONGO_SECRET_KEY set, so upgrades use the labelled test checkout and no money moves.");
  else if (!process.env.PAYMONGO_WEBHOOK_SECRET) console.log("PAYMONGO_WEBHOOK_SECRET is empty: payments are confirmed when people return from checkout, but webhooks are refused.");
});

function shutdown() {
  server.close(() => {
    close();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
