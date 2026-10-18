import { HttpError } from "./types.ts";

/** How a book looks: its cover, paper and photos. Mirrors client/src/book/design.ts. */
export interface Sticker {
  k: string;
  x: number;
  y: number;
  r: number;
  s: number;
}

export interface Design {
  cloth: string;
  texture: string;
  foil: string;
  titleFont: string;
  layout: string;
  emblem: string;
  coverPhoto: string | null;
  stickers: Sticker[];
  paper: string;
  photo: string;
  accent: string;
}

const OPTIONS = {
  texture: ["linen", "leather", "canvas", "kraft", "velvet"],
  foil: ["gold", "silver", "copper", "rose", "white", "ink"],
  titleFont: ["classic", "modern", "script", "typewriter", "hand"],
  layout: ["classic", "centered", "framed"],
  emblem: ["none", "compass", "plane", "heart", "mountain", "wave", "palm", "camera", "star", "sun"],
  paper: ["cream", "white", "kraft", "grid", "dotted", "lined"],
  photo: ["polaroid", "clip", "corners", "plain"],
  accent: ["red", "blue", "green", "plum", "ink"],
} as const;

export const STICKER_KINDS = ["plane", "heart", "sun", "palm", "wave", "camera", "ticket", "mountain", "pin", "star", "flower", "suitcase", "hello", "cloud"];
export const MAX_STICKERS = 16;

export const DEFAULT_DESIGN: Design = {
  cloth: "#1f2d47",
  texture: "linen",
  foil: "gold",
  titleFont: "classic",
  layout: "classic",
  emblem: "compass",
  coverPhoto: null,
  stickers: [],
  paper: "cream",
  photo: "polaroid",
  accent: "red",
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number, field: string) => {
  if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) throw new HttpError(400, `Sticker ${field} is out of range.`);
  return Math.round(v * 100) / 100;
};

/** Validates a design sent by the client. Unknown keys are dropped; missing keys fall back to the default. */
export function parseDesign(v: unknown): Design {
  if (!isObj(v)) throw new HttpError(400, "Send the design as a JSON object.");
  const out: Design = { ...DEFAULT_DESIGN, stickers: [] };

  if (v.cloth != null) {
    if (typeof v.cloth !== "string" || !/^#[0-9a-fA-F]{6}$/.test(v.cloth)) throw new HttpError(400, "Cloth colour must look like #1f2d47.");
    out.cloth = v.cloth.toLowerCase();
  }
  for (const key of Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]) {
    const val = v[key];
    if (val == null) continue;
    if (typeof val !== "string" || !(OPTIONS[key] as readonly string[]).includes(val)) throw new HttpError(400, `That ${key} isn't one of the choices.`);
    out[key] = val;
  }
  if (v.coverPhoto != null) {
    if (typeof v.coverPhoto !== "string" || !/^[a-f0-9]{24}$/.test(v.coverPhoto)) throw new HttpError(400, "The cover photo reference is malformed.");
    out.coverPhoto = v.coverPhoto;
  }
  if (v.stickers != null) {
    if (!Array.isArray(v.stickers)) throw new HttpError(400, "Stickers must be a list.");
    if (v.stickers.length > MAX_STICKERS) throw new HttpError(400, `A cover holds up to ${MAX_STICKERS} stickers.`);
    out.stickers = v.stickers.map((s) => {
      if (!isObj(s) || typeof s.k !== "string" || !STICKER_KINDS.includes(s.k)) throw new HttpError(400, "That sticker isn't one of the choices.");
      return { k: s.k, x: num(s.x, 0, 100, "position"), y: num(s.y, 0, 100, "position"), r: num(s.r, -180, 180, "rotation"), s: num(s.s, 0.5, 2, "size") };
    });
  }
  return out;
}

export function readDesign(json: string): Design {
  try {
    return parseDesign(JSON.parse(json));
  } catch {
    return { ...DEFAULT_DESIGN };
  }
}
