import { useState, type CSSProperties, type FormEvent } from "react";
import { api, errorText } from "../api";
import { jitter } from "../lib/format";
import type { Note, NoteColor, Page } from "../types";

const COLORS: { id: NoteColor; name: string; hex: string }[] = [
  { id: "butter", name: "Butter", hex: "#fff3c4" },
  { id: "blush", name: "Blush", hex: "#ffd6df" },
  { id: "sky", name: "Sky", hex: "#d3e8ff" },
  { id: "mint", name: "Mint", hex: "#d2f3df" },
  { id: "lilac", name: "Lilac", hex: "#e6dcff" },
];

interface Props {
  page: Page;
  /** Who is reading; null for samples and read-only views. */
  me: { id: string; owner: boolean } | null;
  bookId?: string;
  onPage?: (p: Page) => void;
}

/** Sticky notes on a page, each signed by whoever wrote it. */
export function Notes({ page, me, bookId, onPage }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const canWrite = Boolean(me && bookId && onPage && !page.sample);
  if (!page.notes.length && !canWrite) return null;

  return (
    <section className="notes" aria-label="Notes">
      <h3>Notes{page.notes.length ? ` · ${page.notes.length}` : ""}</h3>
      <div className="note-wall">
        {page.notes.map((n) =>
          editing === n.id && canWrite ? (
            <NoteForm key={n.id} start={n} bookId={bookId!} pageId={page.id} onDone={(p) => { setEditing(null); if (p) onPage!(p); }} />
          ) : (
            <NoteCard key={n.id} note={n} canEdit={canWrite && n.author?.id === me?.id} canRemove={canWrite && (n.author?.id === me?.id || Boolean(me?.owner))}
              onEdit={() => setEditing(n.id)} onRemove={async () => onPage!(await api.deleteNote(bookId!, page.id, n.id))} />
          ),
        )}
        {canWrite && editing == null && <NoteForm bookId={bookId!} pageId={page.id} onDone={(p) => p && onPage!(p)} />}
      </div>
    </section>
  );
}

function NoteCard({ note, canEdit, canRemove, onEdit, onRemove }: { note: Note; canEdit: boolean; canRemove: boolean; onEdit: () => void; onRemove: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");
  return (
    <figure className="note" data-c={note.color} style={{ "--nr": `${jitter(note.id, "n", -3, 3).toFixed(1)}deg` } as CSSProperties}>
      <p>{note.text}</p>
      {error && <span className="err">{error}</span>}
      <footer>
        <span>— {note.author?.name ?? "A former member"}</span>
        {(canEdit || canRemove) && (
          <span>
            {canEdit && <button type="button" onClick={onEdit}>Edit</button>}
            {canRemove && (
              <button type="button" onBlur={() => setArmed(false)} onClick={async () => {
                if (!armed) return setArmed(true);
                try { await onRemove(); } catch (err) { setError(errorText(err, "Couldn't remove it.")); setArmed(false); }
              }}>{armed ? "Sure?" : "Remove"}</button>
            )}
          </span>
        )}
      </footer>
    </figure>
  );
}

function NoteForm({ start, bookId, pageId, onDone }: { start?: Note; bookId: string; pageId: string; onDone: (p: Page | null) => void }) {
  const [text, setText] = useState(start?.text ?? "");
  const [color, setColor] = useState<NoteColor>(start?.color ?? "butter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const id = `nf-${start?.id ?? "new"}`;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const page = start ? await api.editNote(bookId, pageId, start.id, text.trim(), color) : await api.addNote(bookId, pageId, text.trim(), color);
      setText("");
      setBusy(false);
      onDone(page);
    } catch (err) {
      setBusy(false);
      setError(errorText(err, "Couldn't stick the note. Try again."));
    }
  }

  return (
    <form className="note-form" onSubmit={submit}>
      <label htmlFor={id} className="sr-only">{start ? "Edit your note" : "Write a note on this page"}</label>
      <textarea id={id} maxLength={280} placeholder={start ? "" : "Leave a note on this page…"} value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row">
        <div className="note-colors" role="radiogroup" aria-label="Note colour">
          {COLORS.map((c) => (
            <label key={c.id} title={c.name}>
              <input type="radio" name={`${id}-c`} checked={color === c.id} onChange={() => setColor(c.id)} />
              <span style={{ background: c.hex }} />
              <span className="sr-only">{c.name}</span>
            </label>
          ))}
        </div>
        <span>
          {start && <button type="button" className="btn small line" onClick={() => onDone(null)} disabled={busy}>Cancel</button>}{" "}
          <button type="submit" className="btn small" disabled={busy || !text.trim()}>{busy ? "Sticking…" : start ? "Save" : "Stick it on"}</button>
        </span>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
    </form>
  );
}
