import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, errorText } from "../api";
import { Icon, type IconName } from "../components/Icon";
import { useToast } from "../components/Toast";
import { MONTHS, daysBetween, fmtShort, parseDate, plural, todayYMD } from "../lib/format";
import { Link, navigate, useTitle } from "../router";
import { useSession } from "../session";
import type { PlaceKind, Suggestion, Suggestions, Trip, TripInput, TripPlace } from "../types";
import { IDEAS } from "./ideas";
import { Cover, Popular, explorePath } from "./Popular";
import { TripJourney } from "./TripJourney";
import { World } from "./World";

export const KIND_ICON: Record<PlaceKind, IconName> = {
  landmark: "city", culture: "sparkle", nature: "mountain", water: "wave", food: "food", shopping: "backpack", activity: "camera",
};
const KIND_NAME: Record<PlaceKind, string> = {
  landmark: "Landmark", culture: "Culture", nature: "Nature", water: "Water", food: "Food", shopping: "Shopping", activity: "Things to do",
};
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Days from the first to the last date, counting both; 0 without both dates. */
const tripDays = (start: string, end: string) => (start && end ? Math.round((parseDate(end).getTime() - parseDate(start).getTime()) / 864e5) + 1 : 0);

/** "1 – 5 Apr 2026", "28 Mar – 2 Apr 2026", or "From 1 Apr 2026". */
function fmtRange(start: string, end: string): string {
  if (!start) return "";
  if (!end || end === start) return end ? fmtShort(start) : `From ${fmtShort(start)}`;
  const a = parseDate(start), b = parseDate(end);
  const sameYear = a.getFullYear() === b.getFullYear(), sameMonth = sameYear && a.getMonth() === b.getMonth();
  const left = sameMonth ? `${a.getDate()}` : sameYear ? `${a.getDate()} ${MONTHS[a.getMonth()].slice(0, 3)}` : fmtShort(start);
  return `${left} – ${fmtShort(end)}`;
}

/** "Day 2 · Thu 2 Apr", or just "Day 2" before there are dates. */
function dayLabel(start: string, day: number): string {
  if (!start) return `Day ${day}`;
  const d = parseDate(start);
  d.setDate(d.getDate() + day - 1);
  return `Day ${day} · ${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

const placeId = () => "p" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const input = (t: Trip): TripInput => ({ destination: t.destination, start: t.start, end: t.end, days: t.days, places: t.places });
/** How long the trip lasts: by its dates, or as set without them. */
const lengthOf = (t: Pick<Trip, "start" | "end" | "days">) => tripDays(t.start, t.end) || t.days || 0;
/** "1 – 5 Apr 2026", "5 days", or "No dates yet". */
export const whenOf = (t: Trip) => fmtRange(t.start, t.end) || (t.days ? plural(t.days, "day") : "No dates yet");

/* ---------- The Plan tab: where to next ---------- */

/** "Good morning", "Good afternoon" or "Good evening", by the clock. */
function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** The Plan tab: a greeting, the search for where to go, and ready-made destinations. */
export function PlanHome() {
  useTitle("Plan");
  const toast = useToast();
  const { me } = useSession();
  const [busy, setBusy] = useState(false);
  const first = me?.user.name.trim().split(/\s+/)[0] ?? "";

  async function go(destination: string) {
    // A destination NinRe already knows opens its page, with photos, the map and NinRe AI.
    const known = IDEAS.find((d) => same(d.name, destination));
    if (known) return navigate(explorePath(known.id));
    setBusy(true);
    try {
      const trip = await api.createTrip({ destination, start: "", end: "", days: 0, places: [] });
      navigate(`/app/plan/${trip.id}`);
    } catch (err) {
      toast(errorText(err, "Couldn't start that trip. Try again."));
      setBusy(false);
    }
  }

  return (
    <div className="plan">
      <header className="plan-hello">
        <span className="plan-kicker">{first ? `${greeting()}, ${first}` : greeting()}</span>
        <h1 className="app-title">Where to next?</h1>
        <p className="plan-lede">Search a country or city, or start from a favourite below. NinRe AI can plan every day for you.</p>
      </header>
      <WhereTo busy={busy} onGo={go} />
      <Popular />
      <World />
    </div>
  );
}

/** Places the empty search box suggests in turn, from every corner of the map. */
const DREAMS = ["Kyoto", "Santorini", "Bali", "Reykjavík", "Cusco", "Seoul", "Marrakesh", "Queenstown", "Lisbon", "Cappadocia", "Banff", "Hoi An"];

/** The search: type a place and go, or tap one of the ready-made destinations below (narrowed as you type). */
function WhereTo({ busy, onGo }: { busy: boolean; onGo: (destination: string) => void }) {
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);
  const [dream, setDream] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  // While the box is empty and nobody's in it, it daydreams through destinations (not with reduced motion).
  useEffect(() => {
    if (q || focused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setDream((d) => (d + 1) % DREAMS.length), 2400);
    return () => window.clearInterval(t);
  }, [q, focused]);

  const typed = q.trim().toLowerCase();
  // A ready-made destination matches by its name, or by a city in it ("Kyoto" finds Japan).
  const matches = typed
    ? IDEAS.flatMap((d) => {
        if (d.name.toLowerCase().includes(typed)) return [{ idea: d, via: "" }];
        const cities = d.places.map((p) => p.area.split(", ").pop()!);
        // "kyo" means Kyoto before Tokyo.
        const city = cities.find((c) => c.toLowerCase().startsWith(typed)) ?? cities.find((c) => c.toLowerCase().includes(typed));
        return city ? [{ idea: d, via: city }] : [];
      })
    : IDEAS.filter((d) => d.featured).slice(0, 4).map((idea) => ({ idea, via: "" }));
  const picks = matches.slice(0, 4);

  function send(e: FormEvent) {
    e.preventDefault();
    const where = q.trim();
    if (!where) {
      setError("Type a country or city first.");
      return input.current?.focus();
    }
    setError("");
    onGo(where);
  }

  return (
    <section className="where" aria-labelledby="where-h">
      <h2 id="where-h" className="where-h">Where are you going?</h2>
      <form className="where-search" onSubmit={send} noValidate>
        <Icon name="search" />
        <span className="where-field">
          <input
            ref={input} type="text" value={q} maxLength={80} autoComplete="off" enterKeyHint="go" aria-labelledby="where-h" aria-describedby={error ? "where-err" : undefined}
            onChange={(e) => { setQ(e.target.value); setError(""); }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          />
          {!q && <span key={dream} className="where-ghost" aria-hidden="true">{DREAMS[dream]}</span>}
        </span>
        <button type="submit" className="where-go" disabled={busy}>Plan it</button>
      </form>
      {error && <p id="where-err" className="err" role="alert">{error}</p>}

      {picks.length > 0 ? (
        <ul className="where-picks">
          {picks.map(({ idea, via }) => (
            <li key={idea.id}>
              <Link href={explorePath(idea.id)} className="where-pick">
                <Cover idea={idea} className="where-pick-photo" />
                <span>{via || idea.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="where-note">Anywhere works: press Plan it to start a trip to {q.trim()}.</p>
      )}
    </section>
  );
}

/* ---------- My trips ---------- */

type Status = "idea" | "soon" | "now" | "past";

/** Where a trip stands today: still an idea without dates, coming up, under way, or over. */
function statusOf(t: Trip, today: string): { key: Status; text: string } {
  if (!t.start) return { key: "idea", text: "Planning" };
  if (today < t.start) {
    const n = daysBetween(today, t.start);
    return { key: "soon", text: n === 1 ? "Tomorrow" : n <= 60 ? `In ${n} days` : "Coming up" };
  }
  if (today <= (t.end || t.start)) return { key: "now", text: "On now" };
  return { key: "past", text: "Been there" };
}

/** Dated trips in the order they happen, then the ones without dates, newest first. */
const byWhen = (a: Trip, b: Trip) => (a.start && b.start ? a.start.localeCompare(b.start) : a.start ? -1 : b.start ? 1 : b.createdAt - a.createdAt);
const sleepMs = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Every trip the person is planning, by year and month, with a photo when NinRe knows the place. */
export function MyTrips() {
  useTitle("My trips");
  const toast = useToast();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState("");
  /** "all", a year such as "2026", or "none" for trips without dates. */
  const [year, setYear] = useState("all");
  const [month, setMonth] = useState<number | "all">("all");
  const [armed, setArmed] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    api.trips().then((r) => setTrips(r.trips), (err) => setError(errorText(err, "Couldn't load your trips.")));
  }, []);

  // A delete waits a few seconds for its second tap, then stands down.
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(null), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);

  const ideaFor = (t: Trip) => IDEAS.find((d) => same(d.name, t.destination));
  const today = todayYMD();
  const all = (trips ?? []).slice().sort(byWhen);
  const undated = all.filter((t) => !t.start).length;
  const years = [...new Set(all.filter((t) => t.start).map((t) => t.start.slice(0, 4)))].sort((a, b) => b.localeCompare(a));
  // A filter left pointing at nothing (its last trip deleted) falls back to everything.
  const y = year === "none" ? (undated ? "none" : "all") : years.includes(year) ? year : "all";
  const inYear = all.filter((t) => (y === "all" ? true : y === "none" ? !t.start : t.start.startsWith(y)));
  const months = y === "all" || y === "none" ? [] : [...new Set(inYear.map((t) => parseDate(t.start).getMonth()))].sort((a, b) => a - b);
  const m = month !== "all" && months.includes(month) ? month : "all";
  const shown = m === "all" ? inYear : inYear.filter((t) => parseDate(t.start).getMonth() === m);
  const scope = y === "all" ? "All trips" : y === "none" ? "Trips without dates" : m === "all" ? y : `${MONTHS[m]} ${y}`;
  const coming = all.filter((t) => ["soon", "now"].includes(statusOf(t, today).key)).length;

  // Under a heading per month: "April 2026", and "No dates yet" last.
  const groups: { key: string; label: string; trips: Trip[] }[] = [];
  for (const t of shown) {
    const key = t.start ? t.start.slice(0, 7) : "none";
    const last = groups[groups.length - 1];
    if (last?.key === key) last.trips.push(t);
    else groups.push({ key, label: t.start ? `${MONTHS[parseDate(t.start).getMonth()]} ${t.start.slice(0, 4)}` : "No dates yet", trips: [t] });
  }

  function pickYear(next: string) {
    setYear(next);
    setMonth("all");
  }

  async function remove(t: Trip) {
    if (armed !== t.id) return setArmed(t.id);
    setArmed(null);
    setLeaving((l) => [...l, t.id]);
    try {
      await Promise.all([api.deleteTrip(t.id), sleepMs(calm() ? 0 : 260)]);
      setTrips((list) => list && list.filter((x) => x.id !== t.id));
      toast(`Your trip to ${t.destination} was deleted.`);
    } catch (err) {
      toast(errorText(err, "Couldn't delete the trip. Try again."));
    }
    setLeaving((l) => l.filter((x) => x !== t.id));
  }

  return (
    <div className="plan">
      <header className="plan-hello trips-head">
        <div>
          <h1 className="app-title">My trips</h1>
          <p className="plan-lede">
            {all.length ? `${plural(all.length, "trip")}${coming ? ` · ${coming} coming up` : ""}. Open one to plan its days.` : "Every trip you plan is kept here."}
          </p>
        </div>
        {all.length > 0 && (
          <button type="button" className="btn small line trips-map-btn" aria-haspopup="dialog" onClick={() => setMapOpen(true)}>
            <Icon name="globe" />Map
          </button>
        )}
      </header>

      {error && <p className="err" role="alert">{error}</p>}
      {!trips && !error && <p className="hint">Loading…</p>}
      {trips && trips.length === 0 && (
        <div className="trips-empty">
          <span className="trips-empty-ico" aria-hidden="true"><Icon name="plane" /></span>
          <h2>No trips yet</h2>
          <p>Pick somewhere to go, and NinRe AI can plan the days with you.</p>
          <Link href="/app/plan" className="btn sun"><Icon name="search" />Find a destination</Link>
        </div>
      )}

      {all.length > 1 && (
        <div className="trip-filters">
          <div className="idea-tabs" role="group" aria-label="Year">
            <button type="button" className="idea-tab" aria-pressed={y === "all"} onClick={() => pickYear("all")}>All <small>{all.length}</small></button>
            {years.map((yr) => (
              <button key={yr} type="button" className="idea-tab" aria-pressed={y === yr} onClick={() => pickYear(yr)}>
                {yr} <small>{all.filter((t) => t.start.startsWith(yr)).length}</small>
              </button>
            ))}
            {undated > 0 && <button type="button" className="idea-tab" aria-pressed={y === "none"} onClick={() => pickYear("none")}>No dates <small>{undated}</small></button>}
          </div>
          {months.length > 1 && (
            <div className="idea-tabs trip-months" role="group" aria-label={`Month in ${y}`}>
              <button type="button" className="idea-tab" aria-pressed={m === "all"} onClick={() => setMonth("all")}>All months</button>
              {months.map((mo) => (
                <button key={mo} type="button" className="idea-tab" aria-pressed={m === mo} onClick={() => setMonth(mo)}>{MONTHS[mo].slice(0, 3)}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key} className="trip-group" aria-labelledby={`tg-${g.key}`}>
          <h2 id={`tg-${g.key}`} className="plan-label">{g.label}</h2>
          <ul className="trip-cards">
            {g.trips.map((t) => {
              const d = ideaFor(t);
              const visited = t.places.filter((p) => p.done).length;
              const st = statusOf(t, today);
              const len = lengthOf(t);
              const on = armed === t.id;
              const start = t.start ? parseDate(t.start) : null;
              return (
                <li key={t.id} className={leaving.includes(t.id) ? "leaving" : undefined}>
                  <div className={`trip-card is-${st.key}`}>
                    <Link href={`/app/plan/${t.id}`} className="trip-card-link">
                      <span className="trip-card-photo">
                        {d ? <Cover idea={d} size={320} className="trip-card-img" /> : <span className="trip-card-img trip-card-blank" aria-hidden="true"><Icon name="plane" /></span>}
                        {start && (
                          <span className="trip-date" aria-hidden="true">
                            <small>{MONTHS[start.getMonth()].slice(0, 3)}</small>
                            <b>{start.getDate()}</b>
                          </span>
                        )}
                      </span>
                      <span className="trip-text">
                        <span className={`trip-status is-${st.key}`}>{st.text}</span>
                        <b>{t.destination}</b>
                        <span className="trip-meta">
                          <Icon name="calendar" />
                          {t.start ? `${fmtRange(t.start, t.end)}${len ? ` · ${plural(len, "day")}` : ""}` : whenOf(t)}
                        </span>
                        <span className="trip-meta">
                          <Icon name="pin" />
                          {t.places.length ? `${plural(t.places.length, "place")}${visited ? ` · ${visited} visited` : ""}` : "No places yet"}
                        </span>
                        {t.places.length > 0 && (
                          <span className="trip-bar" role="img" aria-label={`${visited} of ${t.places.length} visited`}>
                            <i style={{ width: `${(visited / t.places.length) * 100}%` }} />
                          </span>
                        )}
                      </span>
                    </Link>
                    <button
                      type="button"
                      className={`trip-del${on ? " armed" : ""}`}
                      aria-label={on ? `Tap again to delete your trip to ${t.destination}` : `Delete your trip to ${t.destination}`}
                      title={on ? "Tap again to delete" : "Delete trip"}
                      disabled={leaving.includes(t.id)}
                      onClick={() => remove(t)}
                      onBlur={() => on && setArmed(null)}
                    >
                      <Icon name="trash" />{on && <span>Delete?</span>}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {mapOpen && <TripJourney trips={shown} scope={scope} onClose={() => setMapOpen(false)} />}
    </div>
  );
}

interface TripFormValue { destination: string; start: string; end: string }

/** Where and when, for editing a trip. */
function TripForm({ value, submit, busy, onSubmit, onCancel }: {
  value?: TripFormValue; submit: string; busy?: boolean; onSubmit: (v: TripFormValue) => void; onCancel?: () => void;
}) {
  const [destination, setDestination] = useState(value?.destination ?? "");
  const [start, setStart] = useState(value?.start ?? "");
  const [end, setEnd] = useState(value?.end ?? "");
  const [error, setError] = useState("");

  function send(e: FormEvent) {
    e.preventDefault();
    const where = destination.trim();
    if (!where) return setError("Say where you're going.");
    if (start && end && end < start) return setError("The trip can't end before it starts.");
    if (tripDays(start, end) > 90) return setError("A trip can be up to 90 days long.");
    setError("");
    onSubmit({ destination: where, start, end: start ? end : "" });
  }

  return (
    <form className="trip-form" onSubmit={send} noValidate>
      <div className="fld">
        <label htmlFor="trip-where">Destination</label>
        <input id="trip-where" type="text" placeholder="Japan, Kyoto, Bali…" value={destination} maxLength={80} autoComplete="off" onChange={(e) => setDestination(e.target.value)} />
      </div>
      <div className="row2">
        <div className="fld">
          <label htmlFor="trip-from">From <span className="opt">optional</span></label>
          <input id="trip-from" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="trip-to">To <span className="opt">optional</span></label>
          <input id="trip-to" type="date" value={end} min={start || undefined} disabled={!start} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="trip-form-acts">
        {onCancel && <button type="button" className="btn line" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn sun" disabled={busy}><Icon name="sparkle" />{submit}</button>
      </div>
    </form>
  );
}

/* ---------- One trip: the plan, and suggested places ---------- */

export function TripPlan({ id }: { id: string }) {
  const toast = useToast();
  const [trip, setTripState] = useState<Trip | null>(null);
  // Off until the server says suggestions are on, so a server without them isn't asked.
  const [canSuggest, setCanSuggest] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [own, setOwn] = useState("");
  useTitle(trip ? `Plan · ${trip.destination}` : "Plan");

  // The trip as last changed here. Changes are saved in order; only the newest waiting one is sent.
  const current = useRef<Trip | null>(null);
  const waiting = useRef<Trip | null>(null);
  const sending = useRef(false);

  useEffect(() => {
    api.trip(id).then((t) => { current.current = t; setTripState(t); }, (err) => setError(errorText(err, "Couldn't open that trip.")));
    api.trips().then((r) => setCanSuggest(r.suggestions), () => {});
  }, [id]);

  async function flush() {
    if (sending.current) return;
    sending.current = true;
    while (waiting.current) {
      const next = waiting.current;
      waiting.current = null;
      try {
        await api.saveTrip(next.id, input(next));
      } catch (err) {
        toast(errorText(err, "Couldn't save that change. Try again."));
      }
    }
    sending.current = false;
  }

  function change(fn: (t: Trip) => Trip) {
    if (!current.current) return;
    const next = fn(current.current);
    current.current = next;
    setTripState(next);
    waiting.current = next;
    void flush();
  }

  const setPlace = (pid: string, p: Partial<TripPlace>) => change((t) => ({ ...t, places: t.places.map((x) => (x.id === pid ? { ...x, ...p } : x)) }));
  const removePlace = (pid: string) => change((t) => ({ ...t, places: t.places.filter((x) => x.id !== pid) }));
  const addPlace = (p: Pick<TripPlace, "name" | "area" | "kind"> & { note?: string }) =>
    change((t) => ({ ...t, places: [...t.places, { id: placeId(), note: "", day: null, done: false, ...p }] }));

  function addOwn(e: FormEvent) {
    e.preventDefault();
    const name = own.trim();
    if (!name || !trip) return;
    if (trip.places.some((p) => same(p.name, name))) return toast(`${name} is already on your plan.`);
    addPlace({ name, area: "", kind: "landmark" });
    setOwn("");
  }

  async function remove() {
    if (!deleteArmed) return setDeleteArmed(true);
    try {
      await api.deleteTrip(id);
      navigate("/app/trips", { replace: true });
    } catch (err) {
      toast(errorText(err, "Couldn't delete the trip. Try again."));
    }
  }

  if (error) return <div className="plan"><p className="err" role="alert">{error}</p><Link href="/app/trips" className="btn line">Back to my trips</Link></div>;
  if (!trip) return <div className="plan"><p className="hint">Loading…</p></div>;

  const days = lengthOf(trip);
  const range = fmtRange(trip.start, trip.end);
  const groups = days
    ? [...Array.from({ length: days }, (_, i) => ({ key: `d${i + 1}`, label: dayLabel(trip.start, i + 1), places: trip.places.filter((p) => p.day === i + 1) })),
      { key: "any", label: "Any day", places: trip.places.filter((p) => p.day == null) }].filter((g) => g.places.length)
    : [{ key: "all", label: "", places: trip.places }];
  const visited = trip.places.filter((p) => p.done).length;

  return (
    <div className="plan">
      {editing ? (
        <section className="plan-card" aria-label="Edit the trip">
          <TripForm
            value={trip}
            submit="Save"
            onCancel={() => { setEditing(false); setDeleteArmed(false); }}
            onSubmit={(v) => {
              // Places on days the trip no longer has go back to "any day".
              change((t) => {
                const n = tripDays(v.start, v.end) || t.days;
                return { ...t, ...v, days: n, places: t.places.map((p) => (p.day && p.day > n ? { ...p, day: null } : p)) };
              });
              setEditing(false);
            }}
          />
          <button type="button" className={`btn warn small${deleteArmed ? " armed" : ""}`} onClick={remove}>
            <Icon name="trash" />{deleteArmed ? "Delete it for good" : "Delete this trip"}
          </button>
        </section>
      ) : (
        <header className="plan-top trip-top">
          <div>
            <h1 className="app-title">{trip.destination}</h1>
            <p className="plan-lede">
              {[range ? `${range} · ${plural(days, "day")}` : days ? `${plural(days, "day")}, dates not set` : "No dates yet", trip.places.length ? `${plural(trip.places.length, "place")}${visited ? `, ${visited} visited` : ""}` : ""].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button type="button" className="btn small line" onClick={() => setEditing(true)}><Icon name="pen" />Edit trip</button>
        </header>
      )}

      <section className="plan-group" aria-labelledby="the-plan">
        <h2 id="the-plan" className="plan-label">Your plan</h2>
        {trip.places.length === 0 ? (
          <p className="plan-empty">Nothing on the plan yet. Add places from the suggestions below, or type in your own.</p>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="plan-day">
              {g.label && <h3 className="plan-day-h">{g.label}</h3>}
              <ul className="place-list">
                {g.places.map((p) => (
                  <li key={p.id} className={p.done ? "done" : undefined}>
                    <span className="place-ico" title={KIND_NAME[p.kind]}><Icon name={KIND_ICON[p.kind]} /></span>
                    <span className="place-text">
                      <b>{p.name}</b>
                      {(p.area || p.note) && <span>{[p.area, p.note].filter(Boolean).join(" · ")}</span>}
                    </span>
                    <span className="place-acts">
                      {days > 0 && (
                        <select className="place-day" aria-label={`Day for ${p.name}`} value={p.day ?? ""} onChange={(e) => setPlace(p.id, { day: e.target.value ? Number(e.target.value) : null })}>
                          <option value="">Any day</option>
                          {Array.from({ length: days }, (_, i) => <option key={i} value={i + 1}>Day {i + 1}</option>)}
                        </select>
                      )}
                      <button type="button" className="place-btn" aria-pressed={p.done} aria-label={`${p.name}: visited`} title={p.done ? "Visited" : "Mark as visited"} onClick={() => setPlace(p.id, { done: !p.done })}>
                        <Icon name="check" />
                      </button>
                      <button type="button" className="place-btn" aria-label={`Take ${p.name} off the plan`} title="Take off the plan" onClick={() => removePlace(p.id)}>
                        <Icon name="close" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        <form className="place-own" onSubmit={addOwn}>
          <input className="input" type="text" placeholder="Add a place yourself" aria-label="Add a place yourself" value={own} maxLength={80} onChange={(e) => setOwn(e.target.value)} />
          <button type="submit" className="btn line" disabled={!own.trim()}><Icon name="plus" />Add</button>
        </form>
      </section>

      {canSuggest ? (
        <Suggested key={trip.destination} destination={trip.destination} plan={trip.places} onAdd={(s) => addPlace({ name: s.name, area: s.area, kind: s.kind })} />
      ) : (
        <p className="hint">Suggested places aren't available on this server, but you can add your own above.</p>
      )}
    </div>
  );
}

/** Places worth seeing at the destination, asked for when the trip opens, with more on request. */
function Suggested({ destination, plan, onAdd }: { destination: string; plan: TripPlace[]; onAdd: (s: Suggestion) => void }) {
  const [found, setFound] = useState<Suggestions | null>(null);
  const [list, setList] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [noMore, setNoMore] = useState(false);

  async function ask(exclude: string[]) {
    setLoading(true);
    setError("");
    try {
      const out = await api.suggestPlaces(destination, exclude);
      if (!exclude.length) setFound(out);
      const fresh = out.places.filter((s) => !list.some((x) => same(x.name, s.name)));
      if (exclude.length && !fresh.length) setNoMore(true);
      setList((l) => [...l, ...fresh]);
    } catch (err) {
      setError(errorText(err, "Couldn't find suggestions just now."));
    }
    setLoading(false);
  }

  useEffect(() => { void ask([]); }, []);

  const onPlan = (s: Suggestion) => plan.some((p) => same(p.name, s.name));
  const where = found?.destination || destination;

  return (
    <section className="plan-group" aria-labelledby="suggested" aria-busy={loading}>
      <h2 id="suggested" className="plan-label"><Icon name="sparkle" />Suggested in {where}</h2>
      {found?.found && found.summary && <p className="plan-summary">{found.summary}</p>}
      {found && !found.found && <p className="plan-empty">NinRe doesn't know “{destination}”. Check the spelling with Edit trip, or try a nearby city or the country.</p>}
      {list.length > 0 && (
        <ul className="sug-list">
          {list.map((s) => {
            const added = onPlan(s);
            return (
              <li key={s.name}>
                <span className="place-ico" title={KIND_NAME[s.kind]}><Icon name={KIND_ICON[s.kind]} /></span>
                <span className="sug-text">
                  <b>{s.name}</b>
                  <span className="sug-meta">{[s.area, s.time].filter(Boolean).join(" · ")}</span>
                  {s.why && <span className="sug-why">{s.why}</span>}
                </span>
                <button type="button" className={`btn small${added ? " line" : " sun"}`} disabled={added} onClick={() => onAdd(s)} aria-label={added ? `${s.name} is on your plan` : `Add ${s.name} to your plan`}>
                  <Icon name={added ? "check" : "plus"} />{added ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {loading && <p className="hint plan-loading" role="status"><span className="plan-spin" aria-hidden="true" />{list.length ? "Finding more places…" : `Finding places to see in ${destination}…`}</p>}
      {error && <p className="err" role="alert">{error} <button type="button" className="link-btn" onClick={() => ask(list.length ? [...list, ...plan].map((x) => x.name) : [])}>Try again</button></p>}
      {!loading && found?.found && !noMore && (
        <button type="button" className="btn line plan-more" onClick={() => ask([...list.map((s) => s.name), ...plan.map((p) => p.name)])}>
          <Icon name="sparkle" />More suggestions
        </button>
      )}
      {noMore && <p className="hint">That's every place NinRe can think of for now.</p>}
    </section>
  );
}
