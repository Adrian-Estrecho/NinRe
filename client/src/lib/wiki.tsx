import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Photos of places, taken from their Wikipedia articles (only freely licensed lead images, which is what
 * Wikipedia's page images give by default).
 *
 * Nothing is fetched for a photo until it scrolls into view (or is about to: a small margin hides the pop-in).
 * Photos that come into view together are looked up in one request; a place whose title isn't an article is
 * searched for instead. Answers are kept for the session, so scrolling back and forth costs nothing.
 */

export interface PhotoAsk {
  /** The Wikipedia article to try first. */
  title: string;
  /** What to search for when the title isn't an article, e.g. "Tegallalang Rice Terraces Ubud". */
  search: string;
}

const API = "https://en.wikipedia.org/w/api.php";
/** How far outside the screen a photo starts loading, so it's usually there by the time it's seen. */
const AHEAD = "120px";
const known = new Map<string, string | null>();
const keyOf = (a: PhotoAsk, size: number) => `${size}|${a.title}`;

type Page = { title: string; thumbnail?: { source: string } };
type Answer = { query?: { pages?: Page[]; normalized?: { from: string; to: string }[]; redirects?: { from: string; to: string }[] } };

async function ask(params: Record<string, string>): Promise<Answer> {
  const q = new URLSearchParams({ action: "query", format: "json", formatversion: "2", origin: "*", ...params });
  const res = await fetch(`${API}?${q}`);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/** Finds photos for places not yet known: by title in batches of 50, then a search for each one left. */
async function lookUp(asks: PhotoAsk[], size: number) {
  const pending = asks.filter((a) => !known.has(keyOf(a, size)));
  // Places whose batch failed (offline, or Wikipedia asking us to slow down) aren't searched one by one, which
  // would only make more requests; they stay unknown and are tried again the next time they're shown.
  const failed = new Set<PhotoAsk>();
  for (let i = 0; i < pending.length; i += 50) {
    const batch = pending.slice(i, i + 50);
    try {
      const out = await ask({ redirects: "1", prop: "pageimages", piprop: "thumbnail", pithumbsize: String(size), titles: batch.map((a) => a.title).join("|") });
      const follow = new Map<string, string>();
      for (const n of [...(out.query?.normalized ?? []), ...(out.query?.redirects ?? [])]) follow.set(n.from, n.to);
      const byTitle = new Map((out.query?.pages ?? []).map((p) => [p.title, p.thumbnail?.source ?? null]));
      for (const a of batch) {
        let t = a.title;
        for (let hops = 0; hops < 3 && follow.has(t); hops++) t = follow.get(t)!;
        const src = byTitle.get(t);
        if (src) known.set(keyOf(a, size), src);
      }
    } catch {
      for (const a of batch) failed.add(a);
    }
  }
  const misses = pending.filter((a) => !known.has(keyOf(a, size)) && !failed.has(a));
  for (let i = 0; i < misses.length; i += 4) {
    await Promise.all(misses.slice(i, i + 4).map(async (a) => {
      try {
        const out = await ask({ generator: "search", gsrsearch: a.search, gsrlimit: "1", prop: "pageimages", piprop: "thumbnail", pithumbsize: String(size) });
        known.set(keyOf(a, size), out.query?.pages?.[0]?.thumbnail?.source ?? null);
      } catch {
        // Left unknown, so it's tried again later.
      }
    }));
  }
}

/* ---------- Asking for one photo: gathered into batches ---------- */

const waiting = new Map<string, { ask: PhotoAsk; size: number; tell: Set<(src: string | null) => void> }>();
let timer = 0;

/** Asks for one place's photo; `tell` hears back once (straight away if it's already known). */
function want(a: PhotoAsk, size: number, tell: (src: string | null) => void): () => void {
  const key = keyOf(a, size);
  if (known.has(key)) {
    tell(known.get(key)!);
    return () => {};
  }
  const entry = waiting.get(key) ?? { ask: a, size, tell: new Set() };
  entry.tell.add(tell);
  waiting.set(key, entry);
  // Photos that scroll in together arrive within a few milliseconds of each other: wait a moment and ask once.
  if (!timer) timer = window.setTimeout(flush, 40);
  return () => entry.tell.delete(tell);
}

async function flush() {
  timer = 0;
  const batch = [...waiting.values()];
  waiting.clear();
  for (const size of new Set(batch.map((e) => e.size))) {
    const group = batch.filter((e) => e.size === size);
    await lookUp(group.map((e) => e.ask), size);
    for (const e of group) {
      // A place with no photo is remembered as null; one whose lookup failed isn't remembered at all.
      const src = known.get(keyOf(e.ask, size)) ?? null;
      for (const tell of e.tell) tell(src);
    }
  }
}

/* ---------- Noticing when something comes into view ---------- */

let watcher: IntersectionObserver | null = null;
const onSeen = new WeakMap<Element, () => void>();

/** Calls `seen` once, the first time the element comes near the screen. */
function watch(el: Element, seen: () => void): () => void {
  if (typeof IntersectionObserver === "undefined") {
    seen();
    return () => {};
  }
  watcher ??= new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      watcher!.unobserve(e.target);
      onSeen.get(e.target)?.();
      onSeen.delete(e.target);
    }
  }, { rootMargin: AHEAD });
  onSeen.set(el, seen);
  watcher.observe(el);
  return () => {
    watcher?.unobserve(el);
    onSeen.delete(el);
  };
}

/**
 * A place's photo, in a box the caller styles. Until the box comes into view nothing is fetched and `fallback`
 * shows; then the photo is looked up and fades in. `children` sit on top (a number badge, say).
 */
export function WikiPhoto({ title, search, size = 500, alt = "", className = "", fallback, children }: PhotoAsk & {
  size?: number; alt?: string; className?: string; fallback?: ReactNode; children?: ReactNode;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => (box.current ? watch(box.current, () => setSeen(true)) : undefined), []);

  useEffect(() => {
    if (!seen) return;
    let live = true;
    const stop = want({ title, search }, size, (s) => live && setSrc(s));
    return () => {
      live = false;
      stop();
    };
  }, [seen, title, search, size]);

  return (
    <span ref={box} className={`wphoto ${className}`}>
      {(!src || !loaded) && fallback}
      {src && <img src={src} alt={alt} decoding="async" className={loaded ? "in" : undefined} onLoad={() => setLoaded(true)} onError={() => setSrc(null)} />}
      {children}
    </span>
  );
}
