import { esc } from "../lib/format";

/**
 * A small vintage map engine: equirectangular projection, coastlines drawn from
 * /map/world.json (see MapDefs), drag/wheel/pinch zoom, numbered pins and a
 * dashed route. It owns its container's DOM; React only hands it data.
 */

// Must match tools/build-map.mjs.
const Q = 100; // map units per degree
const LAT_TOP = 84;
const W = 360 * Q;
const H = (84 + 58) * Q;
const projX = (lng: number) => (lng + 180) * Q;
const projY = (lat: number) => (LAT_TOP - lat) * Q;

const SEA_LABELS: [string, number, number, number][] = [
  ["PACIFIC OCEAN", 2, -140, 0], ["PACIFIC OCEAN", 30, 168, 0], ["INDIAN OCEAN", -22, 78, 0], ["ATLANTIC OCEAN", 24, -42, 0],
  ["PHILIPPINE SEA", 17.5, 131, 1.6], ["SOUTH CHINA SEA", 14.5, 113.5, 1.6], ["SEA OF JAPAN", 40.5, 134.5, 3], ["SULU SEA", 8.4, 120.2, 7],
  ["CELEBES SEA", 3.6, 123.2, 7], ["SIBUYAN SEA", 12.6, 122.5, 22], ["BOHOL SEA", 9.1, 124.4, 26], ["JAVA SEA", -5, 111, 4], ["CORAL SEA", -16, 154, 2],
];
const LAND_LABELS: [string, number, number, number][] = [
  ["Luzon", 16.4, 121.2, 9], ["Mindanao", 7.7, 124.9, 9], ["Visayas", 11.1, 123.7, 12], ["Palawan", 9.9, 118.7, 14], ["Borneo", 1, 114, 3.5], ["Japan", 37.2, 139.2, 3],
];

export interface Pin {
  id: string;
  lat: number;
  lng: number;
  n?: number;
  label?: string;
  draft?: boolean;
}

export interface AtlasOptions {
  interactive?: boolean;
  controls?: boolean;
  labels?: boolean;
  route?: boolean;
  fitLabel?: string;
  home?: { lat: number; lng: number };
  onPin?: (id: string) => void;
  onPick?: (lat: number, lng: number) => void;
  onMove?: () => void;
}

type PlacedPin = Pin & { ox: number; oy: number };

export class Atlas {
  private el: HTMLElement;
  opts: AtlasOptions;
  private pins: PlacedPin[] = [];
  private pinEls: SVGGElement[] = [];
  private w = 0;
  private h = 0;
  private s = 0;
  private tx = 0;
  private ty = 0;
  private ready = false;
  private pending: (() => void) | null = null;
  private raf = 0;
  private ro: ResizeObserver;
  private gGr: SVGGElement;
  private gMap: SVGGElement;
  private gLbl: SVGGElement;
  private pRoute: SVGPathElement;
  private gPins: SVGGElement;

  constructor(el: HTMLElement, opts: AtlasOptions = {}) {
    this.el = el;
    this.opts = { interactive: true, controls: true, labels: true, route: false, ...opts };
    el.innerHTML = `<svg aria-hidden="true"><rect width="100%" height="100%" fill="var(--sea)"/><g class="gr"></g>
      <g class="mapg"><use href="#tb-land" class="halo1"/><use href="#tb-land" class="halo2"/><use href="#tb-land" class="land"/><use href="#tb-border" class="border"/></g>
      <g class="lbls"></g><path class="route"/><g class="pins"></g></svg>` +
      (this.opts.controls
        ? `<div class="map-ctl"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">&minus;</button><button type="button" class="fit" data-z="fit" aria-label="${esc(this.opts.fitLabel ?? "Show all pins")}">ALL</button></div>`
        : "");
    const q = <T extends Element>(s: string) => el.querySelector(s) as T;
    this.gGr = q(".gr"); this.gMap = q(".mapg"); this.gLbl = q(".lbls"); this.pRoute = q(".route"); this.gPins = q(".pins");
    el.querySelector(".map-ctl")?.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest("button");
      if (!b) return;
      if (b.dataset.z === "fit") this.fit();
      else this.zoomAt(this.w / 2, this.h / 2, b.dataset.z === "in" ? 1.8 : 1 / 1.8);
    });
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(el);
    if (this.opts.interactive) this.bind();
  }

  destroy() {
    this.ro.disconnect();
    cancelAnimationFrame(this.raf);
    this.el.innerHTML = "";
  }

  private get sMin() { return Math.max(this.w / W, this.h / H); }
  private readonly sMax = 22;

  resize() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cx = this.ready ? (this.w / 2 - this.tx) / this.s : 0;
    const cy = this.ready ? (this.h / 2 - this.ty) / this.s : 0;
    this.w = r.width;
    this.h = r.height;
    if (!this.ready) {
      this.ready = true;
      const p = this.pending;
      this.pending = null;
      if (p) p(); else this.fit();
      return;
    }
    this.s = Math.max(this.s, this.sMin);
    this.tx = this.w / 2 - cx * this.s;
    this.ty = this.h / 2 - cy * this.s;
    this.apply();
  }

  private clamp() {
    this.s = Math.min(this.sMax, Math.max(this.sMin, this.s));
    this.tx = Math.min(0, Math.max(this.w - W * this.s, this.tx));
    this.ty = Math.min(0, Math.max(this.h - H * this.s, this.ty));
  }

  private apply() {
    this.clamp();
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.draw();
    });
  }

  private later(fn: () => void) {
    if (this.ready) fn(); else this.pending = fn;
  }

  centerOn(lat: number, lng: number, spanDeg = 8) {
    this.later(() => {
      this.s = Math.min(this.sMax, Math.max(this.sMin, this.w / (spanDeg * Q)));
      this.tx = this.w / 2 - projX(lng) * this.s;
      this.ty = this.h / 2 - projY(lat) * this.s;
      this.apply();
    });
  }

  fit() {
    this.later(() => {
      const pts = this.pins;
      if (!pts.length) {
        const home = this.opts.home ?? { lat: 20, lng: 120 };
        this.s = this.sMin;
        this.tx = this.w / 2 - projX(home.lng) * this.s;
        this.ty = this.h / 2 - projY(home.lat) * this.s;
        return this.apply();
      }
      if (pts.length === 1) return this.centerOn(pts[0].lat, pts[0].lng, 10);
      const xs = pts.map((p) => projX(p.lng)), ys = pts.map((p) => projY(p.lat));
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const pad = Math.min(70, this.w * 0.12);
      this.s = Math.min((this.w - 2 * pad) / Math.max(x1 - x0, 60), (this.h - 2 * pad) / Math.max(y1 - y0, 60));
      this.s = Math.min(this.sMax, Math.max(this.sMin, this.s));
      this.tx = this.w / 2 - ((x0 + x1) / 2) * this.s;
      this.ty = this.h / 2 - ((y0 + y1) / 2) * this.s;
      this.apply();
    });
  }

  zoomAt(px: number, py: number, f: number) {
    const s2 = Math.min(this.sMax, Math.max(this.sMin, this.s * f)), k = s2 / this.s;
    this.tx = px - (px - this.tx) * k;
    this.ty = py - (py - this.ty) * k;
    this.s = s2;
    this.apply();
    this.opts.onMove?.();
  }

  private toLatLng(px: number, py: number): [number, number] {
    const x = (px - this.tx) / this.s, y = (py - this.ty) / this.s;
    return [LAT_TOP - y / Q, x / Q - 180];
  }
  private sx(lng: number) { return this.tx + projX(lng) * this.s; }
  private sy(lat: number) { return this.ty + projY(lat) * this.s; }

  setPins(pins: Pin[]) {
    const groups = new Map<string, Pin[]>();
    for (const p of pins) {
      const k = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
      groups.set(k, [...(groups.get(k) ?? []), p]);
    }
    // Pages at the same spot fan out around it instead of hiding each other.
    this.pins = pins.map((p) => {
      const g = groups.get(`${p.lat.toFixed(3)},${p.lng.toFixed(3)}`)!;
      const i = g.indexOf(p), a = (i / g.length) * Math.PI * 2 - Math.PI / 2, r = g.length > 1 ? 13 : 0;
      return { ...p, ox: Math.cos(a) * r, oy: Math.sin(a) * r };
    });
    this.gPins.innerHTML = this.pins.map((p) => {
      const big = p.n != null;
      return `<g class="pin${p.draft ? " draft" : ""}" data-id="${esc(p.id)}"><title>${esc(p.label ?? "")}</title><circle class="sh" cy="2" r="${big ? 10.5 : 7.5}"/><circle class="o" r="${big ? 10 : 7}"/>${big ? `<text style="font-size:${p.n! > 99 ? 8 : 10}px">${p.n}</text>` : ""}</g>`;
    }).join("");
    this.pinEls = [...this.gPins.children] as SVGGElement[];
    if (this.ready) this.draw();
  }

  setHot(id: string | null) {
    this.pinEls.forEach((g) => g.classList.toggle("hot", g.dataset.id === id));
    const hot = this.pinEls.find((g) => g.dataset.id === id);
    if (hot) this.gPins.appendChild(hot);
  }

  private draw() {
    if (!this.ready) return;
    const { s, tx, ty, w, h } = this;
    this.gMap.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s})`);

    // Graticule, stepped so lines stay roughly 90px apart
    const need = 90 / (Q * s);
    const step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30].find((v) => v >= need) ?? 30;
    const lng0 = -tx / s / Q - 180, lng1 = (w - tx) / s / Q - 180;
    const lat0 = LAT_TOP - (h - ty) / s / Q, lat1 = LAT_TOP - -ty / s / Q;
    const fmt = (v: number, pos: string, neg: string) => `${+Math.abs(v).toFixed(2)}°${v === 0 ? "" : v > 0 ? pos : neg}`;
    let d = "", lbl = "";
    for (let g = Math.ceil(lng0 / step) * step; g <= lng1; g += step) {
      const X = this.sx(g);
      d += `M${X.toFixed(1)} 0V${h}`;
      if (this.opts.labels) lbl += `<text class="grat-lbl" x="${(X + 3).toFixed(1)}" y="11">${fmt(+g.toFixed(2), "E", "W")}</text>`;
    }
    for (let g = Math.ceil(lat0 / step) * step; g <= lat1; g += step) {
      const Y = this.sy(g);
      if (Math.abs(g) > 1e-9) d += `M0 ${Y.toFixed(1)}H${w}`;
      if (this.opts.labels) lbl += `<text class="grat-lbl" x="4" y="${(Y - 3).toFixed(1)}">${fmt(+g.toFixed(2), "N", "S")}</text>`;
    }
    this.gGr.innerHTML = `<path class="grat" d="${d}"/><path class="grat eq" d="M0 ${this.sy(0).toFixed(1)}H${w}"/>${lbl}`;

    // Sea and land names that suit the current zoom
    if (this.opts.labels) {
      const z = s / this.sMin;
      const text = (cls: string, l: [string, number, number, number]) => `<text class="${cls}" x="${this.sx(l[2]).toFixed(1)}" y="${this.sy(l[1]).toFixed(1)}">${l[0]}</text>`;
      this.gLbl.innerHTML =
        SEA_LABELS.filter((l) => z >= l[3] && z < l[3] * 40 + 8).map((l) => text("sea-lbl", l)).join("") +
        LAND_LABELS.filter((l) => z >= l[3] && z < l[3] * 12).map((l) => text("isl-lbl", l)).join("");
    }

    this.pinEls.forEach((g, i) => {
      const p = this.pins[i];
      g.setAttribute("transform", `translate(${(this.sx(p.lng) + p.ox).toFixed(1)} ${(this.sy(p.lat) + p.oy).toFixed(1)})`);
    });

    // Dashed route in the order the days happened, bowed like a flight path
    if (this.opts.route && this.pins.length > 1) {
      const pts = this.pins.slice().sort((a, b) => (a.n ?? 0) - (b.n ?? 0)).map((p) => [this.sx(p.lng) + p.ox, this.sy(p.lat) + p.oy]);
      let r = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const bend = Math.min(len * 0.2, 90), cx = (ax + bx) / 2 - (dy / len) * bend, cy = (ay + by) / 2 + (dx / len) * bend;
        r += `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`;
      }
      this.pRoute.setAttribute("d", r);
    } else this.pRoute.setAttribute("d", "");
  }

  private bind() {
    const el = this.el, pts = new Map<number, [number, number]>();
    let start: { p: [number, number]; tx: number; ty: number; moved: boolean; pin?: string } | null = null;
    let pinch: { d: number; s: number; m: [number, number]; tx: number; ty: number } | null = null;
    const local = (e: PointerEvent | WheelEvent | MouseEvent): [number, number] => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    el.addEventListener("pointerdown", (e) => {
      if ((e.target as Element).closest(".map-ctl") || e.button > 0) return;
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, local(e));
      if (pts.size === 1) start = { p: local(e), tx: this.tx, ty: this.ty, moved: false, pin: (e.target as Element).closest<SVGGElement>(".pin")?.dataset.id };
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: this.s, m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], tx: this.tx, ty: this.ty };
        if (start) start.moved = true;
      }
    });
    el.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, local(e));
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const s2 = Math.min(this.sMax, Math.max(this.sMin, (pinch.s * d) / pinch.d)), k = s2 / pinch.s;
        this.s = s2;
        this.tx = m[0] - (pinch.m[0] - pinch.tx) * k;
        this.ty = m[1] - (pinch.m[1] - pinch.ty) * k;
        this.apply();
      } else if (start) {
        const [x, y] = local(e), dx = x - start.p[0], dy = y - start.p[1];
        if (!start.moved && Math.hypot(dx, dy) > 5) { start.moved = true; el.classList.add("dragging"); }
        if (start.moved) { this.tx = start.tx + dx; this.ty = start.ty + dy; this.apply(); this.opts.onMove?.(); }
      }
    });
    const end = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size > 0) return;
      el.classList.remove("dragging");
      if (start && !start.moved && e.type === "pointerup") {
        if (start.pin && this.opts.onPin) this.opts.onPin(start.pin);
        else if (this.opts.onPick) this.opts.onPick(...this.toLatLng(p[0], p[1]));
      }
      start = null;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("wheel", (e) => {
      e.preventDefault();
      const [x, y] = local(e);
      this.zoomAt(x, y, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0018)));
    }, { passive: false });
    el.addEventListener("dblclick", (e) => {
      const [x, y] = local(e);
      this.zoomAt(x, y, 2);
    });
  }
}
