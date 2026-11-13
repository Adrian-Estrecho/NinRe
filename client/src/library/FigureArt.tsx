import type { CSSProperties } from "react";
import type { Figure, FigureAccessory, FigureAge, FigureBuild, FigureGender, FigureHat, HairStyle, Outfit } from "../types";

/** A plain figure to start from when making one by hand. */
export const DEFAULT_FIGURE: Figure = {
  name: "", gender: "any", age: "adult", build: "regular", skin: "#f2c7a5", hair: "#4a2f22", hairStyle: "short", top: "#2f6fb8", bottom: "#33415c", outfit: "trousers",
  shoes: "#2b2422", glasses: false, beard: false, hat: "none", hatColor: "#d6364b",
  accessory: "none", accessoryColor: "#c8693f",
};

export const GENDERS: { id: FigureGender; name: string }[] = [
  { id: "girl", name: "Girl" },
  { id: "boy", name: "Boy" },
  { id: "any", name: "Not set" },
];
export const AGES: { id: FigureAge; name: string }[] = [
  { id: "kid", name: "Kid" },
  { id: "adult", name: "Grown-up" },
];
export const BUILDS: { id: FigureBuild; name: string }[] = [
  { id: "slim", name: "Slim" },
  { id: "regular", name: "Regular" },
  { id: "broad", name: "Broad" },
];

// How wide the body is drawn for each build, and how tall a kid's body is next to a grown-up's.
const BUILD_WIDTH: Record<FigureBuild, number> = { slim: 0.86, regular: 1, broad: 1.17 };
const KID_HEIGHT = 0.76;
// The feet stand here, and the neck meets the head here.
const FEET = 87, NECK = 34;

export const HAIR_STYLES: { id: HairStyle; name: string }[] = [
  { id: "short", name: "Short" },
  { id: "bob", name: "Bob" },
  { id: "long", name: "Long" },
  { id: "curly", name: "Curly" },
  { id: "pigtails", name: "Pigtails" },
  { id: "ponytail", name: "Ponytail" },
  { id: "bun", name: "Bun" },
  { id: "bald", name: "Bald" },
];
/** An option in the editor; `premium` ones are for Plus and Crew. */
export interface Choice<T> { id: T; name: string; premium?: boolean }

export const OUTFITS: Choice<Outfit>[] = [
  { id: "trousers", name: "Trousers" },
  { id: "shorts", name: "Shorts" },
  { id: "skirt", name: "Skirt" },
  { id: "dress", name: "Dress" },
  { id: "suit", name: "Suit", premium: true },
  { id: "overalls", name: "Overalls", premium: true },
  { id: "hoodie", name: "Hoodie", premium: true },
  { id: "raincoat", name: "Raincoat", premium: true },
];
export const HATS: Choice<FigureHat>[] = [
  { id: "none", name: "No hat" },
  { id: "cap", name: "Cap" },
  { id: "beanie", name: "Beanie" },
  { id: "sunhat", name: "Sun hat" },
  { id: "beret", name: "Beret", premium: true },
  { id: "crown", name: "Crown", premium: true },
  { id: "headphones", name: "Headphones", premium: true },
];
export const ACCESSORIES: Choice<FigureAccessory>[] = [
  { id: "none", name: "Nothing" },
  { id: "backpack", name: "Backpack", premium: true },
  { id: "camera", name: "Camera", premium: true },
  { id: "scarf", name: "Scarf", premium: true },
  { id: "sunglasses", name: "Sunglasses", premium: true },
];

/** Whether a figure wears or carries anything only Plus and Crew can put on the bookcase (the server checks too). */
export const isPremiumFigure = (f: Figure) =>
  Boolean(OUTFITS.find((o) => o.id === f.outfit)?.premium || HATS.find((h) => h.id === f.hat)?.premium || (f.accessory && f.accessory !== "none"));

/**
 * How far down a figure's box the top of its head sits, as a share of the box's height: a kid's head rides lower.
 * Name tags hang just above it.
 */
export const headTop = (f: Figure) => (f.age === "kid" ? (FEET - NECK) * (1 - KID_HEIGHT) / 96 : 0);

/** A figure's name, on a little tag above its head; nothing for a figure without one. */
export function NameTag({ fig, className = "fig-name" }: { fig?: Figure; className?: string }) {
  if (!fig?.name) return null;
  return <span className={className} style={{ "--sink": `${(headTop(fig) * 100).toFixed(1)}%` } as CSSProperties} aria-hidden="true">{fig.name}</span>;
}

/** Skin tones offered when making a figure by hand (any colour can still be picked). */
export const SKIN_TONES = ["#fbe0cc", "#f6d2b4", "#f2c7a5", "#e3a983", "#c98e66", "#a86f4c", "#8a5638", "#5f3a26"];

const SHADE = "rgba(0, 0, 0, .14)";
// The dark ink of the face and frames, the same on every figure.
const INK = "#2b2422";

/**
 * A small toy person on a round stand, drawn from a figure's traits, in the same 44 × 96 box as the other things on
 * the bookcase. Each part is a flat shape with a little shade, so any colour reads.
 */
export function FigureArt({ fig }: { fig: Figure }) {
  const { skin, hair, top, bottom, outfit, shoes } = fig;
  // Everything but shorts, a skirt and a dress has trousers under it.
  const longLegs = !(outfit === "shorts" || outfit === "skirt" || outfit === "dress");
  const acc = fig.accessory ?? "none", accent = fig.accessoryColor ?? DEFAULT_FIGURE.accessoryColor;
  // Figures saved before builds and ages existed are regular grown-ups.
  const sx = BUILD_WIDTH[fig.build] ?? 1;
  const sy = fig.age === "kid" ? KID_HEIGHT : 1;
  // The body is stretched or squashed from the feet up, and the head rides down with the neck.
  const body = sx === 1 && sy === 1 ? undefined : `translate(22 ${FEET}) scale(${sx} ${sy}) translate(-22 -${FEET})`;
  const drop = (FEET - NECK) * (1 - sy);
  const head = drop ? `translate(0 ${drop.toFixed(2)})` : undefined;
  return (
    <>
      {/* The stand */}
      <ellipse cx="22" cy="92" rx="16" ry="4" fill="#a98d62" />
      <path d="M6 88h32v4c0 2-7 3.5-16 3.5S6 94 6 92Z" fill="#c9b28a" />
      <ellipse cx="22" cy="88" rx="16" ry="3.5" fill="#dcc8a2" />

      <g transform={head}><HairBack style={fig.hairStyle} hair={hair} /></g>

      <g transform={body}>
      {/* Legs: in trousers, or bare under shorts, a skirt or a dress */}
      {longLegs ? (
        <>
          <rect x="14.5" y="58" width="6.5" height="27" rx="2" fill={bottom} />
          <rect x="23" y="58" width="6.5" height="27" rx="2" fill={bottom} />
          <path d="M22 60v24" stroke={SHADE} strokeWidth="1.5" />
        </>
      ) : (
        <>
          <rect x="15.5" y="62" width="4.5" height="22" rx="2" fill={skin} />
          <rect x="24" y="62" width="4.5" height="22" rx="2" fill={skin} />
          {outfit === "shorts" && <path d="M12 56h20l1 13h-9.5l-1.5-5-1.5 5H11Z" fill={bottom} />}
        </>
      )}
      <path d="M14 83.5h7v3.5h-8.5c0-2 .5-3.5 1.5-3.5ZM23 83.5h7c1 0 1.5 1.5 1.5 3.5H23Z" fill={shoes} />
      {acc === "backpack" && <rect x="8.5" y="40" width="27" height="20" rx="4" fill={accent} />}
      {acc === "backpack" && <rect x="8.5" y="40" width="27" height="20" rx="4" fill={SHADE} />}

      {/* Body */}
      {outfit === "dress" ? (
        <>
          <path d="M16 38h12c2 0 3 1 3.5 3L38 67c.4 1.6-.6 3-2.2 3H8.7c-1.6 0-2.6-1.4-2.2-3L12.5 41c.5-2 1.5-3 3.5-3Z" fill={top} />
          <path d="M8 66h28" stroke="#fff" strokeWidth="1.5" strokeDasharray="2 2.5" opacity=".7" />
        </>
      ) : outfit === "skirt" ? (
        <>
          <path d="M11.5 53h21L38 67c.4 1.6-.6 3-2.2 3H8.2c-1.6 0-2.6-1.4-2.2-3Z" fill={bottom} />
          <path d="M16 38h12c2 0 3 1 3.5 3l1 14h-21l1-14c.5-2 1.5-3 3.5-3Z" fill={top} />
        </>
      ) : outfit === "suit" ? (
        <>
          <path d="M16 38h12c2 0 3 1 3.5 3l.8 19H11.7l.8-19c.5-2 1.5-3 3.5-3Z" fill={top} />
          <path d="M18.5 38.3L22 47l3.5-8.7Z" fill="#fbfaf6" />
          <path d="M21.2 40h1.6l.9 6.5-1.7 2-1.7-2Z" fill="#b3352b" />
          <path d="M17.5 38.5L22 48l-6.5-6ZM26.5 38.5L22 48l6.5-6Z" fill={SHADE} />
          <path d="M22 48v12" stroke={SHADE} strokeWidth=".8" />
          <circle cx="23.3" cy="52" r=".8" fill="rgba(0, 0, 0, .35)" />
          <circle cx="23.3" cy="55.5" r=".8" fill="rgba(0, 0, 0, .35)" />
        </>
      ) : outfit === "raincoat" ? (
        <>
          <path d="M16 38h12c2 0 3 1 3.5 3L36 71c.3 1.4-.6 2.5-2 2.5H10c-1.4 0-2.3-1.1-2-2.5L12.5 41c.5-2 1.5-3 3.5-3Z" fill={top} />
          <path d="M11.4 54h21.2v2.6H11.4Z" fill={SHADE} />
          <path d="M22 39v34.5" stroke={SHADE} strokeWidth=".8" />
          {[44, 49, 61, 67].map((y) => <circle key={y} cx="23.4" cy={y} r=".9" fill="rgba(0, 0, 0, .3)" />)}
          <path d="M16.8 38.5l5.2 4 5.2-4Z" fill={SHADE} />
        </>
      ) : (
        <>
          <path d="M12 55h20v5H12Z" fill={bottom} />
          <path d="M16 38h12c2 0 3 1 3.5 3l.5 16H12l.5-16c.5-2 1.5-3 3.5-3Z" fill={top} />
          <path d="M12 56.5h20" stroke={SHADE} strokeWidth="1.5" />
          {outfit === "overalls" && (
            <>
              <rect x="15.5" y="44" width="13" height="14" rx="1.5" fill={bottom} />
              <path d="M15.8 38.5L17 44.5M28.2 38.5L27 44.5" stroke={bottom} strokeWidth="2.2" />
              <circle cx="17" cy="45.2" r=".9" fill="#e9d48a" />
              <circle cx="27" cy="45.2" r=".9" fill="#e9d48a" />
              <rect x="19" y="47.5" width="6" height="4" rx=".6" fill={SHADE} />
            </>
          )}
          {outfit === "hoodie" && (
            <>
              <path d="M15 50h14l1.5 6.5h-17Z" fill={SHADE} />
              <path d="M20.5 39.5v5M23.5 39.5v5" stroke="#fbfaf6" strokeWidth=".8" strokeLinecap="round" />
            </>
          )}
        </>
      )}
      {/* Sleeves, in the shade of the top */}
      <path d="M12.5 41c.5-2 1.5-3 3.5-3h2l-3 9h-4.5ZM31.5 41c-.5-2-1.5-3-3.5-3h-2l3 9h4.5Z" fill={SHADE} />
      {outfit === "dress" && <path d="M17 38.5l5 4.5 5-4.5" fill="#fffdf6" stroke={SHADE} strokeWidth="1" />}
      {acc === "backpack" && <path d="M15.5 39.5L14 56M28.5 39.5L30 56" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />}
      {/* Long sleeves on a suit, a hoodie and a raincoat; bare arms otherwise */}
      <path d="M12.5 46L7 59" stroke={skin} strokeWidth="4" strokeLinecap="round" />
      <path d="M31.5 46L37 59" stroke={skin} strokeWidth="4" strokeLinecap="round" />
      {(outfit === "suit" || outfit === "hoodie" || outfit === "raincoat") && (
        <path d="M13 42L8 55.5M31 42L36 55.5" stroke={top} strokeWidth="4.4" strokeLinecap="round" />
      )}
      {acc === "camera" && (
        <>
          <path d="M18 38.5L19.5 47M26 38.5L24.5 47" stroke={accent} strokeWidth="1" />
          <rect x="17.5" y="46.5" width="9" height="6" rx="1.2" fill="#2b2f33" />
          <circle cx="22" cy="49.5" r="2" fill="#c9cdd1" />
          <circle cx="22" cy="49.5" r="1.2" fill="#1c1f22" />
          <rect x="18.4" y="47.3" width="2" height="1" fill="#fbfaf6" />
        </>
      )}
      <rect x="19.5" y="34" width="5" height="5" fill={skin} />
      <rect x="19.5" y="34" width="5" height="5" fill={SHADE} />
      {outfit === "hoodie" && <path d="M9.5 38c-2-9 3.5-15 12.5-15s14.5 6 12.5 15c-3 1.5-7.5 2-12.5 2s-9.5-.5-12.5-2Z" fill={top} />}
      {outfit === "hoodie" && <path d="M9.5 38c-2-9 3.5-15 12.5-15s14.5 6 12.5 15c-3 1.5-7.5 2-12.5 2s-9.5-.5-12.5-2Z" fill={SHADE} />}
      {acc === "scarf" && (
        <>
          <rect x="15" y="35.5" width="14" height="4.8" rx="2.2" fill={accent} />
          <path d="M24.5 38.5h3.6l1.1 10.5h-3.6Z" fill={accent} />
          <path d="M25 42.5h3.8M25.3 45.5h3.8" stroke="rgba(255, 255, 255, .55)" strokeWidth="1" />
        </>
      )}
      </g>

      {/* Head and face */}
      <g transform={head}>
      <circle cx="22" cy="23" r="13" fill={skin} />
      {fig.beard && <path d="M9.5 25c.5 8 5.5 13 12.5 13s12-5 12.5-13c-2 3-4.5 4.5-7 4.5h-11c-2.5 0-5-1.5-7-4.5Z" fill={hair} />}
      <HairFront style={fig.hairStyle} hair={hair} />
      <circle cx="17" cy="25.5" r="1.6" fill={INK} />
      <circle cx="27" cy="25.5" r="1.6" fill={INK} />
      {fig.gender === "girl" && <path d="M15.6 24.4l-1.3-1M16.5 23.9l-.6-1.3M28.4 24.4l1.3-1M27.5 23.9l.6-1.3" stroke={INK} strokeWidth=".8" strokeLinecap="round" />}
      {fig.gender === "boy" && <path d="M15 22.4h3.8M25.2 22.4H29" stroke={hair} strokeWidth="1.4" strokeLinecap="round" />}
      {!fig.beard && <circle cx="14.5" cy="29.5" r="2.2" fill="#f0a3a0" opacity=".6" />}
      {!fig.beard && <circle cx="29.5" cy="29.5" r="2.2" fill="#f0a3a0" opacity=".6" />}
      <path d="M19.5 30.5c1.5 1.5 3.5 1.5 5 0" stroke={fig.beard ? skin : "#a8564a"} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {fig.glasses && acc !== "sunglasses" && (
        <g fill="rgba(255, 255, 255, .18)" stroke={INK} strokeWidth="1.1">
          <circle cx="17" cy="25.5" r="3.4" />
          <circle cx="27" cy="25.5" r="3.4" />
          <path d="M20.4 25.2h3.2M13.6 24.8L9.6 23.8M30.4 24.8l4-1" fill="none" />
        </g>
      )}
      {acc === "sunglasses" && (
        <g>
          <rect x="13.2" y="23.2" width="7.4" height="4.8" rx="2" fill="#1f2428" />
          <rect x="23.4" y="23.2" width="7.4" height="4.8" rx="2" fill="#1f2428" />
          <path d="M20.6 24.4h2.8M13.4 24.2L9.6 23.4M30.6 24.2l3.8-.8" stroke={accent} strokeWidth="1" fill="none" />
          <path d="M14.6 24.4l2-.1M24.8 24.4l2-.1" stroke="#fff" strokeWidth=".7" opacity=".6" strokeLinecap="round" />
        </g>
      )}
      <Hat hat={fig.hat} color={fig.hatColor} />
      </g>
    </>
  );
}

/** Hair that falls behind the head and shoulders. */
function HairBack({ style, hair }: { style: HairStyle; hair: string }) {
  switch (style) {
    case "long":
      return <path d="M8.5 21C6.5 32 7 43 9 51h26c2-8 2.5-19 .5-30Z" fill={hair} />;
    case "bob":
      return <path d="M8.5 21C7.5 29 8 34 10 37.5h24c2-3.5 2.5-8.5 1.5-16.5Z" fill={hair} />;
    case "pigtails":
      return (
        <>
          <circle cx="6" cy="27" r="5.5" fill={hair} />
          <circle cx="38" cy="27" r="5.5" fill={hair} />
        </>
      );
    case "ponytail":
      return <path d="M30 12c7 0 11 6 10 14-.5 5-2 9-4.5 11.5.5-6-1.5-12-7-15.5Z" fill={hair} />;
    default:
      return null;
  }
}

/** Hair over the top of the head: a cap with a fringe, curls, or a bun. */
function HairFront({ style, hair }: { style: HairStyle; hair: string }) {
  if (style === "bald") return <ellipse cx="17" cy="15" rx="3.5" ry="1.6" fill="#fff" opacity=".25" transform="rotate(-20 17 15)" />;
  const cap = <path d="M9 24C9 13.5 15 9 22 9s13 4.5 13 15c-2-5-5.5-7.5-9-8-1 2.5-4 4-8.5 4.5C14 21 11 22 9 24Z" fill={hair} />;
  const shine = <ellipse cx="17" cy="15" rx="3.5" ry="1.6" fill="#fff" opacity=".16" transform="rotate(-20 17 15)" />;
  if (style === "curly") {
    return (
      <g fill={hair}>
        {cap}
        {[[10.5, 16, 4], [15.5, 11.5, 4.2], [22, 10, 4.4], [28.5, 11.5, 4.2], [33.5, 16, 4], [9, 21.5, 3.4], [35, 21.5, 3.4]].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    );
  }
  return (
    <>
      {style === "bun" && <circle cx="22" cy="8" r="5.5" fill={hair} />}
      {cap}
      {shine}
    </>
  );
}

function Hat({ hat, color }: { hat: FigureHat; color: string }) {
  switch (hat) {
    case "cap":
      return (
        <>
          <path d="M9 19.5C9 11.5 15 7.5 22 7.5s13 4 13 12Z" fill={color} />
          <path d="M24 17.5h14.5c1.5 0 1.8 2.5 0 2.8L24 21Z" fill={color} />
          <path d="M24 19.2h14.8" stroke={SHADE} strokeWidth="1.6" />
          <circle cx="22" cy="7.8" r="1.4" fill={SHADE} />
        </>
      );
    case "beanie":
      return (
        <>
          <path d="M8.5 21C8.5 11 15 6.5 22 6.5S35.5 11 35.5 21Z" fill={color} />
          <rect x="8" y="17" width="28" height="5" rx="2.2" fill={color} />
          <rect x="8" y="17" width="28" height="5" rx="2.2" fill={SHADE} />
          <circle cx="22" cy="5" r="3" fill="#f3efe6" />
        </>
      );
    case "beret":
      return (
        <>
          <rect x="20.4" y="5.6" width="1.6" height="3" rx=".6" fill={color} />
          <ellipse cx="20.5" cy="12" rx="13.5" ry="5" fill={color} transform="rotate(-8 20.5 12)" />
          <path d="M8 14.6c4 2 21 1.4 26-1.8" stroke={SHADE} strokeWidth="1.6" fill="none" />
        </>
      );
    case "crown":
      return (
        <>
          <path d="M11 17L12.5 7.5l4 5L22 5.5l5.5 7 4-5L33 17Z" fill="#f2c23a" stroke="#c99118" strokeWidth=".6" strokeLinejoin="round" />
          <rect x="11" y="14.3" width="22" height="3" rx=".6" fill="#e3ad25" />
          {[16.5, 22, 27.5].map((x) => <circle key={x} cx={x} cy="15.8" r="1" fill={color} />)}
        </>
      );
    case "headphones":
      return (
        <>
          <path d="M8.5 24C8.5 10.5 14 6.5 22 6.5S35.5 10.5 35.5 24" stroke={color} strokeWidth="2.4" fill="none" />
          <rect x="5.6" y="20.5" width="5.4" height="9" rx="2.2" fill={color} />
          <rect x="33" y="20.5" width="5.4" height="9" rx="2.2" fill={color} />
          <rect x="9" y="21.5" width="2" height="7" rx="1" fill={SHADE} />
          <rect x="33" y="21.5" width="2" height="7" rx="1" fill={SHADE} />
        </>
      );
    case "sunhat":
      return (
        <>
          <ellipse cx="22" cy="17" rx="19" ry="4.5" fill={color} />
          <ellipse cx="22" cy="17" rx="19" ry="4.5" fill={SHADE} />
          <path d="M12 17c0-7 4.5-10.5 10-10.5S32 10 32 17Z" fill={color} />
          <path d="M12.2 14.5h19.6v2.6H12.2Z" fill="rgba(0, 0, 0, .22)" />
        </>
      );
    default:
      return null;
  }
}
