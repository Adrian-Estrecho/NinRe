import { useMemo, useState } from "react";
import { isPinned } from "../lib/book";
import { fmtShort, plural } from "../lib/format";
import { AtlasMap } from "../map/AtlasMap";
import type { NumberedPage } from "../types";

interface Props {
  list: NumberedPage[];
  sample: boolean;
  onOpen: (id: string) => void;
}

export function AtlasView({ list, sample, onOpen }: Props) {
  const [hot, setHot] = useState<string | null>(null);
  const pinned = useMemo(() => list.filter(isPinned), [list]);
  const pins = useMemo(
    () => pinned.map((p) => ({ id: p.id, lat: p.place.lat, lng: p.place.lng, n: p.n, label: `${p.n}. ${p.place.name}: ${p.title}` })),
    [pinned],
  );
  const places = new Set(pinned.map((p) => `${p.place.lat.toFixed(2)},${p.place.lng.toFixed(2)}`)).size;

  return (
    <section id="view-atlas" role="tabpanel" aria-labelledby="tab-atlas">
      <div className="atlas-grid">
        <div className="map-sheet">
          <AtlasMap pins={pins} route hot={hot} fitKey={pins.length} onPin={onOpen} />
          <svg className="compass" viewBox="-30 -38 60 68" aria-hidden="true">
            <circle r="26" fill="none" stroke="currentColor" strokeWidth=".8" />
            <circle r="21" fill="none" stroke="currentColor" strokeWidth=".5" strokeDasharray="1 2" />
            <path d="M0-24L4 0 0 24-4 0Z" fill="currentColor" opacity=".25" />
            <path d="M0-24L4 0H-4Z" fill="var(--red)" />
            <path d="M-24 0L0-3 24 0 0 3Z" fill="currentColor" opacity=".45" />
            <text y="-29" fontSize="7" textAnchor="middle" fill="currentColor" fontFamily="DM Mono, monospace">N</text>
          </svg>
          <h2 className="cartouche">
            Places we've been
            <small>{plural(pinned.length, "pin")} · {plural(places, "place")}{sample ? " · samples" : ""}</small>
          </h2>
        </div>
        <aside className="places" aria-label="Places we've been, in order">
          <h3>The route so far</h3>
          <p className="mono">In the order it happened. Tap one to open its page.</p>
          <ol onPointerLeave={() => setHot(null)}>
            {pinned.length ? pinned.map((p) => (
              <li key={p.id}>
                <button type="button" className={hot === p.id ? "hot" : ""} onClick={() => onOpen(p.id)} onPointerEnter={() => setHot(p.id)} onFocus={() => setHot(p.id)}>
                  <span className="num">{p.n}</span>
                  <span>
                    <span className="pn">{p.place.name}</span>
                    <span className="pt">{p.title}</span>
                    <span className="pd">{fmtShort(p.date)} · {p.place.code}</span>
                  </span>
                </button>
              </li>
            )) : (
              <li className="empty-line" style={{ paddingTop: 12 }}>No pinned places yet. Add a page with a place and it shows up here.</li>
            )}
          </ol>
        </aside>
      </div>
    </section>
  );
}
