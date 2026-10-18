import { useEffect, useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from "react";

/* A small history router: the app has a handful of routes and no nested layouts. */

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
window.addEventListener("popstate", notify);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => location.pathname + location.search;

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === snapshot() + location.hash) return;
  if (opts.replace) history.replaceState(null, "", to);
  else history.pushState(null, "", to);
  notify();
  if (!to.includes("#")) window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

/** The current path and query, updated on navigation. */
export function useLocation() {
  const full = useSyncExternalStore(subscribe, snapshot);
  const [path, query = ""] = full.split("?");
  return { path, query: new URLSearchParams(query) };
}

/** Matches a pattern like /app/book/:id against a path. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/").filter(Boolean), b = path.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) out[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return out;
}

/** An <a> that navigates inside the app without reloading. */
export function Link({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  function click(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || rest.target === "_blank") return;
    if (!href.startsWith("/") || href.startsWith("//")) return;
    e.preventDefault();
    if (href.startsWith("/#") && location.pathname === "/") {
      document.getElementById(href.slice(2))?.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", href);
      return;
    }
    navigate(href);
  }
  return <a href={href} onClick={click} {...rest} />;
}

/** Sets the document title while a screen is shown. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · NinRe` : "NinRe: a travel book you write together";
  }, [title]);
}
