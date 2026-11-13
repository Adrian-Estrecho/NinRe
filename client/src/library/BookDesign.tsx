import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { api, errorText } from "../api";
import { CoverDesigner } from "../book/CoverDesigner";
import { CoverFace } from "../book/CoverFace";
import { bookStyle, normalizeDesign, type Design } from "../book/design";
import { joinNames } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { shelve } from "../lib/book";
import { BOOK_KINDS, kindOf } from "../lib/kinds";
import type { Book, BookKind, Cover, NumberedPage } from "../types";
import { PageLeaf } from "./PageLeaf";
import type { SaveState } from "./room";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const SAVE_AFTER = 700;
const SAVE_LABEL: Record<SaveState, string> = { idle: "", saving: "Saving…", saved: "Saved", error: "Couldn't save" };
/** The page the spread preview is laid out on before it's scaled to fit: about the size the open book shows it. */
const LEAF_W = 440, LEAF_H = 581;
const noop = () => {};
const EASE = "cubic-bezier(.2, .8, .2, 1)";
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Props {
  book: Book;
  state: SaveState;
  onChange: (patch: { design?: Design; cover?: Cover; kind?: BookKind }) => void;
  onState: (state: SaveState) => void;
  onDone: () => void;
}

/**
 * Designing the book while it's open, laid out as the library's board and bookcase are: the book on top (turning on
 * Cover, face on for Stickers, opened at a page for Pages), the switch between them, and that part's options under it.
 * Saves as you go.
 */
export function BookDesign({ book, state, onChange, onState, onDone }: Props) {
  const toast = useToast();
  const design = useMemo(() => normalizeDesign(book.design), [book.design]);
  const timer = useRef(0);
  const job = useRef<(() => Promise<unknown>) | null>(null);

  async function flush() {
    window.clearTimeout(timer.current);
    const run = job.current;
    job.current = null;
    if (!run) return;
    onState("saving");
    try {
      await run();
      onState("saved");
    } catch {
      onState("error");
      job.current ??= run;
    }
  }
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    void job.current?.();
  }, []);

  function queue(run: () => Promise<unknown>) {
    job.current = run;
    onState("idle");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, SAVE_AFTER);
  }
  const setDesign = (d: Design) => {
    onChange({ design: d });
    queue(() => api.saveDesign(book.id, d));
  };
  const setCover = (patch: Partial<Cover>) => {
    const cover = { ...book.cover, ...patch };
    onChange({ cover });
    queue(async () => { await api.saveCover(book.id, cover); await api.saveDesign(book.id, design); });
  };

  // The kind is saved straight away, apart from the cover and design, which wait for a pause in the changes.
  async function setKind(kind: BookKind) {
    const was = book.kind;
    onChange({ kind });
    onState("saving");
    try {
      await api.saveKind(book.id, kind);
      onState("saved");
    } catch (err) {
      onChange({ kind: was });
      onState("error");
      toast(errorText(err, "Couldn't change the kind of book."));
    }
  }

  const photos = useMemo(() => book.pages.flatMap((p) => p.photos.map((ph) => ({ id: ph.id, url: ph.url, caption: ph.caption }))), [book.pages]);
  // The page shown on the stage: the one with the most photos (an album is for looking at), or a sample.
  const preview = useMemo(() => {
    const real = shelve(book.pages).list.filter((p) => p.photos.length);
    return real.reduce<NumberedPage | null>((best, p) => (!best || p.photos.length > best.photos.length ? p : best), null) ?? shelve([]).list[2];
  }, [book.pages]);
  const kind = kindOf(book.kind);

  return (
    <div className="peek-design">
      <CoverDesigner
        stacked
        design={design}
        onChange={setDesign}
        title={book.cover.title}
        subtitle={book.cover.subtitle || joinNames(book.members.map((m) => m.name))}
        photos={photos}
        previewPage={preview}
        idPrefix="pk"
        // The size of the boards of the open book on the Pages tab, allowing for the 3D book looking larger than it is.
        bookWidth="var(--pv-bw)"
        photoStyles={kind.id !== "album"}
        pagesStage={(close) => (
          <SpreadPreview
            page={preview}
            kind={book.kind}
            bookId={book.id}
            design={design}
            title={book.cover.title}
            subtitle={book.cover.subtitle || joinNames(book.members.map((m) => m.name))}
            photoUrl={photos.find((p) => p.id === design.coverPhoto)?.url ?? null}
            onClose={close}
          />
        )}
        header={
          <div className="pd-head">
            <h2 className="sec-h">Design the book</h2>
            <span className={`save-state ${state}`} role="status">
              {SAVE_LABEL[state]}
              {state === "error" && <button type="button" className="link-btn" onClick={flush}>Try again</button>}
            </span>
            <button type="button" className="btn small" onClick={() => { void flush(); onDone(); }}><Icon name="check" />Done</button>
          </div>
        }
        extras={{
          cover: (
            <div className="row2">
              <div className="fld">
                <label htmlFor="pk-title">Title</label>
                <input id="pk-title" type="text" maxLength={60} value={book.cover.title} onChange={(e) => setCover({ title: e.target.value })} onBlur={() => !book.cover.title.trim() && setCover({ title: kind.title })} />
              </div>
              <div className="fld">
                <label htmlFor="pk-names">Names on the cover</label>
                <input id="pk-names" type="text" maxLength={60} placeholder={joinNames(book.members.map((m) => m.name))} value={book.cover.subtitle} onChange={(e) => setCover({ subtitle: e.target.value })} />
              </div>
            </div>
          ),
          pages: (
            <fieldset className="dgroup">
              <legend>Kind of book</legend>
              <div className="kind-row">
                {BOOK_KINDS.map((k) => (
                  <label key={k.id} className={`kind-chip${kind.id === k.id ? " on" : ""}`} title={k.blurb}>
                    <input type="radio" name="pk-kind" checked={kind.id === k.id} onChange={() => setKind(k.id)} />
                    <Icon name={k.icon} />{k.name}
                  </label>
                ))}
              </div>
              <p className="hint">Pages keep everything on them; only the way they're laid out changes.</p>
            </fieldset>
          ),
        }}
        footer={photos.length === 0 ? <p className="hint">Add photos to a page and you can put one on the cover.</p> : undefined}
      />
    </div>
  );
}

interface SpreadProps {
  page: NumberedPage;
  kind: BookKind;
  bookId: string;
  design: Design;
  title: string;
  subtitle: string;
  photoUrl: string | null;
  onClose: () => void;
}

/**
 * The book opened flat on the stage, its pages the same size as the closed book on the Cover tab. It opens as it
 * arrives: the closed book sits in the middle, its cover swings over to the left and the book slides across so the
 * spread is centred. Tapping it closes it the same way and goes back to the cover. The page is drawn exactly as the
 * reader draws it (an album's photos covering the spread, a journal's photo and story), in the book's current paper,
 * scaled down from the reader's size.
 */
function SpreadPreview({ page, kind, bookId, design, title, subtitle, photoUrl, onClose }: SpreadProps) {
  const box = useRef<HTMLDivElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const lid = useRef<HTMLDivElement>(null);
  const inside = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const busy = useRef(false);
  // The cloth and paper, set here as well so the boards follow every change of the design.
  const look = bookStyle(design);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / (LEAF_W * 2));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /** Runs the opening forwards (or backwards, to close), resolving when the book has finished moving. */
  function swing(open: boolean) {
    const b = box.current, p = pages.current, l = lid.current, i = inside.current;
    if (!b || !p || !l || !i) return Promise.resolve();
    const t = calm() ? 0 : 1;
    const run = (el: HTMLElement, frames: Keyframe[], duration: number, delay: number) =>
      el.animate(frames, { duration: duration * t, delay: delay * t, easing: EASE, fill: "both" });
    const shut = { transform: "translateX(-25%)" }, flat = { transform: "translateX(0)" };
    const down = { transform: "rotateY(0deg)" }, over = { transform: "rotateY(-180deg)" };
    // Only the right-hand page shows while the cover is down; the left one is under the inside of the cover once it's over.
    const half = { clipPath: "inset(-10% -10% -10% 50%)" }, whole = { clipPath: "inset(-10% -10% -10% -10%)" };
    if (open) {
      // The closed book slides across as its cover turns over onto the left, then the inside of the cover gives way to the page.
      run(l, [down, over], 900, 0);
      run(p, [half, { ...half, offset: 0.97 }, whole], 900, 0);
      run(i, [{ opacity: 1 }, { opacity: 0 }], 240, 900);
      return run(b, [shut, flat], 900, 0).finished.then(() => {}, () => {});
    }
    run(i, [{ opacity: 0 }, { opacity: 1 }], 200, 0);
    run(p, [whole, { ...half, offset: 0.03 }, half], 760, 200);
    run(l, [over, down], 760, 200);
    return run(b, [flat, shut], 760, 200).finished.then(() => {}, () => {});
  }

  useLayoutEffect(() => {
    void swing(true);
  }, []);

  async function close() {
    if (busy.current) return;
    busy.current = true;
    await swing(false);
    onClose();
  }

  return (
    <div
      ref={box}
      className="pd-spread"
      style={look.style}
      {...look.data}
      role="button"
      tabIndex={0}
      aria-label={`The book open at a page: ${page.title}. Press Enter to close it.`}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void close();
        }
      }}
    >
      <div ref={pages} className="pd-spread-pages">
        {/* The boards in the book's cloth, showing all round the pages, with the spine down the middle */}
        <div className="pd-case" aria-hidden="true" />
        <div className="pd-spread-in" inert style={{ "--fw": `${LEAF_W}px`, "--fh": `${LEAF_H}px`, transform: `scale(${scale})`, visibility: scale ? undefined : "hidden" } as Vars}>
          <PageLeaf key={`${page.id}-${kind}`} bookId={bookId} page={page} kind={kindOf(kind)} me={null} writing={false} fresh={false} onSaved={noop} onState={noop} />
        </div>
        {/* The light on the paper: the pages curving down into the spine and up at their outer edges, and the block of
            pages showing at the sides */}
        <div className="pd-sheen" aria-hidden="true" />
      </div>
      {/* The cover, hinged at the spine: its front on one side, the inside of the board (endpaper) on the other */}
      <div ref={lid} className="pd-lid" aria-hidden="true">
        <div className="pd-lid-front"><CoverFace design={design} title={title || "Our Photo Album"} subtitle={subtitle} photoUrl={photoUrl} /></div>
        <div ref={inside} className="pd-lid-inside" />
      </div>
    </div>
  );
}
