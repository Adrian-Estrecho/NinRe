import { Icon } from "../components/Icon";
import { Notes } from "../components/Notes";
import { fmtLong } from "../lib/format";
import { AlbumLeaf } from "./AlbumLeaf";
import { Editable } from "./Editable";
import { AddPhoto, TagSelect, useLeaf, type LeafProps } from "./leaf";

/** One page of the open book, drawn the way its kind of book reads. */
export function PageLeaf(props: LeafProps) {
  switch (props.kind.id) {
    case "album": return <AlbumLeaf {...props} />;
    default: return <JournalLeaf {...props} />;
  }
}

/**
 * A travel journal's page. Read, it is simply printed. Written in, it is edited straight on the paper: photos on the
 * left with a + to add more, and the title, day, place and story on the right, each edited where it stands.
 */
function JournalLeaf({ bookId, page, kind, me, writing, fresh, onSaved, onState }: LeafProps) {
  const s = useLeaf({ bookId, page, onSaved, onState });
  const { leaf } = s;
  const ph = leaf.photos[s.shown];

  return (
    <article className="book fold peek-book leaf-book">
      <div className="left">
        {s.input}
        {ph ? (
          <figure className="mount">
            <img src={ph.url} alt={ph.caption || `Photo from ${leaf.place.name}`} />
            <Editable as="figcaption" label="Caption" value={ph.caption} placeholder="Write a caption" maxLength={60} readOnly={!writing} onCommit={(c) => s.caption(ph.id, c)} />
          </figure>
        ) : s.adding || writing ? (
          <AddPhoto s={s} big />
        ) : (
          <figure className="mount">
            <div className="blank">{leaf.place.code}</div>
            <figcaption>no photos, just us</figcaption>
          </figure>
        )}
        {(leaf.photos.length > (writing ? 0 : 1) || s.adding > 0) && (
          <ul className="leaf-thumbs" aria-label="Photos on this page">
            {leaf.photos.map((p, i) => (
              <li key={p.id}>
                <button type="button" className="leaf-thumb" aria-current={p === ph} aria-label={`Show photo ${i + 1}${p.caption ? `: ${p.caption}` : ""}`} onClick={() => s.setShown(i)}>
                  <img src={p.url} alt="" />
                </button>
                {writing && <button type="button" className="leaf-thumb-x" aria-label={`Take photo ${i + 1} off this page`} onClick={() => s.remove(i)}><Icon name="close" /></button>}
              </li>
            ))}
            {Array.from({ length: s.adding }, (_, i) => <li key={`up${i}`}><span className="leaf-thumb busy" aria-hidden="true" /></li>)}
            {writing && !s.full && <li><AddPhoto s={s} /></li>}
          </ul>
        )}
      </div>

      <div className="right">
        <Editable as="h2" label="Title" value={leaf.title} required maxLength={120} placeholder="Name this day" readOnly={!writing} autoEdit={fresh} onCommit={(title) => s.change({ title })} />
        <span className="fulldate">
          <Editable label="Date" type="date" value={leaf.date} required shown={fmtLong(leaf.date)} readOnly={!writing} onCommit={(date) => s.change({ date })} />
          {" · "}
          <TagSelect s={s} kind={kind} writing={writing} />
        </span>
        <div className="place">
          <Editable as="strong" label="Place" value={leaf.place.name} required maxLength={80} placeholder="Where were you?" readOnly={!writing} onCommit={s.setPlace} />
          <Editable label="Region or country" value={leaf.place.region} maxLength={80} placeholder="Region" readOnly={!writing} onCommit={(region) => s.change({ place: { ...leaf.place, region } })} />
        </div>
        <Editable
          as="div"
          className={leaf.story || writing ? "story" : "story none"}
          multiline
          label="Story"
          value={leaf.story}
          placeholder="Tell the story of this day…"
          readOnly={!writing}
          empty="No story written yet."
          onCommit={(story) => s.change({ story })}
        />
        {page.author && <p className="byline">Written by {page.author.name}</p>}
        {/* Notes are written in the writing mode; while reading, the ones already left are shown. */}
        <Notes page={page} me={writing ? me : null} bookId={writing ? bookId : undefined} onPage={writing ? onSaved : undefined} />
      </div>
    </article>
  );
}
