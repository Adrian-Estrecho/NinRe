import { useEffect, useState, type ReactNode } from "react";
import { api, errorText } from "../api";
import { Avatar } from "../components/Avatar";
import { Icon, type IconName } from "../components/Icon";
import { useToast } from "../components/Toast";
import { fmtStamp } from "../lib/format";
import { isApp } from "../lib/native";
import { setUnread } from "../lib/unread";
import { Link, navigate, useTitle } from "../router";
import { useSession } from "../session";
import type { AppNotification } from "../types";

const ICON: Record<AppNotification["kind"], IconName> = {
  follow: "user-plus", book_add: "book", book_invite: "book", join: "people", page: "pen", note: "chat",
};

/** "just now", "5 min ago", "3 h ago", "2 days ago", then the date. */
function ago(ms: number) {
  const s = (Date.now() - ms) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} day${s < 2 * 86400 ? "" : "s"} ago`;
  return fmtStamp(ms);
}

/** Everything that happened around the person: followers, books they were added to, pages and notes. */
export function Notifications() {
  useTitle("Notifications");
  const { refresh } = useSession();
  const toast = useToast();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Show what's new as new this time, and count it as read from now on.
  useEffect(() => {
    api.notifications().then((r) => {
      setItems(r.items);
      if (r.unread) api.markAllRead().then(() => setUnread(0), () => {});
      else setUnread(0);
    }, (err) => setError(errorText(err, "Couldn't load your notifications.")));
  }, []);

  const patch = (id: string, p: Partial<AppNotification>) => setItems((l) => l?.map((n) => (n.id === id ? { ...n, ...p } : n)) ?? null);

  async function followBack(n: AppNotification) {
    if (!n.actor) return;
    setBusy(n.id);
    try {
      await api.follow(n.actor.id);
      setItems((l) => l?.map((x) => (x.actor?.id === n.actor!.id ? { ...x, actorFollowed: true } : x)) ?? null);
      toast(`You and ${n.actor.name} are friends now.`);
    } catch (err) {
      toast(errorText(err, "Couldn't follow back. Try again."));
    }
    setBusy(null);
  }

  async function answer(n: AppNotification, accept: boolean) {
    setBusy(n.id);
    try {
      if (accept) {
        await api.acceptRequest(n.id);
        await refresh();
        patch(n.id, { state: "accepted" });
        toast(`You're in ${n.book?.title ?? "the book"}.`);
      } else {
        await api.declineRequest(n.id);
        patch(n.id, { state: "declined" });
      }
    } catch (err) {
      // A full book (402) can be tried again once the owner makes room; anything else is shown as it comes.
      toast(errorText(err, "Couldn't answer that. Try again."));
    }
    setBusy(null);
  }

  const openBook = (n: AppNotification) => n.book && navigate(`/app/book/${encodeURIComponent(n.book.id)}`);

  function line(n: AppNotification): ReactNode {
    const who = <b>{n.actor?.name ?? "Someone"}</b>;
    const book = <b>{n.book?.title ?? "a book that's gone"}</b>;
    switch (n.kind) {
      case "follow": return <>{who} started following you.</>;
      case "book_add": return <>{who} added you to {book}.</>;
      case "book_invite": return <>{who} wants you in {book}.</>;
      case "join": return <>{who} joined {book}.</>;
      case "page": return n.count > 1
        ? <>{who} added {n.count} pages to {book}, the latest “{n.text}”.</>
        : <>{who} added “{n.text}” to {book}.</>;
      case "note": return <>{who} left a note on your page in {book}: “{n.text}”</>;
    }
  }

  function actions(n: AppNotification): ReactNode {
    if (n.kind === "follow") {
      return n.actorFollowed
        ? <span className="nt-done"><Icon name="check" />Friends</span>
        : <button type="button" className="btn small" disabled={busy === n.id} onClick={() => followBack(n)}><Icon name="user-plus" />Follow back</button>;
    }
    if (n.kind === "book_invite") {
      if (n.state === "declined") return <span className="nt-done">Declined</span>;
      if (n.state === "accepted") return <button type="button" className="btn small line" onClick={() => openBook(n)}>Open the book</button>;
      return (
        <>
          <button type="button" className="btn small sun" disabled={busy === n.id} onClick={() => answer(n, true)}>Join</button>
          <button type="button" className="btn small line" disabled={busy === n.id} onClick={() => answer(n, false)}>No thanks</button>
        </>
      );
    }
    return n.book ? <button type="button" className="btn small line" onClick={() => openBook(n)}>Open</button> : null;
  }

  const fresh = items?.filter((n) => !n.read) ?? [];
  const earlier = items?.filter((n) => n.read) ?? [];
  const group = (title: string, list: AppNotification[]) => list.length > 0 && (
    <section className="nt-group" aria-label={title}>
      <h2 className="nt-h">{title}</h2>
      <ul className="nt-list">
        {list.map((n) => (
          <li key={n.id} className={n.read ? undefined : "new"}>
            <span className="nt-face">
              {n.actor ? <Avatar name={n.actor.name} id={n.actor.id} size={42} /> : <span className="avatar nt-blank" style={{ width: 42, height: 42 }} />}
              <span className="nt-kind"><Icon name={ICON[n.kind]} /></span>
            </span>
            <span className="nt-text">
              <span>{line(n)}</span>
              <time dateTime={new Date(n.createdAt).toISOString()}>{ago(n.createdAt)}</time>
            </span>
            <span className="nt-acts">{actions(n)}</span>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="notifs">
      <header className="nt-top">
        <h1 className="app-title">Notifications</h1>
        <Link href="/app/settings/notifications" className="btn small line"><Icon name="gear" />{isApp ? "Settings" : "Choose what you hear about"}</Link>
      </header>
      {error && <p className="err" role="alert">{error}</p>}
      {!items ? (
        !error && <p className="hint">Loading…</p>
      ) : items.length === 0 ? (
        <div className="lib-empty">
          <h2>All quiet</h2>
          <p>New pages, notes on yours, followers and books you're added to will show up here.</p>
          <Link href="/app/settings/friends" className="btn line"><Icon name="people" />Find friends</Link>
        </div>
      ) : (
        <>
          {group("New", fresh)}
          {group(fresh.length ? "Earlier" : "Recent", earlier)}
        </>
      )}
    </div>
  );
}
