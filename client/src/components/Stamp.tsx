import { useId } from "react";
import { MONTHS, deriveCode, jitter, parseDate } from "../lib/format";
import type { Page } from "../types";

/** A red postmark: place name around the top, year around the bottom, date and stamp code in the middle. */
export function Stamp({ page }: { page: Page }) {
  const id = "pm" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const d = parseDate(page.date);
  const day = d.getDate(), mon = MONTHS[d.getMonth()].slice(0, 3).toUpperCase(), year = d.getFullYear();
  const name = page.place.name.toUpperCase().slice(0, 22);
  const code = page.place.code || deriveCode(page.place.name);
  const long = name.length > 13;
  const tilt = jitter(page.id, "stamp", -13, 9);

  return (
    <span className="stamp" style={{ transform: `rotate(${tilt.toFixed(1)}deg)` }}>
      <svg viewBox="0 0 200 120" role="img" aria-label={`Postmark: ${page.place.name}, ${day} ${mon} ${year}`}>
        <defs>
          <path id={`${id}t`} d="M16 60a44 44 0 1 1 88 0" />
          <path id={`${id}b`} d="M8 60a52 52 0 0 0 104 0" />
        </defs>
        <g filter="url(#tb-ink)">
          <g fill="none" stroke="currentColor">
            <circle cx="60" cy="60" r="57" strokeWidth="3" />
            <circle cx="60" cy="60" r="39" strokeWidth="1.5" />
            <path strokeWidth="2.6" d="M112 34q11.5-7 23 0t23 0 23 0 23 0M112 50q11.5-7 23 0t23 0 23 0 23 0M112 66q11.5-7 23 0t23 0 23 0 23 0M112 82q11.5-7 23 0t23 0 23 0 23 0" />
          </g>
          <g fill="currentColor" fontFamily="DM Mono, ui-monospace, monospace">
            <text fontSize={long ? Math.max(7, (11 * 13) / name.length).toFixed(1) : 11} letterSpacing={long ? 1 : 2.2}>
              <textPath href={`#${id}t`} startOffset="50%" textAnchor="middle">{name}</textPath>
            </text>
            <text fontSize="10" letterSpacing="3">
              <textPath href={`#${id}b`} startOffset="50%" textAnchor="middle">★ {year} ★</textPath>
            </text>
            <text x="60" y="58" fontSize="16" fontWeight="500" textAnchor="middle">{day} {mon}</text>
            <text x="60" y="80" fontSize="17" fontWeight="700" letterSpacing="3" textAnchor="middle" fontFamily="Bodoni Moda, Didot, serif">{code}</text>
          </g>
        </g>
      </svg>
    </span>
  );
}
