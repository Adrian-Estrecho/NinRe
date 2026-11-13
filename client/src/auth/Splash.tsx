import { useEffect, useState } from "react";
import { holdStatusBar } from "../lib/shell";

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ROUTE = "M14 78 C 62 14, 168 -4, 238 40";

/**
 * The phone app opens on this: the wordmark, a dotted route a paper plane flies along, and today's postmark.
 * It stays until the session has loaded and the animation has played, then fades into the first screen.
 */
export function Splash({ ready, signedIn, onDone }: { ready: boolean; signedIn: boolean; onDone: () => void }) {
  const [played, setPlayed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const still = calm();
  const today = new Date();
  const day = today.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase();

  useEffect(() => holdStatusBar("dark"), []);
  useEffect(() => {
    const t = window.setTimeout(() => setPlayed(true), still ? 500 : 1750);
    return () => window.clearTimeout(t);
  }, [still]);
  useEffect(() => {
    if (!played || !ready) return;
    setLeaving(true);
    const t = window.setTimeout(onDone, still ? 120 : 380);
    return () => window.clearTimeout(t);
  }, [played, ready, onDone, still]);

  return (
    // The mark fades first, then the blue lifts off whatever comes next (the white welcome screen, or the library).
    <div className={`daylight splash${leaving ? " out lift" : ""}${signedIn ? " to-app" : ""}${still ? " still" : ""}`} role="status" aria-label="Opening NinRe">
      <div className="splash-in" aria-hidden="true">
        <svg className="splash-route" viewBox="0 0 252 92">
          <defs>
            <mask id="splash-draw" maskUnits="userSpaceOnUse">
              {/* Drawn with SMIL like the plane, so the two stay together (Chrome doesn't repaint CSS animations inside a mask). */}
              <path d={ROUTE} className="splash-reveal" pathLength={1} strokeDasharray="1" strokeDashoffset={still ? 0 : 1}>
                {!still && <animate attributeName="stroke-dashoffset" from="1" to="0" dur="1.15s" begin="0.2s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines=".45 0 .25 1" />}
              </path>
            </mask>
          </defs>
          <circle cx="14" cy="78" r="4" className="splash-dot" />
          <path d={ROUTE} className="splash-trail" mask="url(#splash-draw)" />
          <g className="splash-plane">
            {!still && <animateMotion dur="1.15s" begin="0.2s" fill="freeze" rotate="auto" path={ROUTE} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines=".45 0 .25 1" />}
            <path d="M-9 -7 L11 0 L-9 7 L-4 0 Z" transform={still ? "translate(238 40) rotate(32)" : undefined} />
          </g>
        </svg>
        <span className="splash-word">NinRe</span>
        <span className="splash-hand">every trip, kept in a book</span>
        <span className="splash-stamp">
          <span>{day}</span>
          <span>{today.getFullYear()}</span>
        </span>
      </div>
    </div>
  );
}
