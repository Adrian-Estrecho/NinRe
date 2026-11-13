import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { useDismiss } from "../lib/dismiss";
import { plural } from "../lib/format";
import { isApp } from "../lib/native";
import { readPending } from "../lib/pending";
import { prefs } from "../lib/prefs";
import { navigate, useLocation, useTitle } from "../router";
import { useSession } from "../session";
import type { BookSummary, Room } from "../types";
import { NewBookDialog } from "../dialogs/NewBookDialog";
import { Board } from "../library/Board";
import { Bookcase, newestFirst } from "../library/Bookcase";
import { keepFigure } from "../library/room";
import { Carousel } from "../library/Carousel";
import { DecorArt } from "../library/DecorArt";
import { DesignPanel } from "../library/DesignPanel";
import { Peek, type OpenAt } from "../library/Peek";
import { useRoom } from "../library/room";
import { earnedMagnets } from "../lib/countries";


const LOADING: Room = { board: { material: "cork", pins: "pin", title: "" }, photos: [], magnets: [], decor: [], figures: [] };
const between = (lo: number, hi: number) => Math.round((lo + Math.random() * (hi - lo)) * 10) / 10;

/** How the books are shown: the whole library room, or just the books face-out in a row. Kept per device. */
type ShelfView = "library" | "carousel";
const VIEWS: { id: ShelfView; name: string; icon: "shelf" | "carousel" }[] = [
  { id: "library", name: "Library", icon: "shelf" },
  { id: "carousel", name: "Books", icon: "carousel" },
];

/**
 * The signed-in home, set as a library: a board of souvenir magnets on the wall, one for each country the pages are
 * set in, things standing on the bookcase, and every book spine-out on its shelves. A book taken down opens in the
 * middle of the room, at /app/book/:id.
 * Someone who'd rather not have the room can show just their books, face-out in a carousel.
 */
export function Home({ openId, designBook }: { openId?: string; designBook?: boolean }) {
  const { me, refresh } = useSession();
  const { query } = useLocation();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [designing, setDesigning] = useState(false);
  const [view, setView] = useState<ShelfView>(() => (prefs.get<string>("shelfView", "library") === "carousel" ? "carousel" : "library"));
  const lib = useRoom();
  const earned = useMemo(() => earnedMagnets(lib.visits), [lib.visits]);
  const openBook = openId ? me?.books.find((bk) => bk.id === openId) ?? null : null;
  useTitle(openBook ? openBook.cover.title : "Home");

  // Where to open the book, read once from the address it was opened at, which is then tidied.
  const openAt = useMemo<OpenAt>(() => (openId ? {
    page: query.get("page"),
    add: query.get("add") === "1",
    design: designBook,
    hello: query.get("welcome") ? "welcome" : query.get("joined") ? "joined" : null,
  } : {}), [openId]);
  useEffect(() => {
    if (openId && (location.search || designBook)) history.replaceState(null, "", `/app/book/${openId}`);
  }, [openId]);

  // A book that isn't on the shelf may just not be fetched yet (one just joined): look once more before giving up.
  const lookedAgain = useRef<string | null>(null);
  useEffect(() => {
    if (!me || !openId || openBook) return;
    if (lookedAgain.current !== openId) {
      lookedAgain.current = openId;
      void refresh();
      return;
    }
    toast("That book isn't on your shelf. It may have been deleted, or you were removed from it.");
    navigate("/app", { replace: true });
  }, [me, openId, openBook]);
  const autoOpened = useRef(false);
  const askedNew = query.get("new") === "1";
  const empty = me?.books.length === 0;

  useEffect(() => { refresh(); }, [refresh]);

  // Open the new-book dialog once when asked to, or when someone arrives with a cover designed on the website.
  useEffect(() => {
    if (autoOpened.current || !(askedNew || (empty && readPending()))) return;
    autoOpened.current = true;
    setCreating(true);
  }, [askedNew, empty]);

  if (!me) return null;
  const { billing: b, books, user } = me;
  const limit = b.active.books;
  const atLimit = limit != null && b.usage.books >= limit;
  const mine = books.filter((x) => x.role === "owner"), shared = books.filter((x) => x.role !== "owner");
  const newBook = () => {
    if (!atLimit) return setCreating(true);
    // The app sells nothing, so at the limit it only says so; the website shows the plans.
    if (isApp) return toast(`Your plan includes ${plural(limit, "book")}, and your shelf is full.`);
    navigate("/app/account?upgrade=plus");
  };
  const room = lib.room ?? LOADING;
  const { update } = lib;
  const carousel = view === "carousel";
  const show = (v: ShelfView) => {
    setView(v);
    prefs.set("shelfView", v);
    // The room's design drawer belongs to the room.
    if (v === "carousel") setDesigning(false);
  };
  const newTile = { atLimit, limit, onNew: () => setCreating(true) };

  const head = (
    <header className="room-head">
      <h1 className="sr-only">Your library</h1>
      {books.length > 0 && (
        <div className="head-row">
          <div className="view-seg" role="group" aria-label="Show your books">
            {VIEWS.map((v) => (
              <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => show(v.id)}>
                <Icon name={v.icon} />{v.name}
              </button>
            ))}
          </div>
          <EditMenu
            books={books}
            atLimit={atLimit}
            onNewBook={newBook}
          />
          {/* Dressing the room, too. */}
          {!carousel && (
            <button type="button" className="head-btn" aria-label="Design" title="Design" aria-pressed={designing} disabled={!lib.room} onClick={() => setDesigning(!designing)}>
              <Icon name="palette" />
            </button>
          )}
        </div>
      )}
    </header>
  );

  return (
    <div className="home">
      {books.length === 0 ? (
        <div className="home-plain">
          {head}
          <div className="lib-empty">
            <h2>Your shelf is empty</h2>
            <p>Start a book for the two of you, or for the whole group. You'll design its cover next, then add the first page.</p>
            <button type="button" className="btn sun" onClick={() => setCreating(true)}><Icon name="plus" />Start a book</button>
            <p className="hint">Got an invite link from someone? Open it, and their book appears here.</p>
          </div>
        </div>
      ) : (
        <>
          {/* On a phone the room dims behind the panel; tapping the dimmed edge puts the panel away. */}
          {designing && !carousel && lib.room && <div className="design-shade" aria-hidden="true" onClick={() => setDesigning(false)} />}
          {designing && !carousel && lib.room && (
            <DesignPanel
              room={room}
              earned={earned}
              books={newestFirst(books)}
              state={lib.state}
              subscribed={b.active.id !== "free"}
              onBoard={(board) => update((r) => ({ ...r, board: { ...r.board, ...board } }))}
              // A figure put on the bookcase is also kept in the person's figures, once.
              onAdd={(k, fig) => update((r) => ({
                ...r,
                decor: [...r.decor, fig ? { k, x: between(10, 90), fig } : { k, x: between(10, 90) }],
                figures: fig ? keepFigure(r.figures ?? [], fig) : r.figures ?? [],
              }))}
              onForgetFigure={(i) => update((r) => ({ ...r, figures: (r.figures ?? []).filter((_, j) => j !== i) }))}
              onMagnets={(fn) => update((r) => ({ ...r, magnets: fn(r.magnets ?? []) }))}
              onRemoveDecor={(i) => update((r) => ({ ...r, decor: r.decor.filter((_, j) => j !== i) }))}
              onRetry={lib.retry}
              onDone={() => setDesigning(false)}
            />
          )}
          {carousel ? (
            <div className="room as-carousel">
              {head}
              <Carousel books={books} newTile={newTile} onOpen={(bk) => navigate(`/app/book/${bk.id}`)} />
              <div className="floor" aria-hidden="true" />
            </div>
          ) : (
          <div className={`room${designing ? " designing" : ""}`}>
            {head}
            <div className="wall">
              {/* A brass picture lamp over the board, its light falling on the magnets */}
              <span className="lib-lamp" aria-hidden="true" />
              {/* Dust drifting in the lamp's light, and the light falling in from the windows (where there are windows) */}
              <span className="lib-motes" aria-hidden="true" />
              <span className="lib-beams" aria-hidden="true" />
              <Board
                room={room}
                earned={earned}
                ready={Boolean(lib.room)}
              />
            </div>
            <Bookcase
              room={room}
              designing={designing}
              mine={mine}
              shared={shared}
              newTile={newTile}
              onPlaceDecor={(i, x) => update((r) => ({ ...r, decor: r.decor.map((d, j) => (j === i ? { ...d, x } : d)) }))}
              onRemoveDecor={(i) => update((r) => ({ ...r, decor: r.decor.filter((_, j) => j !== i) }))}
              onOpen={(bk) => navigate(`/app/book/${bk.id}`)}
            />
            {/* A big potted plant on the floor beside the bookcase, where the room is wide enough */}
            <div className="lib-floor-plant" aria-hidden="true"><DecorArt kind="plant" /></div>
            <div className="floor" aria-hidden="true" />
          </div>
          )}
        </>
      )}

      {openBook && (
        <Peek
          key={openBook.id}
          book={openBook}
          at={openAt}
          me={user}
          spine={() => document.querySelector<HTMLElement>(`[data-book="${openBook.id}"]`)}
          onClose={() => navigate("/app")}
          onChanged={() => void refresh()}
          onGone={() => { void refresh(); navigate("/app", { replace: true }); }}
        />
      )}

      {creating && (
        <NewBookDialog
          onClose={() => { setCreating(false); if (askedNew) navigate("/app", { replace: true }); }}
          onCreated={async (id) => { await refresh(); navigate(`/app/book/${id}?welcome=1`); setCreating(false); }}
        />
      )}
    </div>
  );
}

/**
 * The Edit menu beside the view switch: add a page (straight to the only book, or choosing one when there are
 * several), and start a new book.
 */
function EditMenu({ books, atLimit, onNewBook }: { books: BookSummary[]; atLimit: boolean; onNewBook: () => void }) {
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => { setOpen(false); setChoosing(false); }, []);
  useDismiss(ref, open, close);
  const addPage = () => (books.length === 1 ? navigate(`/app/book/${books[0].id}?add=1`) : setChoosing(true));

  return (
    <div className="menu" ref={ref}>
      <button type="button" className="head-btn" aria-label="Edit" title="Edit" aria-haspopup="menu" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>
        <Icon name="pen" />
      </button>
      {open && (choosing ? (
        <div className="menu-pop" role="menu" aria-label="Add a page to which book?">
          <p className="menu-who"><b>Which book?</b></p>
          {books.map((bk) => (
            <button key={bk.id} type="button" role="menuitem" onClick={() => navigate(`/app/book/${bk.id}?add=1`)}>
              <Icon name="book" />
              <span className="menu-book"><b>{bk.cover.title}</b><span>{plural(bk.counts.pages, "page")}</span></span>
            </button>
          ))}
        </div>
      ) : (
        <div className="menu-pop" role="menu" aria-label="Edit your library">
          <button type="button" role="menuitem" onClick={addPage}><Icon name="plus" />Add a page</button>
          <button type="button" role="menuitem" onClick={() => { close(); onNewBook(); }}><Icon name={atLimit ? "lock" : "book"} />New book</button>
        </div>
      ))}
    </div>
  );
}
