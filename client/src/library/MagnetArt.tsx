import { useId } from "react";
import type { Country } from "../lib/countries";

/*
 * A souvenir fridge magnet for a country: its flag inside a die-cut shape with a white sticker edge, a gloss across the
 * top and a ribbon with the country's name. The flags are flag-icons' square ones (MIT), each its own file, fetched
 * only when a magnet shows it.
 */
const FLAG_FILES = import.meta.glob("../../../node_modules/flag-icons/flags/1x1/*.svg", { eager: true, query: "?no-inline", import: "default" }) as Record<string, string>;
const FLAGS = new Map(Object.entries(FLAG_FILES).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -4), url]));
export const flagUrl = (id: string) => FLAGS.get(id);

type Shape = "round" | "scallop" | "oval" | "rect";

// The shapes, in a 120 × 120 box; each with the box its flag fills.
const SHAPES: Record<Shape, { d: string; box: [number, number, number, number] }> = {
  round: { d: "M12,60a48,48 0 1,0 96,0a48,48 0 1,0 -96,0Z", box: [12, 12, 96, 96] },
  oval: { d: "M8,60a52,40 0 1,0 104,0a52,40 0 1,0 -104,0Z", box: [8, 20, 104, 80] },
  rect: { d: "M17,24H103a9,9 0 0 1 9,9V85a9,9 0 0 1 -9,9H17a9,9 0 0 1 -9,-9V33a9,9 0 0 1 9,-9Z", box: [8, 24, 104, 70] },
  scallop: { d: scallop(16, 45, 60, 60), box: [11, 11, 98, 98] },
};

/** A stamp-like badge: `n` bumps round a circle of radius `r`. */
function scallop(n: number, r: number, cx: number, cy: number) {
  const at = (i: number) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)].map((v) => v.toFixed(2)).join(",");
  };
  const bump = (r * Math.sin(Math.PI / n) + 0.6).toFixed(2);
  let d = `M${at(0)}`;
  for (let i = 1; i <= n; i++) d += `A${bump},${bump} 0 0 1 ${at(i)}`;
  return `${d}Z`;
}

// Flags with something at the hoist read best in a wide shape; the rest take a shape from their code.
const WIDE = new Set(["us", "gb", "my", "gr", "au", "nz", "tw", "ae", "qa", "np", "lk", "uy", "lr", "tg", "cl", "cu", "fj", "tv"]);
const AUTO: Shape[] = ["round", "scallop", "oval", "round"];
const shapeOf = (id: string): Shape => (WIDE.has(id) ? "rect" : AUTO[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % AUTO.length]);

interface Props {
  country: Country;
  /** Goes on the ribbon instead of the country's name. */
  text?: string;
  /** Small, in a holder on the board: a round badge with no ribbon. */
  compact?: boolean;
  className?: string;
}

/** The magnet itself, as an SVG to be sized by whatever holds it. */
export function MagnetArt({ country, text, compact, className }: Props) {
  const uid = useId().replace(/[^\w-]/g, "");
  const shape = SHAPES[compact ? "round" : shapeOf(country.id)];
  const [bx, by, bw, bh] = shape.box;
  const url = flagUrl(country.id);
  const label = (text?.trim() || country.label).toUpperCase();
  // The ribbon crosses the lower part of the magnet and runs a little past its sides.
  const ry = by + bh - 26, rh = 19;
  // Longer words are set smaller, then squeezed only as much as they still need to fit the ribbon.
  const size = label.length > 13 ? 9.5 : label.length > 10 ? 10.8 : 12.5;
  const fit = label.length * size * 0.72 > 96 ? { textLength: 96, lengthAdjust: "spacingAndGlyphs" as const } : {};

  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`c${uid}`}><path d={shape.d} /></clipPath>
        <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".62" />
          <stop offset=".42" stopColor="#fff" stopOpacity=".1" />
          <stop offset=".43" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".12" />
        </linearGradient>
      </defs>
      {/* The sticker's white edge, round the shape and the ribbon both */}
      <g fill="#fff" stroke="#fff" strokeLinejoin="round">
        <path d={shape.d} strokeWidth={compact ? 12 : 9} />
        {!compact && <rect x="3" y={ry} width="114" height={rh} rx="3" strokeWidth="7" />}
      </g>
      <g clipPath={`url(#c${uid})`}>
        <rect x={bx} y={by} width={bw} height={bh} fill="#d9dde1" />
        {url && <image href={url} x={bx} y={by} width={bw} height={bh} preserveAspectRatio="xMidYMid slice" />}
        <rect x={bx} y={by} width={bw} height={bh} fill={`url(#g${uid})`} />
      </g>
      <path d={shape.d} fill="none" stroke="rgba(0,0,0,.14)" strokeWidth="1" />
      {!compact && (
        <>
          {/* The ribbon, its ends folded behind */}
          <path d={`M3,${ry + 4}l-2,${rh / 2 - 4}l2,${rh / 2}Z M117,${ry + 4}l2,${rh / 2 - 4}l-2,${rh / 2}Z`} fill="#b9ab8c" />
          <rect x="6" y={ry} width="108" height={rh} rx="2.5" fill="#fdf8ec" stroke="rgba(29,42,85,.18)" strokeWidth=".8" />
          <text className="magnet-label" x="60" y={ry + 9.5 + size * 0.33} textAnchor="middle" style={{ fontSize: size }} {...fit}>{label}</text>
        </>
      )}
    </svg>
  );
}
