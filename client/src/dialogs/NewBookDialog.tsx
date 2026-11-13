import { useEffect, useState, type FormEvent } from "react";
import { ApiError, api, errorText } from "../api";
import { Avatar, joinNames } from "../components/Avatar";
import { useToast } from "../components/Toast";
import { Book3D } from "../book/Book3D";
import { Confetti } from "../components/Confetti";
import { DEFAULT_DESIGN, PRESETS, normalizeDesign, type Design } from "../book/design";
import { CoverFace } from "../book/CoverFace";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { BOOK_KINDS, kindOf } from "../lib/kinds";
import { clearPending, readPending } from "../lib/pending";
import { isApp } from "../lib/native";
import { Link } from "../router";
import { useSession } from "../session";
import type { BookKind, PublicPerson } from "../types";

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
  const [kindId, setKindId] = useState<BookKind>("album");
  const [look, setLook] = useState(0);
  // Until a look is picked by hand, each kind of book starts in the look that suits it.
  const [picked, setPicked] = useState(Boolean(pending?.design));
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(false);
  const [error, setError] = useState<{ text: string; upgrade?: boolean } | null>(null);
  const [friends, setFriends] = useState<PublicPerson[] | null>(null);
  const [crew, setCrew] = useState<string[]>([]);
  const toast = useToast();
  const design: Design = looks[look].design;
  const kind = kindOf(kindId);
  // The owner takes one place in the book.
  const room = Math.max(0, (me?.billing.active.members ?? 2) - 1);

  useEffect(() => {
    api.friends().then((r) => setFriends(r.following.filter((p) => p.followsYou)), () => setFriends([]));
  }, []);

  const toggleFriend = (id: string) => setCrew((l) => (l.includes(id) ? l.filter((x) => x !== id) : l.length < room ? [...l, id] : l));

  /** Adds the chosen friends once the book exists, and says how it went. */
  async function addCrew(bookId: string) {
    const added: string[] = [], asked: string[] = [], failed: string[] = [];
    for (const id of crew) {
      const f = friends?.find((x) => x.id === id);
      if (!f) continue;
      try {
        ((await api.addFriend(bookId, id)).status === "added" ? added : asked).push(f.name.split(" ")[0]);
      } catch {
        failed.push(f.name.split(" ")[0]);
      }
    }
    const parts = [
      added.length ? `${joinNames(added)} ${added.length === 1 ? "is" : "are"} in.` : "",
      asked.length ? `${joinNames(asked)} will get a request to join.` : "",
      failed.length ? `Couldn't add ${joinNames(failed)}; try from the book's People screen.` : "",
    ].filter(Boolean);
    if (parts.length) toast(parts.join(" "));
  }

  function chooseKind(id: BookKind) {
    setKindId(id);
    if (!picked) setLook(Math.max(0, looks.findIndex((l) => l.name === kindOf(id).look)));
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const book = await api.createBook({ title: title.trim() || kind.title, subtitle: subtitle.trim(), since, sinceLabel }, design, kindId);
      clearPending();
      if (crew.length) await addCrew(book.id);
      // A short celebration, then hand over to the book's preview.
      setMade(true);
      const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.setTimeout(() => onCreated(book.id), calm ? 700 : 1700);
    } catch (err) {
      setBusy(false);
      setError({ text: errorText(err, "Couldn't make the book. Try again."), upgrade: err instanceof ApiError && err.status === 402 });
    }
  }

  if (made) {
    return (
      <Dialog labelledBy="nb-made" onRequestClose={() => {}}>
        <div className="newbook-made" role="status">
          <Confetti />
          <div className="newbook-made-book">
            <Book3D design={design} title={title.trim() || kind.title} subtitle={subtitle.trim() || me?.user.name} width="min(240px, 58vw)" />
          </div>
          <h2 id="nb-made">Your book is ready</h2>
          <p>Opening {title.trim() || kind.title}…</p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog labelledBy="nb-title" onRequestClose={() => !busy && onClose()} closeButton>
      <form className="panel wide newbook" onSubmit={create} noValidate>
        <div className="newbook-grid">
          <div className="newbook-show" aria-hidden="true">
            <Book3D design={design} title={title.trim() || kind.title} subtitle={subtitle.trim() || me?.user.name} width="min(220px, 52vw)" />
          </div>
          <div className="newbook-fields">
            <h2 id="nb-title">A new book</h2>
            <p className="sub">Choose what it's for, give it a name and a starting look. You can change everything later.</p>
            <fieldset className="dgroup">
              <legend>Kind of book</legend>
              <div className="kinds">
                {BOOK_KINDS.map((k) => (
                  <label key={k.id} className={`kind-card${kindId === k.id ? " on" : ""}`}>
                    <input type="radio" name="nb-kind" checked={kindId === k.id} onChange={() => chooseKind(k.id)} />
                    <Icon name={k.icon} />
                    <span className="kind-name">{k.name}</span>
                    <span className="kind-blurb">{k.blurb}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="fld">
              <label htmlFor="nb-name">Title</label>
              <input id="nb-name" type="text" maxLength={60} placeholder={kind.title} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
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
              <legend>Who's in it</legend>
              {!friends ? (
                <p className="hint">Loading your friends…</p>
              ) : friends.length === 0 ? (
                <p className="hint">
                  Just you for now. <Link href="/app/settings/friends" onClick={onClose}>Follow your friends</Link> and, once they follow back, you can add them here. Anyone can also join by invite link.
                </p>
              ) : (
                <>
                  <div className="chips-row">
                    {friends.map((f) => {
                      const on = crew.includes(f.id);
                      return (
                        <label key={f.id} className="pill friend-pill">
                          <input type="checkbox" checked={on} disabled={!on && crew.length >= room} onChange={() => toggleFriend(f.id)} />
                          <span><Avatar name={f.name} id={f.id} size={24} />{f.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <span className="hint">
                    {me?.billing.active.name ?? "Your plan"} fits {room + 1} people in a book, you included
                    {crew.length >= room && friends.length > room ? ". To add more, upgrade first" : ""}. Friends who asked to be asked get a request instead.
                  </span>
                </>
              )}
            </fieldset>
            <fieldset className="dgroup">
              <legend>Starting look</legend>
              <div className="looks">
                {looks.map((l, i) => (
                  <label key={l.name} className={`look${look === i ? " on" : ""}`}>
                    <input type="radio" name="nb-look" checked={look === i} onChange={() => { setLook(i); setPicked(true); }} />
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
            {error.text} {error.upgrade && !isApp && <Link href="/app/settings/plan?upgrade=plus" onClick={onClose}>See plans</Link>}
          </p>
        )}
        <div className="panel-foot">
          <button type="button" className="btn line" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="btn sun" disabled={busy}>{busy ? "Making the book…" : "Make the book"}</button>
        </div>
      </form>
    </Dialog>
  );
}
