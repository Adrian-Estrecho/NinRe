import type { CSSProperties, ReactNode } from "react";
import { bookStyle, type Design } from "./design";
import { EmblemArt } from "./emblems";
import { StickerArt } from "./stickers";

interface Props {
  design: Design;
  title: string;
  subtitle?: string;
  photoUrl?: string | null;
  /** Leave the stickers off, e.g. while an editor draws its own movable copies. */
  hideStickers?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * The front of a book: cloth, foil title, emblem, an optional photo window and stickers.
 * Type is sized from the cover's own width, so it reads the same as a thumbnail or full size.
 */
export function CoverFace({ design, title, subtitle, photoUrl, hideStickers, className = "", children }: Props) {
  const { style, data } = bookStyle(design);
  return (
    <div className={`cface ${className}`} style={style} {...data}>
      <div className="cface-in">
        {design.layout === "framed" && <span className="cface-frame" aria-hidden="true" />}
        <div className="cface-body">
          {photoUrl && (
            <span className="cface-photo">
              <img src={photoUrl} alt="" loading="lazy" decoding="async" />
            </span>
          )}
          {design.emblem !== "none" && <EmblemArt emblem={design.emblem} className="cface-emblem" />}
          <span className="cface-title">{title}</span>
          {subtitle && <span className="cface-names">{subtitle}</span>}
        </div>
      </div>
      {!hideStickers && design.stickers.length > 0 && (
        <div className="cface-stickers" aria-hidden="true">
          {design.stickers.map((s, i) => (
            <span key={i} className="sticker" style={{ left: `${s.x}%`, top: `${s.y}%`, "--sr": `${s.r}deg`, "--ss": s.s } as CSSProperties}>
              <StickerArt kind={s.k} />
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
