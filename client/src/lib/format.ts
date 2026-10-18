import type { Place } from "../types";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Parses YYYY-MM-DD as a local calendar date (no timezone shift). */
export function parseDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
export const toYMD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayYMD = () => toYMD(new Date());

export function fmtLong(ymd: string): string {
  const d = parseDate(ymd);
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtDay(ymd: string): string {
  const d = parseDate(ymd);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function fmtShort(ymd: string): string {
  const d = parseDate(ymd);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
export function daysBetween(fromYMD: string, toYMDStr: string): number {
  return Math.round((parseDate(toYMDStr).getTime() - parseDate(fromYMD).getTime()) / 864e5);
}

const NUMERALS: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
export function roman(n: number): string {
  let out = "";
  for (const [v, r] of NUMERALS) while (n >= v) { out += r; n -= v; }
  return out;
}

export function coordsText(p: Pick<Place, "lat" | "lng">): string {
  if (p.lat == null || p.lng == null) return "";
  return `${Math.abs(p.lat).toFixed(4)}° ${p.lat >= 0 ? "N" : "S"} · ${Math.abs(p.lng).toFixed(4)}° ${p.lng >= 0 ? "E" : "W"}`;
}

export const deriveCode = (name: string) => (name.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase() + "XXX").slice(0, 3);
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function mapsUrl(p: Place): string {
  const q = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : encodeURIComponent(p.name);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function excerpt(s: string, n = 260): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).replace(/\s\S*$/, "") + "…" : t;
}

export const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Stable pseudo-random value in [lo, hi] for a seed, so tilts don't change between renders. */
export function jitter(seed: string, key: string | number, lo: number, hi: number): number {
  let h = 2166136261;
  for (const c of `${seed}:${key}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return lo + ((h >>> 0) % 1000) / 999 * (hi - lo);
}

/** Centavos as pesos: 19900 → "₱199". */
export const peso = (centavos: number) =>
  "₱" + (centavos / 100).toLocaleString("en-PH", { minimumFractionDigits: centavos % 100 ? 2 : 0, maximumFractionDigits: 2 });

export const fmtStamp = (ms: number) => fmtDay(toYMD(new Date(ms)));
