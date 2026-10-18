import { useState, type FormEvent } from "react";
import { ApiError, api, errorText } from "../api";
import { Book3D } from "../book/Book3D";
import { DEFAULT_DESIGN, PRESETS, normalizeDesign, type Design } from "../book/design";
import { CoverFace } from "../book/CoverFace";
import { Dialog } from "../components/Dialog";
import { clearPending, readPending } from "../lib/pending";
import { Link } from "../router";
import { useSession } from "../session";

const LABELS = ["Together since", "Friends since", "Travelling since", "Married since"];

/** Name a new book and pick a starting look. The full designer opens from the book itself. */
export function NewBookDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { me } = useSession();
  const pending = readPending();
  const looks = [
    ...(pending?.design ? [{ name: "The one you designed", design: pending.design }] : []),
    ...PRESETS.map((p) => ({ name: p.name, design: normalizeDesign({ ...DEFAULT_DESIGN, ...p.design }) })),
  ];
  const [title, setTitle] = useState(pending?.title ?? "");
  const [subtitle, setSubtitle] = useState("");
  const [sinceLabel, setSinceLabel] = useState(LABELS[0]);
  const [since, setSince] = useState("");
  const [look, setLook] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; upgrade?: boolean } | null>(null);
  const design: Design = looks[look].design;

  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const book = await api.createBook({ title: title.trim(), subtitle: subtitle.trim(), since, sinceLabel }, design);
      clearPending();
      onCreated(book.id);
    } catch (err) {
      setBusy(false);
      setError({ text: errorText(err, "Couldn't make the book. Try again."), upgrade: err instanceof ApiError && err.status === 402 });
    }
  }

  return (
    <Dialog labelledBy="nb-title" onRequestClose={() => !busy && onClose()} closeButton>
      <form className="panel wide newbook" onSubmit={create} noValidate>
        <div className="newbook-grid">
          <div className="newbook-show" aria-hidden="true">
            <Book3D design={design} title={title.trim() || "Our Book of Travels"} subtitle={subtitle.trim() || me?.user.name} width="min(220px, 52vw)" />
          </div>
          <div className="newbook-fields">
            <h2 id="nb-title">A new book</h2>
            <p className="sub">Give it a name and a starting look. You can change everything later.</p>
            <div className="fld">
              <label htmlFor="nb-name">Title</label>
              <input id="nb-name" type="text" maxLength={60} placeholder="Our Book of Travels" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </div>
            <div className="fld">
              <label htmlFor="nb-sub">Names on the cover</label>
              <input id="nb-sub" type="text" maxLength={60} placeholder={`${me?.user.name.split(" ")[0] ?? "You"} & …`} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              <span className="hint">Leave it empty and the cover lists everyone in the book.</span>
            </div>
            <div className="row2">
              <div className="fld">
                <label htmlFor="nb-label">Date on the cover</label>
                <select id="nb-label" value={sinceLabel} onChange={(e) => setSinceLabel(e.target.value)}>
                  {LABELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div className="fld">
                <label htmlFor="nb-since">Date</label>
                <input id="nb-since" type="date" value={since} onChange={(e) => setSince(e.target.value)} />
              </div>
            </div>
            <fieldset className="dgroup">
              <legend>Starting look</legend>
              <div className="looks">
                {looks.map((l, i) => (
                  <label key={l.name} className={`look${look === i ? " on" : ""}`}>
                    <input type="radio" name="nb-look" checked={look === i} onChange={() => setLook(i)} />
                    <span className="look-cover"><CoverFace design={l.design} title={title.trim() || "Our Book"} /></span>
                    <span className="look-name">{l.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </div>
        {error && (
          <p className="err" role="alert">
            {error.text} {error.upgrade && <Link href="/app/account?upgrade=plus" onClick={onClose}>See plans</Link>}
          </p>
        )}
        <div className="panel-foot">
          <button type="button" className="btn line" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn" disabled={busy}>{busy ? "Making the book…" : "Make the book"}</button>
        </div>
      </form>
    </Dialog>
  );
}
