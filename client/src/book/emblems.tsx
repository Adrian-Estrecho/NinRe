import { useId, type ReactNode } from "react";
import type { Emblem } from "./design";

/* Line drawings stamped in the cover's foil. Drawn in a 48 × 48 box. */
const PATHS: Record<Exclude<Emblem, "none">, ReactNode> = {
  compass: (
    <>
      <circle cx="24" cy="24" r="20" />
      <circle cx="24" cy="24" r="15" strokeDasharray="1.5 2.5" />
      <path d="M24 6 28 24 24 42 20 24Z" />
      <path d="M6 24 24 20 42 24 24 28Z" />
      <circle cx="24" cy="24" r="1.6" />
    </>
  ),
  plane: <path d="M6 22 42 8 32 40 24 30 16 34 18 26Zm12 4 24-18M24 30l-6 4" />,
  heart: <path d="M24 41C11 32 6 25 6 17c0-6 5-10 10-10 4 0 7 2 8 5 1-3 4-5 8-5 5 0 10 4 10 10 0 8-5 15-18 24Z" />,
  mountain: (
    <>
      <path d="M3 40 17 16l8 12 6-9 14 21Z" />
      <path d="m13 23 4-7 4 6M28 23l3-4 3 4" />
      <circle cx="37" cy="10" r="4" />
    </>
  ),
  wave: <path d="M4 34c4-14 14-22 26-22 8 0 14 5 14 12 0 5-4 8-8 7 3-4 0-9-5-8-6 2-5 11 2 13 5 1 9 0 11-2M4 40c5-3 10 3 15 0s10 3 15 0 10 3 10 0" />,
  palm: <path d="M24 42 25 18M25 18c-2-6-10-9-17-5 6 0 10 2 12 6M25 18c1-6 9-11 17-4-6-1-12 0-14 4M25 18c-3 3-7 7-12 8 2-5 6-8 11-8M25 18c4 2 7 6 6 11-3-5-5-8-6-9M12 42h24" />,
  camera: (
    <>
      <rect x="5" y="14" width="38" height="26" rx="4" />
      <path d="M16 14l3-5h10l3 5" />
      <circle cx="24" cy="27" r="8" />
      <circle cx="24" cy="27" r="4" />
    </>
  ),
  star: <path d="m24 5 5.6 12.2 13.4 1.6-9.9 9.1 2.7 13.2L24 34.5l-11.8 6.6 2.7-13.2-9.9-9.1 13.4-1.6Z" />,
  sun: (
    <>
      <circle cx="24" cy="24" r="9" />
      <path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.2 4.2M33.9 33.9l4.2 4.2M9.9 38.1l4.2-4.2M33.9 14.1l4.2-4.2" />
    </>
  ),
};

/** A cover emblem in foil. Inherits the foil colours from the surrounding book. */
export function EmblemArt({ emblem, className }: { emblem: Emblem; className?: string }) {
  const id = "fg" + useId().replace(/[^a-zA-Z0-9]/g, "");
  if (emblem === "none") return null;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: "var(--foil-lo)" }} />
          <stop offset=".35" style={{ stopColor: "var(--foil-hi)" }} />
          <stop offset=".6" style={{ stopColor: "var(--foil)" }} />
          <stop offset="1" style={{ stopColor: "var(--foil-lo)" }} />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${id})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {PATHS[emblem]}
      </g>
    </svg>
  );
}
