import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { api } from "../api";
import { CoverDesigner } from "../book/CoverDesigner";
import { bookStyle, normalizeDesign, type Design } from "../book/design";
import { StickerArt } from "../book/stickers";
import { Icon } from "../components/Icon";
import { PageSpread } from "../dialogs/PageSpread";
import { isPinned, shelve } from "../lib/book";
import { fmtShort, peso } from "../lib/format";
import { prefs } from "../lib/prefs";
import { AtlasMap } from "../map/AtlasMap";
import { MapDefs } from "../map/MapDefs";
import { Link, navigate, useTitle } from "../router";
import { useSession } from "../session";
import type { Plan } from "../types";
import { BoardingStub, Envelope, LuggageTag, Snapshot, Tape } from "./Ephemera";
import { FlipBook, PhotoPage, StoryPage } from "./FlipBook";

const FALLBACK_PLANS: Plan[] = [
  { id: "free", name: "Free", price: 0, books: 1, members: 2, photos: 300 },
  { id: "plus", name: "Plus", price: 19900, books: null, members: 6, photos: 5000 },
  { id: "crew", name: "Crew", price: 44900, books: null, members: 20, photos: 25000 },
];

/** The cover the sample book wears until the visitor designs their own: terracotta linen and gold, warm against the green hills. */
const DESK_DESIGN: Design = normalizeDesign({
  cloth: "#b5532f", texture: "linen", foil: "gold", titleFont: "classic", layout: "classic", emblem: "compass", paper: "cream", photo: "polaroid", accent: "red",
});

const PEOPLE = "Mara & Josh";

/** A camera roll from a few trips, as a strip of 35mm frames. The middle frame, Taal, is the photo on the sample book's first page. */
const ROLL = ["/samples/siargao-palms.jpg", "/img/lake-braies.jpg", "/img/ha-long.jpg", "/samples/taal.jpg", "/samples/kyoto-torii.jpg", "/samples/fort-santiago.jpg", "/samples/siargao-road.jpg"];
const PICK = 3;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Saves the book the visitor saw here, title and cover, so their first book starts from it after signing up. */
function keepForSignup(title: string, design: Design) {
  prefs.set("pending", { title: title.trim(), design });
}

export function Landing() {
  useTitle("");
  const { me } = useSession();
  const [title, setTitle] = useState("");
  const [design, setDesign] = useState<Design>(() => normalizeDesign(prefs.get<{ design?: Design } | null>("pending", null)?.design ?? DESK_DESIGN));
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [open, setOpen] = useState<{ id: string; photo: number } | null>(null);
  const [mapOn, setMapOn] = useState(false);
  const shelf = useMemo(() => shelve([]), []);
  const list = shelf.list;
  const root = useRef<HTMLDivElement>(null);
  const atlasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.plans().then((p) => setPlans(p.plans)).catch(() => {});
  }, []);

  // Paper settles and photographs develop as they scroll into view.
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>("[data-settle], [data-develop]");
    if (!els?.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -10% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // The atlas and its coastlines load once the map is nearly on screen.
  useEffect(() => {
    const el = atlasRef.current;
    if (!el || !("IntersectionObserver" in window)) { setMapOn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setMapOn(true); io.disconnect(); } }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function start(e?: FormEvent) {
    e?.preventDefault();
    keepForSignup(title, design);
    navigate(me ? "/app?new=1" : "/signup?next=new");
  }

  const shownTitle = title.trim() || "Our Book of Travels";
  const [tagaytay, , siargao, kyoto] = list;
  const pins = useMemo(() => list.filter(isPinned).map((p) => ({ id: p.id, lat: p.place.lat, lng: p.place.lng, n: p.n, label: `${p.n}. ${p.place.name}` })), [list]);
  const { style: bookVars, data: bookData } = bookStyle(design);

  return (
    <div className="landing" ref={root}>
      {(mapOn || open) && <MapDefs />}

      {/* ---------- A morning in Batanes, the book on it, fading into the white page ---------- */}
      <header className="hero" id="top">
        <div className="hero-art" aria-hidden="true">
          <img className="hero-photo" src="/img/hero.jpg" alt="" fetchPriority="high" decoding="async" />
        </div>
        <nav className="topnav" aria-label="Main">
          <Link href="/" className="wordmark" aria-label="NinRe home">NinRe</Link>
          <div className="topnav-links">
            <a href="#pages">Pages</a>
            <a href="#design">Design</a>
            <a href="#pricing">Plans</a>
          </div>
          <div className="topnav-end">
            {me ? (
              <Link href="/app" className="btn small sky-btn">Your books</Link>
            ) : (
              <>
                <Link href="/login" className="topnav-login">Log in</Link>
                <Link href="/signup" className="btn small sky-btn">Start free</Link>
              </>
            )}
          </div>
        </nav>

        <div className="desk-things" aria-hidden="true">
          <Snapshot className="h-snap-l" src={tagaytay.photos[1].url} caption={tagaytay.photos[1].caption} />
          <BoardingStub className="h-stub" from="MNL" to="IAO" date={fmtShort(siargao.date)} seats="14A · 14B" />
          <LuggageTag className="h-tag" lines={[["Name", PEOPLE], ["Bound for", siargao.place.name]]} />
          <Snapshot className="h-snap-r" src={kyoto.photos[0].url} caption={kyoto.photos[0].caption} />
        </div>

        <div className="hero-copy">
          <h1 className="hero-title">The places we’ve been, <span>bound in one book</span></h1>
          <p className="hero-sub">A travel diary for couples and friends. Everyone you invite writes in the same book: photos, the place, the story, and a note from each of you.</p>
        </div>

        <FlipBook className="hero-book" design={design} title={shownTitle} people={PEOPLE} pages={list} onRead={(id) => setOpen({ id, photo: 0 })} onStart={() => start()} />

        <form className="start-form" onSubmit={start}>
          <label htmlFor="hero-title" className="sr-only">Name your book</label>
          <input id="hero-title" type="text" maxLength={60} placeholder="Name your book" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
          <button type="submit" className="btn sun">Start free</button>
        </form>
        <p className="hero-fine">Free for one book and two people. No card needed.</p>
      </header>

      {/* ---------- For the two of you, or the whole barkada: two trips dissolving into each other ---------- */}
      <section className="sec together" id="about" aria-labelledby="about-h">
        <div className="sec-head">
          <h2 id="about-h" className="sec-title">One book.<br />Everyone writes in it.</h2>
        </div>
        <div className="together-photos">
          <figure className="fade-photo two" data-develop>
            <img src="/img/couple-cappadocia.jpg" alt="A couple in Cappadocia at dawn: she watches the hot-air balloons rise while he photographs them." loading="lazy" decoding="async" />
            <figcaption>for the two of you…</figcaption>
          </figure>
          <figure className="fade-photo crew" data-develop>
            <img src="/img/friends-dolomites.jpg" alt="Four friends with backpacks laughing together under the peaks of the Dolomites." loading="lazy" decoding="async" />
            <figcaption>…or the whole barkada</figcaption>
          </figure>
        </div>
        <div className="sec-foot">
          <p className="sec-lede">Everyone you invite adds pages, photos and notes to the same book. Read it back in chapters, on a map, or as one long album.</p>
          <button type="button" className="btn sun" onClick={() => start()}>Start a book</button>
        </div>

        {/* A camera roll from a few trips; the frame ringed in grease pencil is the one that went on the sample book's first page. */}
        <div className="roll" data-settle data-develop aria-hidden="true">
          <ol className="roll-strip">
            {ROLL.map((src, i) => (
              <li key={src} className={`roll-frame${i === PICK ? " pick" : ""}`} style={{ "--i": Math.abs(i - PICK) } as Vars}>
                <span className="roll-print">{i === 0 ? "NINRE 400" : `▸ ${i + 11}`}</span>
                <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
                <span className="roll-print foot">{`${i + 11}A`}</span>
                {i === PICK && (
                  <>
                    <svg className="roll-ring" viewBox="0 0 200 140" preserveAspectRatio="none" focusable="false">
                      <path d="M38 34C74 8 160 10 186 52c22 36-24 74-92 76C34 130 6 104 14 70 20 44 52 26 98 20" />
                    </svg>
                    <span className="roll-note">this one goes on the page</span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Every page on the map ---------- */}
      <section className="sec atlas-sec" id="pages" aria-labelledby="pages-h">
        <div className="sec-head">
          <h2 id="pages-h" className="sec-title">Pages that<br />tell stories</h2>
          <p className="sec-lede">Every date, weekend away and long trip becomes a page, and every page lands on the book’s own map. These four are from a sample book. Open one to read it like the real thing.</p>
        </div>
        <div className="atlas-desk" ref={atlasRef}>
          <img className="atlas-photo" src="/img/aerial-coast.jpg" alt="" loading="lazy" decoding="async" />
          <div className="map-sheet folded" data-settle style={{ "--r": "-1deg" } as Vars}>
            {mapOn ? <AtlasMap pins={pins} route interactive={false} controls={false} label={`Map of the sample book: ${list.map((p) => p.place.name).join(", ")}`} /> : <div className="amap" />}
            <svg className="compass" viewBox="-30 -38 60 68" aria-hidden="true">
              <circle r="26" fill="none" stroke="currentColor" strokeWidth=".8" />
              <circle r="21" fill="none" stroke="currentColor" strokeWidth=".5" strokeDasharray="1 2" />
              <path d="M0-24L4 0 0 24-4 0Z" fill="currentColor" opacity=".25" />
              <path d="M0-24L4 0H-4Z" fill="currentColor" />
              <text y="-29" textAnchor="middle" fontSize="8" fill="currentColor" fontFamily="DM Mono, monospace">N</text>
            </svg>
            <p className="cartouche">{shownTitle}<small>Sample book · {list.length} pages</small></p>
          </div>
          {list.map((p, i) => (
            <button key={p.id} type="button" className={`atlas-pol pol-${i}`} data-settle style={{ "--r": `${[-6, 5, -4, 6][i]}deg`, "--i": i } as Vars} onClick={() => setOpen({ id: p.id, photo: 0 })}>
              <Tape className="atlas-pol-tape" tone={(["butter", "sky", "blush", "mint"] as const)[i]} />
              <span className="pin-n" aria-hidden="true">{p.n}</span>
              <span className="atlas-pol-photo"><img src={p.photos[0].url} alt={p.photos[0].caption} loading="lazy" decoding="async" /></span>
              <span className="atlas-pol-cap">{p.photos[0].caption}</span>
              <span className="atlas-pol-meta"><b>{p.title}</b>{p.place.name} · {fmtShort(p.date)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- What goes on a page: one page, with its parts marked ---------- */}
      <section className="sec inside" id="inside" aria-labelledby="inside-h">
        <div className="inside-grid">
          <div className="inside-head">
            <h2 id="inside-h" className="sec-title left">What goes<br />on a page</h2>
            <p className="sec-lede left">Five things, every time. Tap one to see where it sits on the page.</p>
          </div>
          <Inside page={siargao} design={design} />
        </div>
      </section>

      {/* ---------- The designer, on a sheet of paper ---------- */}
      <section className="sec design-sec" id="design" aria-labelledby="design-h">
        <div className="sec-head">
          <h2 id="design-h" className="sec-title">Design the book<br />that’s yours</h2>
          <p className="sec-lede">Cloth, foil, type, stickers and paper. Turn the book, drag stickers onto it, try a few looks. The book at the top of this page changes with you, and your first book starts with this cover.</p>
        </div>
        <div className="sheet" data-settle style={{ "--r": ".4deg" } as Vars}>
          <Tape className="sheet-tape sheet-tape-l" tone="butter" />
          <Tape className="sheet-tape sheet-tape-r" tone="sky" />
          <CoverDesigner
            design={design}
            onChange={setDesign}
            title={shownTitle}
            subtitle={PEOPLE}
            previewPage={siargao}
            idPrefix="try"
            header={
              <div className="fld">
                <label htmlFor="try-title">Title on the cover</label>
                <input id="try-title" type="text" maxLength={60} placeholder="Our Book of Travels" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
              </div>
            }
            footer={
              <div className="try-foot">
                <button type="button" className="btn sun" onClick={() => start()}>Start free with this cover</button>
                <span className="hint">Free for one book and two people.</span>
              </div>
            }
          />
        </div>
      </section>

      {/* ---------- Plans, as boarding passes above the clouds ---------- */}
      <section className="sec pricing" id="pricing" aria-labelledby="pricing-h">
        <div className="sec-head">
          <h2 id="pricing-h" className="sec-title">Plans for two,<br />or twenty</h2>
          <p className="sec-lede">Prices in pesos. Pay for 1, 6 or 12 months at a time through PayMongo, with card, GCash or Maya. Nothing renews by itself.</p>
        </div>
        <div className="sky">
          <img className="sky-photo" src="/img/wing-clouds.jpg" alt="" loading="lazy" decoding="async" />
          <div className="passes">
            {plans.map((p, i) => (
              <article key={p.id} className={`pass pass-${p.id}`} data-settle style={{ "--r": `${[-1.2, 0, 1.2][i] ?? 0}deg`, "--i": i } as Vars} aria-labelledby={`plan-${p.id}`}>
                {p.id === "plus" && <span className="pass-star" aria-hidden="true"><StickerArt kind="star" /></span>}
                <div className="pass-top">
                  <header className="pass-head">
                    <h3 id={`plan-${p.id}`}>{p.name}</h3>
                    <svg className="pass-plane" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 13.2 21 7.5c1-.3 1.6.9.8 1.5L9.4 16.6l-1.2 4.1-2-.6.6-3.4-4.6-1.8c-.9-.3-.8-1.5.3-1.7Z" fill="currentColor" /></svg>
                  </header>
                  <dl className="pass-fields">
                    <div><dt>Books</dt><dd>{p.books == null ? "As many as you like" : p.books === 1 ? "1 book" : `${p.books} books`}</dd></div>
                    <div><dt>People per book</dt><dd>Up to {p.members}</dd></div>
                    <div><dt>Photos</dt><dd>{p.photos.toLocaleString("en-PH")}</dd></div>
                  </dl>
                </div>
                <div className="pass-stub">
                  <p className="price"><b>{p.price ? peso(p.price) : "₱0"}</b><span>{p.price ? "a month" : "always"}</span></p>
                  <button type="button" className={`btn ${p.id === "plus" ? "" : "line"}`} onClick={() => { keepForSignup(title, design); navigate(me ? (p.price ? "/app/account" : "/app") : `/signup${p.price ? `?plan=${p.id}` : ""}`); }}>
                    {p.price ? `Choose ${p.name}` : "Start free"}
                  </button>
                  <span className="barcode" aria-hidden="true" />
                </div>
              </article>
            ))}
          </div>
        </div>
        <p className="passes-all"><b>On every plan:</b> every cover, sticker and paper; chapters, atlas, album and notes; invite links. Photos count across all the books you own.</p>
        <p className="tickets-note">When paid months run out, the book goes back to Free limits. Nothing is deleted: you can still read and edit everything, and adding more waits until you renew.</p>
      </section>

      {/* ---------- Good to know ---------- */}
      <section className="sec faq" aria-labelledby="faq-h">
        <div className="faq-grid">
          <h2 id="faq-h" className="sec-title left">Good to<br />know</h2>
          <div className="faq-list">
            {[
              ["Who can see our book?", "Only the people in it. Photos are private too: they only load for members who are signed in."],
              ["How do we write in it together?", "Open the book’s People panel and share the invite link. It works for 14 days, and anyone who joins can add pages, photos and notes."],
              ["Does a plan renew automatically?", "No. Each payment covers the months you choose, and the app tells you a week before they run out."],
              ["What happens if a plan runs out?", "Everything stays. The book drops to Free limits, so new books, people or photos past those limits wait until you renew."],
              ["Can we print the book?", "Not yet."],
            ].map(([q, a]) => (
              <details key={q}>
                <summary>{q}<Icon name="plus" /></summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Close: an envelope to send yourselves, on the sand at sunset ---------- */}
      <footer className="closing">
        <img className="closing-photo" src="/img/beach-sunset.jpg" alt="" loading="lazy" decoding="async" />
        <Envelope className="close-env" postmark={kyoto} style={{ "--r": "-1.2deg" } as Vars}>
          <div className="closing-in">
            <h2 className="sec-title">Start the first page<br />tonight</h2>
            <form className="ticket-form" onSubmit={start}>
              <label htmlFor="close-title" className="sr-only">Name your book</label>
              <input id="close-title" type="text" maxLength={60} placeholder="Name your book" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
              <button type="submit" className="ticket-go">Start free</button>
            </form>
            <p className="closing-fine">Free for one book and two people. No card needed.</p>
          </div>
        </Envelope>
        <div className="foot-row">
          <span className="wordmark small">NinRe</span>
          <nav aria-label="Footer">
            <a href="#pricing">Plans</a>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </nav>
          <span className="foot-fine">Photographs from Unsplash. Payments by PayMongo.</span>
        </div>
      </footer>

      {open && (
        <div className="book-scope" style={bookVars} {...bookData}>
          <PageSpread list={list} id={open.id} photo={open.photo} canEdit={false} onGo={(id, photo = 0) => setOpen({ id, photo })} onClose={() => setOpen(null)} />
        </div>
      )}
    </div>
  );
}

type Part = { id: string; title: string; text: string };

const PARTS: Part[] = [
  { id: "photos", title: "Photos", text: "Up to 12 on a page, resized on your phone before they upload. The first becomes the polaroid on top, and every one gets a handwritten caption." },
  { id: "places", title: "The place", text: "Pick from 83 places that pin themselves, or tap the map to drop your own. Every page lands on the book’s atlas with a numbered pin and a dashed route in the order things happened." },
  { id: "story", title: "The story", text: "Lined paper for the long version of the day. Unsaved pages stay on your phone, so a closed tab doesn’t lose a word." },
  { id: "notes", title: "Notes from each of you", text: "Short sticky notes on any page, signed by whoever wrote them. The quickest way to answer the other person’s version of events." },
  { id: "postmark", title: "A postmark", text: "Every page is stamped with the place, the date and a three-letter code, in your book’s own ink." },
];

/** One real page lying open, its five parts numbered like pins, with a key beside it. */
function Inside({ page, design }: { page: Parameters<typeof StoryPage>[0]["page"]; design: Design }) {
  const [open, setOpen] = useState<string | null>(() => {
    const h = location.hash.replace("#inside-", "");
    return PARTS.some((r) => r.id === h) ? h : "photos";
  });
  const { style, data } = bookStyle(design);
  return (
    <>
      <div className="inside-book" data-settle style={{ "--r": "-1.5deg" } as Vars}>
        <div className="fb fb-open" style={style as Vars} {...data} data-hot={open ?? undefined} aria-hidden="true">
          <div className="fb-board" />
          <div className="fb-face fb-back fb-static" inert><PhotoPage page={page} /></div>
          <div className="fb-face fb-front fb-static" inert><StoryPage page={page} /></div>
          {PARTS.map((p, i) => (
            <span key={p.id} className={`pin-n mark mark-${p.id}${open === p.id ? " hot" : ""}`}>{i + 1}</span>
          ))}
        </div>
      </div>
      <ol className="parts">
        {PARTS.map((r, i) => (
          <li key={r.id} className={`part${open === r.id ? " open" : ""}`} id={`inside-${r.id}`}>
            <button type="button" aria-expanded={open === r.id} aria-controls={`inside-${r.id}-text`} onClick={() => setOpen(open === r.id ? null : r.id)}>
              <span className="pin-n" aria-hidden="true">{i + 1}</span>
              <span>{r.title}</span>
              <Icon name="plus" />
            </button>
            <div className="part-body" id={`inside-${r.id}-text`} hidden={open !== r.id}>
              <p>{r.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
