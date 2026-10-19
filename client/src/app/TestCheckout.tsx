import { useEffect, useState } from "react";
import { api, errorText } from "../api";
import { fmtStamp, peso, plural } from "../lib/format";
import { Link, navigate, useTitle } from "../router";
import type { Payment, Plan } from "../types";

/** Stands in for PayMongo's hosted checkout while no key is configured. No money moves. */
export function TestCheckout({ id }: { id: string }) {
  useTitle("Test checkout");
  const [data, setData] = useState<{ payment: Payment; plan: Plan } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.payment(id).then(setData, (err) => setError(errorText(err, "Couldn't open this checkout.")));
  }, [id]);

  async function pay() {
    setBusy(true);
    setError("");
    try {
      await api.testPay(id);
      navigate(`/app/account?payment=${encodeURIComponent(id)}`, { replace: true });
    } catch (err) {
      setBusy(false);
      setError(errorText(err, "Couldn't complete the test payment."));
    }
  }

  return (
    <div className="daylight auth">
      <div className="auth-window">
        <div className="receipt">
          <span className="test-flag">Test checkout</span>
          <h1>NinRe {data?.plan.name ?? ""}</h1>
          <p className="sub" style={{ margin: 0, color: "#4a5762" }}>PayMongo isn't connected on this server yet, so this page stands in for it. No card is asked for and no money moves.</p>
          {data && (
            <dl>
              <dt>Plan</dt><dd>{data.plan.name}</dd>
              <dt>Length</dt><dd>{plural(data.payment.months, "month")}</dd>
              <dt>Price a month</dt><dd>{peso(data.plan.price)}</dd>
              <dt className="total">Total</dt><dd className="total">{peso(data.payment.amount)}</dd>
            </dl>
          )}
          {data?.payment.status === "paid" && <p className="notice"><b>Paid</b><span>This checkout was paid on {fmtStamp(data.payment.paidAt ?? Date.now())}.</span></p>}
          {error && <p className="err" role="alert">{error}</p>}
          {data && data.payment.status !== "paid" && (
            <button type="button" className="btn" onClick={pay} disabled={busy}>{busy ? "Paying…" : `Pay ${peso(data.payment.amount)} (test)`}</button>
          )}
          <Link href={`/app/account${data ? `?payment=${encodeURIComponent(id)}&cancelled=1` : ""}`} className="btn line">Back to your plan</Link>
        </div>
      </div>
    </div>
  );
}
