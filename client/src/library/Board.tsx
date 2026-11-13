import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useDragScroll } from "../lib/dragScroll";
import { CONTINENTS, COUNTRIES, spotNamed, type Continent, type Country, type Earned } from "../lib/countries";
import { prefs } from "../lib/prefs";
import { navigate } from "../router";
import type { Room } from "../types";
import { MagnetArt } from "./MagnetArt";
import { DEFAULT_BOARD_TITLE } from "./room";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** A country's magnet as it shows: what's written on it, and the person's pages from there. */
export interface Placed {
  /** The country's code, which the magnet is saved under. */
  id: string;
  country: Country;
  /** What the person wrote on it, or "" for the country's name. */
  text: string;
  earned: Earned;
}

/** The magnets earned, each with what the person wrote on it. */
export function placeMagnets(earned: Earned[], saved: Room["magnets"]): Placed[] {
  const words = new Map((saved ?? []).map((m) => [m.id, m.text ?? ""]));
  return earned.map((e) => ({ id: e.country.id, country: e.country, text: words.get(e.country.id) ?? "", earned: e }));
}

/** The page a tap on a magnet opens: the place its words name, or else the latest page from its country. */
export const pageOf = (m: Placed) => spotNamed(m.earned, m.text) ?? m.earned;

/** What a magnet says, for screen readers and its tooltip. */
export function magnetName(m: Placed) {
  return m.text && m.text.toLowerCase() !== m.country.label.toLowerCase() ? `${m.text}, ${m.country.name}` : m.country.name;
}

/** The world, a continent at a time, in the board's order. */
export const BY_CONTINENT = CONTINENTS.map((continent) => ({ continent, countries: COUNTRIES.filter((c) => c.continent === continent) }));

interface Props {
  room: Room;
  earned: Earned[];
  /** False while the room is still loading, so the board doesn't flash empty. */
  ready: boolean;
}

/**
 * The board on the wall: a holder for every country in the world, a continent at a time. A page set in a country with
 * a photo on it earns that country's souvenir magnet, which fills its holder; a tap on it opens a page from there.
 */
export function Board({ room, earned, ready }: Props) {
  const { material, title } = room.board;
  const placed = new Map(placeMagnets(earned, room.magnets).map((m) => [m.id, m]));

  // The whole world, or one continent; kept per device.
  const tabs = useRef<HTMLDivElement>(null);
  useDragScroll(tabs);
  const [only, setOnly] = useState<Continent | "all">(() => {
    const v = prefs.get<string>("boardContinent", "all");
    return CONTINENTS.includes(v as Continent) ? (v as Continent) : "all";
  });
  const pick = (v: Continent | "all") => {
    setOnly(v);
    prefs.set("boardContinent", v);
  };
  const shown = only === "all" ? BY_CONTINENT : BY_CONTINENT.filter((g) => g.continent === only);
  const gotIn = (countries: Country[]) => countries.filter((c) => placed.has(c.id)).length;

  // Magnets this device hasn't shown before arrive with a little flourish, once: only counted as seen once on show.
  const [seen] = useState(() => new Set(prefs.get<string[]>("magnetsSeen", [])));
  const ids = shown.flatMap((g) => g.countries).filter((c) => placed.has(c.id)).map((c) => c.id).join(",");
  useEffect(() => {
    if (!ready || !ids) return;
    prefs.set("magnetsSeen", [...new Set([...seen, ...ids.split(",")])]);
  }, [ready, ids]);

  const open = (m: Placed) => {
    const p = pageOf(m);
    navigate(`/app/book/${p.bookId}?page=${encodeURIComponent(p.pageId)}`);
  };
  let fresh = 0;

  return (
    <div className={`board board-${material} holders-board`} role="group" aria-label={`${title || DEFAULT_BOARD_TITLE}: ${placed.size} of ${COUNTRIES.length} countries`}>
      <div className="board-head">
        <p className="board-title">{title || DEFAULT_BOARD_TITLE}</p>
        <span className="board-tally" aria-hidden="true"><b>{ready ? placed.size : "–"}</b> / {COUNTRIES.length}</span>
      </div>
      <div className="board-tabs" ref={tabs} role="group" aria-label="Show countries in">
        <button type="button" aria-pressed={only === "all"} onClick={() => pick("all")}>
          All <span>{placed.size}/{COUNTRIES.length}</span>
        </button>
        {BY_CONTINENT.map(({ continent, countries }) => (
          <button key={continent} type="button" aria-pressed={only === continent} onClick={() => pick(continent)}>
            {continent} <span>{gotIn(countries)}/{countries.length}</span>
          </button>
        ))}
      </div>
      {ready && placed.size === 0 && (
        <p className="board-note">Post a page with a photo from a country, and its magnet fills its spot here.</p>
      )}
      {shown.map(({ continent, countries }) => {
        const got = gotIn(countries);
        return (
          <section key={continent} className="holders" aria-label={`${continent}: ${got} of ${countries.length}`}>
            {only === "all" && <h3 className="holders-h" aria-hidden="true">{continent} <span>{got}/{countries.length}</span></h3>}
            <ul className="holders-grid">
              {countries.map((c) => {
                const m = placed.get(c.id);
                if (!m) {
                  return (
                    <li key={c.id} className="holder" title={`${c.name}: not yet`}>
                      <span aria-hidden="true">{c.id.toUpperCase()}</span>
                      <span className="sr-only">{c.name}, not yet</span>
                    </li>
                  );
                }
                const isNew = ready && !seen.has(c.id);
                return (
                  <li key={c.id} className="holder filled">
                    <button
                      type="button"
                      className={`magnet${isNew ? " fresh" : ""}`}
                      style={isNew ? ({ "--i": fresh++ } as Vars) : undefined}
                      title={`${magnetName(m)}. First visited ${m.earned.first.slice(0, 4)}.`}
                      aria-label={`${magnetName(m)}, first visited ${m.earned.first.slice(0, 4)}. Opens its page.`}
                      onClick={() => open(m)}
                    >
                      <MagnetArt country={c} text={m.text} compact />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {material === "chalk" && <span className="board-tray" aria-hidden="true"><i /><i /></span>}
    </div>
  );
}
