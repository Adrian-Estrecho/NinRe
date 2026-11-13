import { useEffect, useRef, useState } from "react";
import { api, errorText } from "../api";
import { Icon } from "../components/Icon";
import { holdStatusBar } from "../lib/shell";
import { Link, navigate, useLocation, useTitle } from "../router";
import { useSession } from "../session";

/** How often the waiting screen asks whether the email has been confirmed, besides whenever the screen comes back into view. */
const POLL_MS = 4000;
/** How long before the link can be sent again. */
const RESEND_WAIT_S = 30;

/**
 * "Check your inbox": shown right after signing up, and to anyone who signs in before confirming. It notices by itself
 * when the link is opened (on this phone or any other device) and calls onConfirmed.
 */
export function CheckInbox({ email, emailSent = true, onConfirmed, onBack, onWrongEmail, wrongEmailLabel = "Change it" }: {
  email: string;
  emailSent?: boolean;
  onConfirmed: () => void;
  onBack?: () => void;
  onWrongEmail: () => void;
  wrongEmailLabel?: string;
}) {
  const [sent, setSent] = useState(emailSent);
  const [wait, setWait] = useState(emailSent ? RESEND_WAIT_S : 0);
  const [note, setNote] = useState<{ text: string; bad?: boolean } | null>(emailSent ? null : { text: "We couldn't send the email just now. Send it again.", bad: true });
  const [checking, setChecking] = useState(false);
  const done = useRef(false);
  const told = useRef(onConfirmed);
  told.current = onConfirmed;

  useTitle("Check your inbox");
  useEffect(() => holdStatusBar("dark"), []);

  async function check(byHand = false) {
    if (done.current) return;
    if (byHand) setChecking(true);
    try {
      const me = await api.me();
      if (me.user?.verified) {
        done.current = true;
        return told.current();
      }
      if (byHand) setNote({ text: "Not confirmed yet. Open the link in the email, then come back." });
    } catch {
      if (byHand) setNote({ text: "Couldn't reach NinRe. Check your connection.", bad: true });
    } finally {
      if (byHand) setChecking(false);
    }
  }

  // Asks every few seconds, and straight away when they come back from their email app.
  useEffect(() => {
    const t = window.setInterval(() => void check(), POLL_MS);
    const back = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", back);
    window.addEventListener("focus", back);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", back);
      window.removeEventListener("focus", back);
    };
  }, []);

  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  async function resend() {
    setNote(null);
    try {
      const r = await api.resendVerification();
      if (r.verified) return void check();
      setSent(r.emailSent);
      setWait(RESEND_WAIT_S);
      setNote(r.emailSent ? { text: "Sent again. If it isn't there, look in your spam or promotions folder." } : { text: "We couldn't send the email just now. Try again in a minute.", bad: true });
    } catch (err) {
      setNote({ text: errorText(err, "Couldn't reach NinRe. Check your connection."), bad: true });
    }
  }

  return (
    <div className="daylight onb onb-signup solo">
      <div className="onb-frame">
        <header className="onb-top">
          {onBack ? <button type="button" className="onb-back" onClick={onBack} aria-label="Back to your details"><Icon name="back" /></button> : <span />}
          <span className="onb-word">NinRe</span>
          <span />
        </header>
        <div className="onb-step">
          <div className="onb-body">
            <div className="su-hero">
              <h1>Check your inbox</h1>
              <p className="sub">One tap on the link we sent and you're in.</p>
            </div>
            <div className="su-card su-inbox">
              <span className="su-envelope" aria-hidden="true"><Icon name="mail" /></span>
              <p className="su-inbox-to">{sent ? "We sent a link to" : "The link goes to"}<b>{email}</b></p>
              <p className="su-inbox-how">Open it on this phone or any other device. This screen carries on by itself once you've confirmed.</p>
              <p className="su-waiting" role="status"><span className="su-pulse" aria-hidden="true" />Waiting for you to confirm…</p>
              {note && <p className={note.bad ? "onb-err" : "su-note"} role="alert">{note.text}</p>}
            </div>
          </div>
          <footer className="onb-foot">
            <button type="button" className="btn sun" onClick={() => void check(true)} disabled={checking}>{checking ? "Checking…" : "I've confirmed it"}</button>
            <button type="button" className="onb-skip" onClick={() => void resend()} disabled={wait > 0}>
              {wait > 0 ? `Send it again in ${wait}s` : "Send it again"}
            </button>
            <p className="onb-switch">Wrong email? <button type="button" className="su-linkish" onClick={onWrongEmail}>{wrongEmailLabel}</button></p>
          </footer>
        </div>
      </div>
    </div>
  );
}

/** Each token is spent once: React may run the effect twice in development, so both runs share one request. */
const spent = new Map<string, Promise<{ email: string }>>();

/**
 * /verify-email. With ?token= it's where the link in the email lands: it confirms the address, in whatever browser
 * the link opened. Without one it's the waiting screen for someone signed in who hasn't confirmed yet.
 */
export function VerifyEmailPage() {
  const { query } = useLocation();
  const { me, refresh, signOut } = useSession();
  const token = query.get("token");
  const [state, setState] = useState<{ kind: "checking" } | { kind: "done"; email: string } | { kind: "failed"; text: string }>({ kind: "checking" });

  useEffect(() => {
    if (!token) return;
    if (!spent.has(token)) spent.set(token, api.verifyEmail(token));
    spent.get(token)!.then(
      (r) => {
        setState({ kind: "done", email: r.email });
        void refresh();
      },
      (err) => setState({ kind: "failed", text: errorText(err, "Couldn't reach NinRe. Check your connection and open the link again.") }),
    );
  }, [token]);

  // Without a token: the waiting screen, or straight on if there's nothing to wait for.
  useEffect(() => {
    if (token || me === undefined) return;
    if (me === null) navigate("/login", { replace: true });
    else if (me.user.verified) navigate("/app", { replace: true });
  }, [token, me]);

  if (!token) {
    if (!me || me.user.verified) return <p className="loading-line">Opening NinRe…</p>;
    return (
      <CheckInbox email={me.user.email} onConfirmed={() => void refresh().then(() => navigate("/app", { replace: true }))}
        onWrongEmail={() => void signOut().then(() => navigate("/signup", { replace: true }))} wrongEmailLabel="Sign up again" />
    );
  }

  return <Confirmed state={state} signedIn={Boolean(me)} />;
}

function Confirmed({ state, signedIn }: { state: { kind: "checking" } | { kind: "done"; email: string } | { kind: "failed"; text: string }; signedIn: boolean }) {
  useTitle(state.kind === "done" ? "Email confirmed" : state.kind === "failed" ? "Link didn't work" : "Confirming your email");
  useEffect(() => holdStatusBar("dark"), []);
  return (
    <div className="daylight onb onb-signup solo">
      <div className="onb-frame">
        <header className="onb-top"><span /><Link href="/" className="onb-word">NinRe</Link><span /></header>
        <div className="onb-step">
          <div className="onb-body" aria-live="polite">
            <div className="su-hero">
              <h1>{state.kind === "done" ? "You're confirmed" : state.kind === "failed" ? "That link didn't work" : "Confirming…"}</h1>
              <p className="sub">
                {state.kind === "done" ? "Thanks. Your email is all set." : state.kind === "failed" ? "No harm done. You can get a fresh one." : "Just a moment."}
              </p>
            </div>
            <div className="su-card su-inbox">
              {state.kind === "checking" && <p className="su-waiting" role="status"><span className="su-pulse" aria-hidden="true" />Checking your link…</p>}
              {state.kind === "done" && (
                <>
                  <span className="su-envelope ok" aria-hidden="true"><Icon name="check" /></span>
                  <p className="su-inbox-to">Confirmed<b>{state.email}</b></p>
                  <p className="su-inbox-how">
                    {signedIn ? "Your book is waiting." : "If you signed up in the NinRe app or another tab, go back to it: it carries on by itself. Or log in here."}
                  </p>
                </>
              )}
              {state.kind === "failed" && <p className="su-inbox-how">{state.text}</p>}
            </div>
          </div>
          {state.kind !== "checking" && (
            <footer className="onb-foot">
              {signedIn
                ? <Link href="/app" className="btn sun">{state.kind === "done" ? "Open my book" : "Back to NinRe"}</Link>
                : <Link href="/login" className="btn sun">Log in</Link>}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
