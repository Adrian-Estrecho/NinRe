import { useEffect, useState, type CSSProperties } from "react";
import { Icon } from "../components/Icon";
import type { Earned } from "../lib/countries";
import type { BookSummary, DecorKind, Figure, Room } from "../types";
import { BY_CONTINENT, placeMagnets, type Placed } from "./Board";
import { MagnetEditor } from "./MagnetEditor";
import { DecorArt, DECOR_SIZE } from "./DecorArt";
import { FigureArt, NameTag } from "./FigureArt";
import { FigureMaker } from "./FigureMaker";
import { MagnetArt } from "./MagnetArt";
import { DECOR, decorName, DEFAULT_BOARD_TITLE, MATERIALS, MAX_DECOR, type SaveState } from "./room";

type Vars = CSSProperties & Record<`--${string}`, string | number>;
type Part = "board" | "case";

interface Props {
  room: Room;
  /** The magnets earned from the person's pages, for the board preview. */
  earned: Earned[];
  /** The books on the shelf, newest first, for the bookcase preview. */
  books: BookSummary[];
  state: SaveState;
  /** On Plus or Crew, so premium figure looks can go on the bookcase. */
  subscribed: boolean;
  onBoard: (board: Partial<Room["board"]>) => void;
  /** Puts a thing on the bookcase; a figure comes with its traits. */
  onAdd: (kind: DecorKind, fig?: Figure) => void;
  onRemoveDecor: (i: number) => void;
  /** Drops a figure from the person's kept figures (it stays on the bookcase if it's standing there). */
  onForgetFigure: (i: number) => void;
  /** Changes the board's magnets: what they say, and the ones the person made. */
  onMagnets: (fn: (list: Room["magnets"]) => Room["magnets"]) => void;
  onRetry: () => void;
  onDone: () => void;
}

const SAVE_LABEL: Record<SaveState, string> = { idle: "", saving: "Saving…", saved: "Saved", error: "Couldn't save" };
const PARTS: { id: Part; name: string; icon: string }[] = [
  { id: "board", name: "Board", icon: "globe" },
  { id: "case", name: "Bookcase", icon: "book" },
];

/**
 * Dressing the library: a preview of the board or the bookcase at the top, a toggle between them, and the options
 * for whichever is showing underneath. The preview follows every change, so it works while the room is covered.
 */
export function DesignPanel({ room, earned, books, state, subscribed, onBoard, onAdd, onRemoveDecor, onForgetFigure, onMagnets, onRetry, onDone }: Props) {
  const placed = placeMagnets(earned, room.magnets);
  const [part, setPart] = useState<Part>("board");
  // The minifigure being made, if any: shown large in the preview while its options are below.
  const [draft, setDraft] = useState<Figure | null>(null);
  const full = room.decor.length >= MAX_DECOR;

  // Escape puts the drawer away, unless a dialog opened over it is the thing being closed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  return (
    <section className="design-panel" aria-labelledby="dp-h">
      <div className="dp-head">
        <h2 id="dp-h" className="sec-h">Design your library</h2>
        <span className={`save-state ${state}`} role="status">
          {SAVE_LABEL[state]}
          {state === "error" && <button type="button" className="link-btn" onClick={onRetry}>Try again</button>}
        </span>
        <button type="button" className="btn small" onClick={onDone}><Icon name="check" />Done</button>
      </div>

      <div className="dp-preview">
        {part === "board" ? <BoardPreview room={room} placed={placed} />
          : draft ? <FigureStage fig={draft} />
          : <CasePreview room={room} books={books} onRemove={onRemoveDecor} />}
      </div>

      <div className="dp-parts view-seg" role="group" aria-label="What to design">
        {PARTS.map((p) => (
          <button key={p.id} type="button" aria-pressed={part === p.id} onClick={() => setPart(p.id)}>
            <Icon name={p.icon} />{p.name}
          </button>
        ))}
      </div>

      <div className="dp-body">
        {part === "board" ? (
          <div className="dp-grid">
            <MagnetEditor placed={placed} onMagnets={onMagnets} />

            <fieldset className="dp-set">
              <legend>Material</legend>
              <div className="dp-swatches">
                {MATERIALS.map((m) => (
                  <label key={m.id} className={`dp-swatch${room.board.material === m.id ? " on" : ""}`}>
                    <input type="radio" name="board-material" checked={room.board.material === m.id} onChange={() => onBoard({ material: m.id })} />
                    <span className={`dp-chip board-${m.id}`} aria-hidden="true" />
                    {m.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="dp-set dp-title">
              <span className="dp-label">Written on the board</span>
              <input className="input" maxLength={40} value={room.board.title} placeholder={DEFAULT_BOARD_TITLE} onChange={(e) => onBoard({ title: e.target.value })} />
            </label>
            <p className="hint">
              A country's magnet fills its holder once you post a page with a photo from there. Tap a magnet on the
              board to open your page from that place.
            </p>
          </div>
        ) : (
          <div className="dp-grid">
            <div className="dp-set">
              <span className="dp-label">Minifigures</span>
              <FigureMaker full={full} subscribed={subscribed} draft={draft} onDraft={setDraft} onPlace={(fig) => onAdd("figure", fig)} />
            </div>
            {!draft && <div className="dp-set dp-things" role="group" aria-labelledby="dp-things-h">
              <span className="dp-label" id="dp-things-h">
                Put on the bookcase <span className="dp-count">{room.decor.length}/{MAX_DECOR}</span>
              </span>
              {(room.figures ?? []).length > 0 && (
                <>
                  <span className="dp-sublabel">Your figures</span>
                  <div className="dp-things-row">
                    {(room.figures ?? []).map((f, i) => {
                      const name = f.name || "Figure";
                      return (
                        <div key={i} className="dp-kept">
                          <button type="button" className="dp-thing" disabled={full} onClick={() => onAdd("figure", f)} aria-label={`Put ${f.name ? `the figure of ${f.name}` : "this figure"} on the bookcase`}>
                            <DecorArt kind="figure" fig={f} />
                            <span aria-hidden="true">{name}</span>
                          </button>
                          <button type="button" className="pv-x dp-kept-x" aria-label={`Delete ${f.name ? `the figure of ${f.name}` : "this figure"} from your figures`} onClick={() => onForgetFigure(i)}>
                            <Icon name="close" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <span className="dp-sublabel">Furniture</span>
                </>
              )}
              <div className="dp-things-row">
                {DECOR.map((d) => (
                  <button key={d.id} type="button" className="dp-thing" disabled={full} onClick={() => onAdd(d.id)} aria-label={`Add a ${d.name.toLowerCase()}`}>
                    <DecorArt kind={d.id} />
                    <span aria-hidden="true">{d.name}</span>
                  </button>
                ))}
              </div>
              <p className="hint">{full ? "The bookcase is full: take something off in the preview to make room. " : ""}Tap the × on a thing in the preview to take it off; drag things along the bookcase itself.</p>
            </div>}
          </div>
        )}
      </div>
    </section>
  );
}

/** The board in miniature: its material, what's written on it, and every country's holder, filled or not. */
function BoardPreview({ room, placed }: { room: Room; placed: Placed[] }) {
  const { material, title } = room.board;
  const got = new Map(placed.map((m) => [m.id, m]));
  return (
    <div className={`pv-board pv-holders board-${material}`} aria-hidden="true">
      <span className="pv-title">{title || DEFAULT_BOARD_TITLE}</span>
      <span className="pv-dots">
        {BY_CONTINENT.flatMap(({ countries }) => countries).map((c) => {
          const m = got.get(c.id);
          return m ? <MagnetArt key={c.id} country={c} text={m.text} compact /> : <i key={c.id} />;
        })}
      </span>
      {material === "chalk" && <span className="board-tray"><i /><i /></span>}
    </div>
  );
}

/** The minifigure being made, standing on a bit of shelf, as large as the preview allows. */
function FigureStage({ fig }: { fig: Figure }) {
  return (
    <div className="pv-figure">
      <svg viewBox="0 0 44 96" role="img" aria-label={fig.name ? `Figure of ${fig.name}` : "Your minifigure"}><FigureArt fig={fig} /></svg>
      {fig.name && <span className="pv-figure-name">{fig.name}</span>}
    </div>
  );
}

/** The top of the bookcase in miniature, with the shelf of books under it; each thing on top can be taken off. */
function CasePreview({ room, books, onRemove }: { room: Room; books: BookSummary[]; onRemove: (i: number) => void }) {
  return (
    <div className="pv-case">
      <div className="pv-top">
        {room.decor.map((d, i) => {
          const name = decorName(d);
          return (
            <span key={i} className="pv-decor" style={{ left: `${d.x}%`, "--dw": DECOR_SIZE[d.k][0] } as Vars}>
              <DecorArt kind={d.k} fig={d.fig} />
              <NameTag fig={d.fig} className="fig-name small" />
              <button type="button" className="pv-x" aria-label={`Take the ${name} off the bookcase`} onClick={() => onRemove(i)}>
                <Icon name="close" />
              </button>
            </span>
          );
        })}
        {room.decor.length === 0 && <span className="pv-empty">Nothing on top yet</span>}
      </div>
      <div className="pv-crown" aria-hidden="true" />
      <div className="pv-shelf" aria-hidden="true">
        {books.slice(0, 14).map((bk) => <i key={bk.id} style={{ "--cloth": bk.design.cloth, "--w": `${Math.round(Math.min(22, 12 + bk.counts.pages * 0.25))}px` } as Vars} />)}
      </div>
    </div>
  );
}
