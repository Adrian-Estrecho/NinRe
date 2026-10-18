import { randomBytes } from "node:crypto";
import { Router, type Request } from "express";
import { userOf } from "../auth.ts";
import type { Store } from "../db.ts";
import type { Payments } from "../paymongo.ts";
import { MONTH_CHOICES, PAID_PLANS, PLANS, isPlanId } from "../plans.ts";
import { HttpError } from "../types.ts";

/** Public: the plans and prices, so the website and the app read the same numbers. */
export function planRoutes(payments: Payments) {
  const r = Router();
  r.get("/", (_req, res) => {
    res.set("Cache-Control", "public, max-age=300").json({
      currency: "PHP",
      provider: payments.kind,
      months: MONTH_CHOICES,
      plans: Object.values(PLANS),
    });
  });
  return r;
}

export function billingRoutes(store: Store, payments: Payments, appUrl: string | undefined) {
  const r = Router();
  const base = (req: Request) => appUrl || `${req.protocol}://${req.get("host")}`;

  function view(userId: string) {
    return { ...store.billing.state(userId), provider: payments.kind, payments: store.billing.payments(userId) };
  }

  r.get("/", (_req, res) => {
    res.set("Cache-Control", "no-store").json(view(userOf(res).id));
  });

  r.post("/checkout", async (req, res) => {
    const me = userOf(res);
    const planId = req.body?.plan, months = Number(req.body?.months);
    if (!isPlanId(planId) || !PAID_PLANS.includes(planId)) throw new HttpError(400, "Pick Plus or Crew.");
    if (!MONTH_CHOICES.includes(months)) throw new HttpError(400, `Pay for ${MONTH_CHOICES.join(", ")} months at a time.`);
    const plan = PLANS[planId];
    const id = "pay_" + randomBytes(9).toString("hex");
    store.billing.createPayment({ id, userId: me.id, plan: planId, months, amount: plan.price * months, provider: payments.kind });
    const back = `${base(req)}/app/account?payment=${id}`;
    const { ref, url } = await payments.createCheckout({
      paymentId: id, plan, months, successUrl: back, cancelUrl: `${back}&cancelled=1`, customer: { name: me.name, email: me.email },
    });
    store.billing.attachCheckout(id, ref ?? id, url);
    res.status(201).json({ id, url });
  });

  r.get("/payments/:id", (req, res) => {
    const p = store.billing.paymentFor(String(req.params.id), userOf(res).id);
    if (!p) throw new HttpError(404, "That payment isn't on your account.");
    const { ref: _, ...payment } = p;
    res.set("Cache-Control", "no-store").json({ payment, plan: PLANS[payment.plan] });
  });

  /** After returning from checkout: ask the provider directly, in case the webhook hasn't arrived yet. */
  r.post("/payments/:id/sync", async (req, res) => {
    const me = userOf(res);
    const p = store.billing.paymentFor(String(req.params.id), me.id);
    if (!p) throw new HttpError(404, "That payment isn't on your account.");
    if (p.status !== "paid" && p.provider === "paymongo" && p.ref && (await payments.isPaid(p.ref))) store.billing.markPaid(p.id);
    res.json({ payment: store.billing.payment(p.id), billing: view(me.id) });
  });

  /** The labelled test checkout used when no PayMongo key is set. */
  r.post("/payments/:id/test-pay", (req, res) => {
    if (payments.kind !== "test") throw new HttpError(404, "Test payments are off because PayMongo is connected.");
    const me = userOf(res);
    const p = store.billing.paymentFor(String(req.params.id), me.id);
    if (!p || p.provider !== "test") throw new HttpError(404, "That payment isn't on your account.");
    store.billing.markPaid(p.id);
    res.json({ payment: store.billing.payment(p.id), billing: view(me.id) });
  });

  return r;
}

/**
 * PayMongo calls this when a checkout is paid. It needs the raw body to check the signature,
 * so it is mounted before the JSON parser.
 */
export function webhookRoute(store: Store, payments: Payments, log: (m: string) => void) {
  const r = Router();
  r.post("/", (req, res) => {
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!payments.verifyWebhook(raw, req.get("paymongo-signature"))) return void res.status(401).json({ error: "Bad signature." });
    let event: { data?: { attributes?: { type?: string; data?: { id?: string; attributes?: { metadata?: { payment_id?: string }; reference_number?: string } } } } };
    try {
      event = JSON.parse(raw.toString("utf8"));
    } catch {
      return void res.status(400).json({ error: "The body wasn't valid JSON." });
    }
    const a = event.data?.attributes;
    if (a?.type === "checkout_session.payment.paid") {
      const session = a.data;
      const id = (session?.id && store.billing.paymentIdByRef(session.id)) || session?.attributes?.metadata?.payment_id || session?.attributes?.reference_number;
      if (id && store.billing.payment(id)) store.billing.markPaid(id);
      else log(`Webhook for an unknown checkout: ${session?.id ?? "no id"}`);
    }
    res.json({ received: true });
  });
  return r;
}
