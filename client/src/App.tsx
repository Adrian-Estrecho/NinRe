import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AppShell } from "./app/AppShell";
import { Home } from "./app/Home";
import { Notifications } from "./app/Notifications";
import { TestCheckout } from "./app/TestCheckout";
import { AuthPage } from "./auth/AuthPage";
import { JoinPage } from "./auth/JoinPage";
import { Onboarding } from "./auth/Onboarding";
import { Splash } from "./auth/Splash";
import { VerifyEmailPage } from "./auth/VerifyEmail";
import { Welcome } from "./auth/Welcome";
import { PhoneFrame } from "./components/PhoneFrame";
import { WIDE, inFrame, isPhoneScreen, tellFrame } from "./lib/frame";
import { appLike, isNative } from "./lib/native";
import { TermsPage } from "./legal/Terms";
import { Destination } from "./plan/Destination";
import { MyTrips, PlanHome, TripPlan } from "./plan/Plan";
import { Landing } from "./marketing/Landing";
import { Link, match, navigate, useLocation, useTitle } from "./router";
import { useSession } from "./session";
import { Settings, isSection } from "./settings/Settings";

/** In the app, a settings section steps back to the list of sections. */
const SETTINGS_BACK = { href: "/app/settings", label: "Settings" };
/** A trip steps back to the list of trips. */
const PLAN_BACK = { href: "/app/plan", label: "Plan" };
const TRIPS_BACK = { href: "/app/trips", label: "My trips" };

/** Whether this page should be drawn as a phone: a phone screen, at the top level of a browser (never a real phone or the frame's own screen). */
const framed = (path: string) => !inFrame && !isNative && isPhoneScreen(path);

/** True on a computer screen with room for the phone frame. */
function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const change = () => setWide(mq.matches);
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, []);
  return wide;
}

/**
 * Sends people who aren't signed in to log in (to the welcome screen, in the app), and brings them back afterwards.
 * Someone signed in who hasn't confirmed their email yet goes to the "check your inbox" screen instead.
 */
function NeedsAccount({ children }: { children: ReactNode }) {
  const { me } = useSession();
  const { path } = useLocation();
  useEffect(() => {
    if (me === null) navigate(`${appLike ? "/welcome" : "/login"}?next=${encodeURIComponent(path)}`, { replace: true });
    else if (me && !me.user.verified) navigate("/verify-email", { replace: true });
  }, [me, path]);
  if (!me || !me.user.verified) return <p className="loading-line">Opening NinRe…</p>;
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

/** The app has no front page: it opens on the library, or on the welcome screen for someone signed out. */
function AppStart() {
  const { me } = useSession();
  useEffect(() => {
    if (me !== undefined) navigate(me ? "/app" : "/welcome", { replace: true });
  }, [me]);
  return null;
}

function NotFound() {
  useTitle("Not found");
  return (
    <div className="lib-empty" style={{ marginTop: 80 }}>
      <h2>There's no page here</h2>
      <p>The link may be mistyped, or the page has moved.</p>
      <Link href="/" className="btn">Go to NinRe</Link>
    </div>
  );
}

export function App() {
  const { path, query } = useLocation();
  const search = query.toString();
  const { me } = useSession();
  // The phone app opens on its splash, which stays until it knows whether someone is signed in.
  const [splash, setSplash] = useState(appLike);
  const splashDone = useCallback(() => setSplash(false), []);
  const wide = useWide();
  let m: Record<string, string> | null;

  // Inside the phone frame, tell it where this screen is, once its title has been set.
  useEffect(() => {
    const t = window.setTimeout(() => tellFrame({ kind: "path", path: location.pathname + location.search, title: document.title }), 0);
    return () => window.clearTimeout(t);
  }, [path, search]);

  // On a computer, the phone screens open in a phone. The page in it is this same app, with the splash.
  if (wide && framed(path)) return <PhoneFrame path={location.pathname + location.search} />;
  // A screen that isn't a phone screen (the website's library, after logging in) opens full size: the frame leaves for it.
  if (inFrame && !isPhoneScreen(path)) return null;
  if (splash) return <Splash ready={me !== undefined} signedIn={Boolean(me)} onDone={splashDone} />;
  if (path === "/") return appLike ? <AppStart /> : <Landing />;
  if (path === "/welcome") return <GuestOnly><Welcome /></GuestOnly>;
  if (path === "/login") return <GuestOnly><AuthPage /></GuestOnly>;
  if (path === "/signup") return <GuestOnly><Onboarding /></GuestOnly>;
  if (path === "/verify-email") return <VerifyEmailPage />;
  if (path === "/terms") return <TermsPage />;
  if ((m = match("/join/:code", path))) return <JoinPage code={m.code} />;
  if ((m = match("/checkout/test/:id", path))) return <NeedsAccount><TestCheckout id={m.id} /></NeedsAccount>;
  // A book is read, written in and designed where it stands in the library, so its address is the library with it open.
  const open = match("/app/book/:id", path) ?? match("/app/book/:id/design", path);
  if (path === "/app" || open) return <NeedsAccount><AppShell full><Home openId={open?.id} designBook={path.endsWith("/design")} /></AppShell></NeedsAccount>;
  // The plan used to live at /app/account; payment returns and upgrade links still arrive there.
  if (path === "/app/account") return <NeedsAccount><AppShell back={SETTINGS_BACK}><Settings section="plan" /></AppShell></NeedsAccount>;
  if (path === "/app/settings") return <NeedsAccount><AppShell><Settings /></AppShell></NeedsAccount>;
  if ((m = match("/app/settings/:section", path)) && isSection(m.section)) return <NeedsAccount><AppShell back={SETTINGS_BACK}><Settings section={m.section} /></AppShell></NeedsAccount>;
  if (path === "/app/notifications") return <NeedsAccount><AppShell><Notifications /></AppShell></NeedsAccount>;
  // Trip plans: where you're going, and the places to see there.
  if (path === "/app/plan") return <NeedsAccount><AppShell><PlanHome /></AppShell></NeedsAccount>;
  if (path === "/app/trips") return <NeedsAccount><AppShell><MyTrips /></AppShell></NeedsAccount>;
  // A ready-made destination: photos, its places on the map, and NinRe AI to plan the days.
  if ((m = match("/app/plan/explore/:id", path))) return <NeedsAccount><AppShell back={PLAN_BACK}><Destination key={m.id} id={m.id} /></AppShell></NeedsAccount>;
  if ((m = match("/app/plan/:id", path))) return <NeedsAccount><AppShell back={TRIPS_BACK}><TripPlan key={m.id} id={m.id} /></AppShell></NeedsAccount>;
  return <NotFound />;
}
