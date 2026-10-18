import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { Notes } from "../components/Notes";
import { Stamp } from "../components/Stamp";
import { coordsText, fmtLong, mapsUrl } from "../lib/format";
import { AtlasMap } from "../map/AtlasMap";
import type { NumberedPage, Page } from "../types";

interface Props {
  list: NumberedPage[];
  id: string;
  photo: number;
  canEdit: boolean;
  /** The reader, for notes. Leave out for samples. */
  me?: { id: string; owner: boolean } | null;
  bookId?: string;
  onGo: (id: string, photo?: number) => void;
  onClose: () => void;
  onEdit?: (page: NumberedPage) => void;
  onRemove?: (page: NumberedPage) => Promise<boolean>;
  onPage?: (page: Page) => void;
}

/** An open two-page spread: photos and a mini map on the left, the story and notes on the right. */
export function PageSpread({ list, id, photo, canEdit, me = null, bookId, onGo, onClose, onEdit, onRemove, onPage }: Props) {
  const i = list.findIndex((p) => p.id === id);
  const p = list[i];
  const prev = list[i - 1], next = list[i + 1];
  const [armed, setArmed] = useState(false);
  const [removing, setRemoving] = useState(false);
  const armTimer = useRef(0);
  const box = useRef<HTMLElement>(null);

  useEffect(() => {
    setArmed(false);
    box.current?.closest("dialog")?.scrollTo({ top: 0 });
  }, [id]);
  useEffect(() => () => window.clearTimeout(armTimer.current), []);

  const pins = useMemo(() => (p && p.place.lat != null && p.place.lng != null ? [{ id: p.id, lat: p.place.lat, lng: p.place.lng, n: p.n, label: p.place.name }] : []), [p]);
  const center = useMemo(() => (pins[0] ? { lat: pins[0].lat, lng: pins[0].lng, span: 9 } : null), [pins]);

  if (!p) return null;
  const shown = p.photos[photo] ?? p.photos[0];
  const editable = canEdit && !p.sample && Boolean(onEdit);

  async function remove() {
    if (!onRemove) return;
    if (!armed) {
      setArmed(true);
      window.clearTimeout(armTimer.current);
      armTimer.current = window.setTimeout(() => setArmed(false), 4000);
      return;
    }
    window.clearTimeout(armTimer.current);
    setRemoving(true);
    const ok = await onRemove(p);
    if (!ok) { setRemoving(false); setArmed(false); }
  }

  return (
    <Dialog
      label={`Page ${p.n}: ${p.title}`}
      closeButton
      onRequestClose={onClose}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("input, textarea")) return;
        if (e.key === "ArrowLeft" && prev) { e.preventDefault(); onGo(prev.id); }
        if (e.key === "ArrowRight" && next) { e.preventDefault(); onGo(next.id); }
      }}
    >
      <article className="book fold" key={p.id} ref={box}>
        <div className="left">
          {p.sample && <span className="chip-sample">Sample page</span>}
          <figure className="mount">
            {shown ? (
              <img src={shown.url} alt={shown.caption || `Photo from ${p.place.name}`} />
            ) : (
              <div className="blank">{p.place.code}</div>
            )}
            <figcaption>{shown ? shown.caption : "no photos, just us"}</figcaption>
          </figure>
          {p.photos.length > 1 && (
            <div className="thumbs" role="group" aria-label="Photos on this page">
              {p.photos.map((ph, k) => (
                <button key={ph.id} type="button" aria-current={k === photo} aria-label={`Show photo ${k + 1}${ph.caption ? `: ${ph.caption}` : ""}`} onClick={() => onGo(p.id, k)}>
                  <img src={ph.url} alt="" />
                </button>
              ))}
            </div>
          )}
          {center && <AtlasMap className="mini" pins={pins} center={center} interactive={false} controls={false} label={`Map showing ${p.place.name}`} />}
        </div>

        <div className="right">
          <Stamp page={p} />
          <h2>{p.title}</h2>
          <span className="fulldate">{fmtLong(p.date)} · {p.kind}</span>
          <div className="place">
            <strong>{p.place.name}</strong>
            {p.place.region && <span>{p.place.region}</span>}
            <span className="coords">{coordsText(p.place)}</span>
            <a href={mapsUrl(p.place)} target="_blank" rel="noopener noreferrer">Open in Maps ↗</a>
          </div>
          {p.story.trim() ? (
            <div className="story">{p.story.trim()}</div>
          ) : (
            <div className="story none">No story written yet.{editable ? " Use Edit to add one." : ""}</div>
          )}
          {p.author && <p className="byline">Written by {p.author.name}</p>}
          <Notes page={p} me={me} bookId={bookId} onPage={onPage} />
          <div className="book-foot">
            <div className="turn">
              <button type="button" disabled={!prev} aria-label="Previous page" onClick={() => prev && onGo(prev.id)}><Icon name="left" /></button>
              <span className="folio">— {p.n} —</span>
              <button type="button" disabled={!next} aria-label="Next page" onClick={() => next && onGo(next.id)}><Icon name="right" /></button>
            </div>
            {editable && (
              <div className="actions">
                <button type="button" className="btn line small" onClick={() => onEdit!(p)}>Edit</button>
                {onRemove && (
                  <button type="button" className={`btn small warn${armed ? " armed" : ""}`} disabled={removing} onClick={remove}>
                    {removing ? "Removing…" : armed ? "Tap again to remove" : "Remove"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </article>
    </Dialog>
  );
}
