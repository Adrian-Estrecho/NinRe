import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { api } from "../api";
import { CoverDesigner } from "../book/CoverDesigner";
import { CoverFace } from "../book/CoverFace";
import { DEFAULT_DESIGN, bookStyle, normalizeDesign, type Design } from "../book/design";
import { StickerArt } from "../book/stickers";
import { Icon, type IconName } from "../components/Icon";
import { PageSpread } from "../dialogs/PageSpread";
import { shelve } from "../lib/book";
import { fmtShort, peso } from "../lib/format";
import { prefs } from "../lib/prefs";
import { MapDefs } from "../map/MapDefs";
import { Link, navigate, useTitle } from "../router";
import { useSession } from "../session";
import type { Plan } from "../types";
import { Confetti, FoldedCorner, Leaves, Paperclip, PushPin, Scallops, Spiral, Squiggle, Tape, Zigzag, type Metal, type TapeTone } from "./Doodles";

const FALLBACK_PLANS: Plan[] = [
  { id: "free", name: "Free", price: 0, books: 1, members: 2, photos: 300 },
  { id: "plus", name: "Plus", price: 19900, books: null, members: 6, photos: 5000 },
  { id: "crew", name: "Crew", price: 44900, books: null, members: 20, photos: 25000 },
];

const SAMPLE_DESIGN: Design = normalizeDesign({
  cloth: "#6d9cc9", texture: "canvas", foil: "white", titleFont: "modern", layout: "centered", emblem: "palm", paper: "white", photo: "clip", accent: "blue",
  stickers: [{ k: "plane", x: 78, y: 16, r: 14, s: 1 }, { k: "heart", x: 20, y: 84, r: -12, s: 0.8 }],
});

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Saves what the visitor made here so their first book starts from it after signing up. */
function keepForSignup(title: string, design?: Design) {
  prefs.set("pending", { title: title.trim(), design: design ?? null });
}

export function Landing() {
  useTitle("");
  const { me } = useSession();
  const [title, setTitle] = useState("");
  const [design, setDesign] = useState<Design>(() => normalizeDesign(prefs.get<{ design?: Design } | null>("pending", null)?.design ?? DEFAULT_DESIGN));
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [open, setOpen] = useState<{ id: string; photo: number } | null>(null);
  const shelf = useMemo(() => shelve([]), []);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.plans().then((p) => setPlans(p.plans)).catch(() => {});
  }, []);

  // Cards settle into place as they scroll into view.
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>("[data-settle]");
    if (!els?.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -12% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function start(e?: FormEvent, withDesign?: boolean) {
    e?.preventDefault();
    keepForSignup(title, withDesign ? design : undefined);
    navigate(me ? "/app?new=1" : "/signup?next=new");
  }

  const shownTitle = title.trim() || "Our Book of Travels";
  const siargao = shelf.list[2];

  return (
    <div className="landing" ref={root}>
      {/* ---------- Hero: the window ---------- */}
      <div className="sky-backdrop" aria-hidden="true" />
      <header className="window" id="top">
        <img className="window-photo" src="/img/hero.jpg" alt="" fetchPriority="high" decoding="async" />
        <div className="window-shade" aria-hidden="true" />

        <nav className="topnav" aria-label="Main">
          <div className="topnav-links">
            <a href="#design">Design</a>
            <a href="#pricing">Pricing</a>
          </div>
          <Link href="/" className="wordmark" aria-label="NinRe home">NinRe</Link>
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

        <aside className="glass book-card" aria-label="A sample book">
          <div className="book-card-cover">
            <CoverFace design={SAMPLE_DESIGN} title={shownTitle} subtitle="Mara & Josh" />
          </div>
          <div className="book-card-text">
            <span className="book-card-kind">Sample book · 4 pages</span>
            <strong>{shownTitle}</strong>
            <span>Mara &amp; Josh, since 2023</span>
            <span className="book-card-tags">Tagaytay · Intramuros · Siargao · Kyoto</span>
          </div>
        </aside>

        <Scallops className="d-scallops" />
        <Spiral className="d-spiral" />
        <Squiggle className="d-squig d-squig-1" />
        <Squiggle className="d-squig d-squig-2" />
        <Leaves className="d-leaves" />
        <Confetti className="d-confetti" />
        <Zigzag className="d-zigzag" />

        <div className="hero-copy">
          <h1 className="hero-title">
            <span className="hl">The places</span>
            <span className="hl">we’ve been,</span>
            <span className="hl">bound in</span>
            <span className="hl">one book</span>
            <span className="chip-sticker s1" style={{ "--d": "0s" } as Vars}><i className="badge azure"><Icon name="camera" /></i>Polaroids</span>
            <span className="chip-sticker s2" style={{ "--d": ".12s" } as Vars}><i className="badge violet"><Icon name="sparkle" /></i>Postmarks</span>
            <span className="chip-sticker s3" style={{ "--d": ".24s" } as Vars}><i className="badge coral"><Icon name="pin" /></i>Pins &amp; notes</span>
          </h1>
          <p className="hero-sub">A travel diary for couples and friends. Everyone you invite writes in the same book: photos, the place, the story, and a note from each of you.</p>
          <form className="glass start-form" onSubmit={start}>
            <label htmlFor="hero-title" className="sr-only">Name your book</label>
            <input id="hero-title" type="text" maxLength={60} placeholder="Name your book" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
            <button type="submit" className="btn">Start free</button>
          </form>
          <p className="hero-fine">Free for one book and two people. No card needed.</p>
        </div>

        <p className="hero-tag">
          <span>— not just photos.</span>
          <span>a book you both</span>
          <span>write in</span>
        </p>

        <div className="dock glass" role="group" aria-label="What a page holds">
          {([["camera", "Photos", "azure", "#inside"], ["pin", "Places", "coral", "#inside"], ["pen", "Notes", "sun", "#inside"], ["palette", "Design", "violet", "#design"]] as [IconName, string, string, string][]).map(([icon, label, tone, href]) => (
            <a key={label} href={href} className={`dock-app ${tone}`} aria-label={label} data-label={label}>
              <Icon name={icon} />
            </a>
          ))}
        </div>

        <div className="page-stack">
          {[3, 1, 0].map((i, k) => {
            const p = shelf.list[i];
            return (
              <button key={p.id} type="button" className="glass page-card" style={{ "--k": k } as Vars} onClick={() => setOpen({ id: p.id, photo: 0 })} tabIndex={k === 2 ? 0 : -1} aria-hidden={k !== 2}>
                <img src={p.photos[0].url} alt="" />
                <span className="page-card-text">
                  <b>{p.title}</b>
                  <span>Page {p.n} · {p.place.name} · Open <Icon name="right" /></span>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* ---------- One book ---------- */}
      <section className="sec paper-sec about" id="about" aria-labelledby="about-h">
        <Scallops className="d-about-scallops" />
        <Spiral className="d-about-spiral" />
        <Leaves className="d-about-leaves" />
        <h2 id="about-h" className="sec-title">One book.<br />Everyone writes in it.</h2>
        <p className="sec-lede">Make a book for the two of you, or for the whole barkada. Everyone you invite adds pages, photos and notes to the same book. Read it back in chapters, on a map, or as one long album.</p>
        <button type="button" className="pin-btn" onClick={() => start()}><PushPin className="pin-btn-pin" />Start a book</button>

        <div className="facts">
          {[
            ["12", "photos on a page", "Resized on your phone before they upload, so even long trips stay quick to open.", "lime"],
            ["3", "ways to read it", "Chapters by year, an atlas of numbered pins, and an album of every photo.", "violet"],
            ["20", "people in one book", "On Crew. Free fits two of you, and Plus fits six.", "coral"],
            ["₱0", "to start", "One book for two people, free for as long as you like.", "azure"],
          ].map(([n, label, text, tone], i) => (
            <article key={label} className={`fact tone-${tone}`} data-settle style={{ "--r": `${[-4, 3, -2.5, 4][i]}deg`, "--i": i } as Vars}>
              <Paperclip className="fact-clip" metal={(["steel", "coral", "steel", "azure"] as Metal[])[i]} />
              <span className="fact-n">{n}</span>
              <h3>{label}</h3>
              <p>{text}</p>
              <FoldedCorner tone={({ lime: "#d4ef3a", violet: "#b9a7ff", coral: "#ff9ab0", azure: "#8ec5ff" } as Record<string, string>)[tone]} />
            </article>
          ))}
        </div>
      </section>

      {/* ---------- Sample pages ---------- */}
      <section className="sec bloom-sec" id="pages" aria-labelledby="pages-h">
        <h2 id="pages-h" className="sec-title">Pages that<br />tell stories</h2>
        <p className="sec-lede">Every date, weekend away and long trip becomes a page. These four are from a sample book. Open one to read it like the real thing.</p>
        <div className="scards">
          {shelf.list.map((p, i) => (
            <button key={p.id} type="button" className="scard" data-settle style={{ "--r": `${[-6, 4, -3, 5][i]}deg`, "--i": i } as Vars} onClick={() => setOpen({ id: p.id, photo: 0 })}>
              {i % 2 ? <Paperclip className="scard-clip" metal={(["azure", "lilac"] as Metal[])[(i - 1) / 2]} /> : <Tape className="scard-tape" tone={(["butter", "sky"] as TapeTone[])[i / 2]} />}
              <span className="scard-photo"><img src={p.photos[0].url} alt={p.photos[0].caption} loading="lazy" decoding="async" /></span>
              <span className="scard-cap">{p.photos[0].caption}</span>
              <span className="scard-foot">
                <b>{p.title}</b>
                <span>{p.place.name} · {fmtShort(p.date)} · page {p.n}</span>
              </span>
            </button>
          ))}
          <button type="button" className="scard blank" data-settle style={{ "--r": "-2deg", "--i": 4 } as Vars} onClick={() => start()}>
            <Tape className="scard-tape" tone="mint" />
            <span className="blank-in">
              <Icon name="plus" />
              <b>Your first page</b>
              <span>Start a book, free</span>
            </span>
          </button>
        </div>
        <span className="chip-sample on-photo">Sample pages</span>
      </section>

      {/* ---------- The designer ---------- */}
      <section className="sec paper-sec design-sec" id="design" aria-labelledby="design-h">
        <Zigzag className="d-design-zig" />
        <Confetti className="d-design-confetti" />
        <h2 id="design-h" className="sec-title">Design the book<br />that’s yours</h2>
        <p className="sec-lede">Cloth, foil, type, stickers and paper. Turn the book, drag stickers onto it, try a few looks. When you sign up, your first book starts with this cover.</p>
        <CoverDesigner
          design={design}
          onChange={setDesign}
          title={shownTitle}
          subtitle="Mara & Josh"
          previewPage={siargao}
          idPrefix="try"
          stageDecor={<><Tape className="mat-tape mat-tape-l" tone="blush" /><Tape className="mat-tape mat-tape-r" tone="sky" /></>}
          header={
            <div className="fld">
              <label htmlFor="try-title">Title on the cover</label>
              <input id="try-title" type="text" maxLength={60} placeholder="Our Book of Travels" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
            </div>
          }
          footer={
            <div className="try-foot">
              <button type="button" className="btn" onClick={() => start(undefined, true)}>Start free with this cover</button>
              <span className="hint">Free for one book and two people.</span>
            </div>
          }
        />
      </section>

      {/* ---------- What goes on a page ---------- */}
      <section className="sec paper-sec inside" id="inside" aria-labelledby="inside-h">
        <Squiggle className="d-inside-squig" />
        <div className="split">
          <div className="split-head">
            <h2 id="inside-h" className="sec-title left">What goes<br />on a page</h2>
            <p className="sec-lede left">Five things, every time. Tap one to see how it works.</p>
            <span className="inside-sticker" aria-hidden="true"><StickerArt kind="camera" /></span>
          </div>
          <Inside />
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section className="sec paper-sec pricing" id="pricing" aria-labelledby="pricing-h">
        <Scallops className="d-price-scallops" />
        <h2 id="pricing-h" className="sec-title">Plans for two,<br />or twenty</h2>
        <p className="sec-lede">Prices in pesos. Pay for 1, 6 or 12 months at a time through PayMongo, with card, GCash or Maya. Nothing renews by itself.</p>
        <div className="pcards">
          {plans.map((p, i) => (
            <article key={p.id} className={`pcard pcard-${p.id}`} data-settle style={{ "--r": `${[-1.5, 0, 1.5][i] ?? 0}deg`, "--i": i } as Vars}>
              <Tape className="pcard-tape" tone={(["mint", "sky", "lilac"] as TapeTone[])[i] ?? "butter"} />
              {p.id === "plus" && <span className="pcard-flag"><StickerArt kind="star" /></span>}
              <header>
                <h3>{p.name}</h3>
                <p className="price"><b>{p.price ? peso(p.price) : "₱0"}</b><span>{p.price ? "a month" : "always"}</span></p>
              </header>
              <ul>
                <li>{p.books == null ? "As many books as you like" : `${p.books} book`}</li>
                <li>Up to {p.members} people in each book</li>
                {p.id === "crew" && <li>More photo storage</li>}
                <li>Every cover, sticker and paper</li>
                <li>Chapters, atlas, album and notes</li>
              </ul>
              <button type="button" className={`btn ${p.id === "plus" ? "" : "line"}`} onClick={() => { keepForSignup(title); navigate(me ? (p.price ? "/app/account" : "/app") : `/signup${p.price ? `?plan=${p.id}` : ""}`); }}>
                {p.price ? `Choose ${p.name}` : "Start free"}
              </button>
            </article>
          ))}
        </div>
        <p className="pcards-note">When paid months run out, the book goes back to Free limits. Nothing is deleted: you can still read and edit everything, and adding more waits until you renew.</p>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="sec paper-sec faq" aria-labelledby="faq-h">
        <div className="split">
          <div className="split-head">
            <h2 id="faq-h" className="sec-title small left">Good<br />to know</h2>
            <span className="faq-sticker" aria-hidden="true"><StickerArt kind="hello" /></span>
          </div>
          <div className="faq-list">
          {[
            ["Who can see our book?", "Only the people in it. Photos are private too: they only load for members who are signed in."],
            ["How do we write in it together?", "Open the book's People panel and share the invite link. It works for 14 days, and anyone who joins can add pages, photos and notes."],
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

      {/* ---------- Close ---------- */}
      <footer className="closing">
        <div className="closing-window">
          <img src="/img/hero.jpg" alt="" loading="lazy" decoding="async" />
          <div className="closing-in">
            <h2 className="sec-title on-sky">Start the first page<br />tonight</h2>
            <form className="glass start-form" onSubmit={start}>
              <label htmlFor="close-title" className="sr-only">Name your book</label>
              <input id="close-title" type="text" maxLength={60} placeholder="Name your book" value={title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />
              <button type="submit" className="btn">Start free</button>
            </form>
          </div>
        </div>
        <div className="foot-row">
          <span className="wordmark small">NinRe</span>
          <nav aria-label="Footer">
            <a href="#pricing">Pricing</a>
            <Link href="/login">Log in</Link>
            <Link href="/signup">Sign up</Link>
          </nav>
          <span className="foot-fine">Photographs from Unsplash. Payments by PayMongo.</span>
        </div>
      </footer>

      {open && (
        <div className="book-scope" style={bookStyle(SAMPLE_DESIGN).style} {...bookStyle(SAMPLE_DESIGN).data}>
          <MapDefs />
          <PageSpread list={shelf.list} id={open.id} photo={open.photo} canEdit={false} onGo={(id, photo = 0) => setOpen({ id, photo })} onClose={() => setOpen(null)} />
        </div>
      )}
    </div>
  );
}

/** The pastel rows: each opens to say what that part of a page does. */
function Inside() {
  const rows: { id: string; tone: string; icon: IconName; title: string; text: string }[] = [
    { id: "photos", tone: "blush", icon: "camera", title: "Photos", text: "Up to 12 on a page, resized on your phone before they upload. The first becomes the polaroid on top, and every one gets a handwritten caption." },
    { id: "places", tone: "sky", icon: "pin", title: "The place", text: "Pick from 83 places that pin themselves, or tap the map to drop your own. Every page lands on the book's atlas with a numbered pin and a dashed route in the order things happened." },
    { id: "story", tone: "butter", icon: "book", title: "The story", text: "Lined paper for the long version of the day. Unsaved pages stay on your phone, so a closed tab doesn't lose a word." },
    { id: "notes", tone: "mint", icon: "pen", title: "Notes from each of you", text: "Short sticky notes on any page, signed by whoever wrote them. The quickest way to answer the other person's version of events." },
    { id: "postmark", tone: "lime", icon: "sparkle", title: "A postmark", text: "Every page is stamped with the place, the date and a three-letter code, in your book's own ink." },
  ];
  const [open, setOpen] = useState<string | null>(() => {
    const h = location.hash.replace("#inside-", "");
    return rows.some((r) => r.id === h) ? h : "photos";
  });
  return (
    <ul className="prows">
      {rows.map((r, i) => (
        <li key={r.id} className={`prow tone-${r.tone}${open === r.id ? " open" : ""}`} id={`inside-${r.id}`} data-settle style={{ "--i": i } as Vars}>
          <button type="button" aria-expanded={open === r.id} aria-controls={`inside-${r.id}-text`} onClick={() => setOpen(open === r.id ? null : r.id)}>
            <span>{r.title}</span>
            <i className={`badge prow-badge tone-${r.tone}`}><Icon name={r.icon} /></i>
          </button>
          <div className="prow-body" id={`inside-${r.id}-text`} hidden={open !== r.id}>
            <p>{r.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
