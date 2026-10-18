import { useEffect, useRef, useState } from "react";
import { CoverFace } from "../book/CoverFace";
import { Avatar, joinNames } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { plural } from "../lib/format";
import { readPending } from "../lib/pending";
import { Link, navigate, useLocation, useTitle } from "../router";
import { useSession } from "../session";
import type { BookSummary } from "../types";
import { NewBookDialog } from "./NewBookDialog";

/** The shelf: every book you own or write in. */
export function Library() {
  useTitle("Your books");
  const { me, refresh } = useSession();
  const { query } = useLocation();
  const [creating, setCreating] = useState(false);
  const autoOpened = useRef(false);
  const askedNew = query.get("new") === "1";
  const empty = me?.books.length === 0;

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Open the new-book dialog once when asked to, or when someone arrives with a cover designed on the website.
  useEffect(() => {
    if (autoOpened.current || !(askedNew || (empty && readPending()))) return;
    autoOpened.current = true;
    setCreating(true);
  }, [askedNew, empty]);

  if (!me) return null;
  const { billing: b, books } = me;
  const limit = b.active.books;
  const atLimit = limit != null && b.usage.books >= limit;
  const mine = books.filter((x) => x.role === "owner"), shared = books.filter((x) => x.role !== "owner");

  return (
    <div className="library">
      <div className="lib-head">
        <div>
          <h1 className="app-title">Your books</h1>
          <p className="app-sub">
            {b.active.name} plan · {limit == null ? `${plural(b.usage.books, "book")}` : `${b.usage.books} of ${limit} book${limit === 1 ? "" : "s"}`} · {b.usage.photos.toLocaleString("en-US")} of {b.active.photos.toLocaleString("en-US")} photos
          </p>
        </div>
        <button type="button" className="btn" onClick={() => (atLimit ? navigate("/app/account?upgrade=plus") : setCreating(true))}>
          <Icon name="plus" />New book
        </button>
      </div>

      {books.length === 0 ? (
        <div className="lib-empty">
          <h2>Your shelf is empty</h2>
          <p>Start a book for the two of you, or for the whole group. You'll design its cover next, then add the first page.</p>
          <button type="button" className="btn" onClick={() => setCreating(true)}><Icon name="plus" />Start a book</button>
          <p className="hint">Got an invite link from someone? Open it, and their book appears here.</p>
        </div>
      ) : (
        <>
          <Shelf books={mine} heading={shared.length ? "Yours" : undefined} newTile={{ atLimit, limit, onNew: () => setCreating(true) }} />
          {shared.length > 0 && <Shelf books={shared} heading="Shared with you" />}
        </>
      )}

      {creating && (
        <NewBookDialog
          onClose={() => { setCreating(false); if (askedNew) navigate("/app", { replace: true }); }}
          onCreated={async (id) => { await refresh(); navigate(`/app/book/${id}?welcome=1`); }}
        />
      )}
    </div>
  );
}

function Shelf({ books, heading, newTile }: { books: BookSummary[]; heading?: string; newTile?: { atLimit: boolean; limit: number | null; onNew: () => void } }) {
  return (
    <section className="shelf-sec" aria-label={heading ?? "Your books"}>
      {heading && <h2 className="shelf-h">{heading}</h2>}
      <ul className="shelf">
        {books.map((bk) => (
          <li key={bk.id}>
            <Link href={`/app/book/${bk.id}`} className="shelf-book">
              <span className="shelf-cover">
                <CoverFace design={bk.design} title={bk.cover.title} subtitle={bk.cover.subtitle || joinNames(bk.members.map((m) => m.name))} photoUrl={bk.coverPhotoUrl} />
              </span>
              <span className="shelf-meta">
                <b>{bk.cover.title}</b>
                <span>{plural(bk.counts.pages, "page")} · {plural(bk.counts.photos, "photo")}</span>
                <span className="faces">
                  {bk.members.slice(0, 5).map((m) => <Avatar key={m.id} name={m.name} id={m.id} size={24} />)}
                  {bk.members.length > 5 && <span className="more">+{bk.members.length - 5}</span>}
                  <span className="sr-only">With {joinNames(bk.members.map((m) => m.name))}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
        {newTile && (
          <li>
            {newTile.atLimit ? (
              <Link href="/app/account?upgrade=plus" className="shelf-new locked">
                <Icon name="lock" />
                <b>More books on Plus</b>
                <span>Free includes {newTile.limit} book. Plus and Crew have room for as many as you like.</span>
              </Link>
            ) : (
              <button type="button" className="shelf-new" onClick={newTile.onNew}>
                <Icon name="plus" />
                <b>New book</b>
                <span>For another trip, or another group</span>
              </button>
            )}
          </li>
        )}
      </ul>
    </section>
  );
}
