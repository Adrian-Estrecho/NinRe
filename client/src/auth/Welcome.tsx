import { useEffect } from "react";
import { Book3D } from "../book/Book3D";
import { DEFAULT_DESIGN } from "../book/design";
import { BoardingStub, LuggageTag, PostageStamp, Tape } from "../marketing/Ephemera";
import { readPending } from "../lib/pending";
import { holdStatusBar } from "../lib/shell";
import { Link, useLocation, useTitle } from "../router";

/** Airports on the faint route map behind the book: where it is drawn on a 400 × 420 sheet. */
const PORTS: [string, number, number][] = [["MNL", 62, 300], ["BSO", 96, 58], ["TPE", 318, 40], ["CEB", 336, 352]];
const LEGS = ["M62 300 C 40 210, 50 120, 96 58", "M96 58 C 170 10, 250 6, 318 40", "M62 300 C 160 380, 260 400, 336 352"];

/**
 * The first screen for someone who isn't signed in: their book lying on a white table among what a trip leaves
 * behind (a boarding pass, a luggage tag, a stamp), over a faint route map. Then start, or log in.
 */
export function Welcome() {
  useTitle("Welcome");
  const { query } = useLocation();
  const pending = readPending();
  const carry = new URLSearchParams([...query.entries()].filter(([k]) => ["invite", "plan", "next"].includes(k))).toString();
  const q = carry ? `?${carry}` : "";
  useEffect(() => holdStatusBar("light"), []);

  return (
    <div className="daylight welcome">
      <div className="welcome-in">
        <header className="welcome-top">
          <span className="welcome-word">NinRe</span>
        </header>

        <div className="welcome-desk" aria-hidden="true">
          <svg className="welcome-map" viewBox="0 0 400 420" preserveAspectRatio="xMidYMid meet">
            {LEGS.map((d, n) => <path key={d} d={d} className="welcome-leg" style={{ animationDelay: `${0.5 + n * 0.25}s` }} />)}
            {PORTS.map(([code, x, y]) => (
              <g key={code} className="welcome-port">
                <circle cx={x} cy={y} r="3.4" />
                <text x={x + 8} y={y + 3.5}>{code}</text>
              </g>
            ))}
          </svg>
          <BoardingStub className="welcome-stub" from="MNL" to="BSO" date="14 FEB" seats="12A 12B" />
          <LuggageTag className="welcome-tag" lines={[["To", "Batanes"], ["With", "my favourite"]]} />
          <span className="welcome-postage">
            <Tape tone="sky" className="welcome-tape" />
            <PostageStamp />
          </span>
          <p className="welcome-note">where to next?</p>
          <div className="welcome-book">
            <Book3D design={pending?.design ?? DEFAULT_DESIGN} title={pending?.title || "Our Book of Travels"} width="min(178px, 44vw, 26svh)" turnable={false} />
          </div>
        </div>

        <div className="welcome-copy">
          <h1>Every trip, kept in a book</h1>
          <p>Write the day, add the photos, and fill it together with the people you travel with.</p>
        </div>
        <div className="welcome-actions">
          <Link href={`/signup${q}`} className="btn sun">Start my book</Link>
          <Link href={`/login${q}`} className="btn line">I already have an account</Link>
          <p className="welcome-fine">Free for one book and two people. No card needed.</p>
        </div>
      </div>
    </div>
  );
}
