import { useState, type FormEvent } from "react";
import { api, errorText } from "../api";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { plural } from "../lib/format";
import { isNative } from "../lib/native";
import { navigate } from "../router";
import { useSession } from "../session";
import type { SectionProps } from "./Settings";

/** Email, password, signed-in devices, a copy of your data, and deleting the account. */
export function SecuritySection({ account, onChange }: SectionProps) {
  const { signOut } = useSession();
  const toast = useToast();
  return (
    <div className="set-stack">
      <Email account={account} onChange={onChange} />
      <Password onDone={() => onChange({ ...account, sessions: 1 })} />
      <Devices account={account} onChange={onChange} />
      {!isNative && <YourData />}
      <DeleteAccount onDeleted={async () => { await signOut(); toast("Your account and the books you owned are deleted."); navigate("/"); }} />
    </div>
  );
}

function Email({ account, onChange }: SectionProps) {
  const { refresh } = useSession();
  const toast = useToast();
  const [email, setEmail] = useState(account.user.email);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const wanted = email.trim().toLowerCase();
  // Entering the waiting address again sends its link again.
  const changed = wanted !== account.user.email;
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // The old address keeps working until the link sent to the new one is opened.
      const r = await api.changeEmail(email.trim(), password);
      onChange({ ...account, user: r.user, pendingEmail: r.pendingEmail });
      setEmail(r.user.email);
      setPassword("");
      await refresh();
      if (!r.pendingEmail) toast("That's already your email.");
      else if (r.emailSent) toast(`Check ${r.pendingEmail} for the confirmation link. Until you open it, log in with ${r.user.email}.`);
      else setError(`Couldn't send the confirmation to ${r.pendingEmail} just now. Try again in a moment.`);
    } catch (err) {
      setError(errorText(err, "Couldn't change the email."));
    }
    setBusy(false);
  }
  return (
    <form className="acct-card" onSubmit={save} aria-labelledby="em-h">
      <h3 id="em-h" className="set-sub">Email</h3>
      <div className="fld">
        <label htmlFor="em-new">Email you log in with</label>
        <input id="em-new" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <span className="hint">Only you see it. Friends find you by your username.</span>
      </div>
      {account.pendingEmail && (
        <p className="notice pending-mail" role="status">
          <b>Waiting</b>
          <span>for you to open the link sent to {account.pendingEmail}. Until then you log in with {account.user.email}. To send it again, enter the new address again.</span>
        </p>
      )}
      {changed && (
        <div className="fld">
          <label htmlFor="em-pw">Your password, to confirm</label>
          <input id="em-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      <div><button type="submit" className="btn line" disabled={busy || !changed || !password}>{busy ? "Saving…" : "Change email"}</button></div>
    </form>
  );
}

function Password({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setError("Use at least 8 characters for the new password.");
    setBusy(true);
    setError("");
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      onDone();
      toast("Password changed. Other devices have been logged out.");
    } catch (err) {
      setError(errorText(err, "Couldn't change the password."));
    }
    setBusy(false);
  }
  return (
    <form className="acct-card" onSubmit={save} aria-labelledby="pw-h">
      <h3 id="pw-h" className="set-sub">Password</h3>
      <div className="fld">
        <label htmlFor="pw-cur">Current password</label>
        <input id="pw-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="fld">
        <label htmlFor="pw-new">New password</label>
        <input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        <span className="hint">At least 8 characters. Changing it logs out your other devices.</span>
      </div>
      {error && <p className="err" role="alert">{error}</p>}
      <div><button type="submit" className="btn line" disabled={busy || !current || !next}>{busy ? "Changing…" : "Change password"}</button></div>
    </form>
  );
}

function Devices({ account, onChange }: SectionProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const others = Math.max(0, account.sessions - 1);
  async function signOutOthers() {
    setBusy(true);
    try {
      const { sessions } = await api.signOutOthers();
      onChange({ ...account, sessions });
      toast("Your other devices are logged out.");
    } catch (err) {
      toast(errorText(err, "Couldn't log the other devices out."));
    }
    setBusy(false);
  }
  return (
    <section className="acct-card" aria-labelledby="dv-h">
      <h3 id="dv-h" className="set-sub">Devices</h3>
      <p className="app-sub">
        {others ? `You're logged in here and on ${plural(others, "other phone or browser", "other phones and browsers")}.` : "You're only logged in here."}
      </p>
      <div><button type="button" className="btn line" onClick={signOutOthers} disabled={busy || !others}>{busy ? "Logging out…" : "Log out everywhere else"}</button></div>
    </section>
  );
}

function YourData() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const data = await api.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `ninre-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast(errorText(err, "Couldn't make the download. Try again."));
    }
    setBusy(false);
  }
  return (
    <section className="acct-card" aria-labelledby="dt-h">
      <h3 id="dt-h" className="set-sub">Your data</h3>
      <p className="app-sub">Download your account, friends, payments and every book you're in, with its pages and notes, as one file. Photos are listed by address.</p>
      <div><button type="button" className="btn line" onClick={download} disabled={busy}><Icon name="download" />{busy ? "Getting it ready…" : "Download my data"}</button></div>
    </section>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const { me } = useSession();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (!me) return null;
  const owned = me.books.filter((b) => b.role === "owner");
  async function remove(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.deleteAccount(password);
      onDeleted();
    } catch (err) {
      setBusy(false);
      setError(errorText(err, "Couldn't delete the account."));
    }
  }
  return (
    <section className="acct-card danger" aria-labelledby="del-h">
      <h3 id="del-h" className="set-sub">Delete account</h3>
      {!open ? (
        <>
          <p className="app-sub">
            {owned.length
              ? `This deletes your account and the ${plural(owned.length, "book")} you own, with every page and photo in them, for everyone in them.`
              : "This deletes your account. Pages you wrote in other people's books stay in those books."}
          </p>
          <div><button type="button" className="btn warn" onClick={() => setOpen(true)}>Delete my account…</button></div>
        </>
      ) : (
        <form onSubmit={remove} className="del-form">
          <div className="fld">
            <label htmlFor="del-pw">Type your password to confirm</label>
            <input id="del-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          {error && <p className="err" role="alert">{error}</p>}
          <div className="panel-foot">
            <button type="button" className="btn line" onClick={() => setOpen(false)} disabled={busy}>Keep my account</button>
            <button type="submit" className="btn warn armed" disabled={busy || !password}>{busy ? "Deleting…" : "Delete for good"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
