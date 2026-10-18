import type { CSSProperties } from "react";
import { jitter } from "../lib/format";
import type { Page } from "../types";

type Vars = CSSProperties & Record<`--${string}`, string>;

/** Up to three taped polaroids, the cover photo on top and the rest peeking out behind it. */
export function PolaroidStack({ page }: { page: Page }) {
  if (!page.photos.length) {
    return (
      <div className="stack">
        <figure className="polaroid blank" style={{ "--r": `${jitter(page.id, 0, -3, 3).toFixed(1)}deg` } as Vars}>
          <span className="tape" />
          <div className="shot"><span>{page.place.code}</span></div>
          <figcaption>no photos, just us</figcaption>
        </figure>
      </div>
    );
  }
  const shown = page.photos.slice(0, 3).map((photo, i) => ({ photo, i })).reverse();
  return (
    <div className="stack">
      {shown.map(({ photo, i }) => {
        const r = i === 0 ? jitter(page.id, 0, -3.5, 3.5) : jitter(page.id, i, 4, 9) * (i % 2 ? -1 : 1);
        const style: Vars = { "--r": `${r.toFixed(1)}deg`, "--x": `${i === 0 ? 0 : i % 2 ? -7 : 7}%`, "--y": `${-3 * i}%` };
        return (
          <figure key={photo.id} className="polaroid" style={style}>
            {i === 0 && <span className="tape" style={{ "--tr": `${jitter(page.id, "t", -6, 5).toFixed(1)}deg` } as Vars} />}
            <div className="shot">
              <img src={photo.url} alt={photo.caption || `Photo from ${page.place.name}`} loading="lazy" decoding="async" />
            </div>
            <figcaption>{i === 0 ? photo.caption : ""}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}
