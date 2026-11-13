import type { PointerEvent as ReactPointerEvent } from "react";

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Follows a pointer across `box`, reporting the position as percentages of it, starting from `from`.
 * `onEnd` hears whether the pointer really moved, so a tap can still mean "open".
 */
export function dragWithin(
  e: ReactPointerEvent<HTMLElement>,
  box: HTMLElement,
  from: { x: number; y: number },
  onMove: (x: number, y: number) => void,
  onEnd: (moved: boolean) => void,
) {
  if (e.button !== 0) return;
  const target = e.currentTarget;
  const rect = box.getBoundingClientRect();
  const sx = e.clientX, sy = e.clientY, id = e.pointerId;
  let moved = false;
  target.setPointerCapture(id);

  const move = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
    moved = true;
    onMove(from.x + ((ev.clientX - sx) / rect.width) * 100, from.y + ((ev.clientY - sy) / rect.height) * 100);
  };
  const up = (ev: PointerEvent) => {
    if (ev.pointerId !== id) return;
    target.removeEventListener("pointermove", move);
    target.removeEventListener("pointerup", up);
    target.removeEventListener("pointercancel", up);
    onEnd(moved);
  };
  target.addEventListener("pointermove", move);
  target.addEventListener("pointerup", up);
  target.addEventListener("pointercancel", up);
}

/** Arrow keys nudge by `step` percent; returns the new position, or null for any other key. */
export function nudge(key: string, at: { x: number; y: number }, step = 2): { x: number; y: number } | null {
  if (key === "ArrowLeft") return { x: at.x - step, y: at.y };
  if (key === "ArrowRight") return { x: at.x + step, y: at.y };
  if (key === "ArrowUp") return { x: at.x, y: at.y - step };
  if (key === "ArrowDown") return { x: at.x, y: at.y + step };
  return null;
}
