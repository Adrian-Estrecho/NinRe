import { useId, type CSSProperties, type ReactNode } from "react";
import { Stamp } from "../components/Stamp";
import type { Page } from "../types";

/* The paper a trip leaves on the table: envelopes, stamps, tickets, tags and snapshots. */

type Vars = CSSProperties & Record<`--${string}`, string | number>;

const TAPES = { butter: "#f4e39c", blush: "#f6c2cf", sky: "#b9d9fb", mint: "#bce9cc", lilac: "#d6cafb" } as const;
export type TapeTone = keyof typeof TAPES;

/** A strip of washi tape with torn ends: translucent, faintly striped, catching a little light. */
export function Tape({ tone = "butter", className = "", style }: { tone?: TapeTone; className?: string; style?: CSSProperties }) {
  const id = "tp" + useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 120 34" preserveAspectRatio="none" className={`tape-strip ${className}`} style={style} aria-hidden="true" focusable="false">
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

/** A perforated postage stamp: a little island, the sun, and AIR MAIL along the foot. */
export function PostageStamp({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <span className={`postage ${className}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 60 74" focusable="false">
        <rect width="60" height="74" fill="#fff8e6" />
        <rect x="4" y="4" width="52" height="54" fill="#8fc3ef" />
        <circle cx="40" cy="20" r="8" fill="#ffd23f" />
        <path d="M4 44q6-4 13 0t13 0 13 0 13 0V58H4Z" fill="#2257b8" />
        <path d="M14 46q8-9 18-1 6-4 10 0Z" fill="#3b8a55" />
        <path d="M26 44c0-8-1-14-4-19" fill="none" stroke="#6b4a2a" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M22 25c-6-2-10 0-12 3 5-2 8-1 12-3Zm0 0c4-5 9-5 12-3-5 0-8 1-12 3Zm0 0c-2-5-6-7-10-6 4 1 7 3 10 6Zm0 0c3 0 7 2 9 6-4-3-6-4-9-6Z" fill="#3b8a55" />
        <text x="30" y="68" textAnchor="middle" fontSize="6.4" fontWeight="800" letterSpacing="1.2" fill="#14202b" fontFamily="Archivo Variable, Archivo, sans-serif">AIR MAIL</text>
      </svg>
    </span>
  );
}

/** An airmail envelope with its chevron border, a stamp and a postmark. What's written on it goes inside. */
export function Envelope({ className = "", postmark, children, style }: { className?: string; postmark?: Page; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className={`envelope ${className}`} style={style}>
      <div className="envelope-in">
        <span className="par-avion" aria-hidden="true"><b>Par avion</b><span>By air mail</span></span>
        <PostageStamp className="envelope-stamp" />
        {postmark && <span className="envelope-pm" aria-hidden="true"><Stamp page={postmark} /></span>}
        {children}
      </div>
    </div>
  );
}

/** A boarding pass stub, torn off at the perforation. */
export function BoardingStub({ from, to, date, seats, className = "", style }: { from: string; to: string; date: string; seats: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={`stub ${className}`} style={style} aria-hidden="true">
      <div className="stub-band">Boarding pass</div>
      <div className="stub-route">
        <b>{from}</b>
        <svg viewBox="0 0 24 24" focusable="false"><path d="M2.5 13.2 21 7.5c1-.3 1.6.9.8 1.5L9.4 16.6l-1.2 4.1-2-.6.6-3.4-4.6-1.8c-.9-.3-.8-1.5.3-1.7Z" fill="currentColor" /></svg>
        <b>{to}</b>
      </div>
      <dl className="stub-facts">
        <div><dt>Date</dt><dd>{date}</dd></div>
        <div><dt>Seats</dt><dd>{seats}</dd></div>
      </dl>
      <span className="barcode" />
    </div>
  );
}

/** A manila luggage tag on a loop of string, filled in by hand. */
export function LuggageTag({ lines, className = "", style }: { lines: [string, string][]; className?: string; style?: CSSProperties }) {
  return (
    <div className={`tag ${className}`} style={style} aria-hidden="true">
      <svg className="tag-string" viewBox="0 0 120 70" focusable="false">
        <path d="M8 40c20-30 52-34 78-20 14 8 22 18 30 22" fill="none" stroke="#f3efe4" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8 40c22-18 50-18 72-6" fill="none" stroke="#e6dfcf" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="tag-hole" />
      {lines.map(([k, v]) => (
        <p key={k} className="tag-line"><span>{k}</span><b>{v}</b></p>
      ))}
    </div>
  );
}

/** One snapshot taped to the table. */
export function Snapshot({ src, caption, className = "", style }: { src: string; caption: string; className?: string; style?: Vars }) {
  return (
    <figure className={`snap ${className}`} style={style} aria-hidden="true">
      <span className="snap-tape" />
      <img src={src} alt="" loading="lazy" decoding="async" draggable={false} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

export type Ink = "blue" | "red" | "green" | "plum";
type Shape = "round" | "rect" | "oval" | "octagon";

/** Where the straight lines of text sit inside each frame, and how wide each may run. */
const LINES: Record<Exclude<Shape, "round">, { top: [number, number]; foot: [number, number] }> = {
  rect: { top: [50, 168], foot: [126, 168] },
  octagon: { top: [56, 148], foot: [124, 108] },
  oval: { top: [54, 140], foot: [119, 100] },
};

/** Squeezes a line of capitals to fit its frame, the way a stamp-maker would set it tighter. */
function fit(text: string, size: number, spacing: number, max: number) {
  const est = text.length * (size * 0.72 + spacing);
  return est > max ? { textLength: max, lengthAdjust: "spacingAndGlyphs" as const } : {};
}

/** A rubber stamp pressed onto a passport page, in rough ink. */
export function InkStamp({ shape, ink, big, top, foot }: { shape: Shape; ink: Ink; big: string; top: string; foot: string }) {
  const id = "is" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const round = shape === "round";
  return (
    <svg viewBox="0 0 220 160" className={`inkstamp ink-${ink}`} role="img" aria-label={`${big} ${top}`} focusable="false">
      <defs>
        <path id={`${id}t`} d="M44 80a66 66 0 0 1 132 0" />
        <path id={`${id}b`} d="M34 80a76 76 0 0 0 152 0" />
      </defs>
      <g filter="url(#tb-ink)" fill="none" stroke="currentColor">
        {shape === "round" && <><circle cx="110" cy="80" r="76" strokeWidth="5" /><circle cx="110" cy="80" r="54" strokeWidth="2" /></>}
        {shape === "rect" && <><rect x="10" y="14" width="200" height="132" rx="8" strokeWidth="5" /><rect x="20" y="24" width="180" height="112" rx="3" strokeWidth="1.6" /></>}
        {shape === "oval" && <><ellipse cx="110" cy="80" rx="102" ry="68" strokeWidth="5" /><ellipse cx="110" cy="80" rx="88" ry="55" strokeWidth="1.6" strokeDasharray="5 4" /></>}
        {shape === "octagon" && <><path d="M58 10h104l50 50v40l-50 50H58L8 100V60Z" strokeWidth="5" strokeLinejoin="round" /><path d="M63 22h94l42 42v32l-42 42H63L21 96V64Z" strokeWidth="1.6" strokeLinejoin="round" /></>}
        <g fill="currentColor" stroke="none" className="inkstamp-text">
          {round ? (
            <>
              <text fontSize="13" letterSpacing="2.4"><textPath href={`#${id}t`} startOffset="50%" textAnchor="middle">{top.toUpperCase()}</textPath></text>
              <text fontSize="11" letterSpacing="3"><textPath href={`#${id}b`} startOffset="50%" textAnchor="middle">{foot.toUpperCase()}</textPath></text>
              <text x="110" y="98" fontSize="52" className="inkstamp-big" textAnchor="middle">{big}</text>
            </>
          ) : (
            <>
              <text x="110" y={LINES[shape].top[0]} fontSize="13" letterSpacing="2.4" textAnchor="middle" {...fit(top, 13, 2.4, LINES[shape].top[1])}>{top.toUpperCase()}</text>
              <text x="110" y="104" fontSize="54" className="inkstamp-big" textAnchor="middle">{big}</text>
              <text x="110" y={LINES[shape].foot[0]} fontSize="11" letterSpacing="3" textAnchor="middle" {...fit(foot, 11, 3, LINES[shape].foot[1])}>{foot.toUpperCase()}</text>
            </>
          )}
        </g>
      </g>
    </svg>
  );
}
