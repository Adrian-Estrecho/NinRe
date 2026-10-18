import type { CSSProperties } from "react";

/** How a book looks. Mirrors server/src/design.ts, which validates it. */
export interface Sticker {
  k: StickerKind;
  /** Centre position on the cover, in percent. */
  x: number;
  y: number;
  /** Rotation in degrees and scale (0.5–2). */
  r: number;
  s: number;
}

export type Texture = "linen" | "leather" | "canvas" | "kraft" | "velvet";
export type Foil = "gold" | "silver" | "copper" | "rose" | "white" | "ink";
export type TitleFont = "classic" | "modern" | "script" | "typewriter" | "hand";
export type Layout = "classic" | "centered" | "framed";
export type Emblem = "none" | "compass" | "plane" | "heart" | "mountain" | "wave" | "palm" | "camera" | "star" | "sun";
export type Paper = "cream" | "white" | "kraft" | "grid" | "dotted" | "lined";
export type PhotoStyle = "polaroid" | "clip" | "corners" | "plain";
export type Accent = "red" | "blue" | "green" | "plum" | "ink";
export type StickerKind = "plane" | "heart" | "sun" | "palm" | "wave" | "camera" | "ticket" | "mountain" | "pin" | "star" | "flower" | "suitcase" | "hello" | "cloud";

export interface Design {
  cloth: string;
  texture: Texture;
  foil: Foil;
  titleFont: TitleFont;
  layout: Layout;
  emblem: Emblem;
  coverPhoto: string | null;
  stickers: Sticker[];
  paper: Paper;
  photo: PhotoStyle;
  accent: Accent;
}

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

export const CLOTHS: { hex: string; name: string }[] = [
  { hex: "#1f2d47", name: "Navy" },
  { hex: "#24412f", name: "Forest" },
  { hex: "#5c1f24", name: "Oxblood" },
  { hex: "#b5532f", name: "Terracotta" },
  { hex: "#c08a2b", name: "Ochre" },
  { hex: "#6d9cc9", name: "Sky" },
  { hex: "#1f5c5e", name: "Teal" },
  { hex: "#e3a3a6", name: "Blush" },
  { hex: "#8da583", name: "Sage" },
  { hex: "#4a2c4f", name: "Plum" },
  { hex: "#d9c7a3", name: "Sand" },
  { hex: "#232323", name: "Charcoal" },
];

export const TEXTURES: { id: Texture; name: string }[] = [
  { id: "linen", name: "Linen" },
  { id: "canvas", name: "Canvas" },
  { id: "leather", name: "Leather" },
  { id: "velvet", name: "Velvet" },
  { id: "kraft", name: "Kraft" },
];

export const FOILS: { id: Foil; name: string; hi: string; mid: string; lo: string }[] = [
  { id: "gold", name: "Gold", hi: "#f0d99c", mid: "#c9a75e", lo: "#7d5f2a" },
  { id: "silver", name: "Silver", hi: "#f4f6f8", mid: "#b9c0c7", lo: "#6c747c" },
  { id: "copper", name: "Copper", hi: "#f6c4a0", mid: "#c77b4f", lo: "#7a3f22" },
  { id: "rose", name: "Rose gold", hi: "#fbd9d3", mid: "#d99b8f", lo: "#8f5a52" },
  { id: "white", name: "White ink", hi: "#ffffff", mid: "#f4f1ea", lo: "#d9d4c8" },
  { id: "ink", name: "Black ink", hi: "#3a3a3a", mid: "#1d1d1d", lo: "#000000" },
];

export const TITLE_FONTS: { id: TitleFont; name: string; family: string }[] = [
  { id: "classic", name: "Classic", family: '"Bodoni Moda Variable", "Bodoni Moda", Didot, Georgia, serif' },
  { id: "modern", name: "Modern", family: '"Archivo Variable", Archivo, system-ui, sans-serif' },
  { id: "script", name: "Script", family: '"Pinyon Script", "Snell Roundhand", cursive' },
  { id: "typewriter", name: "Typewriter", family: '"Special Elite", "Courier New", monospace' },
  { id: "hand", name: "Handwritten", family: '"Gochi Hand", "Segoe Print", cursive' },
];

export const LAYOUTS: { id: Layout; name: string }[] = [
  { id: "classic", name: "Corner" },
  { id: "centered", name: "Centred" },
  { id: "framed", name: "Framed" },
];

export const EMBLEMS: { id: Emblem; name: string }[] = [
  { id: "none", name: "None" },
  { id: "compass", name: "Compass" },
  { id: "plane", name: "Plane" },
  { id: "heart", name: "Heart" },
  { id: "mountain", name: "Mountain" },
  { id: "wave", name: "Wave" },
  { id: "palm", name: "Palm" },
  { id: "camera", name: "Camera" },
  { id: "star", name: "Star" },
  { id: "sun", name: "Sun" },
];

export const PAPERS: { id: Paper; name: string }[] = [
  { id: "cream", name: "Cream" },
  { id: "white", name: "White" },
  { id: "kraft", name: "Kraft" },
  { id: "grid", name: "Grid" },
  { id: "dotted", name: "Dotted" },
  { id: "lined", name: "Lined" },
];

export const PHOTO_STYLES: { id: PhotoStyle; name: string }[] = [
  { id: "polaroid", name: "Polaroid & tape" },
  { id: "clip", name: "Paper clip" },
  { id: "corners", name: "Photo corners" },
  { id: "plain", name: "Plain print" },
];

export const ACCENTS: { id: Accent; name: string; hex: string }[] = [
  { id: "red", name: "Postbox red", hex: "#b3352b" },
  { id: "blue", name: "Airmail blue", hex: "#2257b8" },
  { id: "green", name: "Stamp green", hex: "#2f7a4b" },
  { id: "plum", name: "Plum", hex: "#7a3a78" },
  { id: "ink", name: "Black ink", hex: "#23292b" },
];

export const STICKER_KINDS: { k: StickerKind; name: string }[] = [
  { k: "plane", name: "Paper plane" },
  { k: "heart", name: "Heart" },
  { k: "sun", name: "Sun" },
  { k: "palm", name: "Palm tree" },
  { k: "wave", name: "Wave" },
  { k: "camera", name: "Camera" },
  { k: "ticket", name: "Ticket" },
  { k: "mountain", name: "Mountain" },
  { k: "pin", name: "Map pin" },
  { k: "star", name: "Star" },
  { k: "flower", name: "Flower" },
  { k: "suitcase", name: "Suitcase" },
  { k: "hello", name: "Hello from" },
  { k: "cloud", name: "Cloud" },
];

/** Ready-made looks to start from. */
export const PRESETS: { name: string; design: Partial<Design> }[] = [
  { name: "Navy & gold", design: { cloth: "#1f2d47", texture: "linen", foil: "gold", titleFont: "classic", layout: "classic", emblem: "compass", paper: "cream", photo: "polaroid", accent: "red" } },
  { name: "Island days", design: { cloth: "#6d9cc9", texture: "canvas", foil: "white", titleFont: "modern", layout: "centered", emblem: "palm", paper: "white", photo: "clip", accent: "blue" } },
  { name: "Road trip", design: { cloth: "#b5532f", texture: "leather", foil: "copper", titleFont: "typewriter", layout: "framed", emblem: "mountain", paper: "kraft", photo: "corners", accent: "ink" } },
  { name: "Love notes", design: { cloth: "#e3a3a6", texture: "velvet", foil: "rose", titleFont: "script", layout: "centered", emblem: "heart", paper: "lined", photo: "polaroid", accent: "plum" } },
  { name: "Field notes", design: { cloth: "#8da583", texture: "kraft", foil: "ink", titleFont: "hand", layout: "classic", emblem: "sun", paper: "grid", photo: "plain", accent: "green" } },
];

const hexOk = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

/** Fills gaps in a design that came from storage or an older version. */
export function normalizeDesign(d: Partial<Design> | null | undefined): Design {
  const pick = <T extends string>(v: unknown, list: { id: T }[] | readonly T[], fallback: T): T => {
    const ids = (list as (T | { id: T })[]).map((x) => (typeof x === "string" ? x : x.id));
    return ids.includes(v as T) ? (v as T) : fallback;
  };
  const src = d ?? {};
  return {
    cloth: typeof src.cloth === "string" && hexOk(src.cloth) ? src.cloth.toLowerCase() : DEFAULT_DESIGN.cloth,
    texture: pick(src.texture, TEXTURES, DEFAULT_DESIGN.texture),
    foil: pick(src.foil, FOILS, DEFAULT_DESIGN.foil),
    titleFont: pick(src.titleFont, TITLE_FONTS, DEFAULT_DESIGN.titleFont),
    layout: pick(src.layout, LAYOUTS, DEFAULT_DESIGN.layout),
    emblem: pick(src.emblem, EMBLEMS, DEFAULT_DESIGN.emblem),
    coverPhoto: typeof src.coverPhoto === "string" ? src.coverPhoto : null,
    stickers: Array.isArray(src.stickers)
      ? src.stickers.filter((s) => STICKER_KINDS.some((k) => k.k === s?.k)).slice(0, MAX_STICKERS).map((s) => ({
          k: s.k,
          x: clamp(Number(s.x) || 50, 0, 100),
          y: clamp(Number(s.y) || 50, 0, 100),
          r: clamp(Number(s.r) || 0, -180, 180),
          s: clamp(Number(s.s) || 1, 0.5, 2),
        }))
      : [],
    paper: pick(src.paper, PAPERS, DEFAULT_DESIGN.paper),
    photo: pick(src.photo, PHOTO_STYLES, DEFAULT_DESIGN.photo),
    accent: pick(src.accent, ACCENTS, DEFAULT_DESIGN.accent),
  };
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Relative luminance of a hex colour, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

type Vars = CSSProperties & Record<`--${string}`, string>;

/**
 * CSS custom properties and data attributes that dress anything inside them as this book:
 * cloth and foil for covers, paper, accent ink and photo style for pages.
 */
export function bookStyle(d: Design): { style: Vars; data: Record<string, string> } {
  const foil = FOILS.find((f) => f.id === d.foil) ?? FOILS[0];
  const font = TITLE_FONTS.find((f) => f.id === d.titleFont) ?? TITLE_FONTS[0];
  return {
    style: {
      "--cloth": d.cloth,
      "--foil": foil.mid,
      "--foil-hi": foil.hi,
      "--foil-lo": foil.lo,
      "--f-cover": font.family,
    },
    data: {
      "data-texture": d.texture,
      "data-foil": d.foil,
      "data-titlefont": d.titleFont,
      "data-layout": d.layout,
      "data-paper": d.paper,
      "data-photo": d.photo,
      "data-accent": d.accent,
      "data-light-cloth": luminance(d.cloth) > 0.42 ? "yes" : "no",
    },
  };
}
