import { PolaroidStack } from "../components/Polaroids";
import { Stamp } from "../components/Stamp";
import { chapters } from "../lib/book";
import { coordsText, excerpt, plural, roman } from "../lib/format";
import type { NumberedPage, SortOrder } from "../types";

interface Props {
  list: NumberedPage[];
  sample: boolean;
  sort: SortOrder;
  onSort: (s: SortOrder) => void;
  onOpen: (id: string) => void;
}

export function Chapters({ list, sample, sort, onSort, onOpen }: Props) {
  let k = 0;
  return (
    <section id="view-chapters" role="tabpanel" aria-labelledby="tab-chapters">
      <div className="toolbar">
        {sample && (
          <div className="sample-note">
            <span className="chip-sample">Samples</span>
            <span>These four sample pages show how your book will read. They disappear when anyone adds the first real page.</span>
          </div>
        )}
        <div className="seg" role="group" aria-label="Page order">
          <button type="button" aria-pressed={sort === "asc"} onClick={() => onSort("asc")}>Oldest first</button>
          <button type="button" aria-pressed={sort === "desc"} onClick={() => onSort("desc")}>Newest first</button>
        </div>
      </div>

      {chapters(list, sort).map((ch) => {
        const places = new Set(ch.pages.map((p) => p.place.name)).size;
        return (
          <section className="chapter" key={ch.year} aria-labelledby={`ch-${ch.year}`}>
            <div className="chapter-head">
              <div>
                <h2 id={`ch-${ch.year}`}>Chapter {roman(ch.number)}</h2>
                <p><b>{ch.year}</b> · {plural(ch.pages.length, "page")} · {plural(places, "place")}</p>
              </div>
            </div>
            <div className="pages">
              {ch.pages.map((p) => (
                <PageCard key={p.id} page={p} flip={k++ % 2 === 1} onOpen={onOpen} />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

function PageCard({ page: p, flip, onOpen }: { page: NumberedPage; flip: boolean; onOpen: (id: string) => void }) {
  const text = excerpt(p.story);
  return (
    <article className={`spread${flip ? " flip" : ""}`} onClick={() => onOpen(p.id)}>
      {p.sample && <span className="chip-sample">Sample page</span>}
      <div className="leaf photos">
        <PolaroidStack page={p} />
      </div>
      <div className="leaf words">
        <Stamp page={p} />
        <h3 className="ptitle">
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen(p.id); }}>{p.title}</button>
        </h3>
        <div className="place">
          <strong>{p.place.name}</strong>
          {p.place.region && <span>{p.place.region}</span>}
          <span className="coords">{coordsText(p.place)}</span>
        </div>
        <p className="excerpt">{text || <em className="empty-line">No story written yet.</em>}</p>
        <div className="page-meta">
          <span>{p.kind}{p.author ? ` · by ${p.author.name}` : ""}</span>
          <span className="folio">— {p.n} —</span>
          <span>{p.notes.length > 0 && <span className="note-count"><i aria-hidden="true" />{p.notes.length} {p.notes.length === 1 ? "note" : "notes"}</span>}</span>
        </div>
      </div>
    </article>
  );
}
