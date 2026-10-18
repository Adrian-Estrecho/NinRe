import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import type { NumberedPage } from "../types";
import { Book3D } from "./Book3D";
import {
  ACCENTS, CLOTHS, EMBLEMS, FOILS, LAYOUTS, MAX_STICKERS, PAPERS, PHOTO_STYLES, PRESETS, STICKER_KINDS, TEXTURES, TITLE_FONTS,
  clamp, normalizeDesign, type Design, type Sticker, type StickerKind,
} from "./design";
import { EmblemArt } from "./emblems";
import { PagePreview } from "./PagePreview";
import { StickerArt } from "./stickers";

type Tab = "cover" | "stickers" | "pages";

interface Props {
  design: Design;
  onChange: (d: Design) => void;
  title: string;
  subtitle?: string;
  /** Photos from the book that can go on the cover. */
  photos?: { id: string; url: string; caption: string }[];
  /** The page dressed in the paper and photo style, as a preview. */
  previewPage: NumberedPage;
  /** Extra controls under the panel, e.g. Save or a sign-up prompt. */
  footer?: ReactNode;
  /** Shown above the tabs, e.g. a title field. */
  header?: ReactNode;
  bookWidth?: string;
  idPrefix?: string;
  /** Things laid on the stage around the book, e.g. tape holding a paper mat. */
  stageDecor?: ReactNode;
}

const NAME = Object.fromEntries(STICKER_KINDS.map((s) => [s.k, s.name])) as Record<StickerKind, string>;

/**
 * The book designer: cloth, foil, type and emblem for the cover; stickers you drag onto it;
 * paper, photo style and ink for the pages. Everything previews live on a book you can turn.
 */
export function CoverDesigner({ design, onChange, title, subtitle, photos = [], previewPage, footer, header, bookWidth = "min(330px, 62vw)", idPrefix = "dz", stageDecor }: Props) {
  const [tab, setTab] = useState<Tab>("cover");
  const [selected, setSelected] = useState<number | null>(null);
  const [ghost, setGhost] = useState<{ k: StickerKind; x: number; y: number } | null>(null);
  const [hot, setHot] = useState(false);
  const [announce, setAnnounce] = useState("");
  const coverRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const live = useRef(design);
  live.current = design;

  const set = (patch: Partial<Design>) => onChange(normalizeDesign({ ...live.current, ...patch }));
  const setStickers = (fn: (list: Sticker[]) => Sticker[]) => set({ stickers: fn(live.current.stickers) });
  const photoUrl = design.coverPhoto ? photos.find((p) => p.id === design.coverPhoto)?.url ?? null : null;

  useEffect(() => {
    if (tab !== "stickers") setSelected(null);
  }, [tab]);
  useEffect(() => {
    if (selected != null && selected >= design.stickers.length) setSelected(null);
  }, [design.stickers.length, selected]);

  /* ---------- Stickers ---------- */

  const full = design.stickers.length >= MAX_STICKERS;

  function pctAt(clientX: number, clientY: number) {
    const r = coverRef.current?.getBoundingClientRect();
    if (!r) return null;
    const x = ((clientX - r.left) / r.width) * 100, y = ((clientY - r.top) / r.height) * 100;
    return { x, y, inside: x >= 0 && x <= 100 && y >= 0 && y <= 100 };
  }

  function addSticker(k: StickerKind, x?: number, y?: number) {
    if (live.current.stickers.length >= MAX_STICKERS) return;
    const n = live.current.stickers.length;
    const s: Sticker = {
      k,
      x: clamp(x ?? 50 + ((n * 37) % 40) - 20, 4, 96),
      y: clamp(y ?? 46 + ((n * 23) % 36) - 18, 4, 96),
      r: Math.round((((n * 53) % 30) - 15)),
      s: 1,
    };
    setStickers((l) => [...l, s]);
    setSelected(n);
    setAnnounce(`${NAME[k]} stuck on the cover.`);
  }

  function trayDown(k: StickerKind, e: RPointerEvent<HTMLButtonElement>) {
    if (full || e.button !== 0) return;
    const id = e.pointerId, sx = e.clientX, sy = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) moved = true;
      if (moved) {
        ev.preventDefault();
        setGhost({ k, x: ev.clientX, y: ev.clientY });
        setHot(Boolean(pctAt(ev.clientX, ev.clientY)?.inside));
      }
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      setGhost(null);
      setHot(false);
      if (ev.type === "pointercancel" || !moved) return; // a plain tap is handled by onClick
      dragged.current = true;
      window.setTimeout(() => { dragged.current = false; }, 0);
      const p = pctAt(ev.clientX, ev.clientY);
      if (p?.inside) addSticker(k, p.x, p.y);
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  function stickerDown(i: number, e: RPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    e.stopPropagation();
    setSelected(i);
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const start = pctAt(e.clientX, e.clientY);
    const from = live.current.stickers[i];
    if (!start || !from) return;
    const move = (ev: globalThis.PointerEvent) => {
      const p = pctAt(ev.clientX, ev.clientY);
      if (!p) return;
      const x = clamp(from.x + p.x - start.x, 0, 100), y = clamp(from.y + p.y - start.y, 0, 100);
      setStickers((l) => l.map((s, j) => (j === i ? { ...s, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : s)));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  const edit = (i: number, fn: (s: Sticker) => Partial<Sticker>) =>
    setStickers((l) => l.map((s, j) => (j === i ? { ...s, ...fn(s) } : s)));
  const turn = (i: number, by: number) => edit(i, (s) => ({ r: ((s.r + by + 540) % 360) - 180 }));
  const grow = (i: number, by: number) => edit(i, (s) => ({ s: Math.round(clamp(s.s + by, 0.5, 2) * 100) / 100 }));
  function peel(i: number) {
    const k = live.current.stickers[i]?.k;
    setStickers((l) => l.filter((_, j) => j !== i));
    setSelected(null);
    if (k) setAnnounce(`${NAME[k]} peeled off.`);
  }

  function stickerKeys(i: number, e: KeyboardEvent<HTMLButtonElement>) {
    const step = e.shiftKey ? 5 : 1.5;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      edit(i, (s) => ({ x: clamp(s.x + dx, 0, 100), y: clamp(s.y + dy, 0, 100) }));
    } else if (e.key === "[" || e.key === "]") {
      e.preventDefault();
      turn(i, e.key === "[" ? -15 : 15);
    } else if (e.key === "+" || e.key === "=" || e.key === "-") {
      e.preventDefault();
      grow(i, e.key === "-" ? -0.1 : 0.1);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      peel(i);
    } else if (e.key === "Escape") {
      setSelected(null);
    }
  }

  const stickerLayer = tab === "stickers" && (
    <div ref={coverRef} className={`sticker-edit${hot ? " hot" : ""}`} onPointerDown={() => setSelected(null)}>
      {design.stickers.map((s, i) => (
        <button
          key={i}
          type="button"
          className={`sticker${selected === i ? " sel" : ""}`}
          style={{ left: `${s.x}%`, top: `${s.y}%`, "--sr": `${s.r}deg`, "--ss": s.s } as CSSProperties}
          aria-label={`${NAME[s.k]} sticker, ${i + 1} of ${design.stickers.length}. Arrow keys move it, [ and ] turn it, plus and minus resize it, Delete peels it off.`}
          aria-pressed={selected === i}
          onPointerDown={(e) => stickerDown(i, e)}
          onFocus={() => setSelected(i)}
          onKeyDown={(e) => stickerKeys(i, e)}
        >
          <StickerArt kind={s.k} />
        </button>
      ))}
    </div>
  );

  /* ---------- Layout ---------- */

  const swatch = (on: boolean) => (on ? "sw on" : "sw");
  const radio = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="designer">
      <div className={`designer-stage stage-${tab}`}>
        {stageDecor}
        {tab === "pages" ? (
          <div className="stage-pages">
            <PagePreview design={design} page={previewPage} />
          </div>
        ) : (
          <Book3D
            design={design}
            title={title || "Our Book of Travels"}
            subtitle={subtitle}
            photoUrl={photoUrl}
            width={bookWidth}
            pose={tab === "stickers" ? "front" : "angled"}
            hideStickers={tab === "stickers"}
            overlay={stickerLayer || undefined}
            label={tab === "stickers" ? `The cover of ${title}, face on for placing stickers.` : undefined}
          />
        )}
        <p className="stage-hint" aria-hidden="true">
          {tab === "cover" ? "Drag the book to turn it" : tab === "stickers" ? (design.stickers.length ? "Drag stickers to move them" : "Drag a sticker onto the cover") : "A page, dressed in your paper and photo style"}
        </p>
      </div>

      <div className="designer-panel">
        {header}
        <div className="presets" role="group" aria-label="Start from a look">
          {PRESETS.map((p) => (
            <button key={p.name} type="button" className="preset" onClick={() => set({ ...p.design, stickers: live.current.stickers, coverPhoto: live.current.coverPhoto })}>
              <span className="preset-dot" style={{ background: p.design.cloth }} />
              {p.name}
            </button>
          ))}
        </div>

        <div className="dtabs" role="tablist" aria-label="What to design">
          {(["cover", "stickers", "pages"] as Tab[]).map((t) => (
            <button key={t} type="button" role="tab" id={`${idPrefix}-tab-${t}`} aria-controls={`${idPrefix}-panel-${t}`} aria-selected={tab === t} onClick={() => setTab(t)}>
              {t === "cover" ? "Cover" : t === "stickers" ? `Stickers${design.stickers.length ? ` · ${design.stickers.length}` : ""}` : "Pages"}
            </button>
          ))}
        </div>

        {tab === "cover" && (
          <div className="dgroup-list" role="tabpanel" id={`${idPrefix}-panel-cover`} aria-labelledby={`${idPrefix}-tab-cover`}>
            <fieldset className="dgroup">
              <legend>Cloth</legend>
              <div className="swatches">
                {CLOTHS.map((c) => (
                  <label key={c.hex} className={swatch(design.cloth === c.hex)} title={c.name}>
                    <input type="radio" name={radio("cloth")} checked={design.cloth === c.hex} onChange={() => set({ cloth: c.hex })} />
                    <span className="cloth-chip" style={{ background: c.hex }} />
                    <span className="sr-only">{c.name}</span>
                  </label>
                ))}
                <label className={`${swatch(!CLOTHS.some((c) => c.hex === design.cloth))} custom`} title="Your own colour">
                  <input type="color" value={design.cloth} onChange={(e) => set({ cloth: e.target.value })} aria-label="Your own cloth colour" />
                  <span className="cloth-chip any" style={{ background: CLOTHS.some((c) => c.hex === design.cloth) ? undefined : design.cloth }} />
                </label>
              </div>
            </fieldset>

            <fieldset className="dgroup">
              <legend>Finish</legend>
              <div className="chips-row">
                {TEXTURES.map((t) => (
                  <label key={t.id} className="pill">
                    <input type="radio" name={radio("tex")} checked={design.texture === t.id} onChange={() => set({ texture: t.id })} />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="dgroup">
              <legend>Foil</legend>
              <div className="swatches">
                {FOILS.map((f) => (
                  <label key={f.id} className={swatch(design.foil === f.id)} title={f.name}>
                    <input type="radio" name={radio("foil")} checked={design.foil === f.id} onChange={() => set({ foil: f.id })} />
                    <span className="foil-chip" style={{ background: `linear-gradient(135deg, ${f.lo}, ${f.hi} 40%, ${f.mid} 60%, ${f.lo})` }} />
                    <span className="sr-only">{f.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="dgroup">
              <legend>Title type</legend>
              <div className="chips-row">
                {TITLE_FONTS.map((f) => (
                  <label key={f.id} className="pill font">
                    <input type="radio" name={radio("font")} checked={design.titleFont === f.id} onChange={() => set({ titleFont: f.id })} />
                    <span style={{ fontFamily: f.family, fontStyle: f.id === "classic" ? "italic" : undefined, fontWeight: f.id === "modern" ? 800 : undefined }}>{f.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="dgroup">
              <legend>Layout</legend>
              <div className="chips-row">
                {LAYOUTS.map((l) => (
                  <label key={l.id} className="pill layout">
                    <input type="radio" name={radio("layout")} checked={design.layout === l.id} onChange={() => set({ layout: l.id })} />
                    <span><i className={`lay lay-${l.id}`} aria-hidden="true" />{l.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="dgroup">
              <legend>Emblem</legend>
              <div className="chips-row emblems">
                {EMBLEMS.map((m) => (
                  <label key={m.id} className="pill icon" title={m.name}>
                    <input type="radio" name={radio("emblem")} checked={design.emblem === m.id} onChange={() => set({ emblem: m.id })} />
                    <span>{m.id === "none" ? "None" : <EmblemArt emblem={m.id} />}<span className="sr-only">{m.id === "none" ? "" : m.name}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>

            {photos.length > 0 && (
              <fieldset className="dgroup">
                <legend>Cover photo</legend>
                <div className="photo-pick">
                  <label className="pill">
                    <input type="radio" name={radio("photo")} checked={!design.coverPhoto} onChange={() => set({ coverPhoto: null })} />
                    <span>No photo</span>
                  </label>
                  {photos.slice(0, 24).map((p) => (
                    <label key={p.id} className={`thumb${design.coverPhoto === p.id ? " on" : ""}`}>
                      <input type="radio" name={radio("photo")} checked={design.coverPhoto === p.id} onChange={() => set({ coverPhoto: p.id })} />
                      <img src={p.url} alt={p.caption || "A photo from the book"} loading="lazy" />
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}

        {tab === "stickers" && (
          <div className="dgroup-list" role="tabpanel" id={`${idPrefix}-panel-stickers`} aria-labelledby={`${idPrefix}-tab-stickers`}>
            <p className="dhelp">{full ? `That's all ${MAX_STICKERS} stickers. Peel one off to add another.` : "Drag a sticker onto the cover, or tap one to stick it on."}</p>
            <div className="tray" role="group" aria-label="Sticker sheet">
              {STICKER_KINDS.map((s) => (
                <button key={s.k} type="button" className="tray-item" disabled={full} aria-label={`Add ${s.name}`} title={s.name}
                  onPointerDown={(e) => trayDown(s.k, e)} onClick={() => !dragged.current && addSticker(s.k)}>
                  <StickerArt kind={s.k} />
                </button>
              ))}
            </div>
            <div className="sel-bar" aria-live="polite">
              {selected != null && design.stickers[selected] ? (
                <>
                  <span className="sel-name">{NAME[design.stickers[selected].k]}</span>
                  <button type="button" className="btn line small icon" onClick={() => turn(selected, -15)} aria-label="Turn left"><Icon name="rotl" /></button>
                  <button type="button" className="btn line small icon" onClick={() => turn(selected, 15)} aria-label="Turn right"><Icon name="rotr" /></button>
                  <button type="button" className="btn line small icon" onClick={() => grow(selected, -0.15)} aria-label="Smaller"><Icon name="smaller" /></button>
                  <button type="button" className="btn line small icon" onClick={() => grow(selected, 0.15)} aria-label="Bigger"><Icon name="bigger" /></button>
                  <button type="button" className="btn line small" onClick={() => peel(selected)}>Peel off</button>
                </>
              ) : (
                <span className="dhelp">{design.stickers.length ? "Tap a sticker on the cover to turn, resize or peel it." : "Your cover has no stickers yet."}</span>
              )}
            </div>
            {design.stickers.length > 0 && (
              <button type="button" className="link-btn" onClick={() => { setStickers(() => []); setAnnounce("All stickers peeled off."); }}>Peel off all stickers</button>
            )}
          </div>
        )}

        {tab === "pages" && (
          <div className="dgroup-list" role="tabpanel" id={`${idPrefix}-panel-pages`} aria-labelledby={`${idPrefix}-tab-pages`}>
            <fieldset className="dgroup">
              <legend>Paper</legend>
              <div className="papers">
                {PAPERS.map((p) => (
                  <label key={p.id} className={`paper-chip${design.paper === p.id ? " on" : ""}`}>
                    <input type="radio" name={radio("paper")} checked={design.paper === p.id} onChange={() => set({ paper: p.id })} />
                    <span className={`paper-swatch ps-${p.id}`} aria-hidden="true" />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="dgroup">
              <legend>Photos</legend>
              <div className="chips-row">
                {PHOTO_STYLES.map((p) => (
                  <label key={p.id} className="pill">
                    <input type="radio" name={radio("photostyle")} checked={design.photo === p.id} onChange={() => set({ photo: p.id })} />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="dgroup">
              <legend>Ink for postmarks and pins</legend>
              <div className="swatches">
                {ACCENTS.map((a) => (
                  <label key={a.id} className={swatch(design.accent === a.id)} title={a.name}>
                    <input type="radio" name={radio("accent")} checked={design.accent === a.id} onChange={() => set({ accent: a.id })} />
                    <span className="cloth-chip round" style={{ background: a.hex }} />
                    <span className="sr-only">{a.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {footer}
        <p className="sr-only" aria-live="polite">{announce}</p>
      </div>

      {ghost && (
        <span className="sticker-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <StickerArt kind={ghost.k} />
        </span>
      )}
    </div>
  );
}
