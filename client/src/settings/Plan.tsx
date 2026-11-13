import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorText } from "../api";
import { Icon } from "../components/Icon";
import { fmtStamp, peso, plural } from "../lib/format";
import { inFrame } from "../lib/frame";
import { isApp } from "../lib/native";
import { navigate, useLocation } from "../router";
import { useSession } from "../session";
import type { Billing, Plan, PlanId, Plans } from "../types";

const STATUS_POLL_MS = 3000;

/** What each plan holds, as lines on its card. */
const lines = (p: Plan) => [
  p.books == null ? "As many books as you like" : plural(p.books, "book"),
  `${p.members} people in each book`,
  `${p.photos.toLocaleString("en-US")} photos across your books`,
];

/** The plan, what it holds and how much is used, the plans side by side, and payments. */
export function PlanSection() {
  const { refresh } = useSession();
  const { query } = useLocation();
  const [plans, setPlans] = useState<Plans | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [pick, setPick] = useState<PlanId>(() => (query.get("upgrade") === "crew" ? "crew" : "plus"));
  const [months, setMonths] = useState(1);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [returned, setReturned] = useState<{ kind: "paid" | "pending" | "cancelled"; text: string } | null>(null);
  const buyRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    const [p, b] = await Promise.all([api.plans(), api.billing()]);
    setPlans(p);
    setBilling(b);
  }, []);

  useEffect(() => {
    load().catch(() => setPayError("Couldn't load your plan. Check your connection and refresh."));
  }, [load]);

  useEffect(() => {
    if (query.get("upgrade") && plans) buyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [query, plans]);

  // Coming back from checkout: confirm the payment with the provider, and keep checking for a little while.
  const paymentId = query.get("payment");
  const cancelled = query.get("cancelled") === "1";
  useEffect(() => {
    if (!paymentId) return;
    let live = true, tries = 0, timer = 0;
    const check = async () => {
      try {
        const r = await api.syncPayment(paymentId);
        if (!live) return;
        setBilling(r.billing);
        if (r.payment.status === "paid") {
          setReturned({ kind: "paid", text: `Payment received. ${r.billing.active.name} is yours until ${fmtStamp(r.billing.paidUntil)}.` });
          refresh();
          return;
        }
        if (cancelled) return setReturned({ kind: "cancelled", text: "Checkout was cancelled, so nothing was charged." });
        setReturned({ kind: "pending", text: "Waiting for PayMongo to confirm the payment. This usually takes a few seconds." });
        if (++tries < 20) timer = window.setTimeout(check, STATUS_POLL_MS);
        else setReturned({ kind: "pending", text: "PayMongo hasn't confirmed this payment yet. If you paid, it will show up here once it does." });
      } catch (err) {
        if (live) setReturned({ kind: "pending", text: errorText(err, "Couldn't check the payment yet. Refresh in a moment.") });
      }
    };
    check();
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [paymentId, cancelled, refresh]);

  const b = billing;
  const paid = plans?.plans.filter((p) => p.price > 0) ?? [];
  const chosen = paid.find((p) => p.id === pick);
  const running = b && b.plan !== "free" && b.paidUntil - Date.now() > 0;

  async function checkout() {
    if (!chosen) return;
    setPaying(true);
    setPayError("");
    try {
      const { url } = await api.checkout(chosen.id, months);
      if (url.startsWith("/")) navigate(url);
      // Inside the phone frame, the checkout takes the whole tab: a payment page won't open inside another site's frame.
      else (inFrame ? window.top! : window).location.assign(url);
    } catch (err) {
      setPaying(false);
      setPayError(errorText(err, "Couldn't start the checkout. Try again."));
    }
  }

  return (
    <div className="set-stack">
      {returned && (
        <div className={`notice pay-${returned.kind}`} role="status">
          <b>{returned.kind === "paid" ? "Thank you" : returned.kind === "cancelled" ? "Cancelled" : "Almost there"}</b>
          <span>{returned.text}</span>
          <button type="button" className="btn small line" onClick={() => { setReturned(null); navigate("/app/settings/plan", { replace: true }); }}>Dismiss</button>
        </div>
      )}

      <section className="acct-card plan-now" aria-labelledby="plan-h">
        <div>
          <h3 id="plan-h" className="set-sub">Your plan: {b?.active.name ?? "…"}</h3>
          <p className="app-sub">
            {/* The app sells nothing, so it states the plan without asking anyone to buy. */}
            {!b ? "Loading…" : running
              ? `Paid until ${fmtStamp(b.paidUntil)}.${isApp ? "" : " It doesn't renew by itself, so top up before then to keep going."}`
              : b.plan !== "free"
                ? `Your ${b.plan === "crew" ? "Crew" : "Plus"} months ended on ${fmtStamp(b.paidUntil)}. Your books are on Free limits${isApp ? "." : " until you renew."}`
                : isApp ? "Free: one book for two people." : "Free: one book for two people. Upgrade any time."}
          </p>
        </div>
        {b && (
          <dl className="meters">
            <Meter label="Books you own" used={b.usage.books} max={b.active.books} />
            <Meter label="Photos across your books" used={b.usage.photos} max={b.active.photos} />
            <div className="meter"><dt>People per book</dt><dd><b>{b.active.members}</b><span>on {b.active.name}</span></dd></div>
          </dl>
        )}
      </section>

      {!isApp && plans && (
        <section className="acct-card" ref={buyRef} aria-labelledby="buy-h">
          <h3 id="buy-h" className="set-sub">{running ? "Add months or switch plan" : "Plans"}</h3>
          <p className="app-sub">
            Prepaid by the month through PayMongo: card, GCash or Maya. Nothing renews by itself. Adding months to your plan extends it; switching starts the new plan now, and unused days carry over at the price difference.
          </p>
          {plans.provider === "test" && (
            <p className="notice test-note"><b>Test mode</b><span>PayMongo isn't connected on this server yet, so checkout is a labelled test and no money moves.</span></p>
          )}
          <fieldset className="price-grid">
            <legend className="sr-only">Choose a plan</legend>
            {plans.plans.map((p) => {
              const current = b?.active.id === p.id;
              const body = (
                <>
                  <span className="price-name">{p.name}{current && <em>Your plan</em>}</span>
                  <span className="price-amt">{p.price ? <><b>{peso(p.price)}</b> a month</> : <b>Free</b>}</span>
                  <ul>{lines(p).map((l) => <li key={l}><Icon name="check" />{l}</li>)}</ul>
                </>
              );
              return p.price === 0 ? (
                <div key={p.id} className={`price-card plan-${p.id}`}>{body}</div>
              ) : (
                <label key={p.id} className={`price-card plan-${p.id}${pick === p.id ? " on" : ""}`}>
                  <input type="radio" name="buy-plan" checked={pick === p.id} onChange={() => setPick(p.id)} />
                  {body}
                </label>
              );
            })}
          </fieldset>
          <p className="hint">Every plan has the map, notes, friends, notifications and on-this-day. Limits count the books you own; books others own follow their plan.</p>
          <div className="buy-side">
            <fieldset className="dgroup">
              <legend>How many months of {chosen?.name ?? "it"}</legend>
              <div className="chips-row">
                {plans.months.map((m) => (
                  <label key={m} className="pill">
                    <input type="radio" name="buy-months" checked={months === m} onChange={() => setMonths(m)} />
                    <span>{plural(m, "month")}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="buy-total">
              <span>Total today</span>
              <b>{chosen ? peso(chosen.price * months) : "…"}</b>
            </p>
            {payError && <p className="err" role="alert">{payError}</p>}
            <button type="button" className="btn sun" onClick={checkout} disabled={!chosen || paying}>
              {paying ? "Opening checkout…" : `Pay for ${chosen?.name ?? "the plan"}`}
            </button>
          </div>
        </section>
      )}
      {isApp && payError && <p className="err" role="alert">{payError}</p>}

      {!isApp && b && b.payments.length > 0 && (
        <section className="acct-card" aria-labelledby="pay-h">
          <h3 id="pay-h" className="set-sub">Payments</h3>
          <table className="pay-table">
            <thead><tr><th>Date</th><th>Plan</th><th>Months</th><th className="num">Amount</th><th>Status</th></tr></thead>
            <tbody>
              {b.payments.map((p) => (
                <tr key={p.id}>
                  <td>{fmtStamp(p.paidAt ?? p.createdAt)}</td>
                  <td>{p.plan === "crew" ? "Crew" : "Plus"}{p.provider === "test" ? " (test)" : ""}</td>
                  <td className="num">{p.months}</td>
                  <td className="num">{peso(p.amount)}</td>
                  <td><span className={`status-dot ${p.status}`}>{p.status === "paid" ? "Paid" : "Not paid"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Meter({ label, used, max }: { label: string; used: number; max: number | null }) {
  const pct = max == null ? 0 : Math.min(100, (used / Math.max(1, max)) * 100);
  return (
    <div className="meter">
      <dt>{label}</dt>
      <dd>
        <b>{used.toLocaleString("en-US")}</b>
        <span>{max == null ? "no limit" : `of ${max.toLocaleString("en-US")}`}</span>
      </dd>
      {max != null && <span className={`bar${pct >= 100 ? " full" : pct > 85 ? " near" : ""}`} aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>}
    </div>
  );
}
