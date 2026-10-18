import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { ThemeToggle } from "../components/ThemeToggle";
import { fmtStamp } from "../lib/format";
import { Link, navigate, useLocation } from "../router";
import { useSession } from "../session";

const WEEK = 7 * 864e5;

/** The signed-in frame: wordmark, the two places to go, theme, and the account menu. */
export function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { me, signOut } = useSession();
  const { path } = useLocation();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  if (!me) return null;
  const b = me.billing;
  const left = b.paidUntil - Date.now();
  const ending = b.plan !== "free" && left > 0 && left < WEEK;
  const lapsed = b.plan !== "free" && left <= 0;
  const planName = b.plan === "crew" ? "Crew" : "Plus";

  return (
    <div className="app paper-ground">
      <header className="appbar">
        <div className={`appbar-in${wide ? " wide" : ""}`}>
          <Link href="/app" className="app-wordmark">NinRe</Link>
          <nav className="app-nav" aria-label="App">
            <Link href="/app" aria-current={path === "/app" || path.startsWith("/app/book") ? "page" : undefined}>Books</Link>
            <Link href="/app/account" aria-current={path === "/app/account" ? "page" : undefined}>Plan &amp; account</Link>
          </nav>
          <div className="appbar-end">
            <span className={`plan-chip plan-${b.active.id}`}>{b.active.name}</span>
            <ThemeToggle />
            <div className="menu" ref={menuRef}>
              <button type="button" className="menu-btn" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)} aria-label={`Account menu for ${me.user.name}`}>
                <Avatar name={me.user.name} id={me.user.id} size={34} />
              </button>
              {menu && (
                <div className="menu-pop" role="menu">
                  <p className="menu-who"><b>{me.user.name}</b><span>{me.user.email}</span></p>
                  <button type="button" role="menuitem" onClick={() => { setMenu(false); navigate("/app/account"); }}><Icon name="user" />Plan &amp; account</button>
                  <button type="button" role="menuitem" onClick={async () => { setMenu(false); await signOut(); navigate("/"); }}><Icon name="out" />Log out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {(ending || lapsed) && path !== "/app/account" && (
        <div className={`app-main${wide ? " wide" : ""}`}>
          <div className="notice renew" role="status">
            <b>{lapsed ? `${planName} has ended` : `${planName} ends soon`}</b>
            <span>
              {lapsed
                ? `Your paid months ran out on ${fmtStamp(b.paidUntil)}. Everything is still here; adding past the Free limits waits until you renew.`
                : `Your paid months run out on ${fmtStamp(b.paidUntil)}. Plans don't renew by themselves.`}
            </span>
            <Link href="/app/account" className="btn small">Renew</Link>
          </div>
        </div>
      )}

      <main className={`app-main${wide ? " wide" : ""}`}>{children}</main>
    </div>
  );
}
