import { useState, type FormEvent } from "react";
import { api, errorText } from "../api";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { OFTEN, TRIPS, WITH } from "../lib/onboarding";
import { useSession } from "../session";
import type { Profile, TripKind } from "../types";
import type { SectionProps } from "./Settings";

const USERNAME = /^[a-z0-9][a-z0-9._]{2,19}$/;

/** The details other people see, and how the person travels (asked while signing up). */
export function ProfileSection({ account, onChange }: SectionProps) {
  const { refresh } = useSession();
  const toast = useToast();
  const [name, setName] = useState(account.user.name);
  const [username, setUsername] = useState(account.user.username);
  const [bio, setBio] = useState(account.bio);
  const [home, setHome] = useState(account.home);
  const [travel, setTravel] = useState<Profile>(account.travel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handle = username.trim().replace(/^@/, "").toLowerCase();
  const handleOk = USERNAME.test(handle);
  const changed = name.trim() !== account.user.name || handle !== account.user.username || bio.trim() !== account.bio
    || home.trim() !== account.home || JSON.stringify(travel) !== JSON.stringify(account.travel);

  const toggleTrip = (t: TripKind) =>
    setTravel((p) => ({ ...p, trips: p.trips.includes(t) ? p.trips.filter((x) => x !== t) : [...p.trips, t] }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!handleOk) return setError("A username is 3 to 20 letters, numbers, dots or underscores, starting with a letter or number.");
    setBusy(true);
    setError("");
    try {
      const { user } = await api.saveProfile({ name: name.trim(), username: handle, bio: bio.trim(), home: home.trim(), travel });
      onChange({ ...account, user, bio: bio.trim(), home: home.trim(), travel });
      setUsername(user.username);
      await refresh();
      toast("Profile saved.");
    } catch (err) {
      setError(errorText(err, "Couldn't save your profile."));
    }
    setBusy(false);
  }

  return (
    <form className="set-stack" onSubmit={save} noValidate>
      <div className="acct-card">
        <div className="prof-card" aria-label="How friends see you">
          <Avatar name={name || account.user.name} id={account.user.id} size={64} />
          <div>
            <b>{name.trim() || "Your name"}</b>
            <span>@{handle || "username"}{home.trim() ? ` · ${home.trim()}` : ""}</span>
            {bio.trim() && <p>{bio.trim()}</p>}
          </div>
        </div>
        <p className="hint">This is what people see when they search for you or look at your followers. Your email and your books stay private.</p>

        <div className="fld">
          <label htmlFor="pf-name">Name</label>
          <input id="pf-name" type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <span className="hint">Shown on the pages and notes you write.</span>
        </div>
        <div className="fld">
          <label htmlFor="pf-user">Username</label>
          <div className="at-input">
            <span aria-hidden="true">@</span>
            <input id="pf-user" type="text" maxLength={21} value={username} onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-invalid={!handleOk} aria-describedby="pf-user-hint" />
          </div>
          <span className="hint" id="pf-user-hint">Friends find you by this. 3 to 20 letters, numbers, dots or underscores.</span>
        </div>
        <div className="fld">
          <label htmlFor="pf-home">Home base</label>
          <input id="pf-home" type="text" maxLength={60} placeholder="Quezon City" value={home} onChange={(e) => setHome(e.target.value)} />
        </div>
        <div className="fld">
          <label htmlFor="pf-bio">About you</label>
          <textarea id="pf-bio" className="input" rows={3} maxLength={160} placeholder="Chasing waterfalls and good kare-kare." value={bio} onChange={(e) => setBio(e.target.value)} />
          <span className="hint">{160 - bio.length} characters left.</span>
        </div>
      </div>

      <div className="acct-card">
        <h3 className="set-sub">How you travel</h3>
        <p className="hint">From when you signed up. NinRe uses it to suggest the kind of book and look that fit.</p>
        <fieldset className="dgroup">
          <legend>Who you travel with</legend>
          <div className="chips-row">
            {WITH.map((c) => (
              <label key={c.id} className="pill">
                <input type="radio" name="pf-with" checked={travel.travelWith === c.id} onChange={() => setTravel((p) => ({ ...p, travelWith: c.id }))} />
                <span><Icon name={c.icon} />{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="dgroup">
          <legend>Kinds of trip</legend>
          <div className="chips-row">
            {TRIPS.map((c) => (
              <label key={c.id} className="pill">
                <input type="checkbox" checked={travel.trips.includes(c.id)} onChange={() => toggleTrip(c.id)} />
                <span><Icon name={c.icon} />{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="dgroup">
          <legend>How often</legend>
          <div className="chips-row">
            {OFTEN.map((c) => (
              <label key={c.id} className="pill">
                <input type="radio" name="pf-often" checked={travel.often === c.id} onChange={() => setTravel((p) => ({ ...p, often: c.id }))} />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="set-save">
        {error && <p className="err" role="alert">{error}</p>}
        <button type="submit" className="btn sun" disabled={busy || !changed || !name.trim()}>{busy ? "Saving…" : "Save profile"}</button>
      </div>
    </form>
  );
}
