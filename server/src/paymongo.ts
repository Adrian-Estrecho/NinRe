import { createHmac, timingSafeEqual } from "node:crypto";
import type { Plan } from "./plans.ts";
import { HttpError } from "./types.ts";

const API = "https://api.paymongo.com/v1";

export interface CheckoutInput {
  paymentId: string;
  plan: Plan;
  months: number;
  successUrl: string;
  cancelUrl: string;
  customer: { name: string; email: string };
}

export interface Payments {
  kind: "paymongo" | "test";
  /** Creates a hosted checkout. Returns the provider's reference and where to send the payer. */
  createCheckout(input: CheckoutInput): Promise<{ ref: string | null; url: string }>;
  /** Asks the provider whether a checkout was paid. */
  isPaid(ref: string): Promise<boolean>;
  /** Checks a webhook's Paymongo-Signature header against the raw body. */
  verifyWebhook(raw: Buffer, header: string | undefined): boolean;
}

/**
 * Payments through PayMongo's hosted Checkout Sessions (cards, GCash, Maya; PHP only).
 * A checkout is a one-off payment, so paid months are prepaid and never renew by themselves.
 */
export function paymongo(opts: { secretKey: string; webhookSecret: string; methods: string[]; log: (m: string) => void }): Payments {
  const headers = {
    Authorization: "Basic " + Buffer.from(opts.secretKey + ":").toString("base64"),
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // PayMongo answers in JSON:API envelopes; only a few fields are read, each checked where used.
  async function call(path: string, init: RequestInit = {}): Promise<any> {
    let res: Response;
    try {
      res = await fetch(API + path, { ...init, headers, signal: AbortSignal.timeout(15000) });
    } catch (err) {
      opts.log(`PayMongo unreachable: ${err}`);
      throw new HttpError(502, "Couldn't reach PayMongo. Try again in a minute.");
    }
    const body: any = await res.json().catch(() => null);
    if (!res.ok) {
      opts.log(`PayMongo ${init.method ?? "GET"} ${path} answered ${res.status}: ${JSON.stringify(body?.errors ?? body)}`);
      throw new HttpError(502, "PayMongo couldn't start the payment. Try again, or contact us if it keeps happening.");
    }
    return body;
  }

  return {
    kind: "paymongo",

    async createCheckout({ paymentId, plan, months, successUrl, cancelUrl, customer }) {
      const body = await call("/checkout_sessions", {
        method: "POST",
        body: JSON.stringify({
          data: {
            attributes: {
              line_items: [{ currency: "PHP", amount: plan.price, name: `NinRe ${plan.name}, 1 month`, quantity: months }],
              payment_method_types: opts.methods,
              success_url: successUrl,
              cancel_url: cancelUrl,
              description: `NinRe ${plan.name} for ${months} month${months === 1 ? "" : "s"}. Prepaid; it doesn't renew by itself.`,
              reference_number: paymentId,
              metadata: { payment_id: paymentId, plan: plan.id, months: String(months) },
              billing: { name: customer.name, email: customer.email },
              send_email_receipt: true,
              show_description: true,
              show_line_items: true,
            },
          },
        }),
      });
      const ref = body?.data?.id, url = body?.data?.attributes?.checkout_url;
      if (typeof ref !== "string" || typeof url !== "string") throw new HttpError(502, "PayMongo's answer was missing the checkout link.");
      return { ref, url };
    },

    async isPaid(ref) {
      const body = await call(`/checkout_sessions/${encodeURIComponent(ref)}`);
      const a = body?.data?.attributes ?? {};
      const payments: unknown[] = Array.isArray(a.payments) ? a.payments : [];
      return payments.some((p) => (p as { attributes?: { status?: string } })?.attributes?.status === "paid")
        || a.payment_intent?.attributes?.status === "succeeded";
    },

    verifyWebhook(raw, header) {
      if (!opts.webhookSecret || !header) return false;
      const parts = new Map(header.split(",").map((kv) => {
        const i = kv.indexOf("=");
        return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()] as const;
      }));
      const t = parts.get("t");
      if (!t) return false;
      const want = Buffer.from(createHmac("sha256", opts.webhookSecret).update(`${t}.${raw.toString("utf8")}`).digest("hex"));
      return [parts.get("te"), parts.get("li")].some((sig) => {
        if (!sig) return false;
        const got = Buffer.from(sig);
        return got.length === want.length && timingSafeEqual(got, want);
      });
    },
  };
}

/** Used when no PayMongo key is configured: a labelled test checkout inside the app. No money moves. */
export function testPayments(): Payments {
  return {
    kind: "test",
    async createCheckout({ paymentId }) {
      return { ref: null, url: `/checkout/test/${paymentId}` };
    },
    async isPaid() {
      return false;
    },
    verifyWebhook() {
      return false;
    },
  };
}
