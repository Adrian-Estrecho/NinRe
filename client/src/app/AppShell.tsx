import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { ThemeToggle } from "../components/ThemeToggle";
import { fmtStamp } from "../lib/format";
import { appLike, isApp } from "../lib/native";
import { refreshUnread, useUnread } from "../lib/unread";
import { Link, useLocation } from "../router";
import { useSession } from "../session";
import { ProfileSheet, prefetchProfile } from "../settings/ProfileSheet";

const WEEK = 7 * 864e5;
const UNREAD_POLL_MS = 60_000;

/**
 * The signed-in frame: a glass bar with the wordmark, the places to go centred, then the plan, theme and account menu.
 * `full` hands the whole screen to the page, with the bar floating over it.
 */
export function AppShell({ children, wide, full, back }: { children: ReactNode; wide?: boolean; full?: boolean; back?: { href: string; label: string } }) {
  const { me } = useSession();
  const { path } = useLocation();
  const [sheet, setSheet] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);
  const unread = useUnread();
  const signedIn = Boolean(me);

  // The bell's count: checked on every screen change, every minute, and when the app comes back to the front.
  useEffect(() => {
    if (signedIn) void refreshUnread();
  }, [signedIn, path]);
  useEffect(() => {
    if (!signedIn) return;
    const tick = () => document.visibilityState === "visible" && void refreshUnread();
    const timer = window.setInterval(tick, UNREAD_POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [signedIn]);

  if (!me) return null;
  const onPlan = path === "/app/account" || path === "/app/settings/plan";
  const atLibrary = path === "/app";
  // The Plan tab: finding where to go (not the subscription plan, which lives in settings).
  const planTab = path === "/app/plan" || path.startsWith("/app/plan/explore/");
  // My trips: the trips themselves, each open at /app/plan/:id.
  const tripsTab = path === "/app/trips" || (path.startsWith("/app/plan/") && !planTab);
  const inSettings = path === "/app/account" || path.startsWith("/app/settings");
  const b = me.billing;
  const left = b.paidUntil - Date.now();
  const ending = b.plan !== "free" && left > 0 && left < WEEK;
  const lapsed = b.plan !== "free" && left <= 0;
  const planName = b.plan === "crew" ? "Crew" : "Plus";

  return (
    <div className={`app paper-ground${full ? " full" : ""}`}>
      <header className="appbar">
        <div className={`appbar-in${wide ? " wide" : ""}${full ? " full" : ""}`}>
          {/* The app is a stack of screens: away from the library, the corner takes you back to it. */}
          {appLike && path !== "/app" && path !== "/app/plan" && path !== "/app/trips" && !path.startsWith("/app/book") ? (
            <Link href={back?.href ?? "/app"} className="app-back"><Icon name="left" />{back?.label ?? "Library"}</Link>
          ) : (
            <Link href="/app" className="app-wordmark">NinRe</Link>
          )}
          {!appLike && <nav className="app-nav" aria-label="App">
            <Link href="/app" aria-current={path === "/app" || path.startsWith("/app/book") ? "page" : undefined}>Home</Link>
            <Link href="/app/settings/friends" aria-current={path === "/app/settings/friends" ? "page" : undefined}>Friends</Link>
            <Link href="/app/settings" aria-current={inSettings && path !== "/app/settings/friends" ? "page" : undefined}>Settings</Link>
          </nav>}
          <div className="appbar-end">
            <Link href="/app/settings/plan" className={`plan-chip plan-${b.active.id}`} aria-label={`${b.active.name} plan`}>{b.active.name}</Link>
            <ThemeToggle />
            <Link href="/app/notifications" className={`btn line icon small bell${unread ? " has-new" : ""}`} aria-current={path === "/app/notifications" ? "page" : undefined}
              aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} title="Notifications">
              <Icon name="bell" />
              {unread > 0 && <span className="bell-n" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
            </Link>
            {/* Your face opens your profile, sliding up from the bottom, with every setting under it. */}
            <div className="menu">
              <button type="button" className="menu-btn" aria-haspopup="dialog" aria-expanded={sheet} onPointerDown={() => prefetchProfile(me.user.id)} onClick={() => setSheet(true)} aria-label={`Your profile, ${me.user.name}`}>
                <Avatar name={me.user.name} id={me.user.id} size={34} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {(ending || lapsed) && !isApp && !onPlan && (
        <div className={`app-main${wide ? " wide" : ""}`}>
          <div className="notice renew" role="status">
            <b>{lapsed ? `${planName} has ended` : `${planName} ends soon`}</b>
            <span>
              {lapsed
                ? `Your paid months ran out on ${fmtStamp(b.paidUntil)}. Everything is still here; adding past the Free limits waits until you renew.`
                : `Your paid months run out on ${fmtStamp(b.paidUntil)}. Plans don't renew by themselves.`}
            </span>
            <Link href="/app/settings/plan" className="btn small sun">Renew</Link>
          </div>
        </div>
      )}

      <main className={`app-main${wide ? " wide" : ""}${full ? " full" : ""}`}>{children}</main>
      {/* The places to be: finding where to go, your trips, and your library. Out of the way while a book is open. */}
      {(atLibrary || planTab || tripsTab) && (
        <nav className="tabbar" aria-label="Main">
          <Link href="/app/plan" aria-current={planTab ? "page" : undefined}><Icon name="globe" /><span>Plan</span></Link>
          <Link href="/app/trips" aria-current={tripsTab ? "page" : undefined}><Icon name="plane" /><span>My trips</span></Link>
          <Link href="/app" aria-current={atLibrary ? "page" : undefined}><Icon name="shelf" /><span>My library</span></Link>
        </nav>
      )}
      {sheet && <ProfileSheet onClose={closeSheet} />}
    </div>
  );
}
