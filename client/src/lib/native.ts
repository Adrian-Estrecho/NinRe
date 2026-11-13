import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

/*
 * What changes when NinRe runs as the phone app instead of the website. The app is the same client, bundled inside
 * a Capacitor shell and loaded from localhost, so it calls NinRe's server across origins: it signs requests with a
 * bearer token instead of a cookie, and loads photos with a key in the address, since an <img> can't send a header.
 */

/** True inside the Android or iOS app, or in a desktop browser previewing it (a build with VITE_APP_PREVIEW=1). */
export const isApp = Capacitor.isNativePlatform() || import.meta.env.VITE_APP_PREVIEW === "1";
export const platform = Capacitor.getPlatform();
/** Only inside the real app: the native camera, photo picker and share sheet are there. */
export const isNative = Capacitor.isNativePlatform();
/**
 * The website is shown as the app too: no front page, the splash, then signing in and the library, every screen a
 * phone (drawn in a phone frame on a computer). Signing in by cookie and buying a plan stay the website's own.
 * A build with VITE_SHOW_LANDING=1 brings back the marketing front page and the full-size website.
 */
export const appLike = isApp || import.meta.env.VITE_SHOW_LANDING !== "1";

const trim = (s: string | undefined) => (s ?? "").trim().replace(/\/+$/, "");

/** Where the app finds NinRe's server (set at build time); the website uses its own origin. */
export const API = isApp ? trim(import.meta.env.VITE_API_URL) : "";

/** The public website, for links people share or open in a browser. */
export const SITE = isApp ? trim(import.meta.env.VITE_SITE_URL) || API : location.origin;

export interface AppSession {
  token: string;
  photoKey: string;
}

const KEY = "ninre.session";
let session: AppSession | null = null;

/** Reads the saved session before the app first renders, so it opens signed in. */
export async function loadSession() {
  if (!isApp) return;
  try {
    const { value } = await Preferences.get({ key: KEY });
    const s = value ? JSON.parse(value) : null;
    session = s && typeof s.token === "string" && typeof s.photoKey === "string" ? s : null;
  } catch {
    session = null;
  }
}

export function setSession(s: AppSession | null) {
  session = s;
  void (s ? Preferences.set({ key: KEY, value: JSON.stringify(s) }) : Preferences.remove({ key: KEY })).catch(() => {});
}

/** Headers the app adds to every call: who it is, and its session. */
export function appHeaders(): Record<string, string> {
  if (!isApp) return {};
  return { "X-NinRe-App": "1", ...(session ? { Authorization: `Bearer ${session.token}` } : {}) };
}

/** Points a photo the server returned (/uploads/…) at the server, with the key that lets the app's <img> load it. */
const photoUrl = (url: string) => `${API}${url}${session ? `${url.includes("?") ? "&" : "?"}k=${session.photoKey}` : ""}`;

/** Rewrites every photo address in a response from the server, wherever it sits. */
export function forApp<T>(body: T): T {
  if (!isApp) return body;
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return v.startsWith("/uploads/") ? photoUrl(v) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return walk(body) as T;
}
