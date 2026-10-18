import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { ApiError, api, errorText } from "../api";
import { bookStyle, normalizeDesign } from "../book/design";
import { joinNames } from "../components/Avatar";
import { BookHeader } from "../components/Cover";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { CoverForm } from "../dialogs/CoverForm";
import { PageForm } from "../dialogs/PageForm";
import { PageSpread } from "../dialogs/PageSpread";
import { shelve, stats as countBook } from "../lib/book";
import { prefs } from "../lib/prefs";
import { MapDefs } from "../map/MapDefs";
import { Link, navigate, useLocation, useTitle } from "../router";
import { useSession } from "../session";
import type { Book, NumberedPage, Page, SortOrder, View } from "../types";
import { Album } from "../views/Album";
import { AtlasView } from "../views/AtlasView";
import { Chapters } from "../views/Chapters";
import { PeopleDialog } from "./PeopleDialog";

const VIEWS: { id: View; label: string }[] = [
  { id: "chapters", label: "Chapters" },
  { id: "atlas", label: "Atlas" },
  { id: "album", label: "Album" },
];
const isView = (v: unknown): v is View => VIEWS.some((x) => x.id === v);

/** One book: its header, the three ways to read it, and everything you can do inside it. */
export function BookReader({ bookId }: { bookId: string }) {
  const toast = useToast();
  const { me, refresh } = useSession();
  const { query } = useLocation();
  const cacheKey = `book.${bookId}`;
  const [book, setBook] = useState<Book | null>(() => prefs.get<Book | null>(cacheKey, null));
  const [conn, setConn] = useState<"loading" | "online" | "offline" | "missing">("loading");
  const [view, setView] = useState<View>(() => (isView(location.hash.slice(1)) ? (location.hash.slice(1) as View) : prefs.get<View>("view", "chapters")));
  const [sort, setSort] = useState<SortOrder>(() => (prefs.get<string>("sort", "asc") === "desc" ? "desc" : "asc"));
  const [open, setOpen] = useState<{ id: string; photo: number } | null>(null);
  const [form, setForm] = useState<{ page: NumberedPage | null } | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [hello, setHello] = useState<"welcome" | "joined" | null>(() => (query.get("welcome") ? "welcome" : query.get("joined") ? "joined" : null));
  useTitle(book?.cover.title ?? "Book");

  const keep = useCallback((next: Book) => {
    setBook(next);
    prefs.set(cacheKey, next);
  }, [cacheKey]);

  const load = useCallback(async () => {
    try {
      keep(await api.book(bookId));
      setConn("online");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 401)) {
        prefs.set(cacheKey, null);
        setBook(null);
        setConn("missing");
      } else setConn("offline");
    }
  }, [bookId, keep, cacheKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Stay in step with everyone else in the book: refresh when the tab comes back, and every minute.
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && !document.querySelector("dialog[open]") && load();
    const t = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  useEffect(() => {
    prefs.set("view", view);
    history.replaceState(null, "", `${location.pathname}${location.search}#${view}`);
  }, [view]);
  useEffect(() => prefs.set("sort", sort), [sort]);
  useEffect(() => {
    const follow = () => { const h = location.hash.slice(1); if (isView(h)) setView(h); };
    window.addEventListener("hashchange", follow);
    return () => window.removeEventListener("hashchange", follow);
  }, []);

  const canEdit = conn === "online";
  const pages = book?.pages ?? [];
  const shelf = useMemo(() => shelve(pages), [pages]);
  const counts = useMemo(() => countBook(shelf.list), [shelf.list]);
  const design = useMemo(() => normalizeDesign(book?.design), [book?.design]);
  const coverPhotoUrl = useMemo(() => {
    if (!design.coverPhoto) return null;
    for (const p of pages) for (const ph of p.photos) if (ph.id === design.coverPhoto) return ph.url;
    return null;
  }, [design.coverPhoto, pages]);

  // "N" starts a new page from anywhere outside a text field.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || !canEdit) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, dialog, [contenteditable]") || document.querySelector("dialog[open]")) return;
      e.preventDefault();
      setForm({ page: null });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit]);

  if (conn === "missing") {
    return (
      <div className="lib-empty">
        <h2>This book isn't on your shelf</h2>
        <p>It may have been deleted, or you were removed from it. If someone sent you an invite link, open that link again.</p>
        <Link href="/app" className="btn">Back to your books</Link>
      </div>
    );
  }
  if (!book) return <p className="loading-line">{conn === "offline" ? "Can't reach NinRe, and there's no copy of this book on this device yet." : "Opening the book…"}</p>;

  const current = book;
  const upsert = (page: Page) => {
    const list = current.pages.some((p) => p.id === page.id) ? current.pages.map((p) => (p.id === page.id ? page : p)) : [...current.pages, page];
    keep({ ...current, pages: list });
  };

  async function removePage(page: NumberedPage): Promise<boolean> {
    try {
      await api.deletePage(bookId, page.id);
      keep({ ...current, pages: current.pages.filter((p) => p.id !== page.id) });
      setOpen(null);
      toast("Page removed.");
      return true;
    } catch (err) {
      toast(errorText(err, "Couldn't remove the page. Try again."));
      return false;
    }
  }

  function tabKeys(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = VIEWS.findIndex((v) => v.id === view);
    const next = VIEWS[(i + (e.key === "ArrowRight" ? 1 : VIEWS.length - 1)) % VIEWS.length].id;
    setView(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  const { style, data } = bookStyle(design);
  const tabCount: Record<View, number> = { chapters: counts.pages, atlas: counts.places, album: counts.photos };
  const owner = current.role === "owner";
  const others = current.members.filter((m) => m.id !== me?.user.id);
  const dismissHello = () => { setHello(null); navigate(`/app/book/${bookId}`, { replace: true }); };

  return (
    <div className="book-scope reader" style={style} {...data}>
      <MapDefs />
      <BookHeader book={{ ...current, design }} coverPhotoUrl={coverPhotoUrl} stats={counts} canEdit={canEdit} onEdit={() => setCoverOpen(true)} onPeople={() => setPeopleOpen(true)} />

      {hello && (
        <div className="notice hello" role="status">
          <b>{hello === "welcome" ? "Your book is ready" : "You're in"}</b>
          <span>
            {hello === "welcome"
              ? others.length ? "Add the first page whenever you're ready." : "Invite the people you travel with from People, then add the first page."
              : `You can now add pages, photos and notes to ${current.cover.title}.`}
          </span>
          {hello === "welcome" && !others.length && owner && <button type="button" className="btn small line" onClick={() => setPeopleOpen(true)}><Icon name="people" />Invite</button>}
          <button type="button" className="btn small line" onClick={dismissHello}>Dismiss</button>
        </div>
      )}

      <nav className="tabs" aria-label="Views">
        <div className="tablist" role="tablist" aria-label="Ways to read the book" onKeyDown={tabKeys}>
          {VIEWS.map((v) => (
            <button key={v.id} id={`tab-${v.id}`} className="tab" role="tab" type="button" aria-controls={`view-${v.id}`}
              aria-selected={view === v.id} tabIndex={view === v.id ? 0 : -1} onClick={() => setView(v.id)}>
              {v.label} <span className="count">{tabCount[v.id]}</span>
            </button>
          ))}
        </div>
        {canEdit && (
          <button className="btn" type="button" onClick={() => setForm({ page: null })} title="New page (N)">
            <Icon name="plus" /><span className="long">New </span>page
          </button>
        )}
      </nav>

      {conn === "offline" && (
        <div className="notice" role="status">
          <b>Offline</b>
          <span>Can't reach NinRe, so this is the last copy saved on this device. Adding and editing are paused until it's back.</span>
        </div>
      )}

      <div className="reader-main">
        {view === "chapters" ? (
          <Chapters list={shelf.list} sample={shelf.sample} sort={sort} onSort={setSort} onOpen={(id) => setOpen({ id, photo: 0 })} />
        ) : view === "atlas" ? (
          <AtlasView list={shelf.list} sample={shelf.sample} onOpen={(id) => setOpen({ id, photo: 0 })} />
        ) : (
          <Album list={shelf.list} sort={sort} onOpen={(id, photo) => setOpen({ id, photo })} />
        )}
      </div>

      <footer className="colophon">
        <p className="fin">Fin, for now.</p>
        <p className="hint">{conn === "online" ? `Saved online · shared by ${joinNames(current.members.map((m) => m.name))}` : "Showing the copy saved on this device"}</p>
      </footer>

      {open && (
        <PageSpread
          list={shelf.list}
          id={open.id}
          photo={open.photo}
          canEdit={canEdit}
          me={me ? { id: me.user.id, owner } : null}
          bookId={bookId}
          onGo={(id, photo = 0) => setOpen({ id, photo })}
          onClose={() => setOpen(null)}
          onEdit={(page) => { setOpen(null); setForm({ page }); }}
          onRemove={removePage}
          onPage={(page) => upsert(page)}
        />
      )}
      {form && (
        <PageForm
          bookId={bookId}
          page={form.page}
          onClose={() => setForm(null)}
          onSaved={(page, isNew) => {
            const wasEmpty = current.pages.length === 0;
            upsert(page);
            setForm(null);
            if (isNew) setView("chapters");
            setOpen({ id: page.id, photo: 0 });
            if (hello) dismissHello();
            refresh();
            toast(!isNew ? "Page updated." : wasEmpty ? "Your first page is in. The samples are gone." : "Page added to the book.");
          }}
        />
      )}
      {coverOpen && (
        <CoverForm
          bookId={bookId}
          cover={current.cover}
          namesHint={joinNames(current.members.map((m) => m.name))}
          onClose={() => setCoverOpen(false)}
          onSaved={(cover) => {
            keep({ ...current, cover });
            setCoverOpen(false);
            refresh();
            toast("Cover saved.");
          }}
        />
      )}
      {peopleOpen && (
        <PeopleDialog bookId={bookId} title={current.cover.title} isOwner={owner} onClose={() => { setPeopleOpen(false); load(); }} onChanged={() => { load(); refresh(); }} />
      )}
    </div>
  );
}
