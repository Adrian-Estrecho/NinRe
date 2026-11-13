import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CoverFace } from "../book/CoverFace";
import { normalizeDesign } from "../book/design";
import { joinNames } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { fmtShort, plural, toYMD } from "../lib/format";
import { kindOf } from "../lib/kinds";
import { isApp } from "../lib/native";
import { Link } from "../router";
import type { BookSummary } from "../types";
import { newestFirst, type NewTile } from "./Bookcase";

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** Past this many slides the dots would crowd, so a count shows instead. */
const MAX_DOTS = 12;

interface Props {
  books: BookSummary[];
  newTile: NewTile;
  onOpen: (book: BookSummary) => void;
}

/**
 * The simple shelf: every book face-out in a row that snaps to the middle, newest first, with room for the next book
 * at the end. Swipe it with a finger, drag it with the mouse, or turn the mouse wheel; the book in the middle opens,
 * one to the side comes to the middle first.
 */
export function Carousel({ books, newTile, onOpen }: Props) {
  const track = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const list = newestFirst(books);
  const count = list.length + 1;

  const slides = () => [...(track.current?.children ?? [])] as HTMLElement[];

  // The slide nearest the middle is the one in front.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const find = () => {
      frame = 0;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0, dist = Infinity;
      slides().forEach((s, i) => {
        const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
        if (d < dist) [best, dist] = [i, d];
      });
      setActive(best);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(find); };
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    find();
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [count]);

  const go = (i: number) => {
    const el = track.current, s = slides()[Math.max(0, Math.min(count - 1, i))];
    if (!el || !s) return;
    el.scrollTo({ left: s.offsetLeft - (el.clientWidth - s.offsetWidth) / 2, behavior: calm() ? "auto" : "smooth" });
  };
  const goRef = useRef(go);
  goRef.current = go;
  const activeRef = useRef(active);
  activeRef.current = active;

  // A finger swipes the row natively. A mouse drags it: the row follows the pointer, then settles on the nearest book.
  // A drag doesn't count as a click, so letting go over a book doesn't open it.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let start: { x: number; left: number; id: number } | null = null;
    let dragged = false;

    const nearest = () => {
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0, dist = Infinity;
      slides().forEach((s, i) => {
        const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - mid);
        if (d < dist) [best, dist] = [i, d];
      });
      return best;
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      start = { x: e.clientX, left: el.scrollLeft, id: e.pointerId };
      dragged = false;
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      if (!dragged && Math.abs(dx) < 6) return;
      if (!dragged) {
        dragged = true;
        el.classList.add("dragging");
        el.setPointerCapture(e.pointerId);
      }
      el.scrollLeft = start.left - dx;
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      start = null;
      if (!dragged) return;
      el.classList.remove("dragging");
      goRef.current(nearest());
    };
    const click = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    };
    // The wheel steps one book at a time, so a flick of a mouse wheel doesn't fly past the whole shelf.
    // A trackpad swipe sends a long run of small events, so a step is taken when a new gesture starts, and again
    // every so often if the wheel keeps turning.
    let lastStep = 0, lastEvent = 0;
    const wheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 2) return;
      e.preventDefault();
      const now = performance.now();
      const fresh = now - lastEvent > 250;
      lastEvent = now;
      if (!fresh && now - lastStep < 450) return;
      lastStep = now;
      goRef.current(activeRef.current + Math.sign(delta));
    };
    const noDrag = (e: DragEvent) => e.preventDefault();

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("dragstart", noDrag);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("dragstart", noDrag);
    };
  }, []);

  const onKey = (e: KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "Home" ? -count : e.key === "End" ? count : 0;
    if (!step) return;
    e.preventDefault();
    // Step from the book that has focus: while the row is still gliding, the one in front hasn't caught up yet.
    const from = slides().findIndex((s) => s.contains(e.target as Node));
    const next = Math.max(0, Math.min(count - 1, (from < 0 ? active : from) + step));
    go(next);
    slides()[next]?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });
  };

  return (
    <section className="carousel" aria-roledescription="carousel" aria-label="Your books">
      <ol className="cs-track" ref={track} onKeyDown={onKey}>
        {list.map((bk, i) => (
          <Slide key={bk.id} book={bk} on={i === active} position={`${i + 1} of ${count}`} onFront={() => go(i)} onOpen={onOpen} />
        ))}
        <li className={`cs-slide${active === count - 1 ? " on" : ""}`} aria-roledescription="slide" aria-label={`${count} of ${count}`}>
          <NewCover tile={newTile} onFront={active === count - 1 ? undefined : () => go(count - 1)} />
          <div className="cs-meta">
            <b>{newTile.atLimit ? "Your shelf is full" : "Start another book"}</b>
            <span>{newTile.atLimit ? `Your plan includes ${plural(newTile.limit ?? 0, "book")}` : "A photo album or a travel journal"}</span>
          </div>
        </li>
      </ol>

      <div className="cs-nav">
        {count <= MAX_DOTS ? (
          <div className="cs-dots">
            {Array.from({ length: count }, (_, i) => (
              <button key={i} type="button" className="cs-dot" aria-label={i < list.length ? list[i].cover.title : "New book"} aria-current={i === active ? "true" : undefined} onClick={() => go(i)} />
            ))}
          </div>
        ) : (
          <span className="cs-count" aria-hidden="true">{active + 1} / {count}</span>
        )}
      </div>
    </section>
  );
}

/** A book face-out: its cover as designed, with what's in it underneath. */
function Slide({ book: bk, on, position, onFront, onOpen }: { book: BookSummary; on: boolean; position: string; onFront: () => void; onOpen: (book: BookSummary) => void }) {
  const kind = kindOf(bk.kind);
  const units = plural(bk.counts.pages, kind.unit, kind.unit === "entry" ? "entries" : undefined);
  const names = joinNames(bk.members.map((m) => m.name));
  return (
    <li className={`cs-slide${on ? " on" : ""}`} aria-roledescription="slide" aria-label={position}>
      <Link
        href={`/app/book/${bk.id}`}
        className="cs-book"
        data-book={bk.id}
        aria-haspopup="dialog"
        aria-label={`${bk.cover.title}, a ${kind.name.toLowerCase()} of ${units}, with ${names}. Opens the book here.`}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          // A tap on a book to the side brings it to the middle; Enter from the keyboard always opens.
          if (!on && e.detail !== 0) return onFront();
          onOpen(bk);
        }}
      >
        <CoverFace design={normalizeDesign(bk.design)} title={bk.cover.title} subtitle={bk.cover.subtitle || names} photoUrl={bk.coverPhotoUrl} />
      </Link>
      <div className="cs-meta" aria-hidden="true">
        <b>{bk.cover.title}</b>
        <span>{kind.name} · {units} · {fmtShort(toYMD(new Date(bk.updatedAt)))}</span>
        {bk.role !== "owner" && <span className="cs-shared">Shared by {bk.owner.name}</span>}
      </div>
    </li>
  );
}

/** The space after the last book: start another, or a lock when the plan's books are used. */
function NewCover({ tile, onFront }: { tile: NewTile; onFront?: () => void }) {
  // A tap while it's to the side only brings it to the middle.
  const front = onFront && ((e: { detail: number; preventDefault: () => void }) => {
    if (e.detail === 0) return false;
    e.preventDefault();
    onFront();
    return true;
  });
  if (tile.atLimit && isApp) {
    // The app sells nothing, so the lock just says the shelf is full.
    return (
      <span className="cs-new locked" role="img" aria-label={`Your plan includes ${plural(tile.limit ?? 0, "book")}.`} onClick={(e) => front?.(e)}>
        <Icon name="lock" /><span aria-hidden="true">Shelf full</span>
      </span>
    );
  }
  if (tile.atLimit) {
    return (
      <Link href="/app/account?upgrade=plus" className="cs-new locked" aria-label={`More books on Plus. Free includes ${plural(tile.limit ?? 0, "book")}.`} onClick={(e) => { front?.(e); }}>
        <Icon name="lock" /><span aria-hidden="true">More on Plus</span>
      </Link>
    );
  }
  return (
    <button type="button" className="cs-new" aria-label="Start another book" onClick={(e) => { if (!front?.(e)) tile.onNew(); }}>
      <Icon name="plus" /><span aria-hidden="true">New book</span>
    </button>
  );
}
