import { useEffect, useMemo, useRef, useState } from "react";
import { api, errorText } from "../api";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { MONTHS, parseDate, plural } from "../lib/format";
import { WikiPhoto } from "../lib/wiki";
import { RealMap, type RealPin } from "../map/RealMap";
import { Link, navigate, useLocation, useTitle } from "../router";
import type { Company, Interest, Itinerary, Pace, PlanRequest, TripPlace } from "../types";
import { ideaById, mapsFor, type Idea, type IdeaPlace } from "./ideas";
import { KIND_ICON } from "./Plan";

const placeId = () => "p" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4);
const mapsSearch = (name: string, area: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(area ? `${name}, ${area}` : name)}`;

/** "2026-04-03" for the day `n` days after `start`. */
function addDays(start: string, n: number): string {
  const d = parseDate(start);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** One ready-made destination: its photos, its places on a real map, and NinRe AI to plan the trip. */
export function Destination({ id }: { id: string }) {
  const idea = ideaById(id);
  useTitle(idea ? `Plan · ${idea.name}` : "Plan");
  if (!idea) {
    return (
      <div className="plan">
        <p className="plan-empty">That destination isn't here any more.</p>
        <Link href="/app/plan" className="btn line">Back to Plan</Link>
      </div>
    );
  }
  return <DestinationPage idea={idea} />;
}

function DestinationPage({ idea }: { idea: Idea }) {
  const toast = useToast();
  // Arriving from a place's card (?place=3), that place is the one in view.
  const { query } = useLocation();
  const asked = Number(query.get("place"));
  const start = Number.isInteger(asked) && asked >= 0 && asked < idea.places.length && query.has("place") ? asked : null;
  const [hot, setHot] = useState<number | null>(start);
  const [picked, setPicked] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const strip = useRef<HTMLOListElement>(null);
  const mapBox = useRef<HTMLDivElement>(null);

  const cover = idea.places[idea.cover];
  const pins = useMemo<RealPin[]>(() => idea.places.map((p, i) => ({ id: String(i), lat: p.lat, lng: p.lng, n: i + 1, label: `${i + 1}. ${p.name}, ${p.area}` })), [idea]);

  // Scroll the row sideways to the place it was opened for (only the row: the page stays at the top).
  useEffect(() => {
    const row = strip.current, card = start != null ? (row?.children[start] as HTMLElement | undefined) : undefined;
    if (row && card) row.scrollTo({ left: card.offsetLeft - row.offsetLeft - 16, behavior: "instant" as ScrollBehavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(i: number) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(i)) n.delete(i); else n.add(i);
      return n;
    });
  }

  /** From a card: show the place on the map. */
  function showOnMap(i: number) {
    setHot(i);
    mapBox.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /** From the map: bring the place's card into view. */
  function showCard(i: number) {
    setHot(i);
    strip.current?.children[i]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }

  const chosen = idea.places.filter((_, i) => picked.has(i));

  async function planMyself() {
    setBusy(true);
    try {
      const places = chosen.map((p): TripPlace => ({ id: placeId(), name: p.name, area: p.area, kind: p.kind, note: "", day: null, done: false }));
      const trip = await api.createTrip({ destination: idea.name, start: "", end: "", days: 0, places });
      navigate(`/app/plan/${trip.id}`);
    } catch (err) {
      toast(errorText(err, "Couldn't start that trip. Try again."));
      setBusy(false);
    }
  }

  return (
    <div className="plan dest">
      <header className="dest-hero">
        <WikiPhoto title={cover.wiki} search={`${cover.name} ${cover.area}`} size={960} className="dest-hero-photo" />
        <span className="dest-hero-text">
          <span className="dest-kicker">{plural(idea.places.length, "place")} to see</span>
          <h1 className="app-title">{idea.name}</h1>
          <p>{idea.summary}</p>
        </span>
      </header>

      <section className="plan-group" aria-labelledby="places">
        <div className="dest-row">
          <h2 id="places" className="plan-label"><Icon name="camera" />Places to see</h2>
          <span className="dest-hint">{picked.size ? `${plural(picked.size, "place")} picked` : "Tap + to pick"}</span>
        </div>
        <ol ref={strip} className="dest-strip">
          {idea.places.map((p, i) => (
            <PlaceCard key={p.name} place={p} n={i + 1} hot={hot === i} picked={picked.has(i)} onMap={() => showOnMap(i)} onPick={() => toggle(i)} />
          ))}
        </ol>
      </section>

      <section className="plan-group" aria-labelledby="on-map">
        <h2 id="on-map" className="plan-label"><Icon name="pin" />On the map</h2>
        <div ref={mapBox} className="dest-map-box">
          <RealMap className="dest-map" pins={pins} hot={hot == null ? null : String(hot)} onPin={(pid) => showCard(Number(pid))} label={`Map of ${idea.name}'s places`} />
        </div>
      </section>

      <NinreAI destination={idea.name} defaultDays={idea.days} mustSee={chosen.map((p) => p.name)} />

      <section className="plan-group dest-self">
        <p className="hint">Rather plan it yourself?</p>
        <button type="button" className="btn line" disabled={busy} onClick={planMyself}>
          <Icon name="plus" />{chosen.length ? `Start a ${idea.name} trip with ${plural(chosen.length, "place")}` : `Start an empty ${idea.name} trip`}
        </button>
        <p className="pop-credit">Photos from Wikipedia. Map © OpenStreetMap contributors.</p>
      </section>
    </div>
  );
}

function PlaceCard({ place: p, n, hot, picked, onMap, onPick }: {
  place: IdeaPlace; n: number; hot: boolean; picked: boolean; onMap: () => void; onPick: () => void;
}) {
  return (
    <li className={`dest-card${hot ? " hot" : ""}`}>
      <WikiPhoto title={p.wiki} search={`${p.name} ${p.area}`} alt={p.name} className="dest-photo" fallback={<Icon name={KIND_ICON[p.kind]} />}>
        <span className="dest-num" aria-hidden="true">{n}</span>
      </WikiPhoto>
      <span className="dest-card-text">
        <b>{p.name}</b>
        <span className="sug-meta"><Icon name={KIND_ICON[p.kind]} />{`${p.area} · ${p.time}`}</span>
        <span className="sug-why">{p.why}</span>
      </span>
      <span className="dest-card-acts">
        <button type="button" className="place-btn" aria-label={`Show ${p.name} on the map`} title="Show on the map" onClick={onMap}><Icon name="pin" /></button>
        <a className="place-btn" href={mapsFor(p)} target="_blank" rel="noopener noreferrer" aria-label={`${p.name} in Google Maps`} title="Open in Google Maps"><Icon name="link" /></a>
        <button type="button" className="place-btn" aria-pressed={picked} aria-label={`Pick ${p.name}`} title={picked ? "Picked" : "Pick"} onClick={onPick}>
          <Icon name={picked ? "check" : "plus"} />
        </button>
      </span>
    </li>
  );
}

/* ---------- NinRe AI ---------- */

const COMPANY: { id: Company; label: string }[] = [
  { id: "solo", label: "Just me" }, { id: "couple", label: "Couple" }, { id: "friends", label: "Friends" }, { id: "family", label: "Family" },
];
const PACE: { id: Pace; label: string; hint: string }[] = [
  { id: "relaxed", label: "Relaxed", hint: "2-3 a day" }, { id: "balanced", label: "Balanced", hint: "3-4 a day" }, { id: "packed", label: "Packed", hint: "4-5 a day" },
];
const INTERESTS: { id: Interest; label: string }[] = [
  { id: "food", label: "Food" }, { id: "culture", label: "Culture" }, { id: "nature", label: "Nature" }, { id: "beaches", label: "Beaches" },
  { id: "shopping", label: "Shopping" }, { id: "nightlife", label: "Nightlife" }, { id: "adventure", label: "Adventure" }, { id: "photography", label: "Photo spots" },
];
const WAITING = ["Looking at the map…", "Grouping places by area…", "Working out the best order…", "Finding good food stops…", "Adding a few tips…"];

/** NinRe AI: asks a few things about the trip, then plans it day by day; the plan can be kept as a trip. */
export function NinreAI({ destination, defaultDays, mustSee }: { destination: string; defaultDays: number; mustSee: string[] }) {
  const toast = useToast();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [days, setDays] = useState(defaultDays);
  const [start, setStart] = useState("");
  const [company, setCompany] = useState<Company>("couple");
  const [pace, setPace] = useState<Pace>("balanced");
  const [interests, setInterests] = useState<Interest[]>(["food", "culture"]);
  const [plan, setPlan] = useState<Itinerary | null>(null);
  const [asked, setAsked] = useState<PlanRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [wait, setWait] = useState(0);
  const top = useRef<HTMLElement>(null);

  useEffect(() => {
    api.trips().then((r) => setAvailable(r.planner), () => setAvailable(false));
  }, []);

  useEffect(() => {
    if (!loading) return;
    setWait(0);
    const t = setInterval(() => setWait((w) => Math.min(w + 1, WAITING.length - 1)), 6000);
    return () => clearInterval(t);
  }, [loading]);

  async function ask() {
    const req: PlanRequest = { destination, days, start, pace, company, interests, mustSee };
    setLoading(true);
    setError("");
    try {
      const out = await api.planTrip(req);
      if (!out.found) setError(`NinRe doesn't know “${destination}” well enough to plan it.`);
      else {
        setPlan(out);
        setAsked(req);
        requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      }
    } catch (err) {
      setError(errorText(err, "NinRe couldn't plan that just now. Try again."));
    }
    setLoading(false);
  }

  async function keep() {
    if (!plan || !asked) return;
    setSaving(true);
    try {
      const places = plan.days.flatMap((d) => d.stops.map((s): TripPlace => ({
        id: placeId(), name: s.name, area: s.area, kind: s.kind, note: [s.when, s.note].filter(Boolean).join(" · ").slice(0, 400), day: d.day, done: false,
      })));
      const trip = await api.createTrip({
        destination: plan.destination || destination,
        start: asked.start,
        end: asked.start ? addDays(asked.start, asked.days - 1) : "",
        days: asked.days,
        places: places.slice(0, 120),
      });
      navigate(`/app/plan/${trip.id}`);
    } catch (err) {
      toast(errorText(err, "Couldn't keep the plan. Try again."));
      setSaving(false);
    }
  }

  const flip = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <section ref={top} className="ai" aria-labelledby="ninre-ai">
      <div className="ai-head">
        <span className="ai-face" aria-hidden="true"><Icon name="sparkle" /></span>
        <div>
          <h2 id="ninre-ai" className="ai-name">NinRe AI</h2>
          <p className="ai-says">
            {plan ? `Here's your ${plural(asked!.days, "day")} in ${destination}. Keep it, or change anything and ask again.`
              : `Hi! I'm NinRe. Tell me a little about your trip and I'll plan every day in ${destination} for you.`}
          </p>
        </div>
      </div>

      {available === false && <p className="plan-empty">NinRe AI isn't switched on on this server yet, so trips here are planned by hand for now.</p>}

      {available !== false && !plan && (
        <div className="ai-form" aria-busy={loading}>
          <div className="ai-field">
            <span className="ai-q" id="ai-days">How many days?</span>
            <div className="ai-stepper" role="group" aria-labelledby="ai-days">
              <button type="button" aria-label="One day fewer" disabled={days <= 1} onClick={() => setDays((d) => d - 1)}>−</button>
              <output aria-live="polite">{plural(days, "day")}</output>
              <button type="button" aria-label="One day more" disabled={days >= 14} onClick={() => setDays((d) => d + 1)}>+</button>
            </div>
          </div>
          <div className="ai-field">
            <label className="ai-q" htmlFor="ai-start">When do you leave? <span className="opt">optional</span></label>
            <input id="ai-start" className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="ai-field">
            <span className="ai-q" id="ai-who">Who's going?</span>
            <div className="ai-chips" role="group" aria-labelledby="ai-who">
              {COMPANY.map((c) => <button key={c.id} type="button" className="ai-chip" aria-pressed={company === c.id} onClick={() => setCompany(c.id)}>{c.label}</button>)}
            </div>
          </div>
          <div className="ai-field">
            <span className="ai-q" id="ai-pace">What pace?</span>
            <div className="ai-chips" role="group" aria-labelledby="ai-pace">
              {PACE.map((c) => <button key={c.id} type="button" className="ai-chip" aria-pressed={pace === c.id} onClick={() => setPace(c.id)}>{c.label}<small>{c.hint}</small></button>)}
            </div>
          </div>
          <div className="ai-field">
            <span className="ai-q" id="ai-love">What do you love?</span>
            <div className="ai-chips" role="group" aria-labelledby="ai-love">
              {INTERESTS.map((c) => <button key={c.id} type="button" className="ai-chip" aria-pressed={interests.includes(c.id)} onClick={() => setInterests((l) => flip(l, c.id))}>{c.label}</button>)}
            </div>
          </div>
          {mustSee.length > 0 && (
            <p className="ai-must"><Icon name="check" />I'll fit in your {plural(mustSee.length, "pick")}: {mustSee.join(", ")}.</p>
          )}
          {error && <p className="err" role="alert">{error}</p>}
          {loading ? (
            <p className="ai-wait" role="status"><span className="ai-dots" aria-hidden="true"><i /><i /><i /></span>NinRe is planning {plural(days, "day")} in {destination}. {WAITING[wait]}</p>
          ) : (
            <button type="button" className="btn sun ai-go" disabled={available == null} onClick={ask}><Icon name="sparkle" />Plan my trip</button>
          )}
        </div>
      )}

      {plan && asked && <PlanView plan={plan} start={asked.start} saving={saving} onKeep={keep} onChange={() => setPlan(null)} />}
    </section>
  );
}

function PlanView({ plan, start, saving, onKeep, onChange }: { plan: Itinerary; start: string; saving: boolean; onKeep: () => void; onChange: () => void }) {
  const [day, setDay] = useState(0); // 0 = every day
  const pins = useMemo<RealPin[]>(() => {
    const shown = plan.days.filter((d) => !day || d.day === day);
    return shown.flatMap((d) => d.stops.flatMap((s, i) => (s.lat != null && s.lng != null
      ? [{ id: `${d.day}-${i}`, lat: s.lat, lng: s.lng, n: day ? i + 1 : d.day, label: `Day ${d.day}: ${s.name}` }] : [])));
  }, [plan, day]);

  const dateOf = (n: number) => {
    if (!start) return "";
    const d = parseDate(addDays(start, n - 1));
    return ` · ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  };

  return (
    <div className="ai-plan">
      <div>
        <h3 className="ai-title">{plan.title}</h3>
        <p className="plan-summary">{plan.summary}</p>
      </div>

      <div className="idea-tabs" role="group" aria-label="Show on the map">
        <button type="button" className="idea-tab" aria-pressed={day === 0} onClick={() => setDay(0)}>Every day</button>
        {plan.days.map((d) => <button key={d.day} type="button" className="idea-tab" aria-pressed={day === d.day} onClick={() => setDay(d.day)}>Day {d.day}</button>)}
      </div>
      <RealMap className="ai-map" pins={pins} route={day > 0} label={day ? `Map of day ${day}` : "Map of the whole trip"} maxZoom={14} />

      <ol className="ai-days">
        {plan.days.filter((d) => !day || d.day === day).map((d) => (
          <li key={d.day} className="ai-day">
            <h4><span className="ai-day-n">Day {d.day}{dateOf(d.day)}</span>{d.title}</h4>
            {d.base && <p className="ai-base"><Icon name="home" />Stay in {d.base}</p>}
            <ol className="ai-stops">
              {d.stops.map((s, i) => (
                <li key={i}>
                  <span className="ai-when">{s.when}</span>
                  <span className="sug-text">
                    <b>{s.name}</b>
                    <span className="sug-meta"><Icon name={KIND_ICON[s.kind]} />{s.area}</span>
                    {s.note && <span className="sug-why">{s.note}</span>}
                  </span>
                  <a className="place-btn" href={mapsSearch(s.name, s.area)} target="_blank" rel="noopener noreferrer" aria-label={`${s.name} in Google Maps`} title="Open in Google Maps"><Icon name="pin" /></a>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>

      {plan.tips.length > 0 && (
        <div className="ai-tips">
          <h4>NinRe's tips</h4>
          <ul>{plan.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
        </div>
      )}

      <div className="ai-acts">
        <button type="button" className="btn line" onClick={onChange}><Icon name="pen" />Change something</button>
        <button type="button" className="btn sun" disabled={saving} onClick={onKeep}><Icon name="check" />Keep this plan</button>
      </div>
    </div>
  );
}
