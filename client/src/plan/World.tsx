import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { plural } from "../lib/format";
import { WikiPhoto } from "../lib/wiki";
import { RealMap, type RealPin } from "../map/RealMap";
import { Link } from "../router";
import { ALL_PLACES, IDEAS, REGIONS, mapsFor, type Idea, type Region } from "./ideas";
import { KIND_ICON } from "./Plan";
import { explorePath } from "./Popular";

const pinId = (idea: Idea, index: number) => `${idea.id}:${index}`;

/**
 * Every ready-made place in the world: on one map that gathers nearby places into bubbles, and in a row of photo
 * cards per destination. Photos are fetched only as each card scrolls into view.
 */
export function World() {
  const [region, setRegion] = useState<Region | "all">("all");
  const [picked, setPicked] = useState<string | null>(null);

  const ideas = useMemo(() => IDEAS.filter((d) => region === "all" || d.region === region), [region]);
  const pins = useMemo<RealPin[]>(() => ideas.flatMap((d) => d.places.map((p, i) => ({ id: pinId(d, i), lat: p.lat, lng: p.lng, label: `${p.name}, ${d.name}` }))), [ideas]);
  const chosen = picked ? ALL_PLACES.find(({ idea, index }) => pinId(idea, index) === picked) : undefined;

  function choose(next: Region | "all") {
    setRegion(next);
    setPicked(null);
  }

  return (
    <section className="plan-group world" aria-labelledby="world">
      <div className="dest-row">
        <h2 id="world" className="plan-label"><Icon name="globe" />Around the world</h2>
        <span className="dest-hint">{plural(pins.length, "place")} · {plural(ideas.length, "destination")}</span>
      </div>

      <div className="idea-tabs" role="group" aria-label="Region">
        <button type="button" className="idea-tab" aria-pressed={region === "all"} onClick={() => choose("all")}>Everywhere</button>
        {REGIONS.map((r) => <button key={r} type="button" className="idea-tab" aria-pressed={region === r} onClick={() => choose(r)}>{r}</button>)}
      </div>

      <RealMap className="world-map" pins={pins} cluster hot={picked} onPin={setPicked} maxZoom={12} label={`Map of ${pins.length} places to see`} />
      <p className="pop-credit">Tap a yellow bubble to zoom in, or a red dot to see the place. Map © OpenStreetMap contributors, photos from Wikipedia.</p>

      {chosen && (
        <div className="world-pick" role="status">
          <WikiPhoto key={chosen.place.wiki} title={chosen.place.wiki} search={`${chosen.place.name} ${chosen.place.area}`} className="world-pick-photo" fallback={<Icon name={KIND_ICON[chosen.place.kind]} />} />
          <span className="world-pick-text">
            <b>{chosen.place.name}</b>
            <span className="sug-meta">{chosen.place.area}, {chosen.idea.name} · {chosen.place.time}</span>
            <span className="sug-why">{chosen.place.why}</span>
            <span className="world-pick-acts">
              <Link href={explorePath(chosen.idea.id, chosen.index)} className="btn small sun">Plan {chosen.idea.name}<Icon name="right" /></Link>
              <a className="btn small line" href={mapsFor(chosen.place)} target="_blank" rel="noopener noreferrer"><Icon name="pin" />Google Maps</a>
            </span>
          </span>
          <button type="button" className="place-btn world-pick-close" aria-label="Close" onClick={() => setPicked(null)}><Icon name="close" /></button>
        </div>
      )}

      <div className="world-rows">
        {ideas.map((d) => <DestinationRow key={d.id} idea={d} />)}
      </div>
    </section>
  );
}

/** One destination: its name, and its places as a sideways row of photo cards. */
function DestinationRow({ idea }: { idea: Idea }) {
  return (
    <div className="world-row">
      <div className="world-row-head">
        <h3>{idea.name}</h3>
        <span>{plural(idea.places.length, "place")}</span>
        <Link href={explorePath(idea.id)} className="world-row-open">Plan it<Icon name="right" /></Link>
      </div>
      <ul className="world-strip">
        {idea.places.map((p, i) => (
          <li key={p.name}>
            <Link href={explorePath(idea.id, i)} className="world-card">
              <WikiPhoto title={p.wiki} search={`${p.name} ${p.area}`} className="world-card-photo" fallback={<Icon name={KIND_ICON[p.kind]} />} />
              <span className="world-card-text">
                <b>{p.name}</b>
                <span>{p.area}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
