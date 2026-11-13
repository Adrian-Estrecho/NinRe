import { appLike, isNative } from "./native";

/*
 * NinRe is an app first. On a computer, its phone screens are shown inside a drawn phone (components/PhoneFrame.tsx):
 * the page loads itself in a phone-sized iframe, so every screen lays out, scrolls and taps exactly as it does on a
 * phone. The two talk by postMessage: the screen inside says where it is and how its status bar should look, and the
 * frame keeps the address bar in step, or steps out of the frame when the screen leaves the phone screens.
 */

/** True inside the phone frame: this page is the screen, loaded by NinRe itself one level up. */
export const inFrame = (() => {
  try {
    return window.self !== window.top && window.parent.location.origin === location.origin;
  } catch {
    return false;
  }
})();

/** The full-size website's phone screens: signing up, confirming the email and logging in. Shown as the app, every screen is a phone. */
const PHONE_SCREENS = new Set(["/welcome", "/login", "/signup", "/verify-email"]);
export const isPhoneScreen = (path: string) => (appLike && !isNative) || PHONE_SCREENS.has(path);

/** A computer screen with room for the phone. A real phone or a narrow window shows the screens as they are. */
export const WIDE = "(min-width: 760px) and (min-height: 560px) and (hover: hover)";

export type FrameMessage =
  | { kind: "path"; path: string; title: string }
  | { kind: "bar"; ground: "dark" | "light" };

/** Tells the frame something, if this page is inside one. */
export function tellFrame(msg: FrameMessage) {
  if (inFrame) window.parent.postMessage({ ninre: msg }, location.origin);
}
