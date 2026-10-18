import type { CSSProperties } from "react";
import { fmtShort, jitter } from "../lib/format";
import type { NumberedPage, SortOrder } from "../types";

interface Props {
  list: NumberedPage[];
  sort: SortOrder;
  onOpen: (id: string, photo: number) => void;
}

export function Album({ list, sort, onOpen }: Props) {
  const pages = sort === "asc" ? list : list.slice().reverse();
  const items = pages.flatMap((p) => p.photos.map((photo, i) => ({ p, photo, i })));

  return (
    <section id="view-album" role="tabpanel" aria-labelledby="tab-album">
      {items.length ? (
        <div className="album">
          {items.map(({ p, photo, i }) => (
            <figure
              key={`${p.id}-${photo.id}`}
              tabIndex={0}
              role="button"
              aria-label={`Open ${p.title}`}
              style={{ "--r": `${jitter(p.id, `al${i}`, -3, 3).toFixed(1)}deg` } as CSSProperties}
              onClick={() => onOpen(p.id, i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpen(p.id, i);
                }
              }}
            >
              <img src={photo.url} alt={photo.caption || `Photo from ${p.place.name}`} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
              <figcaption>
                {photo.caption && <span className="cap">{photo.caption}</span>}
                <span className="meta">{fmtShort(p.date)} · {p.place.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="empty-line" style={{ marginTop: 30 }}>No photos yet. Photos you add to pages are collected here.</p>
      )}
    </section>
  );
}
