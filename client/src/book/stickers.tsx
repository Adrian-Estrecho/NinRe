import type { ReactNode } from "react";
import type { StickerKind } from "./design";

/*
 * Die-cut vinyl stickers. Each has a silhouette (`cut`), drawn first in white with a wide stroke to make
 * the white border, then the artwork on top. All are drawn in a 100 × 100 box.
 */
const INK = "#14202b";

const ART: Record<StickerKind, { cut: ReactNode; art: ReactNode }> = {
  plane: {
    cut: <path d="M10 48 88 14 66 86 48 62 30 72 34 56Z" />,
    art: (
      <>
        <path d="M10 48 88 14 48 62Z" fill="#9fd0ff" />
        <path d="M88 14 66 86 48 62Z" fill="#2f80ed" />
        <path d="M48 62 34 56 30 72Z" fill="#1d5fbf" />
        <path d="M10 48 88 14 34 56Z" fill="#d6ecff" />
        <path d="M88 14 34 56" stroke="#1d5fbf" strokeWidth="2" fill="none" />
      </>
    ),
  },
  heart: {
    cut: <path d="M50 88C20 66 8 50 8 33 8 19 19 10 31 10c8 0 15 4 19 11 4-7 11-11 19-11 12 0 23 9 23 23 0 17-12 33-42 55Z" />,
    art: (
      <>
        <path d="M50 88C20 66 8 50 8 33 8 19 19 10 31 10c8 0 15 4 19 11 4-7 11-11 19-11 12 0 23 9 23 23 0 17-12 33-42 55Z" fill="#ff5c7c" />
        <path d="M22 26c3-6 9-8 14-6" stroke="#ffd1db" strokeWidth="5" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  sun: {
    cut: <circle cx="50" cy="50" r="44" />,
    art: (
      <>
        <g stroke="#ff9f1c" strokeWidth="7" strokeLinecap="round">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return <line key={i} x1={50 + Math.cos(a) * 30} y1={50 + Math.sin(a) * 30} x2={50 + Math.cos(a) * 41} y2={50 + Math.sin(a) * 41} />;
          })}
        </g>
        <circle cx="50" cy="50" r="24" fill="#ffd23f" />
        <circle cx="42" cy="47" r="2.6" fill={INK} />
        <circle cx="58" cy="47" r="2.6" fill={INK} />
        <path d="M42 56q8 7 16 0" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  palm: {
    cut: <path d="M14 30C26 10 50 12 54 22 64 10 86 14 90 32 76 28 66 30 60 36 70 44 72 56 66 64 60 52 56 48 54 46L58 82H82V92H18V82H44L48 44C42 50 34 56 26 58 26 46 34 38 44 34 36 28 24 28 14 30Z" />,
    art: (
      <>
        <path d="M18 84q32-12 64 0v8H18Z" fill="#ffe08a" />
        <path d="M52 40 46 86h8l2-46Z" fill="#a0673a" />
        <path d="M52 40c-4-14-22-20-38-10 14-1 24 4 28 12Z" fill="#2fb36b" />
        <path d="M52 40c2-14 20-24 38-8-14-3-26 0-32 10Z" fill="#3fcf7f" />
        <path d="M52 40c-6 6-14 14-26 18 4-12 14-18 24-20Z" fill="#24945a" />
        <path d="M54 40c8 4 14 12 12 24-6-10-10-16-14-20Z" fill="#24945a" />
        <circle cx="50" cy="42" r="4" fill="#7a4a24" />
        <circle cx="57" cy="43" r="3.4" fill="#7a4a24" />
      </>
    ),
  },
  wave: {
    cut: <path d="M8 78C10 46 34 22 62 22c18 0 30 12 30 26 0 12-10 18-18 16 8-10 0-22-12-18-14 6-10 26 6 30 10 2 18 0 24-4V88H8Z" />,
    art: (
      <>
        <path d="M8 78C10 46 34 22 62 22c18 0 30 12 30 26 0 12-10 18-18 16 8-10 0-22-12-18-14 6-10 26 6 30 10 2 18 0 24-4V88H8Z" fill="#2f80ed" />
        <path d="M20 72c4-22 22-38 42-40" stroke="#9fd0ff" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M8 82c14-6 28 6 42 0s28 6 42 0v6H8Z" fill="#d6ecff" />
      </>
    ),
  },
  camera: {
    cut: <rect x="8" y="22" width="84" height="62" rx="12" />,
    art: (
      <>
        <rect x="8" y="28" width="84" height="56" rx="10" fill="#b9a7f5" />
        <rect x="30" y="20" width="26" height="12" rx="4" fill="#7c5cff" />
        <rect x="8" y="40" width="84" height="8" fill="#7c5cff" />
        <circle cx="50" cy="58" r="20" fill="#fff" />
        <circle cx="50" cy="58" r="15" fill={INK} />
        <circle cx="44" cy="52" r="4" fill="#9fd0ff" />
        <circle cx="80" cy="34" r="4" fill="#ff5c7c" />
      </>
    ),
  },
  ticket: {
    cut: <path d="M8 26H92V44a8 8 0 0 0 0 16V78H8V60a8 8 0 0 0 0-16Z" />,
    art: (
      <>
        <path d="M8 26H92V44a8 8 0 0 0 0 16V78H8V60a8 8 0 0 0 0-16Z" fill="#ffd23f" />
        <path d="M68 30v44" stroke="#ff9f1c" strokeWidth="2.4" strokeDasharray="4 4" />
        <text x="38" y="50" textAnchor="middle" fontFamily="Archivo Variable, Archivo, sans-serif" fontWeight="800" fontSize="12" fill={INK}>ADMIT</text>
        <text x="38" y="66" textAnchor="middle" fontFamily="Archivo Variable, Archivo, sans-serif" fontWeight="800" fontSize="15" fill={INK}>TWO</text>
        <path d="m80 44 2.6 5.4 6 .8-4.3 4.2 1 5.9-5.3-2.8-5.3 2.8 1-5.9-4.3-4.2 6-.8Z" fill="#ff5c7c" />
      </>
    ),
  },
  mountain: {
    cut: <path d="M6 84 36 30l14 18 12-22 32 58Z" />,
    art: (
      <>
        <path d="M6 84 36 30l30 54Z" fill="#2fb36b" />
        <path d="M40 84 62 26l32 58Z" fill="#1f8a52" />
        <path d="M62 26 54 46l8-6 8 6Z" fill="#fff" />
        <path d="M36 30 28 46l8-5 7 4Z" fill="#fff" />
        <circle cx="20" cy="26" r="9" fill="#ffd23f" />
      </>
    ),
  },
  pin: {
    cut: <path d="M50 94C30 66 18 52 18 36a32 32 0 0 1 64 0c0 16-12 30-32 58Z" />,
    art: (
      <>
        <path d="M50 94C30 66 18 52 18 36a32 32 0 0 1 64 0c0 16-12 30-32 58Z" fill="#ff5c7c" />
        <circle cx="50" cy="36" r="12" fill="#fff" />
        <path d="M30 26c4-8 12-12 20-12" stroke="#ffd1db" strokeWidth="4" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  star: {
    cut: <path d="m50 6 13 28 30 4-22 21 6 30-27-15-27 15 6-30L7 38l30-4Z" />,
    art: (
      <>
        <path d="m50 6 13 28 30 4-22 21 6 30-27-15-27 15 6-30L7 38l30-4Z" fill="#ffd23f" />
        <path d="m50 18 9 20 21 3-15 15 4 21-19-10" fill="#ffb31f" />
        <circle cx="41" cy="46" r="2.6" fill={INK} />
        <circle cx="57" cy="46" r="2.6" fill={INK} />
      </>
    ),
  },
  flower: {
    cut: <circle cx="50" cy="50" r="44" />,
    art: (
      <>
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} cx="50" cy="24" rx="12" ry="20" fill={i % 2 ? "#ff8fab" : "#ffb3c6"} transform={`rotate(${i * 45} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="14" fill="#ffd23f" />
        <circle cx="46" cy="46" r="3" fill="#ff9f1c" />
      </>
    ),
  },
  suitcase: {
    cut: <path d="M12 30H38V18H62V30H88V88H12Z" />,
    art: (
      <>
        <path d="M40 30v-8h20v8" stroke="#7a3f22" strokeWidth="6" fill="none" />
        <rect x="12" y="30" width="76" height="56" rx="8" fill="#e8743b" />
        <rect x="28" y="30" width="7" height="56" fill="#b5532f" />
        <rect x="65" y="30" width="7" height="56" fill="#b5532f" />
        <circle cx="72" cy="48" r="7" fill="#9fd0ff" />
        <rect x="40" y="56" width="18" height="12" rx="2" fill="#ffd23f" />
      </>
    ),
  },
  hello: {
    cut: <rect x="4" y="26" width="92" height="48" rx="12" />,
    art: (
      <>
        <rect x="4" y="26" width="92" height="48" rx="10" fill="#ff5c7c" />
        <rect x="9" y="31" width="82" height="38" rx="7" fill="none" stroke="#ffd1db" strokeWidth="2" strokeDasharray="3 3" />
        <text x="50" y="48" textAnchor="middle" fontFamily="Gochi Hand, cursive" fontSize="17" fill="#fff">hello</text>
        <text x="50" y="63" textAnchor="middle" fontFamily="Archivo Variable, Archivo, sans-serif" fontWeight="800" fontSize="10" letterSpacing="2" fill="#fff">FROM HERE</text>
      </>
    ),
  },
  cloud: {
    cut: <path d="M22 76a18 18 0 0 1-2-36 24 24 0 0 1 44-10 18 18 0 0 1 22 18 15 15 0 0 1-2 28Z" />,
    art: (
      <>
        <path d="M22 76a18 18 0 0 1-2-36 24 24 0 0 1 44-10 18 18 0 0 1 22 18 15 15 0 0 1-2 28Z" fill="#eef6ff" stroke="#9fd0ff" strokeWidth="3" />
        <path d="M30 44a14 14 0 0 1 16-10" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
      </>
    ),
  },
};

/** One sticker, with its white die-cut border. */
export function StickerArt({ kind, title }: { kind: StickerKind; title?: string }) {
  const s = ART[kind];
  return (
    <svg viewBox="-6 -6 112 112" className="sticker-art" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <g fill="#fff" stroke="#fff" strokeWidth="11" strokeLinejoin="round">{s.cut}</g>
      {s.art}
    </svg>
  );
}
