import { useEffect, type RefObject } from "react";

/**
 * Lets a row that scrolls sideways be dragged along with a mouse, as a finger swipes it on a phone, and turns a mouse
 * wheel's up and down into along. A drag doesn't count as a click on whatever it started on. Touch is left to the
 * browser's own scrolling. `shown` is false while the row isn't rendered, so it's picked up once it is.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>, shown = true) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let start: { x: number; left: number; id: number } | null = null;
    let dragged = false;

    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || el.scrollWidth <= el.clientWidth) return;
      start = { x: e.clientX, left: el.scrollLeft, id: e.pointerId };
      dragged = false;
    };
    const move = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      const dx = e.clientX - start.x;
      if (!dragged && Math.abs(dx) < 5) return;
      if (!dragged) {
        dragged = true;
        el.classList.add("dragging");
        el.setPointerCapture(e.pointerId);
      }
      el.scrollLeft = start.left - dx;
    };
    const up = (e: PointerEvent) => {
      if (!start || e.pointerId !== start.id) return;
      start = null;
      el.classList.remove("dragging");
    };
    const click = (e: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      e.preventDefault();
      e.stopPropagation();
    };
    const wheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
      const before = el.scrollLeft;
      el.scrollLeft += e.deltaY;
      // Only keep the page from scrolling while the row itself still had somewhere to go.
      if (el.scrollLeft !== before) e.preventDefault();
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
    };
  }, [ref, shown]);
}
