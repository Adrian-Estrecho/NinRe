import { useState, type FormEvent } from "react";
import { api, errorText } from "../api";
import { Dialog } from "../components/Dialog";
import type { Cover } from "../types";

const LABELS = ["Together since", "Friends since", "Travelling since", "Married since"];

interface Props {
  bookId: string;
  cover: Cover;
  namesHint: string;
  onClose: () => void;
  onSaved: (cover: Cover) => void;
}

export function CoverForm({ bookId, cover, namesHint, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(cover.title);
  const [subtitle, setSubtitle] = useState(cover.subtitle);
  const [sinceLabel, setSinceLabel] = useState(LABELS.includes(cover.sinceLabel) ? cover.sinceLabel : LABELS[0]);
  const [since, setSince] = useState(cover.since);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSaved(await api.saveCover(bookId, { title: title.trim(), subtitle: subtitle.trim(), since, sinceLabel }));
    } catch (err) {
      setBusy(false);
      setError(errorText(err, "Couldn't save the cover. Try again."));
    }
  }

  return (
    <Dialog labelledBy="cover-title" onRequestClose={() => !busy && onClose()}>
      <form className="panel" onSubmit={save} noValidate>
        <h2 id="cover-title">Edit the cover</h2>
        <p className="sub">Cloth, foil and stickers are in Design.</p>
        <div className="fld">
          <label htmlFor="c-title">Title</label>
          <input type="text" id="c-title" maxLength={60} autoComplete="off" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="fld">
          <label htmlFor="c-names">Names on the cover</label>
          <input type="text" id="c-names" maxLength={60} autoComplete="off" placeholder={namesHint} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          <span className="hint">Leave it empty to list everyone in the book.</span>
        </div>
        <div className="row2">
          <div className="fld">
            <label htmlFor="c-label">Date label</label>
            <select id="c-label" value={sinceLabel} onChange={(e) => setSinceLabel(e.target.value)}>
              {LABELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="fld">
            <label htmlFor="c-since">Date</label>
            <input type="date" id="c-since" value={since} onChange={(e) => setSince(e.target.value)} />
          </div>
        </div>
        <span className="hint">The header counts days from this date.</span>
        {error && <p className="err" role="alert">{error}</p>}
        <div className="panel-foot">
          <button type="button" className="btn line" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn" disabled={busy}>{busy ? "Saving…" : "Save cover"}</button>
        </div>
      </form>
    </Dialog>
  );
}
