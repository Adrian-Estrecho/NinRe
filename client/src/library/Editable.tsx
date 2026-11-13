import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

interface Props {
  value: string;
  onCommit: (value: string) => void;
  /** What the field is, for screen readers: "Title", "Story". */
  label: string;
  placeholder?: string;
  multiline?: boolean;
  type?: "text" | "date";
  maxLength?: number;
  /** The element the text is set in, so it keeps the page's own typography. */
  as?: "h2" | "div" | "span" | "strong" | "figcaption";
  className?: string;
  /** How the value reads when not being edited, e.g. a formatted date. */
  shown?: ReactNode;
  /** Open straight into editing, e.g. the title of a page just added. */
  autoEdit?: boolean;
  /** An empty value isn't allowed; leaving it empty puts the old one back. */
  required?: boolean;
  /** Just the text, as printed: the book is being read, not written in. */
  readOnly?: boolean;
  /** What a read-only field says when it's empty; by default, nothing. */
  empty?: ReactNode;
}

/**
 * Text on the page that becomes editable where it stands: click it (or press Enter on it) and it turns into a field
 * in the same type, saved when you click away or press Enter; Escape puts it back.
 */
export function Editable({ value, onCommit, label, placeholder = "", multiline, type = "text", maxLength, as: Tag = "span", className = "", shown, autoEdit, required, readOnly, empty = null }: Props) {
  const [editing, setEditing] = useState(Boolean(autoEdit));
  const [text, setText] = useState(value);
  const field = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!editing) setText(value);
  }, [value, editing]);

  // A story grows with what's written in it.
  useLayoutEffect(() => {
    const el = field.current;
    if (!editing || !multiline || !el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, multiline, text]);

  useEffect(() => {
    if (!editing) return;
    done.current = false;
    const el = field.current;
    el?.focus();
    if (el && type === "text") el.setSelectionRange(el.value.length, el.value.length);
  }, [editing, type]);

  function finish(keep: boolean) {
    if (done.current) return;
    done.current = true;
    setEditing(false);
    // Read the field itself: a blur can arrive before the last keystroke has rendered.
    const typed = field.current?.value ?? text;
    const next = multiline ? typed.replace(/\s+$/, "") : typed.trim();
    if (!keep || next === value || (required && !next)) return setText(value);
    onCommit(next);
  }

  // Leaving the writing mode mid-sentence keeps what was typed.
  useEffect(() => {
    if (readOnly && editing) finish(true);
  }, [readOnly]);

  if (readOnly) return <Tag className={className}>{value ? (shown ?? value) : empty}</Tag>;

  if (editing) {
    const common = {
      ref: field,
      className: `ed-field ${className}`,
      "aria-label": label,
      value: text,
      maxLength,
      placeholder,
      onBlur: () => finish(true),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); }
        if (e.key === "Enter" && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); finish(true); }
        // Arrow keys move the caret here, not the book's pages.
        e.stopPropagation();
      },
    };
    return (
      <Tag className={`ed editing ${className}`}>
        {multiline
          ? <textarea {...common} rows={3} onChange={(e) => setText(e.target.value)} />
          : <input {...common} type={type} onChange={(e) => setText(e.target.value)} />}
      </Tag>
    );
  }

  return (
    <Tag className={`ed ${className}${value ? "" : " empty"}`}>
      <span
        role="button"
        tabIndex={0}
        className="ed-text"
        aria-label={`${label}: ${value || "empty"}. Edit`}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); }
        }}
      >
        {value ? (shown ?? value) : <span className="ed-ph">{placeholder}</span>}
      </span>
    </Tag>
  );
}
