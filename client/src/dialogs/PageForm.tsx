import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";
import { ApiError, api } from "../api";
import { Dialog } from "../components/Dialog";
import { useToast } from "../components/Toast";
import { coordsText, deriveCode, fmtShort, fold, todayYMD } from "../lib/format";
import { isImageFile, preparePhoto } from "../lib/image";
import { KINDS, PLACES, type KnownPlace } from "../lib/places";
import { prefs } from "../lib/prefs";
import { AtlasMap } from "../map/AtlasMap";
import type { NumberedPage, Page, PageDraft } from "../types";

const MAX_PHOTOS = 12;
const PH_CENTER = { lat: 12.5, lng: 122, span: 22 };

interface FormPhoto {
  key: number;
  /** Set once the photo is stored on the server. */
  id?: string;
  url: string;
  caption: string;
  width: number;
  height: number;
  blob?: Blob;
}

interface Draft {
  title: string; date: string; kind: string; placeName: string; region: string; code: string;
  pin: { lat: number; lng: number } | null; story: string;
}

interface Props {
  bookId: string;
  page: NumberedPage | null;
  onClose: () => void;
  onSaved: (page: Page, isNew: boolean) => void;
}

let photoKey = 0;

export function PageForm({ bookId, page, onClose, onSaved }: Props) {
  const toast = useToast();
  const editing = page && !page.sample ? page : null;
  const draftKey = `draft.${bookId}`;
  const restored = useMemo(() => (editing ? null : prefs.get<Draft | null>(draftKey, null)), [editing]);
  const start: Draft = editing
    ? { title: editing.title, date: editing.date, kind: editing.kind, placeName: editing.place.name, region: editing.place.region, code: editing.place.code,
        pin: editing.place.lat != null && editing.place.lng != null ? { lat: editing.place.lat, lng: editing.place.lng } : null, story: editing.story }
    : restored ?? { title: "", date: todayYMD(), kind: KINDS[0], placeName: "", region: "", code: "", pin: null, story: "" };

  const [d, setD] = useState<Draft>(start);
  const [codeTouched, setCodeTouched] = useState(Boolean(editing || restored?.code));
  const [photos, setPhotos] = useState<FormPhoto[]>(() =>
    (editing?.photos ?? []).map((p) => ({ key: ++photoKey, id: p.id, url: p.url, caption: p.caption, width: p.width, height: p.height })));
  const [center, setCenter] = useState(() => (start.pin ? { ...start.pin, span: 6 } : PH_CENTER));
  const [dirty, setDirty] = useState(Boolean(restored));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(restored ? "Picked up your unsaved draft." : "");
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);
  const [sugg, setSugg] = useState<KnownPlace[]>([]);
  const [si, setSi] = useState(-1);
  const [over, setOver] = useState(false);

  const uploaded = useRef(new Map<number, string>());
  const livePhotos = useRef(photos);
  livePhotos.current = photos;
  const cancelBtn = useRef<HTMLButtonElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const armTimer = useRef(0);
  const skipCancel = useRef(false);

  useEffect(() => {
    titleInput.current?.focus();
    return () => {
      window.clearTimeout(armTimer.current);
      livePhotos.current.forEach((p) => p.blob && URL.revokeObjectURL(p.url));
    };
  }, []);

  // Keep an unsaved new page on this device, so a closed tab doesn't lose the story.
  useEffect(() => {
    if (!editing && dirty) prefs.set(draftKey, d);
  }, [d, dirty, editing, draftKey]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
    setArmed(false);
  };

  const pins = useMemo(() => (d.pin ? [{ id: "draft", lat: d.pin.lat, lng: d.pin.lng, draft: true, label: d.placeName }] : []), [d.pin, d.placeName]);

  /* Place */
  function typePlace(v: string) {
    setD((prev) => ({ ...prev, placeName: v, region: "", code: codeTouched ? prev.code : v.trim() ? deriveCode(v) : "" }));
    setDirty(true);
    const q = fold(v.trim());
    const hits = q
      ? PLACES.map((p) => ({ p, n: fold(p.name), r: fold(p.region) }))
          .filter((x) => x.n.includes(q) || x.r.includes(q))
          .sort((a, b) => Number(b.n.startsWith(q)) - Number(a.n.startsWith(q)) || a.n.localeCompare(b.n))
          .slice(0, 8)
          .map((x) => x.p)
      : [];
    setSugg(hits);
    setSi(-1);
  }
  function choose(p: KnownPlace) {
    setD((prev) => ({ ...prev, placeName: p.name, region: p.region, code: p.code, pin: { lat: p.lat, lng: p.lng } }));
    setCodeTouched(false);
    setDirty(true);
    setSugg([]);
    setCenter({ lat: p.lat, lng: p.lng, span: 6 });
  }
  function placeKeys(e: KeyboardEvent<HTMLInputElement>) {
    if (!sugg.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setSi((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + sugg.length) % sugg.length);
    } else if (e.key === "Enter" && si >= 0) {
      e.preventDefault();
      choose(sugg[si]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setSugg([]);
      skipCancel.current = true;
      setTimeout(() => { skipCancel.current = false; }, 0);
    }
  }

  /* Photos */
  async function addFiles(files: FileList | File[]) {
    const list = [...files].filter(isImageFile);
    if (!list.length) return;
    const room = MAX_PHOTOS - livePhotos.current.length;
    if (room <= 0) return toast(`A page holds up to ${MAX_PHOTOS} photos.`);
    let bad = 0;
    for (const [i, f] of list.slice(0, room).entries()) {
      setStatus(`Preparing photo ${i + 1} of ${Math.min(list.length, room)}…`);
      try {
        const r = await preparePhoto(f);
        setPhotos((prev) => [...prev, { key: ++photoKey, url: r.preview, blob: r.blob, width: r.width, height: r.height, caption: "" }]);
        setDirty(true);
      } catch {
        bad++;
      }
    }
    setStatus("");
    if (bad) toast(bad === 1 ? "One photo couldn't be read. Try saving it as JPG or PNG first." : `${bad} photos couldn't be read. Try saving them as JPG or PNG first.`);
    else if (list.length > room) toast(`A page holds up to ${MAX_PHOTOS} photos, so some were left out.`);
  }
  const editPhoto = (key: number, fn: (list: FormPhoto[], i: number) => FormPhoto[]) => {
    setPhotos((prev) => {
      const i = prev.findIndex((p) => p.key === key);
      return i < 0 ? prev : fn(prev, i);
    });
    setDirty(true);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  /* Closing */
  function requestClose(forced: boolean) {
    if (!forced && skipCancel.current) return;
    if (forced || !dirty || armed) {
      if (!editing) prefs.set(draftKey, null);
      return onClose();
    }
    if (busy) return;
    setArmed(true);
    cancelBtn.current?.focus();
    window.clearTimeout(armTimer.current);
    armTimer.current = window.setTimeout(() => setArmed(false), 5000);
  }

  /* Saving */
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const fail = (msg: string, field?: string) => {
      setError(msg);
      if (field) document.getElementById(field)?.focus();
    };
    if (!d.title.trim()) return fail("Give this page a title.", "f-title");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) return fail("Add the date this happened.", "f-date");
    if (!d.placeName.trim()) return fail("Add where this happened. Pick a suggestion or type a name.", "f-place");

    setError("");
    setBusy(true);
    try {
      const fresh = photos.filter((p) => !p.id && !uploaded.current.has(p.key));
      let k = 0;
      for (const p of fresh) {
        setStatus(`Saving photo ${++k} of ${fresh.length}…`);
        const up = await api.uploadPhoto(bookId, p.blob!, p.width, p.height);
        uploaded.current.set(p.key, up.id);
      }
      setStatus("Saving page…");
      const draft: PageDraft = {
        title: d.title.trim(),
        date: d.date,
        kind: d.kind,
        place: { name: d.placeName.trim(), region: d.region, code: d.code || deriveCode(d.placeName), lat: d.pin?.lat ?? null, lng: d.pin?.lng ?? null },
        story: d.story,
        photos: photos.map((p) => ({ id: p.id ?? uploaded.current.get(p.key)!, caption: p.caption.trim() })),
      };
      const saved = editing ? await api.updatePage(bookId, editing.id, draft) : await api.createPage(bookId, draft);
      if (!editing) prefs.set(draftKey, null);
      onSaved(saved, !editing);
    } catch (err) {
      setStatus("");
      setBusy(false);
      fail(err instanceof ApiError ? err.message : "Couldn't save. Check your connection and try again.");
    }
  }

  const hint = d.pin
    ? d.placeName.trim() ? `Pinned at ${coordsText(d.pin)}. Tap the map to move the pin.` : `Pinned at ${coordsText(d.pin)}. Give this place a name above.`
    : "Pick a suggestion to pin it, or tap the map below to drop a pin yourself.";

  return (
    <Dialog labelledBy="form-title" onRequestClose={requestClose}>
      <form className="sheet" onSubmit={save} noValidate>
        <h2 id="form-title">{editing ? "Edit this page" : "A new page"}</h2>
        <p className="sub">{editing ? `Page ${editing.n}, ${fmtShort(editing.date)}` : "Write down the day while it's still fresh."}</p>

        <div className="fld">
          <label htmlFor="f-title">Title</label>
          <input ref={titleInput} type="text" id="f-title" maxLength={120} placeholder="Bulalo and fog on the ridge" autoComplete="off" value={d.title} onChange={(e) => set("title", e.target.value)} />
        </div>

        <div className="row2">
          <div className="fld">
            <label htmlFor="f-date">Date</label>
            <input type="date" id="f-date" value={d.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="fld">
            <span className="lbl" id="kind-lbl">Kind of day</span>
            <div className="chips" role="radiogroup" aria-labelledby="kind-lbl">
              {KINDS.map((k, i) => (
                <label key={k}>
                  <input type="radio" name="kind" id={`kind-${i}`} value={k} checked={d.kind === k} onChange={() => set("kind", k)} />
                  <span>{k}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="fld">
          <label htmlFor="f-place">Place</label>
          <div className="combo">
            <div className="pinline">
              <input
                type="text" id="f-place" autoComplete="off" placeholder="Start typing: Tagaytay, Siargao, Kyoto…"
                role="combobox" aria-expanded={sugg.length > 0} aria-controls="f-sugg" aria-autocomplete="list"
                aria-activedescendant={si >= 0 ? `sg-${si}` : undefined}
                value={d.placeName} onChange={(e) => typePlace(e.target.value)} onKeyDown={placeKeys} onBlur={() => setTimeout(() => setSugg([]), 150)}
              />
              <input
                type="text" id="f-code" className="code-in" maxLength={3} placeholder="ABC" aria-label="Stamp code, three letters"
                value={d.code} onChange={(e) => { setCodeTouched(true); set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); }}
              />
            </div>
            {sugg.length > 0 && (
              <ul className="sugg" id="f-sugg" role="listbox" aria-label="Suggested places">
                {sugg.map((p, i) => (
                  <li key={p.name} id={`sg-${i}`} role="option" aria-selected={i === si} onMouseDown={(e) => { e.preventDefault(); choose(p); }}>
                    <span>{p.name}, <span className="region">{p.region}</span></span>
                    <small>{p.code}</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="hint">{hint}</span>
          <AtlasMap className="picker" pins={pins} center={center} fitLabel="Show the whole map" home={{ lat: 12.5, lng: 122 }}
            label="Map. Tap to drop a pin." onPick={(lat, lng) => set("pin", { lat: +lat.toFixed(5), lng: +lng.toFixed(5) })} />
        </div>

        <div className="fld">
          <span className="lbl">Photos</span>
          <div className={`drop${over ? " over" : ""}`} onDragEnter={(e) => { e.preventDefault(); setOver(true); }} onDragOver={(e) => e.preventDefault()} onDragLeave={() => setOver(false)} onDrop={onDrop}>
            <input type="file" id="f-files" accept="image/*" multiple onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
            Drop photos here or <label htmlFor="f-files">choose files</label>
            <span className="hint">They're resized before saving. The first photo becomes the cover.</span>
          </div>
          {photos.length > 0 && (
            <div className="pgrid">
              {photos.map((p, i) => (
                <div className="pcell" key={p.key}>
                  {i === 0 && <span className="cov">Cover</span>}
                  <img src={p.url} alt="" />
                  <input type="text" id={`cap-${p.key}`} maxLength={60} placeholder="write a caption" aria-label={`Caption for photo ${i + 1}`}
                    value={p.caption} onChange={(e) => { const v = e.target.value; editPhoto(p.key, (l, j) => l.map((x, n) => (n === j ? { ...x, caption: v } : x))); }} />
                  <div className="pbar">
                    {i > 0 ? <button type="button" onClick={() => editPhoto(p.key, (l, j) => [l[j], ...l.filter((_, n) => n !== j)])}>Make cover</button> : <span />}
                    <button type="button" onClick={() => editPhoto(p.key, (l, j) => { if (l[j].blob) URL.revokeObjectURL(l[j].url); return l.filter((_, n) => n !== j); })}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="fld">
          <label htmlFor="f-story">The story</label>
          <textarea id="f-story" className="lined" placeholder="Where you went, what you ate, what made you laugh…" value={d.story} onChange={(e) => set("story", e.target.value)} />
        </div>

        {error && <p className="err" role="alert">{error}</p>}
        <div className="sheet-foot">
          <span className="status" aria-live="polite">{status}</span>
          <button type="button" ref={cancelBtn} className={`btn line${armed ? " warn armed" : ""}`} onClick={() => requestClose(false)} disabled={busy}>
            {armed ? "Discard changes" : "Cancel"}
          </button>
          <button type="submit" className="btn" disabled={busy}>{busy ? "Saving…" : "Save page"}</button>
        </div>
      </form>
    </Dialog>
  );
}
