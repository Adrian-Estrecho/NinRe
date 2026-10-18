import { useEffect, useRef, type ReactNode } from "react";
import { Account } from "./app/Account";
import { AppShell } from "./app/AppShell";
import { BookReader } from "./app/BookReader";
import { Designer } from "./app/Designer";
import { Library } from "./app/Library";
import { TestCheckout } from "./app/TestCheckout";
import { AuthPage } from "./auth/AuthPage";
import { JoinPage } from "./auth/JoinPage";
import { Landing } from "./marketing/Landing";
import { Link, match, navigate, useLocation, useTitle } from "./router";
import { useSession } from "./session";

/** Sends people who aren't signed in to log in, and brings them back afterwards. */
function NeedsAccount({ children }: { children: ReactNode }) {
  const { me } = useSession();
  const { path } = useLocation();
  useEffect(() => {
    if (me === null) navigate(`/login?next=${encodeURIComponent(path)}`, { replace: true });
  }, [me, path]);
  if (!me) return <p className="loading-line">Opening NinRe…</p>;
  return <>{children}</>;
}

/**
 * Sends people who arrive already signed in past the log-in screens.
 * Someone signing in on the page is sent on by the page itself.
 */
function GuestOnly({ children }: { children: ReactNode }) {
  const { me } = useSession();
  const { query } = useLocation();
  const arrivedSignedIn = useRef<boolean | null>(null);
  if (arrivedSignedIn.current === null && me !== undefined) arrivedSignedIn.current = Boolean(me);
  useEffect(() => {
    if (!me || !arrivedSignedIn.current) return;
    const invite = query.get("invite");
    const next = query.get("next");
    navigate(invite ? `/join/${encodeURIComponent(invite)}` : next && next.startsWith("/app") ? next : "/app", { replace: true });
  }, [me, query]);
  if (me === undefined) return <p className="loading-line">Opening NinRe…</p>;
  return <>{children}</>;
}

function NotFound() {
  useTitle("Not found");
  return (
    <div className="lib-empty daylight" style={{ marginTop: 80 }}>
      <h2>There's no page here</h2>
      <p>The link may be mistyped, or the page has moved.</p>
      <Link href="/" className="btn">Go to NinRe</Link>
    </div>
  );
}

export function App() {
  const { path } = useLocation();
  let m: Record<string, string> | null;

  if (path === "/") return <Landing />;
  if (path === "/login") return <GuestOnly><AuthPage mode="login" /></GuestOnly>;
  if (path === "/signup") return <GuestOnly><AuthPage mode="signup" /></GuestOnly>;
  if ((m = match("/join/:code", path))) return <JoinPage code={m.code} />;
  if ((m = match("/checkout/test/:id", path))) return <NeedsAccount><TestCheckout id={m.id} /></NeedsAccount>;
  if (path === "/app") return <NeedsAccount><AppShell><Library /></AppShell></NeedsAccount>;
  if (path === "/app/account") return <NeedsAccount><AppShell><Account /></AppShell></NeedsAccount>;
  if ((m = match("/app/book/:id/design", path))) return <NeedsAccount><AppShell wide><Designer key={m.id} bookId={m.id} /></AppShell></NeedsAccount>;
  if ((m = match("/app/book/:id", path))) return <NeedsAccount><AppShell><BookReader key={m.id} bookId={m.id} /></AppShell></NeedsAccount>;
  return <NotFound />;
}
