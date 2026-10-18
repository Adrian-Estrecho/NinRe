import { useEffect, useMemo, useRef, useState } from "react";
import { api, errorText } from "../api";
import { CoverDesigner } from "../book/CoverDesigner";
import { normalizeDesign, type Design } from "../book/design";
import { joinNames } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { shelve } from "../lib/book";
import { Link, useTitle } from "../router";
import type { Book, Cover } from "../types";

type Save = "idle" | "saving" | "saved" | "error";

/** The designer for one book. Every change saves itself a moment after you stop. */
export function Designer({ bookId }: { bookId: string }) {
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState("");
  const [design, setDesign] = useState<Design | null>(null);
  const [cover, setCover] = useState<Cover | null>(null);
  const [state, setState] = useState<Save>("idle");
  const [saveError, setSaveError] = useState("");
  const timer = useRef(0);
  const pendingSave = useRef<(() => Promise<void>) | null>(null);
  useTitle(book ? `Design · ${book.cover.title}` : "Design");

  useEffect(() => {
    api.book(bookId).then((b) => {
      setBook(b);
      setDesign(normalizeDesign(b.design));
      setCover(b.cover);
    }, (err) => setError(errorText(err, "Couldn't open this book.")));
  }, [bookId]);

  const flush = async () => {
    window.clearTimeout(timer.current);
    const job = pendingSave.current;
    pendingSave.current = null;
    if (!job) return;
    setState("saving");
    try {
      await job();
      setState("saved");
      setSaveError("");
    } catch (err) {
      setState("error");
      setSaveError(errorText(err, "Couldn't save. Check your connection."));
      pendingSave.current = job;
    }
  };

  // Save whatever is waiting if the page is left mid-change.
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    pendingSave.current?.().catch(() => {});
  }, []);

  function queue(job: () => Promise<void>) {
    pendingSave.current = job;
    setState("idle");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 700);
  }

  function changeDesign(d: Design) {
    setDesign(d);
    queue(async () => {
      await api.saveDesign(bookId, d);
    });
  }
  function changeCover(patch: Partial<Cover>) {
    if (!cover) return;
    const next = { ...cover, ...patch };
    setCover(next);
    queue(async () => {
      await api.saveCover(bookId, next);
      if (design) await api.saveDesign(bookId, design);
    });
  }

  const photos = useMemo(() => (book?.pages ?? []).flatMap((p) => p.photos.map((ph) => ({ id: ph.id, url: ph.url, caption: ph.caption }))), [book]);
  const preview = useMemo(() => {
    const real = shelve(book?.pages ?? []).list.filter((p) => p.photos.length);
    return real[real.length - 1] ?? shelve([]).list[2];
  }, [book]);

  if (error) return <p className="loading-line">{error} <Link href="/app">Back to your books</Link></p>;
  if (!book || !design || !cover) return <p className="loading-line">Opening the designer…</p>;
  const names = cover.subtitle || joinNames(book.members.map((m) => m.name));

  return (
    <div className="design-page">
      <div className="design-head">
        <Link href={`/app/book/${bookId}`} className="btn line small" onClick={() => { flush(); }}><Icon name="back" />Back to the book</Link>
        <h1 className="app-title">Design “{cover.title}”</h1>
        <span className={`save-state ${state}`} aria-live="polite">
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? saveError : ""}
          {state === "error" && <button type="button" className="link-btn" onClick={flush}>Try again</button>}
        </span>
      </div>
      <CoverDesigner
        design={design}
        onChange={changeDesign}
        title={cover.title}
        subtitle={names}
        photos={photos}
        previewPage={preview}
        idPrefix="dz"
        bookWidth="min(340px, 64vw)"
        header={
          <div className="row2">
            <div className="fld">
              <label htmlFor="dz-title">Title</label>
              <input id="dz-title" type="text" maxLength={60} value={cover.title} onChange={(e) => changeCover({ title: e.target.value })} onBlur={() => !cover.title.trim() && changeCover({ title: "Our Book of Travels" })} />
            </div>
            <div className="fld">
              <label htmlFor="dz-names">Names on the cover</label>
              <input id="dz-names" type="text" maxLength={60} placeholder={joinNames(book.members.map((m) => m.name))} value={cover.subtitle} onChange={(e) => changeCover({ subtitle: e.target.value })} />
            </div>
          </div>
        }
        footer={photos.length === 0 ? <p className="hint">Add photos to a page and you can put one on the cover.</p> : undefined}
      />
    </div>
  );
}
