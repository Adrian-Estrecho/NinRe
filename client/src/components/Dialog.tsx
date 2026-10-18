import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon";

interface Props {
  /**
   * Asked to close by Escape, a backdrop click or the close button; the parent decides.
   * `forced` is true when the browser already closed the dialog, so the parent should unmount it.
   */
  onRequestClose: (forced: boolean) => void;
  label?: string;
  labelledBy?: string;
  closeButton?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLDialogElement>) => void;
  children: ReactNode;
}

/** A modal <dialog> that is open for as long as it is mounted, and hands focus back when it goes. */
export function Dialog({ onRequestClose, label, labelledBy, closeButton, onKeyDown, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const mounted = useRef(false);
  const ask = useRef(onRequestClose);
  ask.current = onRequestClose;

  useEffect(() => {
    const dlg = ref.current!;
    const back = document.activeElement as HTMLElement | null;
    mounted.current = true;
    if (!dlg.open) dlg.showModal();
    return () => {
      mounted.current = false;
      if (dlg.open) dlg.close();
      if (back && document.contains(back)) back.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={label}
      aria-labelledby={labelledBy}
      onKeyDown={onKeyDown}
      onCancel={(e) => {
        e.preventDefault();
        ask.current(false);
      }}
      onClose={() => {
        if (mounted.current) ask.current(true);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) ask.current(false);
      }}
    >
      {closeButton && (
        <button type="button" className="close-x" aria-label="Close" onClick={() => ask.current(false)}>
          <Icon name="close" />
        </button>
      )}
      {children}
    </dialog>
  );
}
