import { useId, type CSSProperties, type ReactNode } from "react";

/* Hand-drawn marks scattered over the sky and the paper, in the sticker colours. */
type P = { className?: string; style?: CSSProperties };
const svg = (p: P, viewBox: string, body: ReactNode) => (
  <svg viewBox={viewBox} className={`doodle ${p.className ?? ""}`} style={p.style} aria-hidden="true" focusable="false">{body}</svg>
);

export const Spiral = (p: P) => svg(p, "0 0 80 60",
  <path d="M8 30c4-14 22-20 30-10s-2 22-10 16 2-20 16-22 22 4 22 16-12 18-18 12" fill="none" stroke="var(--sun)" strokeWidth="6" strokeLinecap="round" />);

export const Leaves = (p: P) => svg(p, "0 0 120 110",
  <g fill="none" stroke="var(--lime)" strokeWidth="5" strokeLinejoin="round">
    <path d="M10 46C30 16 70 10 96 30 76 52 40 60 10 46Z" />
    <path d="M30 96C42 66 76 52 104 64 92 90 60 104 30 96Z" />
  </g>);

export const Scallops = (p: P) => svg(p, "0 0 80 70",
  <g fill="none" stroke="var(--azure)" strokeWidth="4.5" strokeLinecap="round">
    <path d="M4 10q5 8 10 0t10 0 10 0" />
    <path d="M18 28q5 8 10 0t10 0 10 0 10 0" />
    <path d="M32 46q5 8 10 0t10 0 10 0" />
    <path d="M46 62q5 6 10 0t10 0" />
  </g>);

export const Zigzag = (p: P) => svg(p, "0 0 70 40",
  <path d="M4 30 18 10l12 18 12-20 12 18 12-14" fill="none" stroke="var(--coral)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />);

export const Squiggle = (p: P) => svg(p, "0 0 90 20",
  <path d="M3 12c6-8 10 6 16-2s10 6 16-2 10 6 16-2 10 6 16-2 10 6 16-2" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />);

export const Confetti = (p: P) => svg(p, "0 0 120 90",
  <>
    <rect x="6" y="16" width="16" height="16" rx="2" fill="var(--mint)" transform="rotate(-14 14 24)" />
    <path d="M96 10l10 14-14 6Z" fill="var(--coral)" />
    <rect x="70" y="62" width="14" height="14" fill="var(--azure)" transform="rotate(45 77 69)" />
  </>);

/* ---------- Objects that hold the paper ---------- */

const METALS = {
  steel: ["#5d6770", "#f2f5f7", "#a3adb6"],
  azure: ["#2a64b8", "#e3f0ff", "#6fa9f0"],
  coral: ["#b8344f", "#ffe6ec", "#f2879f"],
  mint: ["#23864f", "#e2f8ec", "#62cf95"],
  lilac: ["#5b3fc4", "#efeaff", "#a790f4"],
} as const;
export type Metal = keyof typeof METALS;

const CLIP = "M8.5 25V10.5a5.5 5.5 0 0 1 11 0V51a8.5 8.5 0 0 1-17 0V18.5";

/** A coated-wire paper clip, lit from the top left, with its shadow on the paper. */
export function Paperclip({ metal = "steel", className, style }: P & { metal?: Metal }) {
  const id = "pc" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [dark, light, mid] = METALS[metal];
  return (
    <svg viewBox="0 0 26 66" className={`clip ${className ?? ""}`} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2=".2">
          <stop offset="0" stopColor={dark} />
          <stop offset=".32" stopColor={light} />
          <stop offset=".55" stopColor={mid} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <path d={CLIP} fill="none" stroke="rgba(20, 32, 43, .22)" strokeWidth="3.4" strokeLinecap="round" transform="translate(1.4 1.8)" />
      <path d={CLIP} fill="none" stroke={`url(#${id})`} strokeWidth="2.9" strokeLinecap="round" />
      <path d={CLIP} fill="none" stroke="rgba(255, 255, 255, .75)" strokeWidth=".8" strokeLinecap="round" transform="translate(-.55 -.45)" />
    </svg>
  );
}

const TAPES = { butter: "#f4e39c", blush: "#f6c2cf", sky: "#b9d9fb", mint: "#bce9cc", lilac: "#d6cafb" } as const;
export type TapeTone = keyof typeof TAPES;

/** A strip of washi tape with torn ends: translucent, faintly striped, catching a little light. */
export function Tape({ tone = "butter", className, style }: P & { tone?: TapeTone }) {
  const id = "tp" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 120 34" preserveAspectRatio="none" className={`tape-strip ${className ?? ""}`} style={style} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".45" />
          <stop offset=".45" stopColor="#fff" stopOpacity=".08" />
          <stop offset="1" stopColor="#000" stopOpacity=".06" />
        </linearGradient>
        <pattern id={`${id}p`} width="9" height="34" patternUnits="userSpaceOnUse" patternTransform="skewX(-28)">
          <rect width="3" height="34" fill="#fff" fillOpacity=".16" />
        </pattern>
        <clipPath id={`${id}c`}>
          <path d="M4 0H116L120 4 115.5 9 120 14 115.5 19 120 24 115.5 29 119 34H4L0 30 4.5 25 0 20 4.5 15 0 10 4.5 5Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}c)`}>
        <rect width="120" height="34" fill={TAPES[tone]} fillOpacity=".86" />
        <rect width="120" height="34" fill={`url(#${id}p)`} />
        <rect width="120" height="34" fill={`url(#${id}s)`} />
      </g>
    </svg>
  );
}

/** A dog-eared corner: the paper's corner folded over, showing its tinted back. Sits on the card's bottom-right corner. */
export function FoldedCorner({ tone, className }: { tone: string; className?: string }) {
  const id = "fc" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 40 40" className={`fold-corner ${className ?? ""}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tone} />
          <stop offset=".7" stopColor={tone} />
          <stop offset="1" stopColor="#fff" stopOpacity=".55" />
        </linearGradient>
      </defs>
      <path d="M0 40 40 0V40Z" fill="var(--bg)" />
      <path d="M0 40 40 0 3 3Z" fill="rgba(20, 32, 43, .14)" transform="translate(-2 -2)" />
      <path d="M0 40 40 0C26 4 10 8 2.5 2.5 7.5 10 4 26 0 40Z" fill={`url(#${id})`} />
    </svg>
  );
}

export const PushPin = (p: P) => svg(p, "0 0 24 24",
  <>
    <circle cx="12" cy="9" r="6" fill="#ff3b5c" />
    <circle cx="10" cy="7" r="2" fill="#ff9aac" />
    <path d="M12 15v7" stroke="#6d757c" strokeWidth="2" strokeLinecap="round" />
  </>);
