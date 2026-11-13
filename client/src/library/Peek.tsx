import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { flushSync } from "react-dom";
import { ApiError, api, errorText } from "../api";
import { CoverFace } from "../book/CoverFace";
import { bookStyle, normalizeDesign } from "../book/design";
import { joinNames } from "../components/Avatar";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { PeopleDialog } from "../dialogs/PeopleDialog";
import { shelve } from "../lib/book";
import { useDismiss } from "../lib/dismiss";
import { todayYMD } from "../lib/format";
import { kindOf } from "../lib/kinds";
import type { Book, BookSummary, Page } from "../types";
import { BookDesign } from "./BookDesign";
import { Contents } from "./Contents";
import { LeafTools } from "./leaf";
import { PageLeaf } from "./PageLeaf";
import type { SaveState } from "./room";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Phase = "fly" | "read" | "closing";
/** On the phone, the page brought close to read or write on, or null for both pages. */
type Near = "l" | "r" | null;

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = "cubic-bezier(.2, .8, .2, 1)";
/** The flying book's perspective, in book widths; it matches --fw * 4 in library.css. */
const PERSPECTIVE = 4;
/** On the phone, the size one page is laid out at (the reader's own), before the spread is scaled to fit the screen. */
const NW = 440, NH = 581;
const SAVE_LABEL: Record<SaveState, string> = { idle: "", saving: "Saving…", saved: "Saved", error: "Couldn't save" };

/**
 * The size of the closed book in the middle of the screen (open, it is twice as wide), and how far it sits above the
 * middle to leave room for the toolbar. On a phone the open book shows both its pages, like a real book, as large as
 * the screen's width allows; `near` is how much larger it is drawn when one page is brought close to fill the width.
 */
function measure() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const narrow = vw < 760;
  if (narrow) {
    const w = Math.min((vw - 44) / 2, (vh - 230) / (NH / NW), 330);
    // Close up, the page leaves room under it for the zoom buttons and the toolbar.
    return { w, h: w * (NH / NW), t: w * 0.085, narrow, lift: 22, near: Math.min((vw - 20) / NW, (vh - 260) / NH) };
  }
  const w = Math.min(470, vw * 0.46, (vh * 0.76) / 1.32);
  return { w, h: w * 1.32, t: w * 0.085, narrow, lift: 34, near: 1 };
}

export interface OpenAt {
  /** A page to open at, instead of the contents. */
  page?: string | null;
  /** Start a new page as soon as the book is open. */
  add?: boolean;
  /** Open straight into designing the book. */
  design?: boolean;
  hello?: "welcome" | "joined" | null;
}

interface Props {
  book: BookSummary;
  /** The spine the book was taken from (or its cover, when the books are shown face-out), found again when it goes back. */
  spine: () => HTMLElement | null;
  at: OpenAt;
  me: { id: string } | null;
  onClose: () => void;
  /** Something on the shelf changed (pages, cover, people), so the shelf should be fetched again. */
  onChanged: () => void;
  /** The book was deleted. */
  onGone: () => void;
}

/**
 * A book taken down from the shelf: it flies from its spine to the middle of the screen, turns to face you and opens
 * at its contents. Every page is written on directly; the toolbar under it turns pages, adds one, designs the book
 * (which slides it to the left and lays the materials out on the right) and brings people in. Closing flies it back.
 */
export function Peek({ book: bk, spine, at: start, me, onClose, onChanged, onGone }: Props) {
  const toast = useToast();
  const [phase, setPhase] = useState<Phase>("fly");
  const [full, setFull] = useState<Book | null>(null);
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState<string>(start.page ?? "contents");
  const [mode, setMode] = useState<"read" | "design">(start.design ? "design" : "read");
  // A book opens to be read; Edit brings out the pen and the book's tools.
  const [writing, setWriting] = useState(Boolean(start.add || start.design));
  const [fresh, setFresh] = useState<string | null>(null);
  const [saving, setSaving] = useState<SaveState>("idle");
  const [people, setPeople] = useState(false);
  const [menu, setMenu] = useState(false);
  const [armed, setArmed] = useState<"page" | "book" | null>(null);
  const [adding, setAdding] = useState(false);
  const size = useMemo(measure, []);
  const fly = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** On the phone: the page brought close, if any, and the sheet going over while a page is turned. */
  const [near, setNear] = useState<Near>(null);
  const [flip, setFlip] = useState<{ target: string; dir: 1 | -1 } | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const flipping = useRef(false);
  /** Where the page being written on puts its tools, above the book. */
  const [tools, setTools] = useState<HTMLDivElement | null>(null);
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const busy = useRef(false);
  const changed = useRef(false);
  const added = useRef(false);
  useDismiss(menuRef, menu, useCallback(() => { setMenu(false); setArmed(null); }, []));

  // A book that's no longer yours (you left it, or it was deleted) goes back to the shelf.
  const load = useCallback(() => api.book(bk.id).then(setFull, (err) => (err instanceof ApiError && err.status === 404 ? onGone() : setFailed(true))), [bk.id]);
  useEffect(() => { void load(); }, [load]);

  const design = useMemo(() => normalizeDesign(full?.design ?? bk.design), [full?.design, bk.design]);
  const title = full?.cover.title ?? bk.cover.title;
  const names = (full?.cover.subtitle ?? bk.cover.subtitle) || joinNames((full?.members ?? bk.members).map((m) => m.name));
  const { style, data } = bookStyle(design);
  const kind = kindOf(full?.kind ?? bk.kind);
  const Unit = kind.unit[0].toUpperCase() + kind.unit.slice(1);
  const pages = useMemo(() => (full && full.pages.length ? shelve(full.pages).list : []), [full]);
  const order = useMemo(() => ["contents", ...pages.map((p) => p.id)], [pages]);
  const i = order.indexOf(at);
  const page = pages.find((p) => p.id === at) ?? null;
  const owner = full?.role === "owner";

  // A page that's gone (removed here or by someone else) falls back to the contents.
  useEffect(() => {
    if (full && at !== "contents" && !page) setAt("contents");
  }, [full, at, page]);

  /** Where the spine is, as a move and scale from where the book sits, and how thick the book must be to match it. */
  function fromSpine() {
    const el = spine();
    const r = el?.getBoundingClientRect();
    if (!el || !r || !r.width) return null;
    const dx = r.left + r.width / 2 - window.innerWidth / 2, dy = r.top + r.height / 2 - (window.innerHeight / 2 - size.lift);
    // A cover already faces you: the book only grows from it, as thick as it is.
    if (!el.classList.contains("spine")) return { dx, dy, s: r.width / size.w, sy: r.height / size.h, t: size.t, turn: 0 };
    // Turned to show its spine, the book stands half its width nearer, so perspective draws it this much larger.
    const near = PERSPECTIVE / (PERSPECTIVE - 0.5);
    const s = r.height / size.h / near;
    return { dx, dy, s, sy: s, t: r.width / (s * near), turn: 90 };
  }
  const frame = (dx: number, dy: number, s: number, sy = s) => `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${s}, ${sy})`;

  // While the book is out, its place on the shelf stands empty.
  useLayoutEffect(() => {
    const el = spine();
    el?.classList.add("taken");
    return () => el?.classList.remove("taken");
  }, []);

  // Take it down: spine to middle, turning to show the cover, then open the cover and slide so the spread is centred.
  useLayoutEffect(() => {
    const f = fly.current!, b = body.current!, c = cover.current!;
    const from = fromSpine();
    if (!from || calm()) {
      setPhase("read");
      return;
    }
    const opts = (duration: number, delay = 0): KeyframeAnimationOptions => ({ duration, delay, easing: EASE, fill: "forwards" });
    f.animate([{ transform: frame(from.dx, from.dy, from.s, from.sy) }, { transform: frame(0, 0, 1) }], opts(720));
    b.animate([{ transform: `rotateY(${from.turn}deg)`, "--ft": `${from.t}px` } as Keyframe, { transform: "rotateY(-14deg)", "--ft": `${size.t}px`, offset: 0.8 } as Keyframe, { transform: "rotateY(0deg)", "--ft": `${size.t}px` } as Keyframe], opts(720));
    const slide = size.w / 2;
    f.animate([{ transform: frame(0, 0, 1) }, { transform: frame(slide, 0, 1) }], opts(760, 760));
    const open = c.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(-178deg)" }], opts(760, 760));
    open.finished.then(() => setPhase("read"), () => {});
  }, []);

  async function close() {
    if (busy.current) return;
    busy.current = true;
    if (changed.current) onChanged();
    const f = fly.current, b = body.current, c = cover.current;
    const to = fromSpine();
    if (!f || !b || !c || !to || calm()) return onClose();
    setPhase("closing");
    const opts = (duration: number, delay = 0): KeyframeAnimationOptions => ({ duration, delay, easing: EASE, fill: "forwards" });
    const slide = size.w / 2;
    [f, b, c].forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    c.animate([{ transform: "rotateY(-178deg)" }, { transform: "rotateY(0deg)" }], opts(560));
    f.animate([{ transform: frame(slide, 0, 1) }, { transform: frame(0, 0, 1), offset: 0.55 }, { transform: frame(to.dx, to.dy, to.s, to.sy) }], opts(1100));
    const back = b.animate([{ transform: "rotateY(0deg)", "--ft": `${size.t}px` } as Keyframe, { transform: "rotateY(0deg)", "--ft": `${size.t}px`, offset: 0.5 } as Keyframe, { transform: `rotateY(${to.turn}deg)`, "--ft": `${to.t}px` } as Keyframe], opts(1100));
    await back.finished.catch(() => {});
    onClose();
  }

  const upsert = (p: Page) => {
    changed.current = true;
    setFull((f) => f && { ...f, pages: f.pages.some((x) => x.id === p.id) ? f.pages.map((x) => (x.id === p.id ? p : x)) : [...f.pages, p] });
  };

  /** A new page goes in after the last one, at the same place, dated today, with its title ready to type. */
  async function addPage() {
    if (adding || !full) return;
    setAdding(true);
    const last = pages[pages.length - 1];
    try {
      const p = await api.createPage(bk.id, {
        title: kind.fresh, date: todayYMD(), kind: last && kind.tags.includes(last.kind) ? last.kind : kind.tags[0], layout: "", story: "", photos: [],
        place: last ? last.place : { name: "Somewhere new", region: "", code: "", lat: null, lng: null },
      });
      upsert(p);
      setFresh(p.id);
      setAt(p.id);
      setMode("read");
      setWriting(true);
      // On the phone, the new page comes close, at the side its title is written on.
      if (size.narrow) setNear("r");
    } catch (err) {
      toast(errorText(err, "Couldn't add a page. Check your connection."));
    } finally {
      setAdding(false);
    }
  }
  // Arriving from "Add a page" elsewhere: start one as soon as the book is here.
  useEffect(() => {
    if (start.add && full && phase === "read" && !added.current) {
      added.current = true;
      void addPage();
    }
  }, [full, phase]);

  async function removePage() {
    if (!page) return;
    if (armed !== "page") return setArmed("page");
    try {
      await api.deletePage(bk.id, page.id);
      changed.current = true;
      setFull((f) => f && { ...f, pages: f.pages.filter((p) => p.id !== page.id) });
      setAt(order[i - 1] ?? "contents");
      toast(`${Unit} removed.`);
    } catch (err) {
      toast(errorText(err, "Couldn't remove the page."));
    }
    setMenu(false);
    setArmed(null);
  }

  async function deleteBook() {
    if (armed !== "book") return setArmed("book");
    try {
      await api.deleteBook(bk.id);
      toast(`${title} is deleted.`);
      onGone();
    } catch (err) {
      toast(errorText(err, "Couldn't delete the book."));
      setArmed(null);
    }
  }

  /**
   * Turning to another opening. On a computer (or with motion turned down) the book simply shows it. On the phone the
   * page goes over as in a real book: a sheet hinged at the spine carries this opening's right-hand page on its front
   * and the next one's left-hand page on its back (or the other way round, going back), over the opening it's turning
   * to; when it lands, that opening is the book. A page brought close stays close, on the side the sheet lands.
   */
  function turnTo(target: string) {
    if (target === at || flipping.current) return;
    const dir = order.indexOf(target) > i ? 1 : -1;
    if (size.narrow && near) setNear(dir > 0 ? "l" : "r");
    if (!size.narrow || calm()) return setAt(target);
    flipping.current = true;
    setFlip({ target, dir });
  }
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!flip || !el) return;
    let gone = false;
    const a = el.animate([{ transform: "rotateY(0deg)" }, { transform: `rotateY(${flip.dir > 0 ? -180 : 180}deg)` }], { duration: 760, easing: "cubic-bezier(.35, .1, .25, 1)", fill: "forwards" });
    a.finished.then(() => {
      if (gone) return;
      flushSync(() => { setAt(flip.target); setFlip(null); });
      flipping.current = false;
    }, () => {});
    return () => { gone = true; };
  }, [flip]);

  /** One opening of the book: the contents, or a page (or, before the book has come, a word that it's opening). */
  function spread(id: string, live: boolean) {
    const p = pages.find((x) => x.id === id);
    if (!full) {
      return (
        <article className="book fold peek-book">
          <div className="left" />
          <div className="right">
            <div className="peek-empty">
              <h2>{failed ? "This book won't open" : "Opening…"}</h2>
              {failed && <p>Can't reach NinRe right now. Close it and try again in a moment.</p>}
            </div>
          </div>
        </article>
      );
    }
    if (!p) return <Contents book={full} pages={pages} hello={live ? start.hello ?? null : null} onGo={turnTo} onAdd={addPage} onPeople={() => setPeople(true)} />;
    return <PageLeaf key={p.id} bookId={bk.id} page={p} kind={kind} me={me ? { id: me.id, owner } : null} writing={live && writing} fresh={live && writing && fresh === p.id} onSaved={upsert} onState={setSaving} />;
  }

  /** Onwards (1) or back (-1): on the phone, a page that's close moves to the other page of the opening before the book turns. */
  const go = (d: 1 | -1) => {
    if (size.narrow && near === (d > 0 ? "l" : "r")) return setNear(d > 0 ? "r" : "l");
    const next = order[i + d];
    if (next) turnTo(next);
  };
  const canGo = (d: 1 | -1) => (size.narrow && near === (d > 0 ? "l" : "r")) || (d > 0 ? i >= 0 && i < order.length - 1 : i > 0);
  const reading = phase === "read" && mode === "read";

  // On the phone a swipe sideways turns the page (or moves to the other page of the opening, when one is close).
  function swipeStart(e: ReactPointerEvent<HTMLDivElement>) {
    swiped.current = false;
    if (!reading || !size.narrow || flip || !e.isPrimary || e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (!t.closest(".pspread") || t.closest("input, textarea, select, [contenteditable]")) return;
    swipe.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  }
  function swipeEnd(e: ReactPointerEvent<HTMLDivElement>) {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    swipe.current = null;
    if (e.type === "pointercancel") return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    swiped.current = true;
    go(dx < 0 ? 1 : -1);
  }
  const fitK = size.w / NW;
  const nearK = size.near;
  /** The open book's height on screen: on the phone, its boards included, at whatever size it's drawn. */
  const bookH = size.narrow ? (NH + NW * 0.1) * (near ? nearK : fitK) : size.h;

  return (
    <Dialog
      label={`${title}, opened`}
      closeButton
      // Back (or Escape) puts the designer away, then lets a close page go back into the book, then closes the book.
      onRequestClose={(forced) => (forced ? onClose() : mode === "design" ? setMode("read") : size.narrow && near ? setNear(null) : close())}
      onKeyDown={(e) => {
        if (!reading || (e.target as HTMLElement).closest("input, textarea, select, [role=menu]")) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
        if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      }}
    >
      <div
        className={`peek book-scope ${phase} mode-${mode}${size.narrow ? " narrow" : ""}`}
        onPointerDown={swipeStart}
        onPointerUp={swipeEnd}
        onPointerCancel={swipeEnd}
        // A swipe that turned the page isn't also a tap on whatever it started on.
        onClickCapture={(e) => { if (swiped.current) { swiped.current = false; e.preventDefault(); e.stopPropagation(); } }}
        style={{ ...style, "--fw": `${size.w}px`, "--fh": `${size.h}px`, "--lift": `${size.lift}px` } as Vars} {...data}>
        <div className="fly" ref={fly} aria-hidden="true">
          <div className="fly-book" ref={body} style={{ "--ft": `${size.t}px` } as Vars}>
            <div className="fly-face fly-back" />
            <div className="fly-face fly-edge" />
            <div className="fly-face fly-leaf" />
            <div className="fly-face fly-spine" data-texture={design.texture}>
              <span className="foil-text">{title}</span>
            </div>
            <div className="fly-hinge">
              <div className="fly-cover" ref={cover}>
                <div className="fly-face fly-front">
                  <CoverFace design={design} title={title} subtitle={names} photoUrl={bk.coverPhotoUrl} />
                </div>
                <div className="fly-face fly-inside" />
              </div>
            </div>
          </div>
        </div>

        {phase === "read" && mode === "design" && full && (
          <BookDesign
            book={full}
            state={saving}
            onState={setSaving}
            onChange={(patch) => { changed.current = true; setFull((f) => f && { ...f, ...patch }); }}
            onDone={() => setMode("read")}
          />
        )}

        <LeafTools.Provider value={tools}>
        {reading && (
          <>
            {size.narrow ? (
              /* On the phone: the book open flat with both its pages, laid out at the reader's own size and scaled to
                 fit, in its cloth boards. Tapping a page brings it close; turning a page sends a sheet over. */
              <div
                className={`pspread${near ? ` near-${near}` : ""}`}
                data-texture={design.texture}
                style={{ "--k": near ? nearK : fitK, "--px": `${near ? (near === "l" ? 1 : -1) * (NW / 2) * nearK : 0}px` } as Vars}
              >
                <div className="pd-case" aria-hidden="true" />
                {flip && <div className="pflip-under" inert>{spread(flip.target, false)}</div>}
                <div className="plive" style={flip ? { clipPath: flip.dir > 0 ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)" } : undefined}>
                  {spread(page ? page.id : "contents", true)}
                </div>
                {flip && (
                  <div ref={sheet} className={`pflip ${flip.dir > 0 ? "fwd" : "back"}`} aria-hidden="true">
                    <div className="pflip-face pflip-front" inert><div className="pflip-in">{spread(at, false)}</div></div>
                    <div className="pflip-face pflip-back" inert><div className="pflip-in">{spread(flip.target, false)}</div></div>
                  </div>
                )}
                <div className="pd-sheen" aria-hidden="true" />
                {!near && !flip && (
                  <>
                    <button type="button" className="pzoom l" aria-label="Bring the left-hand page close" onClick={() => setNear("l")} />
                    <button type="button" className="pzoom r" aria-label="Bring the right-hand page close" onClick={() => setNear("r")} />
                  </>
                )}
              </div>
            ) : (
              spread(page ? page.id : "contents", true)
            )}

            {/* While writing: the page's own tools (an album's layout picker) just above the top of the book, put there
                by the page itself (LeafTools); like the zoom buttons under it, it follows the book as it grows and shrinks. */}
            {writing && <div className="leaf-tools" ref={setTools} style={{ "--bookh": `${bookH}px` } as Vars} />}

            {/* While writing on the phone: zoom out to both pages, or in to the page being written on, just under the
                book (it follows the book's foot as it grows and shrinks). */}
            {size.narrow && writing && (
              <div className="pzoombar" role="group" aria-label="Zoom" style={{ "--bookh": `${bookH}px` } as Vars}>
                <button type="button" aria-pressed={!near} disabled={!near} onClick={() => setNear(null)}><Icon name="smaller" /><span>Both pages</span></button>
                <button type="button" aria-pressed={Boolean(near)} disabled={Boolean(near)} onClick={() => setNear("r")}><Icon name="bigger" /><span>Close up</span></button>
              </div>
            )}

            <nav className="peek-bar" aria-label="Book tools">
              <div className="pb-turn">
                <button type="button" className="pb-round" disabled={!canGo(-1)} aria-label="Previous page" onClick={() => go(-1)}><Icon name="left" /></button>
                <span className="pb-folio" aria-live="polite">{page ? `${page.n} / ${pages.length}` : "Contents"}</span>
                <button type="button" className="pb-round" disabled={!canGo(1)} aria-label="Next page" onClick={() => go(1)}><Icon name="right" /></button>
              </div>
              {size.narrow && !writing && (
                <button type="button" className="pb-round pb-near" aria-pressed={Boolean(near)} aria-label={near ? "Show both pages" : "Bring the page close"} onClick={() => setNear(near ? null : "r")}>
                  <Icon name={near ? "smaller" : "bigger"} />
                </button>
              )}
              <span className="pb-sep" aria-hidden="true" />
              {!writing ? (
                <button type="button" className="pb-btn sun" disabled={!full} onClick={() => { setWriting(true); if (size.narrow && !near) setNear("r"); }}><Icon name="pen" /><span>Edit</span></button>
              ) : (
                <div className="pb-tools">
                  <button type="button" className="pb-btn" aria-pressed={!page} disabled={!full} onClick={() => setAt("contents")}><Icon name="contents" /><span>Contents</span></button>
                  <button type="button" className="pb-btn sun" disabled={!full || adding} onClick={addPage}><Icon name="plus" /><span>{Unit}</span></button>
                  <button type="button" className="pb-btn" disabled={!full} onClick={() => setMode("design")}><Icon name="palette" /><span>Design</span></button>
                  <button type="button" className="pb-btn" disabled={!full} onClick={() => setPeople(true)}><Icon name="people" /><span>People</span></button>
                  <div className="menu" ref={menuRef}>
                    <button type="button" className="pb-btn" aria-haspopup="menu" aria-expanded={menu} disabled={!full} aria-label="More" onClick={() => { setMenu(!menu); setArmed(null); }}><Icon name="more" /></button>
                    {menu && (
                      <div className="menu-pop pb-menu" role="menu">
                        {page && (
                          <button type="button" role="menuitem" className={armed === "page" ? "armed" : ""} onClick={removePage}>
                            <Icon name="trash" />{armed === "page" ? `Tap again to remove this ${kind.unit}` : `Remove this ${kind.unit}`}
                          </button>
                        )}
                        {owner ? (
                          <button type="button" role="menuitem" className={armed === "book" ? "armed" : ""} onClick={deleteBook}>
                            <Icon name="trash" />{armed === "book" ? "Tap again: delete the book for everyone" : "Delete this book"}
                          </button>
                        ) : (
                          <button type="button" role="menuitem" onClick={() => { setMenu(false); setPeople(true); }}><Icon name="out" />Leave this book</button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`save-state ${saving}`} role="status">{SAVE_LABEL[saving]}</span>
                  <button type="button" className="pb-btn done" onClick={() => { setWriting(false); setMenu(false); }}><Icon name="check" /><span>Done</span></button>
                </div>
              )}
            </nav>
          </>
        )}
        </LeafTools.Provider>
      </div>

      {people && full && (
        <PeopleDialog
          bookId={bk.id}
          title={title}
          isOwner={owner}
          onClose={() => { setPeople(false); void load(); }}
          onChanged={() => { changed.current = true; void load(); }}
        />
      )}
    </Dialog>
  );
}
