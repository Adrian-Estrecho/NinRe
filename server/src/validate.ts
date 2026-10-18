import { DEFAULT_TITLE, SINCE_LABELS } from "./db.ts";
import { HttpError, type Cover, type PageInput } from "./types.ts";

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function text(v: unknown, field: string, max: number, opts: { required?: boolean } = {}): string {
  if (v == null) v = "";
  if (typeof v !== "string") throw new HttpError(400, `${field} must be text.`);
  const s = v.trim();
  if (opts.required && !s) throw new HttpError(400, `${field} is required.`);
  if (s.length > max) throw new HttpError(400, `${field} can be at most ${max} characters.`);
  return s;
}

export function isCalendarDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function deriveCode(name: string): string {
  return (name.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase() + "XXX").slice(0, 3);
}

function coord(v: unknown, limit: number, field: string): number | null {
  if (v == null) return null;
  if (typeof v !== "number" || !Number.isFinite(v) || Math.abs(v) > limit) throw new HttpError(400, `${field} is out of range.`);
  return Math.round(v * 1e6) / 1e6;
}

/* ---------- Accounts ---------- */

export function parseEmail(v: unknown): string {
  const email = text(v, "Email", 254, { required: true }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "That doesn't look like an email address.");
  return email;
}

export function parseName(v: unknown): string {
  return text(v, "Your name", 40, { required: true });
}

export function parseNewPassword(v: unknown): string {
  if (typeof v !== "string" || v.length < 8) throw new HttpError(400, "Use at least 8 characters for your password.");
  if (v.length > 200) throw new HttpError(400, "That password is too long.");
  return v;
}

/* ---------- Books ---------- */

export function parseCover(body: unknown): Cover {
  if (!isObj(body)) throw new HttpError(400, "Send the cover as a JSON object.");
  const since = text(body.since, "Since", 10);
  if (since && !isCalendarDate(since)) throw new HttpError(400, "The date on the cover must look like 2023-02-14.");
  const label = text(body.sinceLabel, "Date label", 24);
  return {
    title: text(body.title, "Book title", 60) || DEFAULT_TITLE,
    subtitle: text(body.subtitle, "Names on the cover", 60),
    since,
    sinceLabel: SINCE_LABELS.includes(label) ? label : SINCE_LABELS[0],
  };
}

export const MAX_PHOTOS = 12;

export function parsePageInput(body: unknown): PageInput {
  if (!isObj(body)) throw new HttpError(400, "Send the page as a JSON object.");
  const date = text(body.date, "Date", 10, { required: true });
  if (!isCalendarDate(date)) throw new HttpError(400, "Date must be a real date like 2025-04-17.");

  const pl = isObj(body.place) ? body.place : {};
  const name = text(pl.name, "Place", 80, { required: true });
  const lat = coord(pl.lat, 90, "Latitude");
  const lng = coord(pl.lng, 180, "Longitude");
  const code = text(pl.code, "Stamp code", 3).toUpperCase().replace(/[^A-Z0-9]/g, "") || deriveCode(name);

  const rawPhotos = body.photos == null ? [] : body.photos;
  if (!Array.isArray(rawPhotos)) throw new HttpError(400, "Photos must be a list.");
  if (rawPhotos.length > MAX_PHOTOS) throw new HttpError(400, `A page holds up to ${MAX_PHOTOS} photos.`);
  const seen = new Set<string>();
  const photos = rawPhotos.map((p) => {
    if (!isObj(p) || typeof p.id !== "string" || !/^[a-f0-9]{24}$/.test(p.id)) throw new HttpError(400, "A photo reference is malformed.");
    if (seen.has(p.id)) throw new HttpError(400, "The same photo is listed twice.");
    seen.add(p.id);
    return { id: p.id, caption: text(p.caption, "Caption", 60) };
  });

  const pinned = lat != null && lng != null;
  return {
    title: text(body.title, "Title", 120, { required: true }),
    date,
    kind: text(body.kind, "Kind of day", 30) || "Day out",
    place: { name, region: text(pl.region, "Region", 80), code, lat: pinned ? lat : null, lng: pinned ? lng : null },
    story: typeof body.story === "string" ? body.story.slice(0, 20000) : "",
    photos,
  };
}

export const NOTE_COLORS = ["butter", "blush", "sky", "mint", "lilac"];
export const MAX_NOTES_PER_PAGE = 40;

export function parseNote(body: unknown): { text: string; color: string } {
  if (!isObj(body)) throw new HttpError(400, "Send the note as a JSON object.");
  const color = typeof body.color === "string" && NOTE_COLORS.includes(body.color) ? body.color : NOTE_COLORS[0];
  return { text: text(body.text, "Note", 280, { required: true }), color };
}
