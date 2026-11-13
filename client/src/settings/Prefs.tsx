import { useRef, useState } from "react";
import { api, errorText } from "../api";
import type { NotifyKind, Settings } from "../types";
import type { SectionProps } from "./Settings";

/** Saves settings as they change, and says whether the last change is saved. */
function useSaver({ account, onChange }: SectionProps) {
  const [state, setState] = useState<"" | "saving" | "saved" | "error">("");
  const [error, setError] = useState("");
  const seq = useRef(0);
  async function save(next: Settings) {
    const prev = account.settings;
    onChange({ ...account, settings: next });
    const n = ++seq.current;
    setState("saving");
    try {
      const saved = await api.saveSettings(next);
      if (n !== seq.current) return;
      onChange({ ...account, settings: saved });
      setState("saved");
    } catch (err) {
      if (n !== seq.current) return;
      onChange({ ...account, settings: prev });
      setError(errorText(err, "Couldn't save that. Try again."));
      setState("error");
    }
  }
  const status = (
    <p className={`save-state ${state}`} role="status">
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? error : "Changes save as you make them."}
    </p>
  );
  return { settings: account.settings, save, status };
}

function Switch({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="switch-row" htmlFor={id}>
      <span className="sw-text"><b>{label}</b><span>{hint}</span></span>
      <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="tgl" aria-hidden="true" />
    </label>
  );
}

const NOTIFY: { id: NotifyKind; label: string; hint: string }[] = [
  { id: "pages", label: "New pages", hint: "Someone adds a page to a book you're in." },
  { id: "notes", label: "Notes on your pages", hint: "Someone leaves a note on a page you wrote." },
  { id: "joins", label: "People joining", hint: "Someone joins a book you own." },
  { id: "books", label: "Added to a book", hint: "A friend puts you in one of their books." },
  { id: "follows", label: "New followers", hint: "Someone starts following you." },
];

export function NotifySection(props: SectionProps) {
  const { settings, save, status } = useSaver(props);
  return (
    <div className="set-stack">
      <div className="acct-card">
        <div className="switch-list">
          {NOTIFY.map((n) => (
            <Switch key={n.id} id={`nt-${n.id}`} label={n.label} hint={n.hint} checked={settings.notify[n.id]}
              onChange={(v) => save({ ...settings, notify: { ...settings.notify, [n.id]: v } })} />
          ))}
        </div>
        {status}
      </div>
      <p className="hint set-note">
        Requests to join a book always come through, because they wait on your answer. Notifications show under the bell in NinRe; nothing is sent by email.
      </p>
    </div>
  );
}

export function PrivacySection(props: SectionProps) {
  const { settings, save, status } = useSaver(props);
  return (
    <div className="set-stack">
      <div className="acct-card">
        <div className="switch-list">
          <Switch id="pv-find" label="Show me in search" checked={settings.discoverable} onChange={(v) => save({ ...settings, discoverable: v })}
            hint={settings.discoverable ? "People can find you by your name or username." : `Only someone who types your exact username, @${props.account.user.username}, can find you.`} />
        </div>
      </div>
      <fieldset className="acct-card choice-list">
        <legend className="set-sub">When a friend adds you to a book</legend>
        <label className={`choice${settings.addToBooks === "friends" ? " on" : ""}`}>
          <input type="radio" name="pv-add" checked={settings.addToBooks === "friends"} onChange={() => save({ ...settings, addToBooks: "friends" })} />
          <span><b>Put me straight in</b><span>Friends (people you follow who follow you back) can add you, and you're told. You can leave any book.</span></span>
        </label>
        <label className={`choice${settings.addToBooks === "ask" ? " on" : ""}`}>
          <input type="radio" name="pv-add" checked={settings.addToBooks === "ask"} onChange={() => save({ ...settings, addToBooks: "ask" })} />
          <span><b>Ask me first</b><span>You get a request under the bell, and join only if you accept.</span></span>
        </label>
        {status}
      </fieldset>
      <p className="hint set-note">Your books are always private to the people in them. Following someone never shows you their books.</p>
    </div>
  );
}
