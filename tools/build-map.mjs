// Converts world-atlas TopoJSON (Natural Earth, public domain) into compact
// equirectangular SVG path strings for the vintage map.
//
// 1. Download land-50m.json, land-10m.json and countries-50m.json from
//    https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/ into an empty folder.
// 2. node tools/build-map.mjs <that folder> client/public/map/world.json
//
// The Philippines is drawn from the 10m data so islands survive close zooms.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dir, out] = process.argv.slice(2);
const Q = 100;            // map units per degree
const LAT_TOP = 84, LAT_BOT = -58;
const PH = [116.0, 4.3, 127.6, 21.5]; // lon/lat box drawn from the 10m data

const load = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));

function decodeArcs(topo) {
  const { scale, translate } = topo.transform;
  return topo.arcs.map((arc) => {
    let x = 0, y = 0;
    return arc.map(([dx, dy]) => {
      x += dx; y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  });
}

function ringCoords(ring, arcs) {
  const pts = [];
  ring.forEach((i, k) => {
    const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
    pts.push(...(k ? a.slice(1) : a));
  });
  return pts;
}

function polygons(geom) {
  if (geom.type === "GeometryCollection") return geom.geometries.flatMap(polygons);
  if (geom.type === "Polygon") return [geom.arcs];
  if (geom.type === "MultiPolygon") return geom.arcs;
  return [];
}

// Douglas-Peucker in degrees
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  const t2 = tol * tol;
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    let best = -1, bi = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      let d;
      if (!len) d = (px - ax) ** 2 + (py - ay) ** 2;
      else {
        const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
        d = (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
      }
      if (d > best) { best = d; bi = i; }
    }
    if (best > t2) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

const bbox = (pts) => pts.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
const inside = (b, box) => b[0] >= box[0] && b[1] >= box[1] && b[2] <= box[2] && b[3] <= box[3];
const proj = ([lon, lat]) => [Math.round((lon + 180) * Q), Math.round((LAT_TOP - lat) * Q)];

function encode(pts, close) {
  const p = pts.map(proj).filter((q, i, a) => !i || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]);
  if (p.length < (close ? 3 : 2)) return "";
  let s = "M" + p[0][0] + " " + p[0][1] + "l";
  let first = true;
  for (let i = 1; i < p.length; i++) {
    const dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1];
    s += (first || dx < 0 ? "" : " ") + dx + (dy < 0 ? "" : " ") + dy;
    first = false;
  }
  return s + (close ? "z" : "");
}

function landRings(file, tol, keepRing, minSpan) {
  const topo = load(file);
  const arcs = decodeArcs(topo);
  const rings = [];
  for (const poly of polygons(topo.objects.land)) {
    for (const ring of poly) {
      const pts = ringCoords(ring, arcs);
      const b = bbox(pts);
      if (b[3] < -56) continue;                       // Antarctica
      if (!keepRing(b)) continue;
      if (Math.max(b[2] - b[0], b[3] - b[1]) < minSpan) continue;
      rings.push(simplify(pts, tol));
    }
  }
  return rings;
}

const world = landRings("land-50m.json", 0.03, (b) => !inside(b, PH), 0.08);
const ph = landRings("land-10m.json", 0.006, (b) => inside(b, PH), 0.035);
const land = [...world, ...ph].map((r) => encode(r, true)).join("");

// Borders: arcs shared by two different countries
const ct = load("countries-50m.json");
const carcs = decodeArcs(ct);
const uses = new Map();
ct.objects.countries.geometries.forEach((g, gi) => {
  for (const poly of polygons(g)) for (const ring of poly) for (const i of ring) {
    const k = i >= 0 ? i : ~i;
    if (!uses.has(k)) uses.set(k, new Set());
    uses.get(k).add(gi);
  }
});
let border = "";
for (const [k, set] of uses) {
  if (set.size < 2) continue;
  const pts = carcs[k];
  const b = bbox(pts);
  if (b[3] < -56) continue;
  border += encode(simplify(pts, 0.04), false);
}

const res = { Q, LAT_TOP, LAT_BOT, W: 360 * Q, H: (LAT_TOP - LAT_BOT) * Q, land, border };
writeFileSync(out, JSON.stringify(res));
console.log("world rings", world.length, "ph rings", ph.length);
console.log("land bytes", land.length, "border bytes", border.length);
