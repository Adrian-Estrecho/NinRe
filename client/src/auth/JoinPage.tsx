import { useEffect, useState } from "react";
import { ApiError, api, errorText } from "../api";
import { Book3D } from "../book/Book3D";
import { normalizeDesign } from "../book/design";
import { Link, navigate, useTitle } from "../router";
import { useSession } from "../session";
import type { InvitePreview } from "../types";

const names = (list: string[]) => (list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);

/** Where an invite link lands: see the book, then join it. */
export function JoinPage({ code }: { code: string }) {
  const { me, refresh } = useSession();
  const [inv, setInv] = useState<InvitePreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useTitle(inv ? `Join ${inv.book.title}` : "Join a book");

  useEffect(() => {
    api.invite(code).then(setInv, (err) => setError(errorText(err, "Couldn't open this invite. Check your connection and try again.")));
  }, [code, me?.user.id]);

  async function join() {
    setBusy(true);
    setError("");
    try {
      const { bookId } = await api.acceptInvite(code);
      await refresh();
      navigate(`/app/book/${bookId}?joined=1`, { replace: true });
    } catch (err) {
      setBusy(false);
      setError(err instanceof ApiError && err.status === 402 ? err.message : errorText(err, "Couldn't join the book. Try again."));
    }
  }

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
          <div className="auth-show">
            {inv && <Book3D design={normalizeDesign(inv.book.design)} title={inv.book.title} subtitle={inv.book.subtitle || names(inv.book.members)} width="min(270px, 24vw)" />}
          </div>
          <div className="auth-card">
            {!inv && !error && <p className="sub">Opening the invite…</p>}
            {!inv && error && (
              <>
                <h1>This link has closed</h1>
                <p className="sub">{error}</p>
                <Link href={me ? "/app" : "/"} className="btn line">{me ? "Back to your books" : "Go to NinRe"}</Link>
              </>
            )}
            {inv && (
              <>
                <h1>{inv.inviter ? `${inv.inviter} invited you` : "You're invited"}</h1>
                <p className="sub">
                  Write in <b>{inv.book.title}</b> with {names(inv.book.members)}. Everyone in the book adds pages, photos and notes.
                </p>
                {error && <p className="err" role="alert">{error}</p>}
                {inv.member ? (
                  <Link href={`/app/book/${inv.bookId}`} className="btn">Open the book</Link>
                ) : inv.full ? (
                  <p className="notice"><b>Full</b><span>This book has as many people as its owner's plan allows. Ask {inv.inviter || "them"} to upgrade, then open this link again.</span></p>
                ) : me ? (
                  <button type="button" className="btn" onClick={join} disabled={busy}>{busy ? "Joining…" : `Join as ${me.user.name}`}</button>
                ) : (
                  <div className="join-actions">
                    <Link href={`/signup?invite=${encodeURIComponent(code)}`} className="btn">Sign up to join</Link>
                    <Link href={`/login?invite=${encodeURIComponent(code)}`} className="btn line">I have an account</Link>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
