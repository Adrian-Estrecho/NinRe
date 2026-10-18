import { useEffect, useRef } from "react";
import { Atlas, type AtlasOptions, type Pin } from "./atlas";

interface Props extends AtlasOptions {
  pins: Pin[];
  className?: string;
  label?: string;
  /** Change this value to re-fit the view around the pins. */
  fitKey?: unknown;
  /** Change this object to move the view. */
  center?: { lat: number; lng: number; span: number } | null;
  hot?: string | null;
}

export function AtlasMap({ pins, className = "", label, fitKey, center, hot, ...opts }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const atlas = useRef<Atlas | null>(null);
  const latest = useRef(opts);
  latest.current = opts;

  useEffect(() => {
    const o = latest.current;
    const a = new Atlas(box.current!, {
      interactive: o.interactive,
      controls: o.controls,
      labels: o.labels,
      route: o.route,
      fitLabel: o.fitLabel,
      home: o.home,
      onPin: o.onPin && ((id) => latest.current.onPin?.(id)),
      onPick: o.onPick && ((lat, lng) => latest.current.onPick?.(lat, lng)),
      onMove: () => latest.current.onMove?.(),
    });
    atlas.current = a;
    return () => {
      a.destroy();
      atlas.current = null;
    };
  }, []);

  useEffect(() => atlas.current?.setPins(pins), [pins]);
  useEffect(() => {
    if (fitKey !== undefined) atlas.current?.fit();
  }, [fitKey]);
  useEffect(() => {
    if (center) atlas.current?.centerOn(center.lat, center.lng, center.span);
  }, [center]);
  useEffect(() => atlas.current?.setHot(hot ?? null), [hot, pins]);

  return <div ref={box} className={`amap ${className}`} role={label ? "img" : undefined} aria-label={label} />;
}
