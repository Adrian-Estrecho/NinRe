import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { api } from "../api";
import { Avatar } from "../components/Avatar";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { navigate } from "../router";
import { useSession } from "../session";
import { SECTIONS, rememberAccount } from "./Settings";

/** How far the sheet has to be pulled down, or how fast it is flicked (px per ms), before letting go closes it. */
const PULL_TO_CLOSE = 110;
const FLICK = 0.45;

/*
 * The slides. Opening eases off the bottom edge, keeps an even pace and comes to rest slowly, with no overshoot;
 * closing gathers speed as it drops. They run as Web Animations on the transform alone, which the browser hands to
 * the compositor, so they stay smooth even while the page underneath is busy.
 */
// Slow and even: it lifts off gently instead of shooting out, then settles over the last third.
const OPEN = { duration: 900, easing: "cubic-bezier(.3, .2, .1, 1)" };
const CLOSE = { duration: 280, easing: "cubic-bezier(.4, 0, .9, .6)" };
const BELOW = "translate3d(0, 100%, 0)";
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fades the dim behind the dialog; browsers that can't animate ::backdrop just show or drop it. */
function fadeBackdrop(dialog: Element | null, from: number, to: number, timing: KeyframeAnimationOptions) {
  try {
    dialog?.animate([{ opacity: from }, { opacity: to }], { ...timing, pseudoElement: "::backdrop", fill: "forwards" });
  } catch {
    /* no ::backdrop animation here */
  }
}

interface Details {
  friends: number;
  following: number;
  followers: number;
  bio: string;
  home: string;
}

/*
 * What the sheet shows is kept between openings, so the second time it opens already filled in and nothing
 * changes size under the finger. It's fetched again each time in the background.
 */
let cached: { userId: string; details: Details } | null = null;
let loading: Promise<Details> | null = null;

function fetchDetails(): Promise<Details> {
  loading ??= Promise.all([api.friends(), api.accountSettings()])
    .then(([{ following, followers }, a]) => (rememberAccount(a), {
      friends: following.filter((p) => p.followsYou).length,
      following: following.length,
      followers: followers.length,
      bio: a.bio,
      home: a.home,
    }))
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** Starts loading the sheet's details early, as a finger lands on the avatar, so they're usually in by the time it opens. */
export function prefetchProfile(userId: string) {
  void fetchDetails().then((details) => (cached = { userId, details }), () => {});
}

/**
 * The person's own page, a sheet at the bottom of the screen: who they are and how many friends they have at the
 * top, then the way into every setting. It appears and goes at once, with no slide; pulling it down, Escape or a
 * tap outside closes it.
 */
export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { me, signOut } = useSession();
  const userId = me?.user.id ?? "";
  const [details, setDetails] = useState<Details | null>(cached?.userId === userId ? cached.details : null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // The drag runs outside React: the sheet follows the finger every frame without re-rendering.
  const drag = useRef<{ id: number; y0: number; y: number; t: number; v: number } | null>(null);
  // While the sheet is moving, details that arrive wait: filling them in re-lays out the sheet and costs frames.
  const moving = useRef(true);
  const held = useRef<Details | null>(null);
  const closing = useRef(false);

  useEffect(() => {
    let live = true;
    fetchDetails().then((d) => {
      cached = { userId, details: d };
      if (!live) return;
      if (moving.current) held.current = d;
      else setDetails(d);
    }, () => {});
    return () => {
      live = false;
    };
  }, [userId]);

  // Parked below the screen before the first paint, so it never shows in place and then jumps.
  useLayoutEffect(() => {
    if (sheetRef.current) sheetRef.current.style.transform = BELOW;
  }, []);

  /*
   * The slide up starts two frames later, once the sheet has been drawn below the screen. Started in the frame
   * that builds the sheet and opens the dialog, its first frames would be lost to that work and it would jump.
   */
  useEffect(() => {
    // The dim starts now, before the open dialog is first painted, so it never flashes in fully dark.
    fadeBackdrop(sheetRef.current?.parentElement ?? null, 0, 1, reduced() ? { ...OPEN, duration: 0 } : { ...OPEN, duration: OPEN.duration + 40 });
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        const sheet = sheetRef.current;
        if (!sheet) return;
        const timing = reduced() ? { ...OPEN, duration: 0 } : OPEN;
        sheet.style.transform = "";
        const anim = sheet.animate([{ transform: BELOW }, { transform: "translate3d(0, 0, 0)" }], timing);
        anim.finished.then(() => {
          moving.current = false;
          if (held.current) setDetails(held.current);
        }, () => {});
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  if (!me) return null;
  /** Slides down from wherever the sheet is now (part way up, or where a drag left it), then goes. */
  const close = () => {
    const sheet = sheetRef.current;
    if (closing.current) return;
    closing.current = true;
    if (!sheet || reduced()) return onClose();
    const from = getComputedStyle(sheet).transform;
    sheet.getAnimations().forEach((a) => a.cancel());
    sheet.style.transform = "";
    moving.current = true;
    const anim = sheet.animate([{ transform: from === "none" ? "translate3d(0, 0, 0)" : from }, { transform: BELOW }], { ...CLOSE, fill: "forwards" });
    fadeBackdrop(sheet.parentElement, 1, 0, CLOSE);
    anim.finished.then(onClose, onClose);
  };
  // The new screen is put in place first, then the sheet goes, so there's no frame with neither on screen.
  const go = (to: string) => {
    navigate(to);
    close();
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (closing.current || e.button !== 0 || (e.target as HTMLElement).closest("button, a")) return;
    // Grabbing it mid-slide takes over from the slide, right where the sheet is.
    const sheet = sheetRef.current;
    if (sheet?.getAnimations().length) {
      const at = getComputedStyle(sheet).transform;
      sheet.getAnimations().forEach((a) => a.cancel());
      sheet.style.transform = at === "none" ? "" : at;
    }
    drag.current = { id: e.pointerId, y0: e.clientY, y: e.clientY, t: e.timeStamp, v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    sheetRef.current?.classList.add("pulling");
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const sheet = sheetRef.current;
    if (!d || d.id !== e.pointerId || !sheet) return;
    const dt = Math.max(1, e.timeStamp - d.t);
    d.v = d.v * 0.6 + ((e.clientY - d.y) / dt) * 0.4;
    d.y = e.clientY;
    d.t = e.timeStamp;
    const dy = e.clientY - d.y0;
    // Down it follows the finger; up it stays put, so letting go never springs it back.
    const off = Math.max(0, dy);
    sheet.style.transform = `translate3d(0, ${off}px, 0)`;
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const sheet = sheetRef.current;
    if (!d || d.id !== e.pointerId || !sheet) return;
    drag.current = null;
    sheet.classList.remove("pulling");
    const dy = e.clientY - d.y0;
    if (dy > PULL_TO_CLOSE || (dy > 20 && d.v > FLICK)) return close();
    // Not far enough: it glides back up from where it was let go.
    const at = sheet.style.transform;
    sheet.style.transform = "";
    if (at && !reduced()) sheet.animate([{ transform: at }, { transform: "translate3d(0, 0, 0)" }], { duration: 420, easing: OPEN.easing });
    moving.current = false;
    if (held.current) setDetails(held.current);
  };

  const n = (v: number | undefined) => (v === undefined ? "–" : v);
  const where = details?.home ? ` · ${details.home}` : "";

  return (
    <Dialog onRequestClose={(forced) => (forced ? onClose() : close())} labelledBy="me-name">
      <div
        ref={sheetRef}
        className="me-sheet"
      >
        <div className="me-top" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <span className="me-grab" aria-hidden="true" />
          <button type="button" className="me-x" aria-label="Close" onClick={close}><Icon name="close" /></button>
          <div className="me-head">
            <Avatar name={me.user.name} id={me.user.id} size={84} />
            <h2 id="me-name">{me.user.name}</h2>
            <p className="me-handle">@{me.user.username}{where}</p>
            <div className={`me-bio-wrap${details?.bio ? " on" : ""}`}>
              <p className="me-bio">{details?.bio}</p>
            </div>
          </div>
          <div className="me-stats">
            <button type="button" className="me-stat main" onClick={() => go("/app/settings/friends")}>
              <b>{n(details?.friends)}</b><span>{details?.friends === 1 ? "Friend" : "Friends"}</span>
            </button>
            <button type="button" className="me-stat" onClick={() => go("/app/settings/friends")}>
              <b>{n(details?.following)}</b><span>Following</span>
            </button>
            <button type="button" className="me-stat" onClick={() => go("/app/settings/friends")}>
              <b>{n(details?.followers)}</b><span>{details?.followers === 1 ? "Follower" : "Followers"}</span>
            </button>
          </div>
          <button type="button" className="btn line me-edit" onClick={() => go("/app/settings/profile")}><Icon name="user" />Edit profile</button>
        </div>

        <h3 className="me-h">Settings</h3>
        <ul className="me-list">
          {SECTIONS.filter((s) => s.id !== "profile").map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => go(`/app/settings/${s.id}`)}>
                <span className="set-ic"><Icon name={s.icon} /></span>
                <span className="set-lbl"><b>{s.label}</b><span>{s.blurb}</span></span>
                <Icon name="right" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="me-out" onClick={async () => { onClose(); await signOut(); navigate("/"); }}>
          <Icon name="out" />Log out
        </button>
      </div>
    </Dialog>
  );
}
