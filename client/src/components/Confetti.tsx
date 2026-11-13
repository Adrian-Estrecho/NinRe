import { useMemo, type CSSProperties } from "react";

const COLORS = ["#ffd23f", "#ff6b8b", "#4cc9f0", "#7bd389", "#a78bfa", "#ff9f43"];

/** A one-shot burst of paper confetti from the middle of the screen. Purely decorative. */
export function Confetti({ pieces = 90 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const reach = 120 + Math.random() * 260;
        return {
          key: i,
          style: {
            "--dx": `${Math.cos(angle) * reach}px`,
            "--dy": `${Math.sin(angle) * reach * 0.8 - 140}px`,
            "--fall": `${260 + Math.random() * 320}px`,
            "--spin": `${(Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 720)}deg`,
            "--delay": `${Math.random() * 120}ms`,
            "--time": `${1300 + Math.random() * 700}ms`,
            background: COLORS[i % COLORS.length],
            width: `${6 + Math.random() * 6}px`,
            height: `${8 + Math.random() * 8}px`,
            borderRadius: i % 3 === 0 ? "50%" : "2px",
          } as CSSProperties,
        };
      }),
    [pieces],
  );

  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b) => <i key={b.key} style={b.style} />)}
    </div>
  );
}
