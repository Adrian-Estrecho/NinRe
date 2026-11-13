import { DEFAULT_TITLE, SINCE_LABELS } from "./db.ts";
import { parseFigure } from "./figure.ts";
import {
  BOARD_MATERIALS, BOOK_KINDS, DECOR_KINDS, DEFAULT_SETTINGS, EMPTY_PROFILE, HEARD_FROM, HttpError, MIN_AGE, NOTIFY_KINDS, PAGE_LAYOUTS, PIN_STYLES, TRAVEL_OFTEN, TRAVEL_WITH, TRIP_KINDS,
  type BookKind, type Cover, type PageInput, type Profile, type Room, type Settings, type SignupDetails,
} from "./types.ts";

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

/** The rest of the sign-up form: last name, age, an optional phone number, and agreeing to the terms. */
export function parseSignupDetails(body: Record<string, unknown>): SignupDetails {
  if (body.acceptTerms !== true) throw new HttpError(400, "Agree to the Terms and Conditions to make an account.");
  const termsVersion = text(body.termsVersion, "Terms version", 20, { required: true });
  const lastName = text(body.lastName, "Your last name", 40, { required: true });
  const age = body.age;
  if (typeof age !== "number" || !Number.isInteger(age) || age < 0 || age > 120) throw new HttpError(400, "Add your age as a whole number.");
  if (age < MIN_AGE) throw new HttpError(400, `You need to be ${MIN_AGE} or older to use NinRe.`);
  const phone = text(body.phone, "Phone number", 20);
  const digits = phone.replace(/\D/g, "").length;
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || digits < 7 || digits > 15)) throw new HttpError(400, "That phone number doesn't look right.");
  return { lastName, age, phone, termsVersion };
}

/** The sign-up answers. Anything left out is unanswered; anything not on the lists is refused. */
export function parseProfile(v: unknown): Profile {
  if (v == null) return { ...EMPTY_PROFILE };
  if (!isObj(v)) throw new HttpError(400, "Send the sign-up answers as a JSON object.");
  const pick = <T extends string>(x: unknown, options: readonly T[], field: string): T | "" => {
    if (x == null || x === "") return "";
    if (!options.includes(x as T)) throw new HttpError(400, `${field} isn't one of the choices.`);
    return x as T;
  };
  if (v.trips != null && !Array.isArray(v.trips)) throw new HttpError(400, "Kinds of trip must be a list.");
  const listed = ((v.trips as unknown[] | undefined) ?? []).slice(0, TRIP_KINDS.length * 2).map((x) => pick(x, TRIP_KINDS, "A kind of trip"));
  const heardFrom = pick(v.heardFrom, HEARD_FROM, "Where you heard of NinRe");
  return {
    travelWith: pick(v.travelWith, TRAVEL_WITH, "Who you travel with"),
    trips: [...new Set(listed.filter((x) => x !== ""))] as Profile["trips"],
    often: pick(v.often, TRAVEL_OFTEN, "How often you travel"),
    keep: pick(v.keep, BOOK_KINDS, "Kind of book"),
    heardFrom,
    heardOther: heardFrom === "other" ? text(v.heardOther, "Where you heard of NinRe", 60) : "",
  };
}

/** 3 to 20 lowercase letters, digits, dots or underscores, starting with a letter or digit. */
export function parseUsername(v: unknown): string {
  const u = text(v, "Username", 30, { required: true }).replace(/^@/, "").toLowerCase();
  if (u.length < 3 || u.length > 20) throw new HttpError(400, "A username is 3 to 20 characters long.");
  if (!/^[a-z0-9][a-z0-9._]*$/.test(u)) throw new HttpError(400, "A username can use letters, numbers, dots and underscores, and starts with a letter or number.");
  return u;
}

/** What a person shows others about themselves. */
export function parsePublicProfile(body: unknown) {
  if (!isObj(body)) throw new HttpError(400, "Send the profile as a JSON object.");
  return {
    name: parseName(body.name),
    username: parseUsername(body.username),
    bio: text(body.bio, "About you", 160),
    home: text(body.home, "Home base", 60),
    travel: parseProfile(body.travel),
  };
}

export function parseSettings(body: unknown): Settings {
  if (!isObj(body)) throw new HttpError(400, "Send the settings as a JSON object.");
  const notify = isObj(body.notify) ? body.notify : {};
  const flag = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    discoverable: flag(body.discoverable, DEFAULT_SETTINGS.discoverable),
    addToBooks: body.addToBooks === "ask" ? "ask" : "friends",
    notify: Object.fromEntries(NOTIFY_KINDS.map((k) => [k, flag(notify[k], DEFAULT_SETTINGS.notify[k])])) as Settings["notify"],
  };
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

/** A kind of book; one made without saying is a photo album. */
export function parseBookKind(v: unknown): BookKind {
  if (v == null) return "album";
  if (!BOOK_KINDS.includes(v as BookKind)) throw new HttpError(400, "That kind of book isn't one of the choices.");
  return v as BookKind;
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

  const layout = body.layout == null ? "" : body.layout;
  if (layout !== "" && !PAGE_LAYOUTS.includes(layout as never)) throw new HttpError(400, "That photo layout isn't one of the choices.");

  const pinned = lat != null && lng != null;
  return {
    title: text(body.title, "Title", 120, { required: true }),
    date,
    kind: text(body.kind, "Kind of day", 30) || "Day out",
    layout: layout as PageInput["layout"],
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

/* ---------- The library ---------- */

export const MAX_BOARD_PHOTOS = 24;
export const MAX_DECOR = 10;
export const MAX_FIGURES = 24;
export const MAX_MAGNETS = 120;
export const MAGNET_TEXT = 16;

const pick = <T extends string>(v: unknown, from: readonly T[], fallback: T): T => (from.includes(v as T) ? (v as T) : fallback);
const pct = (v: unknown, lo: number, hi: number, field: string) => {
  if (typeof v !== "number" || !Number.isFinite(v)) throw new HttpError(400, `${field} must be a number.`);
  return Math.round(Math.min(hi, Math.max(lo, v)) * 10) / 10;
};

/** A room as sent by the client. Photo ids are checked against the person's books by the store. */
export function parseRoom(body: unknown): Room {
  if (!isObj(body)) throw new HttpError(400, "Send the library as a JSON object.");
  const board = isObj(body.board) ? body.board : {};
  const rawPhotos = body.photos == null ? [] : body.photos;
  const rawDecor = body.decor == null ? [] : body.decor;
  const rawFigures = body.figures == null ? [] : body.figures;
  if (!Array.isArray(rawFigures)) throw new HttpError(400, "Figures must be a list.");
  if (rawFigures.length > MAX_FIGURES) throw new HttpError(400, `You can keep up to ${MAX_FIGURES} figures.`);
  if (!Array.isArray(rawPhotos) || !Array.isArray(rawDecor)) throw new HttpError(400, "Photos and objects must be lists.");
  if (rawPhotos.length > MAX_BOARD_PHOTOS) throw new HttpError(400, `The board holds up to ${MAX_BOARD_PHOTOS} photos.`);
  if (rawDecor.length > MAX_DECOR) throw new HttpError(400, `The top of the bookcase holds up to ${MAX_DECOR} things.`);
  const rawMagnets = body.magnets == null ? [] : body.magnets;
  if (!Array.isArray(rawMagnets)) throw new HttpError(400, "Magnets must be a list.");
  if (rawMagnets.length > MAX_MAGNETS) throw new HttpError(400, `The board holds up to ${MAX_MAGNETS} magnets.`);
  const seen = new Set<string>();
  return {
    board: {
      material: pick(board.material, BOARD_MATERIALS, "cork"),
      pins: pick(board.pins, PIN_STYLES, "pin"),
      title: text(board.title, "Board title", 40),
    },
    photos: rawPhotos.map((p) => {
      if (!isObj(p) || typeof p.id !== "string" || !/^[a-f0-9]{24}$/.test(p.id)) throw new HttpError(400, "A photo reference is malformed.");
      if (seen.has(p.id)) throw new HttpError(400, "The same photo is pinned twice.");
      seen.add(p.id);
      return { id: p.id, x: pct(p.x, 0, 100, "A photo's position"), y: pct(p.y, 0, 100, "A photo's position"), r: pct(p.r, -12, 12, "A photo's tilt") };
    }),
    // A magnet is a country's code, for the one earned there (which countries is worked out from the pages, not sent),
    // or the code and a suffix for one the person made, as in "ph-k3x9". Either can say something of its own.
    magnets: rawMagnets.map((m) => {
      if (!isObj(m) || typeof m.id !== "string" || !/^[a-z]{2}(-[a-z0-9]{1,12})?$/.test(m.id)) throw new HttpError(400, "A magnet reference is malformed.");
      if (seen.has(m.id)) throw new HttpError(400, "The same magnet is on the board twice.");
      seen.add(m.id);
      const words = text(m.text, "A magnet's words", MAGNET_TEXT);
      const at = { id: m.id, x: pct(m.x, 0, 100, "A magnet's position"), y: pct(m.y, 0, 100, "A magnet's position"), r: pct(m.r, -12, 12, "A magnet's tilt") };
      return words ? { ...at, text: words } : at;
    }),
    decor: rawDecor.map((d) => {
      if (!isObj(d) || !DECOR_KINDS.includes(d.k as never)) throw new HttpError(400, "That isn't something that goes on the bookcase.");
      const k = d.k as Room["decor"][number]["k"];
      const x = pct(d.x, 0, 100, "An object's position");
      return k === "figure" ? { k, x, fig: parseFigure(d.fig) } : { k, x };
    }),
    figures: rawFigures.map(parseFigure),
  };
}
