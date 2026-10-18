import { useEffect, useState } from "react";

/** The world's coastlines and borders, loaded once and reused by every map through <use>. */
export function MapDefs() {
  const [paths, setPaths] = useState({ land: "M0 0", border: "M0 0" });

  useEffect(() => {
    let live = true;
    fetch("/map/world.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { land: string; border: string }) => live && setPaths({ land: d.land, border: d.border }))
      .catch(() => {}); // maps still show pins, graticule and labels without coastlines
    return () => {
      live = false;
    };
  }, []);

  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <path id="tb-land" vectorEffect="non-scaling-stroke" d={paths.land} />
        <path id="tb-border" vectorEffect="non-scaling-stroke" d={paths.border} />
      </defs>
    </svg>
  );
}
