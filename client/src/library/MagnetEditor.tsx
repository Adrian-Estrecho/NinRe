import { useRef, useState } from "react";
import { useDragScroll } from "../lib/dragScroll";
import { MAGNET_TEXT, suggestionsFor } from "../lib/countries";
import type { Room } from "../types";
import { magnetName, type Placed } from "./Board";
import { MagnetArt } from "./MagnetArt";

type Magnets = Room["magnets"];

/** Sets what a country's magnet says, leaving out words that are blank. Positions aren't used: each has its holder. */
export function withWords(list: Magnets, id: string, text: string): Magnets {
  const rest = list.filter((s) => s.id !== id);
  return text.trim() ? [...rest, { id, x: 0, y: 0, r: 0, text }] : rest;
}

interface Props {
  placed: Placed[];
  onMagnets: (fn: (list: Magnets) => Magnets) => void;
}

/**
 * Writing on the magnets: pick one of the countries earned and write where you went there, from the places on your
 * pages or the ones offered. Each country has one magnet, earned by posting a photo from it.
 */
export function MagnetEditor({ placed, onMagnets }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const row = useRef<HTMLDivElement>(null);
  const m = placed.find((p) => p.id === picked) ?? placed[0] ?? null;
  useDragScroll(row, Boolean(m));
  const write = (text: string) => m && onMagnets((l) => withWords(l, m.id, text));
  const ideas = m ? suggestionsFor(m.country, m.earned) : [];
  const said = m?.text.trim().toLowerCase() ?? "";

  return (
    <div className="dp-set dp-magnets" role="group" aria-labelledby="dp-mag-h">
      <span className="dp-label" id="dp-mag-h">
        Magnets <span className="dp-count">{placed.length}</span>
      </span>

      {m ? (
        <>
          <div className="dp-mag-row" ref={row} role="listbox" aria-label="Choose a magnet to write on" aria-orientation="horizontal">
            {placed.map((p) => (
              <button key={p.id} type="button" role="option" className="dp-mag" aria-selected={p.id === m.id} aria-label={magnetName(p)} onClick={() => setPicked(p.id)}>
                <MagnetArt country={p.country} text={p.text} />
              </button>
            ))}
          </div>

          <div className="dp-mag-edit">
            <div className="dp-mag-big" aria-hidden="true"><MagnetArt country={m.country} text={m.text} /></div>
            <div className="dp-mag-fields">
              <p className="dp-mag-earned">
                <b>{m.country.name}</b>
                <span>Earned {m.earned.first.slice(0, 4)}, {m.earned.pages === 1 ? "1 page" : `${m.earned.pages} pages`} with photos</span>
              </p>
              <label className="dp-mag-field">
                <span className="dp-sublabel">Written on it</span>
                <input className="input" value={m.text} maxLength={MAGNET_TEXT} placeholder={m.country.label} onChange={(e) => write(e.target.value)} />
              </label>
            </div>

            {ideas.length > 0 && (
              <div className="dp-mag-ideas" role="group" aria-label={`Places to write on the ${m.country.name} magnet`}>
                {ideas.map((t) => (
                  <button key={t} type="button" className="dp-idea" aria-pressed={said === t.toLowerCase()} onClick={() => write(t)}>{t}</button>
                ))}
              </div>
            )}

            {m.text && (
              <div className="dp-mag-actions">
                <button type="button" className="btn line small" onClick={() => write("")}>Back to “{m.country.label}”</button>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="hint">
          No magnets yet. Post a page with a photo from a country, say from Palawan or Vigan, and that country's magnet
          fills its spot on the board. Then you can write on it here.
        </p>
      )}
    </div>
  );
}
