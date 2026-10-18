import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorText } from "../api";
import { Avatar } from "../components/Avatar";
import { useToast } from "../components/Toast";
import { fmtStamp, peso, plural } from "../lib/format";
import { navigate, useLocation, useTitle } from "../router";
import { useSession } from "../session";
import type { Billing, PlanId, Plans } from "../types";

const STATUS_POLL_MS = 3000;

/** Plan, payments and the account's own details. */
export function Account() {
  useTitle("Plan & account");
  const { me, refresh, signOut } = useSession();
  const { query } = useLocation();
  const toast = useToast();
  const [plans, setPlans] = useState<Plans | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [pick, setPick] = useState<PlanId>(() => (query.get("upgrade") === "crew" ? "crew" : "plus"));
  const [months, setMonths] = useState(1);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [returned, setReturned] = useState<{ kind: "paid" | "pending" | "cancelled"; text: string } | null>(null);
  const planRef = useRef<HTMLElement>(null);

  const load = useCallback(async () => {
    const [p, b] = await Promise.all([api.plans(), api.billing()]);
    setPlans(p);
    setBilling(b);
    return b;
  }, []);

  useEffect(() => {
    load().catch(() => setPayError("Couldn't load your plan. Check your connection and refresh."));
  }, [load]);

  useEffect(() => {
    if (query.get("upgrade")) planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [query]);

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

  if (!me) return null;
  const b = billing;
  const paid = plans?.plans.filter((p) => p.price > 0) ?? [];
  const chosen = paid.find((p) => p.id === pick);
  const activeLeft = b ? b.paidUntil - Date.now() : 0;
  const running = b && b.plan !== "free" && activeLeft > 0;

  async function checkout() {
    if (!chosen) return;
    setPaying(true);
    setPayError("");
    try {
      const { url } = await api.checkout(chosen.id, months);
      if (url.startsWith("/")) navigate(url);
      else window.location.assign(url);
    } catch (err) {
      setPaying(false);
      setPayError(errorText(err, "Couldn't start the checkout. Try again."));
    }
  }

  return (
    <div className="account">
      <h1 className="app-title">Plan &amp; account</h1>

      {returned && (
        <div className={`notice pay-${returned.kind}`} role="status">
          <b>{returned.kind === "paid" ? "Thank you" : returned.kind === "cancelled" ? "Cancelled" : "Almost there"}</b>
          <span>{returned.text}</span>
          <button type="button" className="btn small line" onClick={() => { setReturned(null); navigate("/app/account", { replace: true }); }}>Dismiss</button>
        </div>
      )}

      <section className="acct-card plan-now" aria-labelledby="plan-h">
        <div>
          <h2 id="plan-h">Your plan: {b?.active.name ?? "…"}</h2>
          <p className="app-sub">
            {!b ? "Loading…" : running
              ? `Paid until ${fmtStamp(b.paidUntil)}. It doesn't renew by itself, so top up before then to keep going.`
              : b.plan !== "free"
                ? `Your ${b.plan === "crew" ? "Crew" : "Plus"} months ended on ${fmtStamp(b.paidUntil)}. Your books are on Free limits until you renew.`
                : "Free: one book for two people. Upgrade any time."}
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

      <section className="acct-card buy" ref={planRef} aria-labelledby="buy-h">
        <h2 id="buy-h">{running ? "Add months or switch plan" : "Upgrade"}</h2>
        <p className="app-sub">
          Prepaid by the month through PayMongo: card, GCash or Maya. Adding months to your current plan extends it. Switching plans starts the new one now, and unused days carry over at the price difference.
        </p>
        {plans?.provider === "test" && (
          <p className="notice test-note"><b>Test mode</b><span>PayMongo isn't connected on this server yet, so checkout is a labelled test and no money moves.</span></p>
        )}
        <div className="buy-grid">
          <fieldset className="buy-plans">
            <legend className="sr-only">Plan</legend>
            {paid.map((p) => (
              <label key={p.id} className={`buy-plan${pick === p.id ? " on" : ""}`}>
                <input type="radio" name="buy-plan" checked={pick === p.id} onChange={() => setPick(p.id)} />
                <span className="buy-name">{p.name}{b?.active.id === p.id && running ? <em>current</em> : null}</span>
                <span className="buy-price"><b>{peso(p.price)}</b> a month</span>
                <span className="buy-lines">{p.books == null ? "Unlimited books" : plural(p.books, "book")} · {p.members} people per book · {p.photos.toLocaleString("en-US")} photos</span>
              </label>
            ))}
          </fieldset>
          <div className="buy-side">
            <fieldset className="dgroup">
              <legend>How many months</legend>
              <div className="chips-row">
                {(plans?.months ?? [1, 6, 12]).map((m) => (
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
            <button type="button" className="btn" onClick={checkout} disabled={!chosen || paying}>
              {paying ? "Opening checkout…" : `Pay for ${chosen?.name ?? "the plan"}`}
            </button>
          </div>
        </div>
      </section>

      {b && b.payments.length > 0 && (
        <section className="acct-card" aria-labelledby="pay-h">
          <h2 id="pay-h">Payments</h2>
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

      <div className="acct-two">
        <Profile />
        <Password />
      </div>

      <DeleteAccount onDeleted={async () => { await signOut(); toast("Your account and the books you owned are deleted."); navigate("/"); }} />
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

function Profile() {
  const { me, refresh } = useSession();
  const toast = useToast();
  const [name, setName] = useState(me?.user.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!me) return null;
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.rename(name);
      await refresh();
      toast("Name saved.");
    } catch (err) {
      setError(errorText(err, "Couldn't save your name."));
    }
    setBusy(false);
  }
  return (
    <form className="acct-card" onSubmit={save} aria-labelledby="prof-h">
      <h2 id="prof-h"><Avatar name={me.user.name} id={me.user.id} size={30} /> You</h2>
      <div className="fld">
        <label htmlFor="p-name">Name</label>
        <input id="p-name" type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <span className="hint">Shown on the pages and notes you write.</span>
      </div>
      <div className="fld">
        <label htmlFor="p-email">Email</label>
        <input id="p-email" type="email" value={me.user.email} readOnly />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div><button type="submit" className="btn line" disabled={busy || !name.trim() || name.trim() === me.user.name}>{busy ? "Saving…" : "Save name"}</button></div>
    </form>
  );
}

function Password() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setError("Use at least 8 characters for the new password.");
    setBusy(true);
    setError("");
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      toast("Password changed. Other devices have been logged out.");
    } catch (err) {
      setError(errorText(err, "Couldn't change the password."));
    }
    setBusy(false);
  }
  return (
    <form className="acct-card" onSubmit={save} aria-labelledby="pw-h">
      <h2 id="pw-h">Password</h2>
      <div className="fld">
        <label htmlFor="pw-cur">Current password</label>
        <input id="pw-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="fld">
        <label htmlFor="pw-new">New password</label>
        <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div><button type="submit" className="btn line" disabled={busy || !current || !next}>{busy ? "Changing…" : "Change password"}</button></div>
    </form>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const { me } = useSession();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!me) return null;
  const owned = me.books.filter((b) => b.role === "owner");
  async function remove(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.deleteAccount(password);
      onDeleted();
    } catch (err) {
      setBusy(false);
      setError(errorText(err, "Couldn't delete the account."));
    }
  }
  return (
    <section className="acct-card danger" aria-labelledby="del-h">
      <h2 id="del-h">Delete account</h2>
      {!open ? (
        <>
          <p className="app-sub">
            {owned.length
              ? `This deletes your account and the ${plural(owned.length, "book")} you own, with every page and photo in them, for everyone in them.`
              : "This deletes your account. Pages you wrote in other people's books stay in those books."}
          </p>
          <div><button type="button" className="btn warn" onClick={() => setOpen(true)}>Delete my account…</button></div>
        </>
      ) : (
        <form onSubmit={remove} className="del-form">
          <div className="fld">
            <label htmlFor="del-pw">Type your password to confirm</label>
            <input id="del-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <div className="panel-foot">
            <button type="button" className="btn line" onClick={() => setOpen(false)} disabled={busy}>Keep my account</button>
            <button type="submit" className="btn warn armed" disabled={busy || !password}>{busy ? "Deleting…" : "Delete for good"}</button>
          </div>
        </form>
      )}
    </section>
  );
}

