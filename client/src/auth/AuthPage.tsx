import { useEffect, useState, type FormEvent } from "react";
import { api, errorText } from "../api";
import { DEFAULT_DESIGN } from "../book/design";
import { Icon } from "../components/Icon";
import { createFromPending, readPending } from "../lib/pending";
import { holdStatusBar } from "../lib/shell";
import { Link, navigate, useLocation, useTitle } from "../router";
import { useSession } from "../session";
import { BookAside, carryOf, leaveSignIn } from "./Onboarding";

/** Logging in, on the same white page as signing up. New accounts start at /signup (Onboarding). */
export function AuthPage() {
  const { query } = useLocation();
  const { refresh } = useSession();
  useTitle("Log in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = readPending();
  const invite = query.get("invite");
  const plan = query.get("plan");
  const carry = carryOf(query);
  // The top of the screen is the blue backdrop, so the status bar takes light icons.
  useEffect(() => holdStatusBar("dark"), []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (!email.trim()) return setError("Add your email address.");
    if (!password) return setError("Add your password.");
    setBusy(true);
    try {
      await api.login(email.trim(), password);
      const me = await refresh();
      if (invite) return navigate(`/join/${encodeURIComponent(invite)}`, { replace: true });
      if (plan === "plus" || plan === "crew") return navigate(`/app/account?upgrade=${plan}`, { replace: true });
      const next = query.get("next");
      if (next && /^\/(app|checkout)\//.test(next)) return navigate(next, { replace: true });
      if (me && me.books.length === 0 && (pending || next === "new")) {
        const id = await createFromPending();
        await refresh();
        return navigate(`/app/book/${id}?welcome=1`, { replace: true });
      }
      navigate("/app", { replace: true });
    } catch (err) {
      setBusy(false);
      setError(errorText(err, "Couldn't reach NinRe. Check your connection and try again."));
    }
  }

  return (
    <div className="daylight onb onb-login">
      <div className="onb-frame">
        <header className="onb-top">
          <button type="button" className="onb-back" onClick={() => leaveSignIn(carry)} aria-label="Back"><Icon name="back" /></button>
          <Link href="/" className="onb-word">NinRe</Link>
          <span className="onb-skip" aria-hidden="true" />
        </header>
        <form className="login" onSubmit={submit} noValidate>
          <h1>Welcome back</h1>
          <p className="sub">{invite ? "Log in, then you're straight into the book you were invited to." : "Your books are on the shelf, just as you left them."}</p>

          {/* Just the two fields and the button, on one white card over the edge of the blue. */}
          <div className="login-card">
            <div className="login-fld">
              <label htmlFor="li-email">Email</label>
              <div className="login-box">
                <Icon name="mail" className="login-icon" />
                <input id="li-email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="login-fld">
              <label htmlFor="li-pass">Password</label>
              <div className="login-box">
                <Icon name="lock" className="login-icon" />
                <input id="li-pass" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Your password"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="login-show" onClick={() => setShow(!show)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
              </div>
            </div>
            {error && <p className="onb-err" role="alert">{error}</p>}
            <button type="submit" className="btn sun login-go" disabled={busy}>
              {busy ? "Logging in…" : "Log in"}
              {!busy && <Icon name="right" />}
            </button>
          </div>

          <p className="onb-switch">New to NinRe? <Link href={`/signup${carry ? `?${carry}` : ""}`}>Start a book, free</Link></p>
        </form>
      </div>
      <BookAside design={pending?.design ?? DEFAULT_DESIGN} title={pending?.title || "Our Book of Travels"} note="Pick up where you left off" />
    </div>
  );
}
