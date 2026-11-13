/**
 * Minifigures for the top of the bookcase. A figure is a handful of traits (colours and a few styles) that the app
 * draws as a small toy; a person can set them by hand, or send a photo and have Claude read them off it.
 * The photo is only passed through to Claude: it isn't written to disk or kept.
 */
import Anthropic from "@anthropic-ai/sdk";
import { HttpError } from "./types.ts";

export const HAIR_STYLES = ["short", "bob", "long", "pigtails", "ponytail", "bun", "curly", "bald"] as const;
// The everyday outfits and hats, which anyone can use and which a photo can be read as.
export const BASIC_OUTFITS = ["dress", "skirt", "trousers", "shorts"] as const;
export const BASIC_HATS = ["none", "cap", "beanie", "sunhat"] as const;
// The stylish ones, and everything carried or worn as an accessory, are for Plus and Crew.
export const PREMIUM_OUTFITS = ["suit", "overalls", "hoodie", "raincoat"] as const;
export const PREMIUM_HATS = ["beret", "crown", "headphones"] as const;
export const OUTFITS = [...BASIC_OUTFITS, ...PREMIUM_OUTFITS] as const;
export const HATS = [...BASIC_HATS, ...PREMIUM_HATS] as const;
export const ACCESSORIES = ["none", "backpack", "camera", "scarf", "sunglasses"] as const;
// Chosen by the person in the editor; never read off a photo.
export const GENDERS = ["girl", "boy", "any"] as const;
export const AGES = ["kid", "adult"] as const;
export const BUILDS = ["slim", "regular", "broad"] as const;

export interface Figure {
  name: string;
  gender: (typeof GENDERS)[number];
  age: (typeof AGES)[number];
  build: (typeof BUILDS)[number];
  skin: string;
  hair: string;
  hairStyle: (typeof HAIR_STYLES)[number];
  top: string;
  bottom: string;
  outfit: (typeof OUTFITS)[number];
  shoes: string;
  glasses: boolean;
  beard: boolean;
  hat: (typeof HATS)[number];
  hatColor: string;
  accessory: (typeof ACCESSORIES)[number];
  accessoryColor: string;
}

/** Whether a figure wears or carries anything only subscribers can put on the bookcase. */
export const isPremiumFigure = (f: Figure) =>
  (PREMIUM_OUTFITS as readonly string[]).includes(f.outfit) || (PREMIUM_HATS as readonly string[]).includes(f.hat) || f.accessory !== "none";

export const DEFAULT_FIGURE: Figure = {
  name: "", gender: "any", age: "adult", build: "regular", skin: "#f2c7a5", hair: "#4a2f22", hairStyle: "short", top: "#2f6fb8", bottom: "#33415c", outfit: "trousers",
  shoes: "#2b2422", glasses: false, beard: false, hat: "none", hatColor: "#d6364b",
  accessory: "none", accessoryColor: "#c8693f",
};

const HEX = /^#[0-9a-f]{6}$/i;
const colour = (v: unknown, fallback: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : fallback);
const oneOf = <T extends string>(v: unknown, from: readonly T[], fallback: T): T => (from.includes(v as T) ? (v as T) : fallback);

/** A figure as sent by the client (or read off a photo): anything missing or malformed falls back to a default. */
export function parseFigure(v: unknown): Figure {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw new HttpError(400, "A figure must be an object.");
  const f = v as Record<string, unknown>;
  const d = DEFAULT_FIGURE;
  return {
    name: typeof f.name === "string" ? f.name.replace(/\s+/g, " ").trim().slice(0, 24) : "",
    gender: oneOf(f.gender, GENDERS, d.gender),
    age: oneOf(f.age, AGES, d.age),
    build: oneOf(f.build, BUILDS, d.build),
    skin: colour(f.skin, d.skin),
    hair: colour(f.hair, d.hair),
    hairStyle: oneOf(f.hairStyle, HAIR_STYLES, d.hairStyle),
    top: colour(f.top, d.top),
    bottom: colour(f.bottom, d.bottom),
    outfit: oneOf(f.outfit, OUTFITS, d.outfit),
    shoes: colour(f.shoes, d.shoes),
    glasses: f.glasses === true,
    beard: f.beard === true,
    hat: oneOf(f.hat, HATS, d.hat),
    hatColor: colour(f.hatColor, d.hatColor),
    accessory: oneOf(f.accessory, ACCESSORIES, d.accessory),
    accessoryColor: colour(f.accessoryColor, d.accessoryColor),
  };
}

/* ---------- Reading a figure off a photo ---------- */

export type FigureImageType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface FigureReader {
  /** Traits for the most prominent person in the photo, or null when there's no person in it. */
  read(image: Buffer, type: FigureImageType): Promise<Figure | null>;
}

const hex = { type: "string", description: "A colour as #rrggbb" };
const SCHEMA = {
  type: "object",
  properties: {
    person_found: { type: "boolean", description: "False when the photo has no clearly visible person." },
    skin: hex,
    hair: hex,
    hairStyle: { type: "string", enum: [...HAIR_STYLES] },
    top: { ...hex, description: "Main colour of the shirt, jumper, jacket or dress, as #rrggbb" },
    bottom: { ...hex, description: "Main colour of the trousers, shorts or skirt (same as top for a dress), as #rrggbb" },
    outfit: { type: "string", enum: [...BASIC_OUTFITS] },
    shoes: hex,
    glasses: { type: "boolean" },
    beard: { type: "boolean" },
    hat: { type: "string", enum: [...BASIC_HATS] },
    hatColor: hex,
  },
  required: ["person_found", "skin", "hair", "hairStyle", "top", "bottom", "outfit", "shoes", "glasses", "beard", "hat", "hatColor"],
  additionalProperties: false,
};

const SYSTEM = `You help a travel-diary app draw a small toy figurine of a person from their photo.
Look at the most prominent person in the photo and describe only what is visible about how they look, for a simple cartoon:
skin tone, hair colour and the closest hair style, the main colours of what they're wearing, whether they wear glasses, a beard or a hat.
Pick colours as they appear in the photo, slightly brightened so they read well on a small drawing. If a detail can't be seen
(for example their shoes), choose something plausible that goes with the outfit. Use "bald" only for a shaved or bald head;
for a hat that hides the hair, still give the hair colour you can see at the edges. Do not guess anything else about the person.
If there is no clearly visible person, set person_found to false and fill the other fields with neutral defaults.`;

/** Reads figures with Claude. The SDK finds credentials itself (ANTHROPIC_API_KEY, or an `ant auth login` profile). */
export function claudeFigureReader(log: (m: string) => void): FigureReader {
  const client = new Anthropic();
  return {
    async read(image, type) {
      let msg: Anthropic.Beta.BetaMessage;
      try {
        msg = await client.beta.messages.create({
          model: "claude-opus-5-5",
          max_tokens: 2048,
          // A plain description: low effort is plenty, and keeps the wait short.
          output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
          // If the model declines (a false positive on a photo of a person), the API retries on a suitable fallback model.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: SYSTEM,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: type, data: image.toString("base64") } },
              { type: "text", text: "Describe this person for their figurine." },
            ],
          }],
        }, { timeout: 60_000 });
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) throw new HttpError(503, "Lots of figures are being made right now. Try again in a minute.");
        if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
          log(`Figure reader: Claude rejected the server's credentials (${err.status}).`);
          throw new HttpError(503, "Making figures from photos isn't working on this server right now.");
        }
        if (err instanceof Anthropic.BadRequestError) throw new HttpError(422, "That photo couldn't be read. Try a different one.");
        if (err instanceof Anthropic.APIError) {
          log(`Figure reader: Claude API error ${err.status}: ${err.message}`);
          throw new HttpError(502, "The figure couldn't be made just now. Try again.");
        }
        throw err;
      }
      if (msg.stop_reason === "refusal") throw new HttpError(422, "That photo couldn't be used for a figure. Try a different one.");
      const text = msg.content.find((b) => b.type === "text")?.text;
      if (!text) throw new HttpError(502, "The figure couldn't be made just now. Try again.");
      let out: Record<string, unknown>;
      try {
        out = JSON.parse(text) as Record<string, unknown>;
      } catch {
        throw new HttpError(502, "The figure couldn't be made just now. Try again.");
      }
      if (out.person_found !== true) return null;
      // Gender, age and build are left at their defaults for the person to set.
      return parseFigure({ ...out, gender: undefined, age: undefined, build: undefined });
    },
  };
}

/** A figure reader for tests: every photo gives the same figure (or none). */
export function fixedFigureReader(fig: Figure | null): FigureReader {
  return { read: async () => fig };
}
