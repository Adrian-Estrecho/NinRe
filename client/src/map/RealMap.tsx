import { useEffect, useRef, useState } from "react";
import type { LngLatBoundsLike, Map as MapLibre, Marker } from "maplibre-gl";
// MapLibre looks for its worker next to its own file, which isn't where it ends up once bundled; Vite ships the
// (self-contained) worker as a file of its own and MapLibre is told where it is.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";

/**
 * A real street map (OpenStreetMap data drawn from OpenFreeMap's free tiles) with numbered or named pins.
 * MapLibre is loaded only when a map is first shown, so the rest of the app doesn't carry it.
 * Scrolling the page passes over the map; it pans with two fingers, or zooms with ctrl/⌘ and the wheel.
 */

export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

/** MapLibre and its stylesheet, loaded on first use and told where its worker is. */
export async function loadMapLibre() {
  const [m] = await Promise.all([import("maplibre-gl"), import("maplibre-gl/dist/maplibre-gl.css")]);
  if (m.getWorkerUrl() !== workerUrl) m.setWorkerUrl(workerUrl);
  return m;
}

export interface RealPin {
  id: string;
  lat: number;
  lng: number;
  /** Read out and shown on hover. */
  label: string;
  /** A number in the pin; without one, the label is written on the pin instead. */
  n?: number;
  /** For a labelled pin: which side of its spot the label sits, so neighbours don't cover each other. */
  side?: "left" | "right";
}

interface Props {
  pins: RealPin[];
  label: string;
  className?: string;
  hot?: string | null;
  onPin?: (id: string) => void;
  /** Join the pins with a line, in order. */
  route?: boolean;
  /** Closest the map zooms when fitting the pins. */
  maxZoom?: number;
  /** Draw the pins as dots that gather into counted bubbles when close together: for hundreds of places. */
  cluster?: boolean;
}

type Lib = typeof import("maplibre-gl");

export function RealMap({ pins, label, className = "", hot = null, onPin, route = false, maxZoom = 12, cluster = false }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibre | null>(null);
  const lib = useRef<Lib | null>(null);
  const markers = useRef<{ id: string; marker: Marker }[]>([]);
  const tap = useRef(onPin);
  tap.current = onPin;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const m = await loadMapLibre();
        if (!live || !box.current) return;
        lib.current = m;
        const made = new m.Map({
          container: box.current,
          style: MAP_STYLE,
          center: [120, 20],
          zoom: 2,
          cooperativeGestures: true,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        made.addControl(new m.NavigationControl({ showCompass: false }), "top-right");
        made.on("load", () => {
          if (!live) return;
          setReady(true);
          // The credits open over the bottom of the map; they fold into their (i) button after a moment.
          // Every map also has them written underneath.
          setTimeout(() => {
            const credits = box.current?.querySelector(".maplibregl-ctrl-attrib");
            credits?.classList.remove("maplibregl-compact-show");
            credits?.removeAttribute("open");
          }, 4000);
        });
        made.on("error", (e) => console.warn("Map:", e.error?.message));
        map.current = made;
      } catch {
        // No WebGL, or the map library couldn't load: the list of places still says everything.
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  function fit(animate: boolean) {
    const m = map.current, L = lib.current;
    if (!m || !L || !pins.length) return;
    if (pins.length === 1) return void m.jumpTo({ center: [pins[0].lng, pins[0].lat], zoom: Math.min(maxZoom, 11) });
    const b = new L.LngLatBounds();
    for (const p of pins) b.extend([p.lng, p.lat]);
    // Labelled pins reach out to the side of their spot, so leave room for the words.
    const named = pins.some((p) => p.n == null);
    const padding = named ? { top: 56, bottom: 40, left: 96, right: 112 } : 44;
    m.fitBounds(b as LngLatBoundsLike, { padding, maxZoom, duration: animate ? 600 : 0 });
  }

  // The pins, and the route between them.
  useEffect(() => {
    const m = map.current, L = lib.current;
    if (!ready || !m || !L) return;
    for (const { marker } of markers.current) marker.remove();
    markers.current = [];
    if (cluster) {
      showClustered(m, pins, (id) => tap.current?.(id));
      fit(false);
      return;
    }
    markers.current = pins.map((p) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = p.n != null ? "rpin" : `rpin named${p.side ? ` to-${p.side}` : ""}`;
      el.textContent = p.n != null ? String(p.n) : p.label;
      el.setAttribute("aria-label", p.label);
      el.title = p.label;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        tap.current?.(p.id);
      });
      // A label to the left of its spot is anchored by its right end, and the other way round.
      const anchor = p.n == null && p.side ? (p.side === "left" ? "right" : "left") : "center";
      return { id: p.id, marker: new L.Marker({ element: el, anchor }).setLngLat([p.lng, p.lat]).addTo(m) };
    });

    const line = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: route ? pins.map((p) => [p.lng, p.lat]) : [] } };
    const src = m.getSource("route") as import("maplibre-gl").GeoJSONSource | undefined;
    if (src) src.setData(line);
    else {
      m.addSource("route", { type: "geojson", data: line });
      m.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#b3352b", "line-width": 2.5, "line-dasharray": [2, 1.5], "line-opacity": 0.85 } });
    }
    fit(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pins, route]);

  // The place being looked at: raised, and brought into view.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    for (const { id, marker } of markers.current) marker.getElement().classList.toggle("hot", id === hot);
    if (cluster && m.getLayer("place-hot")) m.setFilter("place-hot", ["==", ["get", "id"], hot ?? ""]);
    const p = pins.find((x) => x.id === hot);
    if (p) m.easeTo({ center: [p.lng, p.lat], zoom: Math.max(m.getZoom(), Math.min(maxZoom, 11)), duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hot, pins]);

  return (
    <div className={`rmap ${className}`} role="region" aria-label={label}>
      <div ref={box} className="rmap-canvas" />
      {failed ? (
        <p className="rmap-note">The map couldn't load on this device. Every place is still listed here.</p>
      ) : (
        ready && pins.length > 1 && <button type="button" className="rmap-all" onClick={() => fit(true)}>Show all</button>
      )}
    </div>
  );
}

/**
 * Hundreds of places as map layers rather than one element each: nearby places gather into a yellow bubble with
 * their count (tap it to zoom in), single places are red dots (tap one to choose it), the chosen one dark.
 */
function showClustered(m: MapLibre, pins: RealPin[], onPin: (id: string) => void) {
  const data = {
    type: "FeatureCollection" as const,
    features: pins.map((p) => ({ type: "Feature" as const, properties: { id: p.id, label: p.label }, geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] } })),
  };
  const src = m.getSource("places") as import("maplibre-gl").GeoJSONSource | undefined;
  if (src) return void src.setData(data);

  m.addSource("places", { type: "geojson", data, cluster: true, clusterRadius: 42, clusterMaxZoom: 12 });
  // The counts use whichever font the map's own labels use, so no other font has to be fetched.
  const fonts = m.getStyle().layers.flatMap((l) => (l.type === "symbol" && Array.isArray(l.layout?.["text-font"]) ? [l.layout["text-font"] as string[]] : []));
  // Upright, and bold if the map has one (its italic is for seas).
  const upright = fonts.filter((f) => !f.some((n) => /italic/i.test(n)));
  const font = upright.find((f) => f.some((n) => /bold/i.test(n))) ?? upright[0] ?? ["Noto Sans Regular"];
  m.addLayer({
    id: "clusters", type: "circle", source: "places", filter: ["has", "point_count"],
    paint: {
      "circle-color": "#ffd23f", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2,
      "circle-radius": ["step", ["get", "point_count"], 14, 10, 18, 40, 23],
    },
  });
  m.addLayer({
    id: "cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"],
    layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": font, "text-size": 12, "text-allow-overlap": true },
    paint: { "text-color": "#14202b" },
  });
  m.addLayer({
    id: "place", type: "circle", source: "places", filter: ["!", ["has", "point_count"]],
    paint: { "circle-color": "#b3352b", "circle-radius": 7, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 },
  });
  m.addLayer({
    id: "place-hot", type: "circle", source: "places", filter: ["==", ["get", "id"], ""],
    paint: { "circle-color": "#14202b", "circle-radius": 10, "circle-stroke-color": "#ffd23f", "circle-stroke-width": 3 },
  });

  m.on("click", "clusters", async (e) => {
    const f = e.features?.[0];
    if (!f) return;
    const zoom = await (m.getSource("places") as import("maplibre-gl").GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id as number);
    m.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom, duration: 500 });
  });
  m.on("click", "place", (e) => {
    const id = e.features?.[0]?.properties.id;
    if (typeof id === "string") onPin(id);
  });
  for (const layer of ["clusters", "place"]) {
    m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
    m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
  }
}
