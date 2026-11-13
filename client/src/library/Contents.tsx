import { Avatar, joinNames } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { chapters } from "../lib/book";
import { fmtShort, roman } from "../lib/format";
import { kindOf } from "../lib/kinds";
import type { Book, NumberedPage } from "../types";

interface Props {
  book: Book;
  pages: NumberedPage[];
  /** Shown once, when the book was just made or just joined. */
  hello: "welcome" | "joined" | null;
  onGo: (pageId: string) => void;
  onAdd: () => void;
  onPeople: () => void;
  /** A plain table of contents whatever the kind of book (on the phone, where the book is read a page at a time). */
  toc?: boolean;
}

/**
 * The book opened at the front: the names inside the cover, and on the right a way into the pages that suits the
 * kind of book: an album's contact sheet, or a journal's chapters by year.
 */
export function Contents({ book, pages, hello, onGo, onAdd, onPeople, toc }: Props) {
  const names = book.cover.subtitle || joinNames(book.members.map((m) => m.name));
  const kind = kindOf(book.kind);
  return (
    <article className={`book fold peek-book contents-book contents-${kind.id}`}>
      <div className="left">
        <div className="peek-endpaper">
          <p className="peek-ex">Ex libris</p>
          <p className="peek-who">{names}</p>
          {book.cover.since && <p className="peek-since">{book.cover.sinceLabel} {fmtShort(book.cover.since)}</p>}
          <span className="faces">
            {book.members.slice(0, 8).map((m) => <Avatar key={m.id} name={m.name} id={m.id} size={30} />)}
          </span>
        </div>
      </div>
      <div className="right">
        <h2>Contents</h2>
        {hello && (
          <p className="contents-hello">
            {hello === "welcome" ? `Your ${kind.name.toLowerCase()} is ready. Add the first ${kind.unit}, and invite the people you share it with.` : `You're in. Add ${kind.unit}s, photos and notes to ${book.cover.title}.`}
          </p>
        )}
        {!pages.length ? (
          <div className="peek-empty">
            <p>{EMPTY[kind.id]}</p>
            <div className="peek-empty-row">
              <button type="button" className="btn sun small" onClick={onAdd}><Icon name="plus" />Add the first {kind.unit}</button>
              {hello === "welcome" && <button type="button" className="btn line small" onClick={onPeople}><Icon name="people" />Invite</button>}
            </div>
          </div>
        ) : !toc && kind.id === "album" ? (
          <Sheet pages={pages} onGo={onGo} />
        ) : (
          <Chapters pages={pages} onGo={onGo} />
        )}
      </div>
    </article>
  );
}

const EMPTY = {
  journal: "No pages yet. The first one is waiting: a day, a place and a photo or two.",
  album: "No pages yet. Add a page of photos and choose how to lay them out.",
};

type ListProps = { pages: NumberedPage[]; onGo: (pageId: string) => void };

function Chapters({ pages, onGo }: ListProps) {
  return (
    <ol className="contents">
      {chapters(pages, "asc").map((ch) => (
        <li key={ch.year}>
          <p className="contents-ch">Chapter {roman(ch.number)} <span>{ch.year}</span></p>
          <ol>
            {ch.pages.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onGo(p.id)}>
                  <span className="contents-t">{p.title}</span>
                  <span className="contents-d">{fmtShort(p.date)}</span>
                  <span className="contents-dots" aria-hidden="true" />
                  <span className="contents-n">{p.n}</span>
                </button>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}

/** An album's pages as a contact sheet: the first photo of each, its title and page number. */
function Sheet({ pages, onGo }: ListProps) {
  return (
    <ol className="contact">
      {pages.map((p) => (
        <li key={p.id}>
          <button type="button" onClick={() => onGo(p.id)} aria-label={`${p.title}, page ${p.n}`}>
            {p.photos[0] ? <img src={p.photos[0].url} alt="" loading="lazy" /> : <span className="contact-blank" aria-hidden="true">{p.place.code}</span>}
            <span className="contact-t" aria-hidden="true"><b>{p.n}</b>{p.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
