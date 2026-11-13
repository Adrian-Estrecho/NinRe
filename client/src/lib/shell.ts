import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import { navigate } from "../router";
import { tellFrame } from "./frame";
import { appLike, isApp, isNative, platform } from "./native";

/** Screens that are the bottom of the stack: Back from here leaves the app instead of going anywhere. */
const ROOTS = new Set(["/app", "/welcome"]);

/** A screen that sits on its own ground whatever the theme (the blue splash, the white sign-up) sets the icons itself. */
let ground: "dark" | "light" | null = null;

/** The status bar's icons follow the theme: dark icons on the light paper, light ones on the dark. */
export function syncStatusBar() {
  const chosen = document.documentElement.dataset.theme;
  const dark = ground ? ground === "dark" : chosen ? chosen === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  // The desktop phone frame draws its own status bar, and takes its colours from here.
  tellFrame({ kind: "bar", ground: dark ? "dark" : "light" });
  if (isNative) StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {});
}

/** Pins the status bar icons for a screen with its own ground; returns how to let go again. */
export function holdStatusBar(on: "dark" | "light") {
  ground = on;
  syncStatusBar();
  return () => {
    if (ground === on) ground = null;
    syncStatusBar();
  };
}

/** Steps inside a screen (the sign-up questions) that Back walks through before leaving it. The newest one answers first. */
const backSteps: (() => boolean)[] = [];
export function onBack(step: () => boolean) {
  backSteps.push(step);
  return () => {
    const i = backSteps.lastIndexOf(step);
    if (i >= 0) backSteps.splice(i, 1);
  };
}

/** Connects the native shell once, before the app first renders. The website shown as the app gets the app's look and status bar. */
export function startShell() {
  if (!appLike) return;
  document.documentElement.classList.add("in-app", `in-${platform}`);
  syncStatusBar();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncStatusBar);
  new MutationObserver(syncStatusBar).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  // The rest is the real phone's: its Back button, links opened in the app, and the native splash.
  if (!isApp) return;

  // Android's Back button closes what's on top first (a book, a dialog), then a screen's own steps, then steps back through the screens.
  void App.addListener("backButton", ({ canGoBack }) => {
    const open = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")];
    const top = open[open.length - 1];
    if (top) {
      top.dispatchEvent(new Event("cancel", { cancelable: true }));
      return;
    }
    const step = backSteps[backSteps.length - 1];
    if (step?.()) return;
    if (ROOTS.has(location.pathname)) return void App.minimizeApp();
    if (canGoBack) history.back();
    else navigate("/app", { replace: true });
  });

  // Invite links opened on the phone (https://…/join/CODE) land on the join screen.
  void App.addListener("appUrlOpen", ({ url }) => {
    const m = /\/join\/([A-Za-z0-9_-]+)/.exec(url);
    if (m) navigate(`/join/${m[1]}`);
  });

  // The native splash stays up until the first screen (the app's own splash, on the same blue) has drawn.
  requestAnimationFrame(() => requestAnimationFrame(() => void SplashScreen.hide({ fadeOutDuration: 150 }).catch(() => {})));
}
