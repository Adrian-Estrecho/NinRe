import { useState, type FormEvent } from "react";
import { api, errorText } from "../api";
import { Book3D } from "../book/Book3D";
import { DEFAULT_DESIGN } from "../book/design";
import { createFromPending, readPending } from "../lib/pending";
import { Link, navigate, useLocation, useTitle } from "../router";
import { useSession } from "../session";

/** Sign up and log in, inside the same sky window as the website. */
export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { query } = useLocation();
  const { refresh } = useSession();
  useTitle(mode === "login" ? "Log in" : "Start your book");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = readPending();
  const invite = query.get("invite");
  const plan = query.get("plan");
  const carry = new URLSearchParams([...query.entries()].filter(([k]) => ["invite", "plan", "next"].includes(k))).toString();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    if (mode === "signup" && !name.trim()) return setError("Tell us your name. It goes on the pages you write.");
    if (!email.trim()) return setError("Add your email address.");
    if (mode === "signup" && password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy(true);
    try {
      if (mode === "signup") await api.signup(name.trim(), email.trim(), password);
      else await api.login(email.trim(), password);
      const me = await refresh();
      if (invite) return navigate(`/join/${encodeURIComponent(invite)}`, { replace: true });
      if (plan === "plus" || plan === "crew") return navigate(`/app/account?upgrade=${plan}`, { replace: true });
      const next = query.get("next");
      if (next && /^\/(app|checkout)\//.test(next)) return navigate(next, { replace: true });
      if (me && me.books.length === 0 && (pending || query.get("next") === "new")) {
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

  const heading = mode === "signup" ? (invite ? "Join the book" : "Start your book") : "Welcome back";
  return (
    <div className="daylight auth">
      <div className="sky-backdrop" aria-hidden="true" />
      <div className="window auth-window">
        <img className="window-photo" src="/img/hero.jpg" alt="" decoding="async" />
        <div className="window-shade" aria-hidden="true" />
        <nav className="topnav" aria-label="Main">
          <span />
          <Link href="/" className="wordmark">NinRe</Link>
          <span />
        </nav>

        <div className="auth-grid">
          <div className="auth-show" aria-hidden="true">
            <Book3D design={pending?.design ?? DEFAULT_DESIGN} title={pending?.title || "Our Book of Travels"} subtitle={name.trim() || undefined} width="min(270px, 24vw)" turnable={false} />
            {pending?.design && mode === "signup" && <p className="auth-note">Your cover is ready. It goes on your first book.</p>}
          </div>

          <form className="auth-card" onSubmit={submit} noValidate>
            <h1>{heading}</h1>
            <p className="sub">
              {mode === "signup"
                ? invite ? "Make an account, then you're straight into the book." : "Free for one book and two people. No card needed."
                : "Log in to open your books."}
            </p>
            {mode === "signup" && (
              <div className="fld">
                <label htmlFor="a-name">Your name</label>
                <input id="a-name" type="text" autoComplete="name" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
            )}
            <div className="fld">
              <label htmlFor="a-email">Email</label>
              <input id="a-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus={mode === "login"} />
            </div>
            <div className="fld">
              <label htmlFor="a-pass">Password</label>
              <div className="pass-row">
                <input id="a-pass" type={show ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" className="link-btn" onClick={() => setShow(!show)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
              </div>
              {mode === "signup" && <span className="hint">At least 8 characters.</span>}
            </div>
            {error && <p className="err" role="alert">{error}</p>}
            <button type="submit" className="btn" disabled={busy}>{busy ? (mode === "signup" ? "Making your account…" : "Logging in…") : mode === "signup" ? "Create my account" : "Log in"}</button>
            <p className="switch">
              {mode === "signup" ? "Already have an account? " : "New to NinRe? "}
              <Link href={`/${mode === "signup" ? "login" : "signup"}${carry ? `?${carry}` : ""}`}>{mode === "signup" ? "Log in" : "Start a book, free"}</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
