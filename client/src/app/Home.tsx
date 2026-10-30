import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { api } from "../api";
import { Icon } from "../components/Icon";
import { useDismiss } from "../lib/dismiss";
import { MONTHS, fmtLong, fmtShort, jitter, parseDate, plural, todayYMD } from "../lib/format";
import { readPending } from "../lib/pending";
import { AtlasMap } from "../map/AtlasMap";
import { MapDefs } from "../map/MapDefs";
import { Link, navigate, useLocation, useTitle } from "../router";
import { useSession } from "../session";
import type { BookSummary, Dashboard, PlaceVisit } from "../types";
import { Shelf } from "./Library";
import { NewBookDialog } from "./NewBookDialog";

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const greeting = (hour: number) => (hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
const pageLink = (bookId: string, pageId: string) => `/app/book/${bookId}?page=${encodeURIComponent(pageId)}`;

/** The signed-in home: a memory from this day, everywhere the books have been, and the shelf. */
export function Home() {
  useTitle("Home");
  const { me, refresh } = useSession();
  const { query } = useLocation();
  const [creating, setCreating] = useState(false);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [offline, setOffline] = useState(false);
  const autoOpened = useRef(false);
  const askedNew = query.get("new") === "1";
  const empty = me?.books.length === 0;
  const today = todayYMD();

  useEffect(() => {
    refresh();
    api.dashboard(today).then((d) => { setDash(d); setOffline(false); }, () => setOffline(true));
  }, [refresh, today]);

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
  const newBook = () => (atLimit ? navigate("/app/account?upgrade=plus") : setCreating(true));

  return (
    <div className="home">
      <header className="home-head">
        <div>
          <h1 className="app-title">{greeting(new Date().getHours())}, {user.name.trim().split(/\s+/)[0]}</h1>
          <p className="app-sub">{fmtLong(today)}</p>
        </div>
        {books.length > 0 && (
          <div className="home-actions">
            <AddPage books={books} />
            <button type="button" className="btn line" onClick={newBook}><Icon name="book" />New book</button>
          </div>
        )}
      </header>

      {books.length === 0 ? (
        <div className="lib-empty">
          <h2>Your shelf is empty</h2>
          <p>Start a book for the two of you, or for the whole group. You'll design its cover next, then add the first page.</p>
          <button type="button" className="btn sun" onClick={() => setCreating(true)}><Icon name="plus" />Start a book</button>
          <p className="hint">Got an invite link from someone? Open it, and their book appears here.</p>
        </div>
      ) : (
        <>
          {dash ? (
            <Overview dash={dash} today={today} />
          ) : (
            <p className="home-wait" role="status">{offline ? "Can't reach NinRe right now, so this day's memories and the map are waiting. Your books are below." : "Gathering your pages…"}</p>
          )}
          {/* Someone who only writes in other people's books sees those first, then room to start their own. */}
          {mine.length === 0 && <Shelf books={shared} heading="Shared with you" />}
          <Shelf books={mine} heading={mine.length ? "Your books" : "Start your own"} newTile={{ atLimit, limit, onNew: () => setCreating(true) }} />
          {mine.length > 0 && shared.length > 0 && <Shelf books={shared} heading="Shared with you" />}
        </>
      )}

      {creating && (
        <NewBookDialog
          onClose={() => { setCreating(false); if (askedNew) navigate("/app", { replace: true }); }}
          onCreated={async (id) => { await refresh(); navigate(`/app/book/${id}?welcome=1`); }}
        />
      )}
    </div>
  );
}

/** Adds a page straight to the only book, or asks which book when there are several. */
function AddPage({ books }: { books: BookSummary[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, useCallback(() => setOpen(false), []));

  if (books.length === 1) {
    return <Link href={`/app/book/${books[0].id}?add=1`} className="btn sun"><Icon name="plus" />Add a page</Link>;
  }
  return (
    <div className="menu" ref={ref}>
      <button type="button" className="btn sun" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="plus" />Add a page</button>
      {open && (
        <div className="menu-pop" role="menu" aria-label="Add a page to which book?">
          <p className="menu-who"><b>Which book?</b></p>
          {books.map((bk) => (
            <button key={bk.id} type="button" role="menuitem" onClick={() => navigate(`/app/book/${bk.id}?add=1`)}>
              <Icon name="book" />
              <span className="menu-book"><b>{bk.cover.title}</b><span>{plural(bk.counts.pages, "page")}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** "2 years, 8 months" between two calendar dates. */
function span(from: string, to: string): string {
  const a = parseDate(from), z = parseDate(to);
  const months = (z.getFullYear() - a.getFullYear()) * 12 + z.getMonth() - a.getMonth() - (z.getDate() < a.getDate() ? 1 : 0);
  const y = Math.floor(months / 12), m = months % 12;
  return [y && plural(y, "year"), m && plural(m, "month")].filter(Boolean).join(", ");
}

function Overview({ dash, today }: { dash: Dashboard; today: string }) {
  const { totals, onThisDay } = dash;
  const d = parseDate(today);
  const day = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const since = totals.since ? parseDate(totals.since) : null;
  const ledger: [string, string][] = [
    [totals.pages.toLocaleString("en-US"), totals.pages === 1 ? "Page" : "Pages"],
    [totals.photos.toLocaleString("en-US"), totals.photos === 1 ? "Photo" : "Photos"],
    [totals.places.toLocaleString("en-US"), totals.places === 1 ? "Place" : "Places"],
    [totals.books.toLocaleString("en-US"), totals.books === 1 ? "Book" : "Books"],
    [totals.people.toLocaleString("en-US"), "Writing with you"],
    [since ? `${MONTHS[since.getMonth()].slice(0, 3)} ${since.getFullYear()}` : "None yet", "First page"],
  ];
  const kept = totals.since ? span(totals.since, today) : "";

  return (
    <>
      <div className="home-top">
        <section className="home-sec" aria-labelledby="otd-h">
          <h2 id="otd-h" className="sec-h">On this day</h2>
          <p className="sec-sub">
            {onThisDay.match === "day" ? `${day}, in earlier years.` : onThisDay.match === "week" ? `Nothing from ${day} itself, so here's the same week in earlier years.` : `Nothing from ${day} yet.`}
          </p>
          {onThisDay.pages.length ? (
            <ol className="memories">
              {onThisDay.pages.map((m) => (
                <li key={m.pageId} className="memory">
                  <Link href={pageLink(m.bookId, m.pageId)}>
                    <figure className="memory-pol" style={{ "--r": `${jitter(m.pageId, "r", -3.5, 3.5).toFixed(1)}deg` } as Vars}>
                      {m.photo ? <img src={m.photo.url} alt="" loading="lazy" decoding="async" /> : <span className="memory-blank" aria-hidden="true">{m.place.name.slice(0, 3).toUpperCase()}</span>}
                      <figcaption>{m.photo?.caption || m.place.name}</figcaption>
                    </figure>
                    <b className="memory-title">{m.title}</b>
                    <span className="memory-ago">{plural(m.years, "year")} ago{onThisDay.match === "day" ? " today" : `, ${fmtShort(m.date)}`}</span>
                    <span className="memory-meta">{m.place.name} · {m.bookTitle}</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="memory-none">
              <span className="memory-pol blank" aria-hidden="true"><span>{day}</span></span>
              <p>Pages you add today come back here on {day} next year, and every year after.</p>
            </div>
          )}
        </section>

        <section className="home-sec" aria-labelledby="sofar-h">
          <h2 id="sofar-h" className="sec-h">So far</h2>
          <p className="sec-sub">{kept ? `${kept} of pages, across every book you're in.` : totals.pages ? "Your first pages went in this month." : "Nothing written yet. The first page starts the count."}</p>
          <dl className="ledger home-ledger">
            {ledger.map(([n, label]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd className="tnum">{n}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <Everywhere places={dash.places} />
    </>
  );
}

const hasPin = (p: PlaceVisit): p is PlaceVisit & { lat: number; lng: number } => p.lat != null && p.lng != null;

/** Every pinned place from every book on one map, numbered in the order they were first visited. */
function Everywhere({ places }: { places: PlaceVisit[] }) {
  const [hot, setHot] = useState<string | null>(null);
  const pinned = useMemo(() => places.filter(hasPin).sort((a, b) => a.first.localeCompare(b.first)), [places]);
  const pins = useMemo(() => pinned.map((p, i) => ({ id: p.pageId, lat: p.lat, lng: p.lng, n: i + 1, label: `${i + 1}. ${p.name}` })), [pinned]);
  const open = (pageId: string) => {
    const p = places.find((x) => x.pageId === pageId);
    if (p) navigate(pageLink(p.bookId, p.pageId));
  };
  const loose = places.length - pinned.length;

  return (
    <section className="home-sec home-map book-scope" data-paper="cream" data-accent="red" aria-labelledby="map-h">
      <MapDefs />
      <h2 id="map-h" className="sec-h">Everywhere you've been</h2>
      <p className="sec-sub">
        {pinned.length ? `${plural(pinned.length, "pinned place")}, numbered in the order you first went. Tap one to open its latest page.` : "Pin a place on a page and it lands on this map."}
        {loose > 0 && ` ${plural(loose, "more place")} ${loose === 1 ? "has" : "have"} no pin yet.`}
      </p>
      <div className="atlas-grid">
        <div className="map-sheet">
          <AtlasMap pins={pins} hot={hot} fitKey={pins.length} onPin={open} label={pinned.length ? `Map of ${pinned.map((p) => p.name).join(", ")}` : "An empty map"} />
          <svg className="compass" viewBox="-30 -38 60 68" aria-hidden="true">
            <circle r="26" fill="none" stroke="currentColor" strokeWidth=".8" />
            <circle r="21" fill="none" stroke="currentColor" strokeWidth=".5" strokeDasharray="1 2" />
            <path d="M0-24L4 0 0 24-4 0Z" fill="currentColor" opacity=".25" />
            <path d="M0-24L4 0H-4Z" fill="var(--red)" />
            <path d="M-24 0L0-3 24 0 0 3Z" fill="currentColor" opacity=".45" />
            <text y="-29" fontSize="7" textAnchor="middle" fill="currentColor" fontFamily="DM Mono, monospace">N</text>
          </svg>
        </div>
        <aside className="places" aria-label="Places, in the order you first went">
          <h3>The route so far</h3>
          <p>Across every book, with the latest visit under each.</p>
          <ol onPointerLeave={() => setHot(null)}>
            {pinned.length ? pinned.map((p, i) => (
              <li key={p.pageId}>
                <button type="button" className={hot === p.pageId ? "hot" : ""} onClick={() => open(p.pageId)} onPointerEnter={() => setHot(p.pageId)} onFocus={() => setHot(p.pageId)}>
                  <span className="num">{i + 1}</span>
                  <span>
                    <span className="pn">{p.name}</span>
                    <span className="pt">{p.region ? `${p.region} · ` : ""}{plural(p.pages, "page")}</span>
                    <span className="pd">Last {fmtShort(p.last)}</span>
                  </span>
                </button>
              </li>
            )) : (
              <li className="empty-line" style={{ paddingTop: 12 }}>No pinned places yet.</li>
            )}
          </ol>
        </aside>
      </div>
    </section>
  );
}
