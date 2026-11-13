import { useContext, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../components/Icon";
import { Notes } from "../components/Notes";
import { fmtDay } from "../lib/format";
import { LAYOUTS, layoutOf } from "../lib/kinds";
import type { Photo } from "../types";
import { Editable } from "./Editable";
import { AddPhoto, LeafTools, MAX_PHOTOS, Print, TagSelect, useLeaf, type LeafProps } from "./leaf";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Side = "l" | "r";
const LEAD = "Put this photo first";

/**
 * An album page, printed like a photo book: the photos cover both pages, cropped to fill their places with thin white
 * gutters between them (an even grid, a mosaic around one big photo, one photo bled to the edges of the left page,
 * film strips, or one photo across the whole spread). The title, day and place are a short caption under them, and
 * the notes open from a button beside it. While writing, the layout is picked above the spread.
 */
export function AlbumLeaf({ bookId, page, kind, me, writing, fresh, onSaved, onState }: LeafProps) {
  const s = useLeaf({ bookId, page, onSaved, onState });
  const [notesOpen, setNotesOpen] = useState(false);
  const tools = useContext(LeafTools);
  const { leaf } = s;
  const photos = leaf.photos;
  const layout = layoutOf(leaf);
  const print = (p: Photo, i: number, className = "", style?: CSSProperties) => (
    <Print key={p.id} s={s} photo={p} i={i} writing={writing} place={leaf.place.name} className={className} style={style} lead={LEAD} />
  );
  const at = (list: Photo[], from: number) => list.map((p, j) => ({ p, i: from + j }));
  const noteCount = page.notes.length;
  const hasNotes = noteCount > 0 || Boolean(writing && me && !page.sample);

  const label = (
    <div className="album-label">
      <div className="album-label-top">
        <Editable as="h2" label="Title" value={leaf.title} required maxLength={120} placeholder="Name this page" readOnly={!writing} autoEdit={fresh} onCommit={(title) => s.change({ title })} />
        {hasNotes && (
          <button type="button" className="album-notes-btn" aria-expanded={notesOpen} onClick={() => setNotesOpen(!notesOpen)}>
            <Icon name="chat" />{noteCount ? `${noteCount} ${noteCount === 1 ? "note" : "notes"}` : "Add a note"}
          </button>
        )}
      </div>
      <span className="fulldate">
        <Editable label="Date" type="date" value={leaf.date} required shown={fmtDay(leaf.date)} readOnly={!writing} onCommit={(date) => s.change({ date })} />
        {" · "}
        <TagSelect s={s} kind={kind} writing={writing} />
        {" · "}
        <Editable as="strong" label="Place" value={leaf.place.name} required maxLength={80} placeholder="Where?" readOnly={!writing} onCommit={s.setPlace} />
      </span>
      {(leaf.story || writing) && (
        <Editable as="div" className="album-words" multiline label="A few words" value={leaf.story} placeholder="A few words about these photos…" readOnly={!writing} onCommit={(story) => s.change({ story })} />
      )}
      {writing && (
        <div className="album-tools">
          <button type="button" className="btn line small" disabled={s.full} onClick={s.pick}><Icon name="camera" />Add photos</button>
          <span className="hint" role="status">{photos.length} of {MAX_PHOTOS}{s.adding ? ` · adding ${s.adding}…` : ""}</span>
        </div>
      )}
    </div>
  );

  let left: ReactNode, right: ReactNode, over: ReactNode = null;
  if (!photos.length) {
    left = writing || s.adding ? <AddPhoto s={s} big className="album-first" /> : <p className="album-none">No photos on this page yet.</p>;
    right = label;
  } else if (layout === "spread") {
    const ph = photos[s.shown] ?? photos[0];
    left = null;
    right = label;
    over = (
      <>
        {print(ph, s.shown, "spread-photo")}
        {photos.length > 1 && (
          <ul className="leaf-thumbs spread-thumbs" aria-label="Photos on this page">
            {photos.map((p, i) => (
              <li key={p.id}>
                <button type="button" className="leaf-thumb" aria-current={i === s.shown} aria-label={`Show photo ${i + 1}${p.caption ? `: ${p.caption}` : ""}`} onClick={() => s.setShown(i)}>
                  <img src={p.url} alt="" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  } else if (layout === "feature") {
    left = <div className="album album-feature">{print(photos[0], 0, "big")}</div>;
    right = <>{photos.length > 1 && grid(at(photos.slice(1), 1), print)}{label}</>;
  } else if (layout === "strip") {
    const strips = photos.length <= 3 ? 1 : photos.length <= 8 ? 2 : 3;
    const per = Math.ceil(photos.length / strips);
    const chunks = Array.from({ length: strips }, (_, k) => at(photos.slice(k * per, (k + 1) * per), k * per)).filter((c) => c.length);
    const onLeft = Math.max(1, chunks.length - 1);
    const film = (c: { p: Photo; i: number }[], k: number) => <div key={k} className="film">{c.map(({ p, i }) => print(p, i, "frame"))}</div>;
    left = <div className="films">{chunks.slice(0, onLeft).map(film)}</div>;
    right = <>{chunks.length > onLeft && <div className="films">{chunks.slice(onLeft).map((c, k) => film(c, onLeft + k))}</div>}{label}</>;
  } else {
    const half = Math.ceil(photos.length / 2);
    const side = layout === "collage" ? mosaic : grid;
    left = side(at(photos.slice(0, half), 0), print, "l");
    right = <>{photos.length > half && side(at(photos.slice(half), half), print, "r")}{label}</>;
  }

  const picker = writing && (
    <div className="lay-pick" role="radiogroup" aria-label="Lay the photos out">
      {LAYOUTS.map((l) => (
        <button key={l.id} type="button" role="radio" aria-checked={layout === l.id} title={`${l.name}: ${l.hint}`} onClick={() => s.change({ layout: l.id })}>
          <Icon name={`lay-${l.id}`} /><span className="sr-only">{l.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <article className={`book fold peek-book album-book lay-${photos.length ? layout : "none"}${writing ? " writing" : ""}`}>
      {s.input}
      {/* The layout picker goes above the book when the reader has a place for it there, else over the top of the spread */}
      {picker && (tools === undefined ? picker : tools ? createPortal(picker, tools) : null)}
      {over}
      <div className="left">{left}</div>
      <div className="right">{right}</div>
      {notesOpen && hasNotes && (
        <section className="album-notes" aria-label="Notes on this page">
          <button type="button" className="album-notes-x" aria-label="Close the notes" onClick={() => setNotesOpen(false)}><Icon name="close" /></button>
          <Notes page={page} me={writing ? me : null} bookId={writing ? bookId : undefined} onPage={writing ? onSaved : undefined} />
        </section>
      )}
    </article>
  );
}

type Place = (p: Photo, i: number, className?: string, style?: CSSProperties) => ReactNode;
type Items = { p: Photo; i: number }[];

/** An even grid filling the page: one column for a photo or two, then two, then three, with rows sharing the height. */
function grid(items: Items, print: Place, _side?: Side) {
  const cols = items.length <= 2 ? 1 : items.length <= 6 ? 2 : 3;
  return (
    <div className={`album album-grid${cols === 2 && items.length % 2 ? " odd" : ""}`} style={{ "--cols": cols, "--rows": Math.ceil(items.length / cols) } as Vars}>
      {items.map(({ p, i }) => print(p, i))}
    </div>
  );
}

/**
 * A mosaic filling the page: the first photo big (two by two, on the outer side of the page), the rest around it in
 * three columns, and the last one stretched across whatever the bottom row has left, so the page has no holes.
 */
function mosaic(items: Items, print: Place, side: Side = "l") {
  if (items.length <= 2) return grid(items, print);
  const cells = items.length + 3;
  const left = cells % 3;
  return (
    <div className={`album album-mosaic ${side}`} style={{ "--rows": Math.ceil(cells / 3) } as Vars}>
      {items.map(({ p, i }, j) =>
        print(p, i, j === 0 ? "big" : "", j === items.length - 1 && left ? { gridColumn: `span ${left === 1 ? 3 : 2}` } : undefined),
      )}
    </div>
  );
}
