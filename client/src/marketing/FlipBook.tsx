import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { CoverFace } from "../book/CoverFace";
import { bookStyle, type Design } from "../book/design";
import { Icon } from "../components/Icon";
import { Stamp } from "../components/Stamp";
import { MONTHS, coordsText, fmtShort, jitter, parseDate } from "../lib/format";
import type { NumberedPage } from "../types";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

interface Props {
  design: Design;
  title: string;
  people: string;
  pages: NumberedPage[];
  onRead: (id: string) => void;
  onStart: () => void;
  className?: string;
}

interface Spread {
  label: string;
  left: ReactNode;
  right: ReactNode;
}

const calm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The sample book on the desk. It opens on its spine and its pages turn: drag a page across, tap either side,
 * or use the arrow keys. Every leaf is a real sheet with a front and a back, so what you see while a page is
 * in the air is the page you're about to read.
 */
export function FlipBook({ design, title, people, pages, onRead, onStart, className = "" }: Props) {
  const [at, setAt] = useState(0);
  const [move, setMove] = useState({ from: 0, to: 0 });
  const [drag, setDrag] = useState<{ leaf: number; a: number } | null>(null);
  const [peek, setPeek] = useState<"l" | "r" | null>(null);
  const grip = useRef<{ x: number; y: number; id: number; leaf: number; fwd: boolean; on: boolean; t: number } | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  const first = pages[0];
  const since = first ? `${MONTHS[parseDate(first.date).getMonth()]} ${parseDate(first.date).getFullYear()}` : "";

  const spreads: Spread[] = [
    {
      label: "Title page",
      left: <Endpaper people={people} />,
      right: (
        <div className="fb-page fb-titlepage">
          <span className="chip-sample">Sample book</span>
          <h3 className="fb-t-title">{title}</h3>
          <p className="fb-t-by">{people}</p>
          <p className="fb-t-since">Since {since}</p>
          <ol className="fb-toc" aria-label="Contents">
            {pages.map((p, i) => (
              <li key={p.id}>
                <button type="button" onClick={() => go(i + 2)}>
                  <span className="fb-toc-n">{p.n}</span>
                  <span className="fb-toc-t">{p.title}</span>
                  <span className="fb-toc-p">{p.place.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    ...pages.map((p) => ({
      label: `Page ${p.n} of ${pages.length}: ${p.title}`,
      left: <PhotoPage page={p} />,
      right: <StoryPage page={p} onRead={() => onRead(p.id)} />,
    })),
    {
      label: "Your next page",
      left: (
        <div className="fb-page fb-blank">
          <span className="fb-blank-photo" aria-hidden="true"><Icon name="camera" /></span>
          <p className="fb-blank-hand">your next page goes here…</p>
          <span className="fb-folio">— {pages.length + 1} —</span>
        </div>
      ),
      right: (
        <div className="fb-page fb-end">
          <h3>Your turn</h3>
          <p>Name your book, invite your people, and write the first page tonight.</p>
          <button type="button" className="btn sun" onClick={onStart}>Start free</button>
          <p className="fb-end-fine">Free for one book and two people.</p>
        </div>
      ),
    },
  ];

  // Leaf i carries the right page of spread i-1 (the cover for leaf 0) on its front, and the left page of spread i on its back.
  const n = spreads.length;
  const fronts = [<CoverFace key="cover" design={design} title={title} subtitle={people} />, ...spreads.slice(0, -1).map((s) => s.right)];
  const backs = spreads.map((s) => s.left);
  const base = spreads[n - 1].right;
  const label = at === 0 ? "Cover" : spreads[at - 1].label;
  const fwd = move.to >= move.from;

  function go(to: number) {
    const next = Math.max(0, Math.min(n, to));
    if (next === at) return;
    setMove({ from: at, to: next });
    setAt(next);
  }

  useEffect(() => {
    if (!drag) return;
    const stop = () => setDrag(null);
    window.addEventListener("blur", stop);
    return () => window.removeEventListener("blur", stop);
  }, [drag]);

  /* ---------- Pointer: tap a side to turn, or drag a page across ---------- */

  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button, a, input")) return;
    grip.current = { x: e.clientX, y: e.clientY, id: e.pointerId, leaf: -1, fwd: true, on: false, t: performance.now() };
  }

  function move_(e: PointerEvent<HTMLDivElement>) {
    const g = grip.current;
    if (!g && e.pointerType === "mouse") {
      // Near an outer edge, the top page lifts a little to show it can be turned.
      const r = bookRef.current?.getBoundingClientRect();
      const rx = r ? (e.clientX - r.left) / r.width : 0.5;
      setPeek(rx > 0.87 && at < n ? "r" : rx < 0.13 && at > 0 ? "l" : null);
    }
    if (!g || g.id !== e.pointerId) return;
    if (peek) setPeek(null);
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.on) {
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { grip.current = null; return; }
      if (Math.abs(dx) < 10) return;
      g.fwd = dx < 0;
      g.leaf = g.fwd ? at : at - 1;
      if (g.leaf < 0 || g.leaf >= n) { grip.current = null; return; }
      g.on = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const pw = (bookRef.current?.getBoundingClientRect().width ?? 600) / 2;
    const p = Math.max(0, Math.min(1, (g.fwd ? -dx : dx) / (pw * 1.15)));
    setDrag({ leaf: g.leaf, a: g.fwd ? -180 * p : -180 + 180 * p });
  }

  function up(e: PointerEvent<HTMLDivElement>) {
    const g = grip.current;
    if (!g || g.id !== e.pointerId) return;
    grip.current = null;
    if (!g.on) {
      // A tap: the right half turns forward, the left half turns back. A closed book opens from anywhere.
      const r = bookRef.current?.getBoundingClientRect();
      if (!r) return;
      if (at === 0) return go(1);
      go(e.clientX >= r.left + r.width / 2 ? at + 1 : at - 1);
      return;
    }
    const a = drag?.a ?? (g.fwd ? 0 : -180);
    const done = g.fwd ? -a / 180 : (a + 180) / 180;
    const quick = performance.now() - g.t < 260 && done > 0.06;
    setDrag(null);
    if (done > 0.3 || quick) go(g.fwd ? at + 1 : at - 1);
  }

  function keys(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("input, textarea")) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, PageDown: 1, PageUp: -1 }[e.key];
    if (step) { e.preventDefault(); go(at + step); }
    else if (e.key === "Home") { e.preventDefault(); go(0); }
    else if (e.key === "End") { e.preventDefault(); go(n); }
  }

  const { style, data } = bookStyle(design);
  const stagger = calm() ? 0 : 80;

  return (
    <div className={`fb-wrap ${className}`} role="region" aria-roledescription="book" aria-label={`Sample book: ${title}`} onKeyDown={keys}>
      <div className="fb-stage" onPointerDown={down} onPointerMove={move_} onPointerUp={up} onPointerLeave={() => setPeek(null)} onPointerCancel={() => { grip.current = null; setDrag(null); }}>
        <div ref={bookRef} className={`fb${at === 0 ? " closed" : ""}${peek && !drag ? ` peek-${peek}` : ""}`} style={style as Vars} {...data}>
          <div className="fb-board" aria-hidden="true" />
          <div className="fb-face fb-base fb-front" inert={at !== n}>{base}</div>
          {fronts.map((front, i) => {
            const flipped = i < at;
            const dragging = drag?.leaf === i;
            // The stack a turning page is joining sits on top, so nothing passes under it in flight.
            const z = dragging ? 4 * n : flipped ? (fwd ? 3 * n + i : i) : !fwd ? 3 * n + (n - i) : n - i;
            const turning = (fwd && i >= move.from && i < move.to) || (!fwd && i >= move.to && i < move.from);
            const order = fwd ? i - move.from : move.from - 1 - i;
            const leafStyle: Vars = { zIndex: z, transitionDelay: turning ? `${order * stagger}ms` : "0ms" };
            if (dragging) leafStyle["--a"] = `${drag.a}deg`;
            return (
              <div key={i} className={`fb-leaf${i === 0 ? " fb-cover" : ""}${flipped ? " flipped" : ""}${dragging ? " held" : ""}${i === at ? " top-r" : ""}${i === at - 1 ? " top-l" : ""}`} style={leafStyle}>
                <div className="fb-face fb-front" inert={i !== at}>{front}</div>
                <div className="fb-face fb-back" inert={i !== at - 1}>{backs[i]}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fb-ctl">
        <button type="button" className="fb-turn" onClick={() => go(at - 1)} disabled={at === 0} aria-label={at === 1 ? "Close the book" : "Previous page"}>
          <Icon name="left" />
        </button>
        <p className="fb-where" aria-live="polite">
          {at === 0 ? <><b>Open the book</b><span>drag a page or tap a side</span></> : <><b>{label.split(":")[0]}</b><span>{at === n ? "end of the sample" : "Sample book"}</span></>}
        </p>
        <button type="button" className="fb-turn" onClick={() => go(at === n ? 0 : at + 1)} aria-label={at === 0 ? "Open the book" : at === n ? "Close the book" : "Next page"}>
          <Icon name={at === n ? "turn" : "right"} />
        </button>
      </div>
    </div>
  );
}

/** The inside of the front board: printed endpaper and a bookplate. */
function Endpaper({ people }: { people: string }) {
  return (
    <div className="fb-endpaper">
      <div className="fb-plate">
        <span className="fb-plate-k">Ex libris</span>
        <span className="fb-plate-for">This book belongs to</span>
        <span className="fb-plate-name">{people}</span>
      </div>
    </div>
  );
}

/** Left-hand page: the photos, taped in, and where they were taken. */
export function PhotoPage({ page }: { page: NumberedPage }) {
  const [a, b] = page.photos;
  return (
    <div className="fb-page fb-photos">
      <span className="chip-sample">Sample page</span>
      <div className="fb-pols">
        {b && (
          <figure className="fb-pol back" style={{ "--r": `${jitter(page.id, "b", 5, 9).toFixed(1)}deg` } as Vars}>
            <img src={b.url} alt={b.caption} loading="lazy" decoding="async" draggable={false} />
          </figure>
        )}
        {a && (
          <figure className="fb-pol" style={{ "--r": `${jitter(page.id, "a", -5, -1).toFixed(1)}deg` } as Vars}>
            <span className="fb-tape" aria-hidden="true" />
            <img src={a.url} alt={a.caption} loading="lazy" decoding="async" draggable={false} />
            <figcaption>{a.caption}</figcaption>
          </figure>
        )}
      </div>
      <p className="fb-place">
        <b>{page.place.name}</b>
        <span>{page.place.region}</span>
        <span className="fb-coords">{coordsText(page.place)}</span>
      </p>
    </div>
  );
}

/** Right-hand page: postmark, title, the start of the story and a note from the other person. */
export function StoryPage({ page, onRead }: { page: NumberedPage; onRead?: () => void }) {
  const note = page.notes[0];
  const first = page.story.split(/\n\s*\n/)[0];
  return (
    <div className="fb-page fb-story">
      <Stamp page={page} />
      <h3 className="fb-ptitle">{page.title}</h3>
      <span className="fb-kind">{page.kind} · {fmtShort(page.date)}</span>
      <p className="fb-text">{first}</p>
      {note && (
        <figure className="fb-note" data-c={note.color} style={{ "--r": `${jitter(note.id, "r", -4, 3).toFixed(1)}deg` } as Vars}>
          <p>{note.text}</p>
          <figcaption>— {note.author?.name}</figcaption>
        </figure>
      )}
      <footer className="fb-foot">
        {onRead && <button type="button" className="fb-read" onClick={onRead}>Read the whole page<Icon name="right" /></button>}
        <span className="fb-folio">— {page.n} —</span>
      </footer>
    </div>
  );
}
