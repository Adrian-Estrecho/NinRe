import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, LngLatBoundsLike, Map as MapLibre, Marker } from "maplibre-gl";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { countryOf } from "../lib/countries";
import { fold, plural } from "../lib/format";
import { PLACES } from "../lib/places";
import { MAP_STYLE, loadMapLibre } from "../map/RealMap";
import type { Trip } from "../types";
import { IDEAS, centerOf } from "./ideas";
import { whenOf } from "./Plan";

type Spot = { lat: number; lng: number };
type LngLat = [number, number];
interface Stop extends Spot { trip: Trip }

const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Where a trip's destination is, from what NinRe already knows: a ready-made destination, a known place, a city its
 * ready-made places are in, the most specific part of "Kyoto, Japan", then the country. Null when it can't tell.
 */
export function whereIs(destination: string): Spot | null {
  const want = fold(destination.trim());
  if (!want) return null;
  const idea = IDEAS.find((d) => fold(d.name) === want);
  if (idea) return centerOf(idea);
  const known = PLACES.find((p) => fold(p.name) === want);
  if (known) return { lat: known.lat, lng: known.lng };
  const inside = IDEAS.flatMap((d) => d.places).filter((p) => fold(p.name) === want || p.area.split(",").some((a) => fold(a.trim()) === want));
  if (inside.length) return { lat: avg(inside.map((p) => p.lat)), lng: avg(inside.map((p) => p.lng)) };
  const parts = destination.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) for (const part of parts) {
    const hit = whereIs(part);
    if (hit) return hit;
  }
  const country = countryOf({ name: destination, region: "" });
  const home = country && IDEAS.find((d) => [country.name, country.label].some((n) => fold(n) === fold(d.name)));
  return home ? centerOf(home) : null;
}

const WORDS = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth", "Tenth"];
/** "First", "Second" … "Tenth", then "11th", "22nd". */
function ordinal(n: number): string {
  if (n <= WORDS.length) return WORDS[n - 1];
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}

/** Longitude `lng` moved by whole turns to within half a world of `near`, so a route crosses the Pacific instead of going round. */
const unwrap = (lng: number, near: number) => near + ((((lng - near) % 360) + 540) % 360) - 180;

/** The great-circle path from a to b, as points along it; the curve real flights follow. */
function arc(a: Spot, b: Spot, n = 72): LngLat[] {
  const r = Math.PI / 180;
  const vec = (p: Spot) => [Math.cos(p.lat * r) * Math.cos(p.lng * r), Math.cos(p.lat * r) * Math.sin(p.lng * r), Math.sin(p.lat * r)];
  const va = vec(a), vb = vec(b);
  const d = Math.acos(Math.min(1, Math.max(-1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2])));
  if (d < 1e-6) return [[a.lng, a.lat], [b.lng, b.lat]];
  const out: LngLat[] = [];
  let prev = a.lng;
  for (let i = 0; i <= n; i++) {
    const t = i / n, A = Math.sin((1 - t) * d) / Math.sin(d), B = Math.sin(t * d) / Math.sin(d);
    const [x, y, z] = [0, 1, 2].map((k) => A * va[k] + B * vb[k]);
    const lng = unwrap(Math.atan2(y, x) / r, prev);
    out.push([lng, Math.atan2(z, Math.hypot(x, y)) / r]);
    prev = lng;
  }
  return out;
}

/** Kilometres between two spots. */
const km = (a: Spot, b: Spot) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
const PLANE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3.5 3 10.8l7 2.6 2.6 7.1Z"/><path d="M10 13.4 21 3.5"/></svg>';

/** Room around the route: the caption sits over the bottom of the map. */
const PAD = { top: 56, bottom: 120, left: 48, right: 48 };

/**
 * The trips on a map, in the order they happen: the map flies to the first, a plane draws the line to the second,
 * and so on, each pin numbered as it lands. Replay, skip to the end, or tap a stop to go straight to it.
 */
export function TripJourney({ trips, scope, onClose }: { trips: Trip[]; scope: string; onClose: () => void }) {
  const { stops, undated, lost } = useMemo(() => {
    const dated = trips.filter((t) => t.start).sort((a, b) => a.start.localeCompare(b.start) || a.createdAt - b.createdAt);
    const stops: Stop[] = [];
    const lost: string[] = [];
    for (const trip of dated) {
      const at = whereIs(trip.destination);
      if (!at) {
        lost.push(trip.destination);
        continue;
      }
      const prev = stops[stops.length - 1];
      stops.push({ trip, lat: at.lat, lng: prev ? unwrap(at.lng, prev.lng) : at.lng });
    }
    return { stops, undated: trips.length - dated.length, lost };
  }, [trips]);

  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const pins = useRef<(Marker | null)[]>([]);
  const plane = useRef<Marker | null>(null);
  /** Bumped to stop whatever is playing. */
  const run = useRef(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  /** The stop on show: -1 before the first, stops.length once the whole route is drawn. */
  const [at, setAt] = useState(-1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!stops.length) return;
    let live = true;
    (async () => {
      try {
        const L = await loadMapLibre();
        if (!live || !box.current) return;
        lib.current = L;
        const m = new L.Map({
          container: box.current,
          style: MAP_STYLE,
          center: [stops[0].lng, stops[0].lat],
          zoom: 1.4,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        m.addControl(new L.NavigationControl({ showCompass: false }), "top-right");
        m.on("load", () => {
          if (!live) return;
          m.addSource("journey", { type: "geojson", data: line([]) });
          m.addLayer({ id: "journey-halo", type: "line", source: "journey", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.75 } });
          m.addLayer({ id: "journey", type: "line", source: "journey", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#b3352b", "line-width": 3 } });
          setReady(true);
        });
        map.current = m;
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
      run.current++;
      map.current?.remove();
      map.current = null;
    };
    // The stops are fixed for as long as the dialog is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Play once the map is up; with reduced motion, just show the whole route.
  useEffect(() => {
    if (!ready) return;
    if (calm()) showAll(true);
    else void play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function line(coords: LngLat[]) {
    return {
      type: "FeatureCollection" as const,
      features: coords.length < 2 ? [] : [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: coords } }],
    };
  }
  const setLine = (coords: LngLat[]) => (map.current?.getSource("journey") as GeoJSONSource | undefined)?.setData(line(coords));

  /** The whole route, every leg in full. */
  const route = () => stops.slice(1).flatMap((s, i) => arc(stops[i], s).slice(i ? 1 : 0));

  function pin(i: number) {
    const m = map.current, L = lib.current;
    if (!m || !L || pins.current[i]) return;
    const s = stops[i];
    const el = document.createElement("button");
    el.type = "button";
    el.className = "jpin";
    el.innerHTML = `<span class="jpin-dot">${i + 1}</span>`;
    el.setAttribute("aria-label", `${ordinal(i + 1)} trip: ${s.trip.destination}`);
    el.title = s.trip.destination;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      go(i);
    });
    pins.current[i] = new L.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(m);
  }

  function clear() {
    for (const p of pins.current) p?.remove();
    pins.current = [];
    plane.current?.remove();
    plane.current = null;
    setLine([]);
  }

  /** Moves the map and waits until it stops (or a moment longer than it should take). */
  function settle(move: (m: MapLibre) => void, ms: number) {
    const m = map.current;
    if (!m) return Promise.resolve();
    return new Promise<void>((done) => {
      const t = setTimeout(done, ms + 400);
      m.once("moveend", () => {
        clearTimeout(t);
        done();
      });
      move(m);
    });
  }

  function frame(spots: Spot[], ms: number, maxZoom = 5.5) {
    const L = lib.current;
    if (!L || !spots.length) return Promise.resolve();
    const b = new L.LngLatBounds();
    for (const s of spots) b.extend([s.lng, s.lat]);
    return settle((m) => m.fitBounds(b as LngLatBoundsLike, { padding: PAD, maxZoom, duration: ms }), ms);
  }

  /** Draws the leg from a to b over a moment, a plane at its head. */
  function fly(a: Stop, b: Stop, done: LngLat[], alive: () => boolean) {
    const m = map.current, L = lib.current;
    if (!m || !L) return Promise.resolve();
    const pts = arc(a, b);
    const ms = Math.min(2600, Math.max(1100, 900 + km(a, b) * 0.22));
    if (!plane.current) {
      const el = document.createElement("div");
      el.className = "jplane";
      el.innerHTML = `<span class="jplane-in">${PLANE}</span>`;
      plane.current = new L.Marker({ element: el }).setLngLat(pts[0]).addTo(m);
    }
    const p = plane.current;
    const turn = p.getElement().firstElementChild as HTMLElement;
    p.getElement().style.visibility = "visible";
    return new Promise<void>((finish) => {
      const t0 = performance.now();
      const step = (now: number) => {
        if (!alive()) return finish();
        const t = ease(Math.min(1, (now - t0) / ms));
        const f = t * (pts.length - 1), k = Math.floor(f), w = f - k;
        const from = pts[k], to = pts[Math.min(k + 1, pts.length - 1)];
        const head: LngLat = [from[0] + (to[0] - from[0]) * w, from[1] + (to[1] - from[1]) * w];
        setLine([...done, ...pts.slice(done.length ? 1 : 0, k + 1), head]);
        p.setLngLat(head);
        // The plane points along the line as it looks on screen; the icon itself faces up and to the right.
        const s0 = m.project(from), s1 = m.project(to);
        if (Math.hypot(s1.x - s0.x, s1.y - s0.y) > 0.5) turn.style.transform = `rotate(${(Math.atan2(s1.y - s0.y, s1.x - s0.x) * 180) / Math.PI + 45}deg)`;
        if (t < 1) requestAnimationFrame(step);
        else finish();
      };
      requestAnimationFrame(step);
    });
  }

  async function play() {
    if (!map.current || !stops.length) return;
    const token = ++run.current;
    const alive = () => run.current === token;
    clear();
    setAt(-1);
    setPlaying(true);
    const done: LngLat[] = [];
    await frame(stops, 700, 4);
    await sleep(400);
    for (let i = 0; i < stops.length; i++) {
      if (!alive()) return;
      const s = stops[i];
      if (i === 0) {
        await settle((m) => m.flyTo({ center: [s.lng, s.lat], zoom: 4.5, duration: 1600, essential: true }), 1600);
      } else {
        const prev = stops[i - 1];
        await frame([prev, s], 900);
        if (!alive()) return;
        await fly(prev, s, done, alive);
        done.push(...arc(prev, s).slice(done.length ? 1 : 0));
      }
      if (!alive()) return;
      pin(i);
      setAt(i);
      await sleep(1500);
    }
    if (!alive()) return;
    if (plane.current) plane.current.getElement().style.visibility = "hidden";
    setLine(route());
    await frame(stops, 1200);
    if (!alive()) return;
    setAt(stops.length);
    setPlaying(false);
  }

  /** Stops anything playing and shows every pin and the whole route. */
  function showAll(fit: boolean) {
    run.current++;
    setPlaying(false);
    if (plane.current) plane.current.getElement().style.visibility = "hidden";
    stops.forEach((_, i) => pin(i));
    setLine(route());
    if (fit) void frame(stops, calm() ? 0 : 700);
    setAt(stops.length);
  }

  /** Straight to one stop, with the whole route drawn. */
  function go(i: number) {
    showAll(false);
    const s = stops[i];
    map.current?.flyTo({ center: [s.lng, s.lat], zoom: 5, duration: calm() ? 0 : 900 });
    setAt(i);
  }

  const shown = at >= 0 && at < stops.length ? stops[at] : null;
  const years = stops.length ? [stops[0].trip.start.slice(0, 4), stops[stops.length - 1].trip.start.slice(0, 4)] : [];
  const notes = [
    undated ? `${plural(undated, "trip")} without dates ${undated === 1 ? "isn't" : "aren't"} on the route.` : "",
    lost.length ? `NinRe couldn't find ${lost.join(", ")} on the map.` : "",
  ].filter(Boolean);

  return (
    <Dialog labelledBy="journey-h" onRequestClose={onClose} closeButton>
      <div className="panel journey">
        <header className="journey-head">
          <h2 id="journey-h">Your trips, in order</h2>
          <p>{stops.length ? `${plural(stops.length, "trip")} · ${scope}` : scope}</p>
        </header>

        {stops.length === 0 ? (
          <div className="journey-empty">
            <span className="trips-empty-ico" aria-hidden="true"><Icon name="globe" /></span>
            <p>{trips.length ? "Add dates to these trips and they'll appear here in the order you take them." : "No trips to show here yet."}</p>
          </div>
        ) : (
          <>
            <div className="rmap journey-map" role="region" aria-label="Map of your trips in order">
              <div ref={box} className="rmap-canvas" />
              {failed ? (
                <p className="rmap-note">The map couldn't load on this device. Your trips are still listed below.</p>
              ) : (
                <div className="journey-cap" aria-live="polite">
                  {shown ? (
                    <>
                      <span className="journey-n">{at + 1}</span>
                      <span className="journey-cap-text">
                        <small>{ordinal(at + 1)} trip</small>
                        <b>{shown.trip.destination}</b>
                        <span>{whenOf(shown.trip)}</span>
                      </span>
                    </>
                  ) : at >= stops.length ? (
                    <>
                      <span className="journey-n done"><Icon name="check" /></span>
                      <span className="journey-cap-text">
                        <small>{years[0] === years[1] ? years[0] : `${years[0]} – ${years[1]}`}</small>
                        <b>{stops.length === 1 ? "One trip" : `${plural(stops.length, "trip")}, one after another`}</b>
                        <span>Tap a pin or a stop below to go back to it.</span>
                      </span>
                    </>
                  ) : (
                    <span className="journey-cap-text"><small>Getting ready</small><b>Taking off…</b></span>
                  )}
                </div>
              )}
            </div>

            <div className="journey-acts">
              {playing ? (
                <button type="button" className="btn small line" onClick={() => showAll(true)}><Icon name="right" />Skip to the end</button>
              ) : (
                <button type="button" className="btn small sun" disabled={!ready} onClick={() => void play()}><Icon name="plane" />{at === -1 ? "Play" : "Play again"}</button>
              )}
            </div>

            <ol className="journey-stops">
              {stops.map((s, i) => (
                <li key={s.trip.id}>
                  <button type="button" className="journey-stop" aria-current={i === at ? "step" : undefined} disabled={!ready} onClick={() => go(i)}>
                    <span className="journey-stop-n">{i + 1}</span>
                    <span className="journey-stop-text"><b>{s.trip.destination}</b><span>{whenOf(s.trip)}</span></span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
        {notes.map((n) => <p key={n} className="hint journey-note">{n}</p>)}
      </div>
    </Dialog>
  );
}
