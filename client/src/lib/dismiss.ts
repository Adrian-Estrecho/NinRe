import { useEffect, type RefObject } from "react";

/** Closes a popover when someone clicks outside it or presses Escape. */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", away);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", away);
    };
  }, [ref, open, close]);
}
