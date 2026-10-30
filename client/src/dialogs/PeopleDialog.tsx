import { useEffect, useState } from "react";
import { ApiError, api, errorText } from "../api";
import { Avatar } from "../components/Avatar";
import { Dialog } from "../components/Dialog";
import { Icon } from "../components/Icon";
import { useToast } from "../components/Toast";
import { fmtStamp } from "../lib/format";
import { Link, navigate } from "../router";
import { useSession } from "../session";
import type { Allowance, Invite, Member } from "../types";

interface Props {
  bookId: string;
  title: string;
  isOwner: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/** Who writes in this book, and the link that brings more people in. */
export function PeopleDialog({ bookId, title, isOwner, onClose, onChanged }: Props) {
  const { me, refresh } = useSession();
  const toast = useToast();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; upgrade?: boolean } | null>(null);
  const [armed, setArmed] = useState<string | null>(null);

  const load = () =>
    api.people(bookId).then((r) => {
      setMembers(r.members);
      setInvites(r.invites);
      setAllowance(r.allowance);
    }, (err) => setError({ text: errorText(err, "Couldn't load the people in this book.") }));

  useEffect(() => {
    load();
  }, [bookId]);

  const full = members && allowance ? members.length >= allowance.members : false;
  const linkFor = (code: string) => `${location.origin}/join/${code}`;

  async function makeInvite() {
    setBusy(true);
    setError(null);
    try {
      const inv = await api.createInvite(bookId);
      setInvites((l) => [inv, ...l]);
      copy(inv.code);
    } catch (err) {
      setError({ text: errorText(err, "Couldn't make an invite link."), upgrade: err instanceof ApiError && err.status === 402 });
    }
    setBusy(false);
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(linkFor(code));
      toast("Invite link copied. Send it to the people you travel with.");
    } catch {
      toast("Copy the link from the box to share it.");
    }
  }

  async function revoke(code: string) {
    try {
      await api.revokeInvite(bookId, code);
      setInvites((l) => l.filter((i) => i.code !== code));
      toast("That link no longer works.");
    } catch (err) {
      setError({ text: errorText(err, "Couldn't turn the link off.") });
    }
  }

  async function remove(m: Member) {
    if (armed !== m.id) {
      setArmed(m.id);
      return;
    }
    setArmed(null);
    try {
      await api.removePerson(bookId, m.id);
      if (m.id === me?.user.id) {
        await refresh();
        toast(`You left ${title}.`);
        navigate("/app");
        return;
      }
      setMembers((l) => l?.filter((x) => x.id !== m.id) ?? null);
      onChanged();
      toast(`${m.name} was removed from the book.`);
    } catch (err) {
      setError({ text: errorText(err, "Couldn't do that. Try again.") });
    }
  }

  return (
    <Dialog labelledBy="ppl-title" onRequestClose={onClose} closeButton>
      <div className="panel people">
        <h2 id="ppl-title">People in this book</h2>
        <p className="sub">Everyone here can add pages, photos and notes, and change the design.{allowance ? ` ${allowance.planName} fits ${allowance.members} people in a book.` : ""}</p>

        {!members ? (
          <p className="hint">Loading…</p>
        ) : (
          <ul className="people-list">
            {members.map((m) => (
              <li key={m.id}>
                <Avatar name={m.name} id={m.id} size={38} />
                <span className="who">
                  <b>{m.name}{m.id === me?.user.id ? " (you)" : ""}</b>
                  <span>{m.role === "owner" ? "Owner" : `Joined ${fmtStamp(m.joinedAt)}`}</span>
                </span>
                {m.role !== "owner" && (isOwner || m.id === me?.user.id) && (
                  <button type="button" className={`btn small warn${armed === m.id ? " armed" : ""}`} onClick={() => remove(m)} onBlur={() => setArmed(null)}>
                    {armed === m.id ? (m.id === me?.user.id ? "Tap again to leave" : "Tap again to remove") : m.id === me?.user.id ? "Leave" : "Remove"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {isOwner && (
          <div className="invite-box">
            <h3>Invite links</h3>
            {full && allowance ? (
              <p className="notice">
                <b>Full</b>
                <span>{allowance.planName} fits {allowance.members} people per book.</span>
                {allowance.plan !== "crew" && <Link href={`/app/account?upgrade=${allowance.plan === "free" ? "plus" : "crew"}`} className="btn small" onClick={onClose}>Upgrade</Link>}
              </p>
            ) : (
              <>
                <p className="hint">A link works for 14 days, for as many people as the plan allows. Anyone with it can join, so send it only to your people.</p>
                {invites.map((inv) => (
                  <div key={inv.code} className="invite-row">
                    <input className="input" readOnly value={linkFor(inv.code)} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
                    <button type="button" className="btn small" onClick={() => copy(inv.code)}><Icon name="copy" />Copy</button>
                    <button type="button" className="btn small line" onClick={() => revoke(inv.code)} title={`Expires ${fmtStamp(inv.expiresAt)}`}>Turn off</button>
                  </div>
                ))}
                <div><button type="button" className="btn line" onClick={makeInvite} disabled={busy}><Icon name="link" />{busy ? "Making a link…" : invites.length ? "Make another link" : "Make an invite link"}</button></div>
              </>
            )}
          </div>
        )}

        {error && (
          <p className="err" role="alert">
            {error.text} {error.upgrade && <Link href="/app/account?upgrade=plus" onClick={onClose}>See plans</Link>}
          </p>
        )}
      </div>
    </Dialog>
  );
}
