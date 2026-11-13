import { useEffect, useState, type ReactNode } from "react";
import { api, errorText } from "../api";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { plural } from "../lib/format";
import { useSession } from "../session";
import type { PublicPerson } from "../types";

type Tab = "friends" | "following" | "followers";

/** Finding people, following them back, and the people who'll be offered when adding to a book. */
export function FriendsSection() {
  const { me } = useSession();
  const toast = useToast();
  const [lists, setLists] = useState<{ following: PublicPerson[]; followers: PublicPerson[] } | null>(null);
  const [tab, setTab] = useState<Tab>("friends");
  const [q, setQ] = useState("");
  const [found, setFound] = useState<PublicPerson[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [armed, setArmed] = useState<string | null>(null);

  useEffect(() => {
    api.friends().then(setLists, (err) => setError(errorText(err, "Couldn't load your friends.")));
  }, []);

  // Search as they type, after a short pause.
  useEffect(() => {
    const term = q.trim();
    if (term.replace(/^@/, "").length < 2) {
      setFound(null);
      return;
    }
    setSearching(true);
    const t = window.setTimeout(() => {
      api.searchPeople(term).then((r) => setFound(r.people), (err) => setError(errorText(err, "Couldn't search right now."))).finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(t);
  }, [q]);

  if (!me) return null;

  /** Puts an updated person back wherever they're listed. */
  function update(p: PublicPerson) {
    const swap = (l: PublicPerson[]) => l.map((x) => (x.id === p.id ? p : x));
    setFound((l) => l && swap(l));
    setLists((cur) => {
      if (!cur) return cur;
      const following = p.following ? (cur.following.some((x) => x.id === p.id) ? swap(cur.following) : [...cur.following, p]) : cur.following.filter((x) => x.id !== p.id);
      const followers = p.followsYou ? swap(cur.followers) : cur.followers.filter((x) => x.id !== p.id);
      return { following, followers };
    });
  }

  async function act(p: PublicPerson, what: "follow" | "unfollow" | "remove") {
    if (what !== "follow" && armed !== `${what}:${p.id}`) return setArmed(`${what}:${p.id}`);
    setArmed(null);
    setError("");
    try {
      const next = what === "follow" ? await api.follow(p.id) : what === "unfollow" ? await api.unfollow(p.id) : await api.removeFollower(p.id);
      if (next) update(next);
      else setLists((cur) => cur && { following: cur.following.filter((x) => x.id !== p.id), followers: cur.followers.filter((x) => x.id !== p.id) });
      if (what === "follow") toast(next?.followsYou ? `You and ${p.name} are friends now.` : `Following ${p.name}.`);
      if (what === "remove") toast(`${p.name} no longer follows you.`);
    } catch (err) {
      setError(errorText(err, "Couldn't do that. Try again."));
    }
  }

  async function copyHandle() {
    try {
      await navigator.clipboard.writeText(`@${me!.user.username}`);
      toast("Username copied.");
    } catch {
      toast(`Your username is @${me!.user.username}.`);
    }
  }

  const friends = lists?.following.filter((p) => p.followsYou) ?? [];
  const shown = tab === "friends" ? friends : tab === "following" ? lists?.following ?? [] : lists?.followers ?? [];

  const actions = (p: PublicPerson, inFollowers = false): ReactNode => (
    <>
      {inFollowers && (
        <button type="button" className={`btn small warn${armed === `remove:${p.id}` ? " armed" : ""}`} onClick={() => act(p, "remove")} onBlur={() => setArmed(null)}>
          {armed === `remove:${p.id}` ? "Tap to remove" : "Remove"}
        </button>
      )}
      {p.following ? (
        <button type="button" className={`btn small line${armed === `unfollow:${p.id}` ? " armed-line" : ""}`} onClick={() => act(p, "unfollow")} onBlur={() => setArmed(null)}>
          {armed === `unfollow:${p.id}` ? "Tap to unfollow" : p.followsYou ? "Friends" : "Following"}
        </button>
      ) : (
        <button type="button" className="btn small" onClick={() => act(p, "follow")}><Icon name="user-plus" />{p.followsYou ? "Follow back" : "Follow"}</button>
      )}
    </>
  );

  return (
    <div className="set-stack">
      <div className="acct-card">
        <div className="fld">
          <label htmlFor="fr-q">Find people</label>
          <div className="search-input">
            <Icon name="search" />
            <input id="fr-q" type="search" placeholder="Name or @username" value={q} onChange={(e) => setQ(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </div>
        </div>
        {found && (
          <div aria-live="polite">
            {found.length === 0 ? (
              <p className="hint">{searching ? "Searching…" : `No one called "${q.trim()}". Some people only show up by their exact username.`}</p>
            ) : (
              <PersonList people={found} actions={(p) => actions(p)} />
            )}
          </div>
        )}
        <p className="my-handle">
          <span>Friends find you as <b>@{me.user.username}</b></span>
          <button type="button" className="btn small line" onClick={copyHandle}><Icon name="copy" />Copy</button>
        </p>
      </div>

      <div className="acct-card">
        <div className="fr-tabs" role="tablist" aria-label="Your people">
          {([["friends", "Friends", friends.length], ["following", "Following", lists?.following.length ?? 0], ["followers", "Followers", lists?.followers.length ?? 0]] as const).map(([id, label, n]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}<span>{n}</span></button>
          ))}
        </div>
        {!lists ? (
          <p className="hint">{error ? "" : "Loading…"}</p>
        ) : shown.length === 0 ? (
          <p className="hint">
            {tab === "friends"
              ? "Friends are people you follow who follow you back. Find the people you travel with above, and add them to a book in one tap."
              : tab === "following" ? "You aren't following anyone yet." : "No one follows you yet. Share your username with the people you travel with."}
          </p>
        ) : (
          <PersonList people={shown} actions={(p) => actions(p, tab === "followers")} />
        )}
        {tab === "friends" && friends.length > 0 && (
          <p className="hint">Add friends to a book from its People screen, or while making a new one. {plural(friends.length, "friend")} so far.</p>
        )}
      </div>

      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
}

/** People in a list, each with what can be done about them. */
export function PersonList({ people, actions }: { people: PublicPerson[]; actions: (p: PublicPerson) => ReactNode }) {
  return (
    <ul className="people-list">
      {people.map((p) => (
        <li key={p.id}>
          <Avatar name={p.name} id={p.id} size={40} />
          <span className="who">
            <b>{p.name}{p.following && p.followsYou ? <em className="ptag">Friend</em> : p.followsYou ? <em className="ptag soft">Follows you</em> : null}</b>
            <span>@{p.username}{p.home ? ` · ${p.home}` : ""}</span>
            {p.bio && <span className="bio">{p.bio}</span>}
          </span>
          <span className="row-acts">{actions(p)}</span>
        </li>
      ))}
    </ul>
  );
}
