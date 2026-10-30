import { CoverFace } from "../book/CoverFace";
import { Avatar, joinNames } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { plural } from "../lib/format";
import { Link } from "../router";
import type { BookSummary } from "../types";

/** A shelf of books, with an optional tile for starting another one. */
export function Shelf({ books, heading, newTile }: { books: BookSummary[]; heading: string; newTile?: { atLimit: boolean; limit: number | null; onNew: () => void } }) {
  return (
    <section className="shelf-sec" aria-label={heading}>
      <h2 className="sec-h">{heading}</h2>
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
