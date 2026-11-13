import type { ReactNode } from "react";
import type { DecorKind, Figure } from "../types";
import { DEFAULT_FIGURE, FigureArt } from "./FigureArt";

/** Natural size in px at full scale; each drawing stands on the bottom edge of its box. */
export const DECOR_SIZE: Record<DecorKind, [number, number]> = {
  plant: [74, 104],
  globe: [66, 96],
  camera: [72, 52],
  lamp: [70, 108],
  postcards: [78, 40],
  jar: [52, 74],
  suitcase: [88, 62],
  girl: [44, 96],
  figure: [44, 96],
};

const ART: Record<Exclude<DecorKind, "figure">, ReactNode> = {
  plant: (
    <>
      <path d="M37 62C30 46 14 44 6 30c14 0 26 6 31 20" fill="#3f7d4e" />
      <path d="M37 60c4-18 16-26 30-30-2 16-14 26-28 32" fill="#4f9460" />
      <path d="M36 58C34 38 38 18 46 4c6 18 2 38-8 54" fill="#5aa36b" />
      <path d="M36 60c-6-14-20-22-30-22 6 12 16 20 30 24" fill="#36704a" />
      <path d="M37 64c2-14-2-30-14-42 0 16 4 30 12 42" fill="#468a58" />
      <path d="M37 50V68" stroke="#2f5e3d" strokeWidth="2" />
      <path d="M14 66h46l-6 38H20Z" fill="#c8693f" />
      <path d="M12 62h50v8H12Z" fill="#d97c50" />
      <path d="M20 104h34l-1-5H21Z" fill="#a45230" />
      <path d="M22 76c10 3 22 3 30 0" stroke="#e79a72" strokeWidth="1.5" fill="none" opacity=".7" />
    </>
  ),
  globe: (
    <>
      <path d="M33 72v14" stroke="#7a5a2e" strokeWidth="4" />
      <path d="M16 96c0-8 8-12 17-12s17 4 17 12Z" fill="#8b6a37" />
      <path d="M8 38a26 26 0 0 0 46 17" stroke="#b9934f" strokeWidth="3" fill="none" />
      <circle cx="33" cy="36" r="24" fill="#5d9cc4" />
      <path d="M22 18c6 2 10 0 14 4s-2 8 2 12 10 0 12 6-6 10-12 8-6 6-10 4-2-10-8-12-10-4-10-10 6-10 12-12Z" fill="#88b37a" />
      <path d="M40 48c4-2 8 0 8 4s-4 6-8 4Z" fill="#88b37a" />
      <ellipse cx="25" cy="27" rx="8" ry="5" fill="#fff" opacity=".22" />
      <circle cx="33" cy="36" r="24" fill="none" stroke="#3b6f92" strokeWidth="1.5" />
    </>
  ),
  camera: (
    <>
      <rect x="4" y="12" width="64" height="38" rx="5" fill="#2b2f33" />
      <rect x="4" y="22" width="64" height="18" fill="#6d5640" />
      <path d="M22 12l4-8h20l4 8Z" fill="#3a3f44" />
      <rect x="52" y="6" width="10" height="6" rx="1" fill="#3a3f44" />
      <circle cx="36" cy="31" r="15" fill="#c9cdd1" />
      <circle cx="36" cy="31" r="11" fill="#1c1f22" />
      <circle cx="36" cy="31" r="6" fill="#33485a" />
      <circle cx="33" cy="28" r="2" fill="#fff" opacity=".5" />
      <rect x="9" y="15" width="9" height="5" rx="1" fill="#e9e3d4" />
    </>
  ),
  lamp: (
    <>
      <ellipse cx="35" cy="104" rx="20" ry="4" fill="#3c3f43" />
      <path d="M20 104h30v-4H20Z" fill="#4a4e53" />
      <path d="M35 100V58l18-22" stroke="#4a4e53" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="35" cy="58" r="4" fill="#5b6066" />
      <path d="M38 22l28 18-10 14-28-18Z" fill="#2f6b5a" />
      <path d="M38 22l28 18" stroke="#3f8a74" strokeWidth="3" />
      <path d="M33 40l20 12" stroke="#ffe7a3" strokeWidth="5" strokeLinecap="round" opacity=".9" />
    </>
  ),
  postcards: (
    <>
      <rect x="6" y="22" width="66" height="16" rx="1.5" fill="#efe6d3" transform="rotate(-2 39 30)" />
      <rect x="4" y="14" width="68" height="12" rx="1.5" fill="#f8f3e8" transform="rotate(3 38 20)" />
      <rect x="8" y="6" width="64" height="12" rx="1.5" fill="#fffdf8" transform="rotate(-4 40 12)" />
      <path d="M10 10l60-4" stroke="#cf3a3a" strokeWidth="1.5" strokeDasharray="5 4" transform="rotate(-4 40 12)" />
      <rect x="58" y="6" width="9" height="9" fill="#2257b8" transform="rotate(-4 40 12)" />
      <rect x="6" y="36" width="68" height="4" rx="1" fill="#d9ccb2" />
    </>
  ),
  jar: (
    <>
      <rect x="12" y="4" width="28" height="9" rx="2" fill="#b07a3a" />
      <path d="M10 14h32c4 0 6 3 6 7v44c0 5-3 9-8 9H12c-5 0-8-4-8-9V21c0-4 2-7 6-7Z" fill="#dfeef0" opacity=".55" />
      <rect x="11" y="40" width="22" height="9" fill="#ffe066" transform="rotate(-14 22 44)" />
      <rect x="18" y="50" width="22" height="9" fill="#ffd8de" transform="rotate(10 29 54)" />
      <rect x="9" y="58" width="22" height="9" fill="#e2f2e5" transform="rotate(-6 20 62)" />
      <rect x="22" y="31" width="20" height="8" fill="#cfe1ff" transform="rotate(18 32 35)" />
      <path d="M10 14h32c4 0 6 3 6 7v44c0 5-3 9-8 9H12c-5 0-8-4-8-9V21c0-4 2-7 6-7Z" fill="none" stroke="#9fb9bd" strokeWidth="1.5" />
      <path d="M11 22v38" stroke="#fff" strokeWidth="3" opacity=".6" strokeLinecap="round" />
    </>
  ),
  suitcase: (
    <>
      <path d="M32 14V7c0-2 1-3 3-3h18c2 0 3 1 3 3v7" stroke="#5a3a22" strokeWidth="4" fill="none" />
      <rect x="4" y="14" width="80" height="46" rx="5" fill="#a8683a" />
      <rect x="4" y="14" width="80" height="46" rx="5" fill="none" stroke="#7d4a27" strokeWidth="2" />
      <path d="M22 14v46M66 14v46" stroke="#6b3f21" strokeWidth="5" />
      <rect x="18" y="32" width="8" height="8" rx="1" fill="#d6b56d" />
      <rect x="62" y="32" width="8" height="8" rx="1" fill="#d6b56d" />
      <rect x="36" y="24" width="16" height="11" rx="1" fill="#f3ead6" transform="rotate(-8 44 30)" />
      <circle cx="46" cy="47" r="7" fill="#e7d9b8" opacity=".85" />
    </>
  ),
  // A little toy girl on a round stand: pigtails with red bows, a yellow dress and red shoes.
  girl: (
    <>
      <ellipse cx="22" cy="92" rx="16" ry="4" fill="#a98d62" />
      <path d="M6 88h32v4c0 2-7 3.5-16 3.5S6 94 6 92Z" fill="#c9b28a" />
      <ellipse cx="22" cy="88" rx="16" ry="3.5" fill="#dcc8a2" />
      <rect x="15.5" y="64" width="4.5" height="20" rx="2" fill="#f2c7a5" />
      <rect x="24" y="64" width="4.5" height="20" rx="2" fill="#f2c7a5" />
      <path d="M14 83.5h7v3.5h-8.5c0-2 .5-3.5 1.5-3.5ZM23 83.5h7c1 0 1.5 1.5 1.5 3.5H23Z" fill="#cf3f52" />
      <path d="M16 38h12c2 0 3 1 3.5 3L38 67c.4 1.6-.6 3-2.2 3H8.7c-1.6 0-2.6-1.4-2.2-3L12.5 41c.5-2 1.5-3 3.5-3Z" fill="#f2b632" />
      <path d="M12.5 41c.5-2 1.5-3 3.5-3h2l-3 9h-4.5ZM31.5 41c-.5-2-1.5-3-3.5-3h-2l3 9h4.5Z" fill="#e5a321" />
      <path d="M8 66h28" stroke="#fff" strokeWidth="1.5" strokeDasharray="2 2.5" opacity=".75" />
      <path d="M12.5 46L7 59" stroke="#f2c7a5" strokeWidth="4" strokeLinecap="round" />
      <path d="M31.5 46L37 59" stroke="#f2c7a5" strokeWidth="4" strokeLinecap="round" />
      <path d="M17 38.5l5 4.5 5-4.5" fill="#fffdf6" stroke="#e5a321" strokeWidth="1" />
      <rect x="19.5" y="34" width="5" height="5" fill="#e9b996" />
      <circle cx="6" cy="27" r="5.5" fill="#4a2f22" />
      <circle cx="38" cy="27" r="5.5" fill="#4a2f22" />
      <circle cx="22" cy="23" r="13" fill="#f6d2b4" />
      <path d="M9 24C9 13.5 15 9 22 9s13 4.5 13 15c-2-5-5.5-7.5-9-8-1 2.5-4 4-8.5 4.5C14 21 11 22 9 24Z" fill="#4a2f22" />
      <path d="M6 21.5l-4.5-3v6ZM6 21.5l4.5-3v6ZM38 21.5l-4.5-3v6ZM38 21.5l4.5-3v6Z" fill="#d6364b" />
      <circle cx="6" cy="21.5" r="1.4" fill="#a82838" />
      <circle cx="38" cy="21.5" r="1.4" fill="#a82838" />
      <circle cx="17" cy="25.5" r="1.6" fill="#2b2422" />
      <circle cx="27" cy="25.5" r="1.6" fill="#2b2422" />
      <circle cx="14.5" cy="29.5" r="2.2" fill="#f0a3a0" opacity=".7" />
      <circle cx="29.5" cy="29.5" r="2.2" fill="#f0a3a0" opacity=".7" />
      <path d="M19.5 30.5c1.5 1.5 3.5 1.5 5 0" stroke="#a8564a" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <ellipse cx="17" cy="16" rx="3.5" ry="1.6" fill="#fff" opacity=".18" transform="rotate(-20 17 16)" />
    </>
  ),
};

/** A thing on the bookcase. A `figure` is drawn from its traits; the rest are fixed drawings. */
export function DecorArt({ kind, fig }: { kind: DecorKind; fig?: Figure }) {
  const [w, h] = DECOR_SIZE[kind];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      {kind === "figure" ? <FigureArt fig={fig ?? DEFAULT_FIGURE} /> : ART[kind]}
    </svg>
  );
}
