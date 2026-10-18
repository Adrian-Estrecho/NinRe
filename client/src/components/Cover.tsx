import { Book3D } from "../book/Book3D";
import { daysBetween, fmtDay, plural, todayYMD } from "../lib/format";
import { Link } from "../router";
import type { Book } from "../types";
import { Avatar, joinNames } from "./Avatar";
import { Icon } from "./Icon";

interface Props {
  book: Book;
  coverPhotoUrl: string | null;
  stats: { pages: number; places: number; photos: number; chapters: number };
  canEdit: boolean;
  onEdit: () => void;
  onPeople: () => void;
}

const UNIT: Record<string, [string, string]> = {
  "Together since": ["day together", "days together"],
  "Friends since": ["day of friendship", "days of friendship"],
  "Travelling since": ["day on the road", "days on the road"],
  "Married since": ["day married", "days married"],
};

/** The top of a book: the book itself, which you can turn, beside its title, its people and its ledger. */
export function BookHeader({ book, coverPhotoUrl, stats, canEdit, onEdit, onPeople }: Props) {
  const { cover } = book;
  const names = cover.subtitle || joinNames(book.members.map((m) => m.name));
  const days = cover.since ? daysBetween(cover.since, todayYMD()) : null;
  const unit = UNIT[cover.sinceLabel] ?? UNIT["Together since"];
  const ledger: [number, string][] = [
    [stats.pages, stats.pages === 1 ? "Page" : "Pages"],
    [stats.places, stats.places === 1 ? "Place pinned" : "Places pinned"],
    [stats.photos, stats.photos === 1 ? "Photo" : "Photos"],
    [stats.chapters, stats.chapters === 1 ? "Chapter" : "Chapters"],
  ];

  return (
    <header className="bhead" aria-label="Book cover">
      <div className="bhead-book">
        <Book3D design={book.design} title={cover.title} subtitle={names} photoUrl={coverPhotoUrl} width="clamp(150px, 19vw, 232px)" />
      </div>
      <div className="bhead-meta">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/app">Your books</Link></nav>
        <h1 className="bhead-title">{cover.title}</h1>
        <p className="bhead-names">{names}</p>
        <p className="bhead-since">
          {cover.since ? (
            <>
              {cover.sinceLabel} {fmtDay(cover.since)}
              {days != null && <> · <b className="tnum">{Math.abs(days).toLocaleString("en-US")}</b> {days >= 0 ? (Math.abs(days) === 1 ? unit[0] : unit[1]) : `${Math.abs(days) === 1 ? "day" : "days"} to go`}</>}
            </>
          ) : canEdit ? (
            <button type="button" className="link-btn" onClick={onEdit}>Add the day it started</button>
          ) : null}
        </p>
        <dl className="ledger">
          {ledger.map(([n, label]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd className="tnum">{n.toLocaleString("en-US")}</dd>
            </div>
          ))}
        </dl>
        <div className="bhead-actions">
          <button type="button" className="people-btn" onClick={onPeople} aria-label={`People in this book: ${joinNames(book.members.map((m) => m.name))}`}>
            <span className="faces">{book.members.slice(0, 4).map((m) => <Avatar key={m.id} name={m.name} id={m.id} size={30} />)}</span>
            <span>{plural(book.members.length, "person", "people")}</span>
          </button>
          {canEdit && (
            <>
              <Link href={`/app/book/${book.id}/design`} className="btn line small"><Icon name="palette" />Design</Link>
              <button type="button" className="btn line small" onClick={onEdit}><Icon name="pen" />Edit cover</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
