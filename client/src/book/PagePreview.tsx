import { useLayoutEffect, useRef, useState } from "react";
import { PolaroidStack } from "../components/Polaroids";
import { Stamp } from "../components/Stamp";
import { coordsText, excerpt } from "../lib/format";
import type { NumberedPage } from "../types";
import { bookStyle, type Design } from "./design";

/** Laid out at the reader's own width, then scaled to fit, so the preview is the page exactly as the book shows it. */
const NATURAL = 900;

/** One page spread dressed in a design's paper, ink and photo style. */
export function PagePreview({ design, page }: { design: Design; page: NumberedPage }) {
  const { style, data } = bookStyle(design);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, height: 0 });

  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    const measure = () => {
      const scale = Math.min(1, o.clientWidth / NATURAL);
      setFit({ scale, height: i.offsetHeight * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={outer} className="book-scope page-preview" style={{ ...style, height: fit.height || undefined }} {...data}>
      <div ref={inner} className="page-preview-in" style={{ width: NATURAL, transform: `scale(${fit.scale})` }}>
        <article className="spread" aria-label={`Preview of a page: ${page.title}`}>
          <div className="leaf photos">
            <PolaroidStack page={page} />
          </div>
          <div className="leaf words">
            <Stamp page={page} />
            <h3 className="ptitle">{page.title}</h3>
            <div className="place">
              <strong>{page.place.name}</strong>
              {page.place.region && <span>{page.place.region}</span>}
              <span className="coords">{coordsText(page.place)}</span>
            </div>
            <p className="excerpt">{excerpt(page.story, 220)}</p>
            <div className="page-meta">
              <span>{page.kind}{page.author ? ` · by ${page.author.name}` : ""}</span>
              <span className="folio">— {page.n} —</span>
              <span />
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
