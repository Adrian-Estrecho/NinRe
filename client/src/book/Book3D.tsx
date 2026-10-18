import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { CoverFace } from "./CoverFace";
import { bookStyle, type Design } from "./design";

interface Props {
  design: Design;
  title: string;
  subtitle?: string;
  photoUrl?: string | null;
  /** CSS width of the book, e.g. "min(320px, 70vw)". */
  width?: string;
  /** "front" turns the book to face you square on, for placing stickers. */
  pose?: "angled" | "front";
  /** Drag (or arrow keys) to turn the book. */
  turnable?: boolean;
  hideStickers?: boolean;
  label?: string;
  className?: string;
  /** Drawn over the front cover, e.g. a sticker editor. */
  overlay?: ReactNode;
}

const REST = { x: -8, y: 26 };
const FRONT = { x: 0, y: 0 };
const calm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A clothbound book in 3D: front, back, spine and page edges. It settles back to its pose after being turned. */
export function Book3D({ design, title, subtitle, photoUrl, width = "min(300px, 64vw)", pose = "angled", turnable = true, hideStickers, label, className = "", overlay }: Props) {
  const home = pose === "front" ? FRONT : REST;
  const [rot, setRot] = useState(home);
  const [held, setHeld] = useState(false);
  const drag = useRef<{ x: number; y: number; rx: number; ry: number; id: number } | null>(null);
  const settle = useRef(0);

  useEffect(() => {
    setRot(home);
  }, [home.x, home.y]);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const goHome = (ms: number) => {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => setRot(home), ms);
  };

  function down(e: PointerEvent<HTMLDivElement>) {
    if (!turnable || pose === "front" || e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    window.clearTimeout(settle.current);
    setHeld(true);
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setRot({ x: Math.max(-28, Math.min(28, d.rx - (e.clientY - d.y) * 0.35)), y: d.ry + (e.clientX - d.x) * 0.5 });
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.id !== e.pointerId) return;
    drag.current = null;
    setHeld(false);
    // Snap the turn to the nearest whole revolution so it settles the short way round.
    setRot((r) => ({ x: r.x, y: r.y - Math.round((r.y - home.y) / 360) * 360 }));
    goHome(calm() ? 0 : 1400);
  }
  function keys(e: KeyboardEvent<HTMLDivElement>) {
    if (!turnable || pose === "front") return;
    const step: Record<string, [number, number]> = { ArrowLeft: [0, -20], ArrowRight: [0, 20], ArrowUp: [8, 0], ArrowDown: [-8, 0] };
    const s = step[e.key];
    if (!s) return;
    e.preventDefault();
    setRot((r) => ({ x: Math.max(-28, Math.min(28, r.x + s[0])), y: r.y + s[1] }));
    goHome(2400);
  }

  const { style, data } = bookStyle(design);
  const sheen = Math.max(-60, Math.min(60, (rot.y - home.y) * 0.9 + (rot.x - home.x) * 0.8));
  const vars = { ...style, "--bw": width, "--rx": `${rot.x}deg`, "--ry": `${rot.y}deg`, "--sheen": `${sheen.toFixed(1)}%` } as CSSProperties;
  const interactive = turnable && pose !== "front";

  return (
    <div
      className={`b3d ${held ? "held" : ""} ${interactive ? "turnable" : ""} ${className}`}
      style={vars}
      {...data}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={keys}
      tabIndex={interactive ? 0 : undefined}
      role="img"
      aria-label={label ?? `The cover of ${title}${interactive ? ". Drag or use the arrow keys to turn the book." : ""}`}
    >
      <div className="b3d-book">
        <div className="b3d-face b3d-front">
          <CoverFace design={design} title={title} subtitle={subtitle} photoUrl={photoUrl} hideStickers={hideStickers}>
            {overlay}
          </CoverFace>
        </div>
        <div className="b3d-face b3d-back" />
        <div className="b3d-face b3d-spine">
          <span>{title}</span>
        </div>
        <div className="b3d-face b3d-edge b3d-edge-r" />
        <div className="b3d-face b3d-edge b3d-edge-t" />
        <div className="b3d-face b3d-edge b3d-edge-b" />
      </div>
      <div className="b3d-shadow" aria-hidden="true" />
    </div>
  );
}
