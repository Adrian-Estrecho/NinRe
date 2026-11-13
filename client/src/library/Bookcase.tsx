import { useRef, useState, type CSSProperties } from "react";
import { FOILS, TITLE_FONTS } from "../book/design";
import { joinNames } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { fmtShort, jitter, plural, toYMD } from "../lib/format";
import { kindOf } from "../lib/kinds";
import { isApp } from "../lib/native";
import { Link } from "../router";
import type { BookSummary, Room } from "../types";
import { DecorArt, DECOR_SIZE } from "./DecorArt";
import { NameTag } from "./FigureArt";
import { clamp, dragWithin, nudge } from "./drag";
import { decorName } from "./room";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export const newestFirst = (books: BookSummary[]) => [...books].sort((a, b) => b.updatedAt - a.updatedAt);

export interface NewTile { atLimit: boolean; limit: number | null; onNew: () => void }

interface Props {
  room: Room;
  designing: boolean;
  mine: BookSummary[];
  shared: BookSummary[];
  newTile: NewTile;
  onPlaceDecor: (i: number, x: number) => void;
  onRemoveDecor: (i: number) => void;
  onOpen: (book: BookSummary, spine: HTMLElement) => void;
}

/** The bookcase: things standing on its top, then a shelf of books for each kind, spine-out. */
export function Bookcase({ room, designing, mine, shared, newTile, onPlaceDecor, onRemoveDecor, onOpen }: Props) {
  // Someone who only writes in other people's books sees those first, then room to start their own.
  const shelves = mine.length === 0
    ? [{ id: "shared", label: "Shared with you", books: shared }, { id: "mine", label: "Start your own", books: mine, newTile }]
    : [{ id: "mine", label: "Your books", books: mine, newTile }, ...(shared.length ? [{ id: "shared", label: "Shared with you", books: shared }] : [])];

  return (
    <div className="case">
      <CaseTop room={room} designing={designing} onPlace={onPlaceDecor} onRemove={onRemoveDecor} />
      <div className="case-crown" aria-hidden="true" />
      <div className="case-body">
        {/* A library's rolling ladder, hooked on a brass rail along the top of the case (drawn only; it never gets in the way of a book) */}
        <div className="case-rail" aria-hidden="true" />
        <div className="case-ladder" aria-hidden="true"><i /><i /></div>
        {shelves.filter((s) => s.books.length || s.newTile).map((s) => (
          <section key={s.id} className="case-shelf" aria-labelledby={`plate-${s.id}`}>
            <ol className="bookcase">
              {newestFirst(s.books).map((bk) => <Spine key={bk.id} book={bk} onOpen={onOpen} />)}
              {s.newTile && <NewSlot tile={s.newTile} />}
              <li className="bookend" aria-hidden="true" />
            </ol>
            <p className="case-plate" id={`plate-${s.id}`}>{s.label}{s.books.length > 0 && <span> · {s.books.length}</span>}</p>
          </section>
        ))}
      </div>
      <div className="case-base" aria-hidden="true" />
    </div>
  );
}

/** The top of the bookcase, where the person's things stand; each slides along it. */
function CaseTop({ room, designing, onPlace, onRemove }: { room: Room; designing: boolean; onPlace: (i: number, x: number) => void; onRemove: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [held, setHeld] = useState<{ i: number; x: number } | null>(null);
  const holding = useRef(held);

  return (
    <div className="case-top" ref={box} role="group" aria-label="On top of the bookcase">
      {room.decor.map((d, i) => {
        const [w] = DECOR_SIZE[d.k];
        const x = held?.i === i ? held.x : d.x;
        const name = decorName(d);
        return (
          <div key={i} className={`decor${held?.i === i ? " held" : ""}`} style={{ left: `${x}%`, "--dw": w } as Vars}>
            <button
              type="button"
              className="decor-btn"
              aria-label={`${name[0].toUpperCase()}${name.slice(1)}. Drag or use the arrow keys to move it along the bookcase.`}
              onPointerDown={(e) => dragWithin(e, box.current!, { x: d.x, y: 0 }, (nx) => setHeld((holding.current = { i, x: clamp(nx, 4, 96) })), (moved) => {
                const h = holding.current;
                setHeld((holding.current = null));
                if (moved && h) onPlace(i, h.x);
              })}
              onKeyDown={(e) => {
                const to = nudge(e.key, { x: d.x, y: 0 });
                if (!to || to.y !== 0) return;
                e.preventDefault();
                onPlace(i, clamp(to.x, 4, 96));
              }}
            >
              <DecorArt kind={d.k} fig={d.fig} />
            </button>
            <NameTag fig={d.fig} />
            {designing && (
              <button type="button" className="pinned-x decor-x" aria-label={`Take the ${name} away`} onClick={() => onRemove(i)}>
                <Icon name="close" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** A book standing spine-out: thicker the more pages it holds. A plain click takes it down to read; the link still works in a new tab. */
function Spine({ book: bk, onOpen }: { book: BookSummary; onOpen: (book: BookSummary, spine: HTMLElement) => void }) {
  const foil = FOILS.find((f) => f.id === bk.design.foil) ?? FOILS[0];
  const kind = kindOf(bk.kind);
  const font = (TITLE_FONTS.find((f) => f.id === bk.design.titleFont) ?? TITLE_FONTS[0]).family;
  const look: Vars = {
    "--cloth": bk.design.cloth, "--foil": foil.mid, "--foil-hi": foil.hi, "--foil-lo": foil.lo, "--f-cover": font,
    "--w": `${Math.round(Math.min(76, 42 + bk.counts.pages * 0.8))}px`,
    "--h": jitter(bk.id, "h", 0.86, 1).toFixed(3),
  };
  return (
    <li style={look}>
      <Link
        href={`/app/book/${bk.id}`}
        className="spine"
        data-book={bk.id}
        data-texture={bk.design.texture}
        data-foil={bk.design.foil}
        data-titlefont={bk.design.titleFont}
        aria-haspopup="dialog"
        aria-label={`${bk.cover.title}, a ${kind.name.toLowerCase()} of ${plural(bk.counts.pages, kind.unit, kind.unit === "entry" ? "entries" : undefined)}, with ${joinNames(bk.members.map((m) => m.name))}. Opens the book here.`}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          onOpen(bk, e.currentTarget);
        }}
        onPointerEnter={(e) => keepTagInside(e.currentTarget)}
        onFocus={(e) => keepTagInside(e.currentTarget)}
      >
        <span className="spine-band" aria-hidden="true" />
        <span className="spine-title foil-text" aria-hidden="true">{bk.cover.title}</span>
        <span className="spine-band" aria-hidden="true" />
        <span className="spine-tag" aria-hidden="true"><b>{bk.cover.title}</b>{kind.name} · {plural(bk.counts.pages, kind.unit, kind.unit === "entry" ? "entries" : undefined)} · {fmtShort(toYMD(new Date(bk.updatedAt)))}</span>
      </Link>
    </li>
  );
}

/**
 * The title card shows centred over its book, unless that would hang off the side of the bookcase (the first or last
 * book on a shelf): then it slides along (--nudge) so it stays within the case.
 */
function keepTagInside(spine: HTMLElement) {
  const tag = spine.querySelector<HTMLElement>(".spine-tag");
  const box = spine.closest(".case")?.getBoundingClientRect();
  if (!tag || !box) return;
  tag.style.setProperty("--nudge", "0px");
  const r = tag.getBoundingClientRect();
  const left = Math.max(box.left, 8) + 6, right = Math.min(box.right, window.innerWidth - 8) - 6;
  const dx = r.left < left ? left - r.left : r.right > right ? right - r.right : 0;
  tag.style.setProperty("--nudge", `${Math.round(dx)}px`);
}

/** An empty slot at the end of the shelf for the next book, or a lock when the plan's books are used. */
function NewSlot({ tile }: { tile: NewTile }) {
  return (
    <li style={{ "--w": "54px", "--h": 0.86 } as Vars}>
      {tile.atLimit && isApp ? (
        // The app sells nothing, so the lock just says the shelf is full.
        <span className="spine-new locked" role="img" aria-label={`Your plan includes ${tile.limit} book${tile.limit === 1 ? "" : "s"}.`}>
          <Icon name="lock" /><span aria-hidden="true">Shelf full</span>
        </span>
      ) : tile.atLimit ? (
        <Link href="/app/account?upgrade=plus" className="spine-new locked" aria-label={`More books on Plus. Free includes ${tile.limit} book.`}>
          <Icon name="lock" /><span aria-hidden="true">More on Plus</span>
        </Link>
      ) : (
        <button type="button" className="spine-new" onClick={tile.onNew} aria-label="Start another book">
          <Icon name="plus" /><span aria-hidden="true">New book</span>
        </button>
      )}
    </li>
  );
}
