import { Icon } from "../components/Icon";
import { plural } from "../lib/format";
import { WikiPhoto } from "../lib/wiki";
import { Link } from "../router";
import { IDEAS, type Idea } from "./ideas";

export const explorePath = (id: string, place?: number) => `/app/plan/explore/${id}${place != null ? `?place=${place}` : ""}`;

/** The three cities with the most places, e.g. "Kyoto, Tokyo, Osaka" ("Asakusa, Tokyo" counts as Tokyo). */
export function topCities(areas: string[]): string {
  const count = new Map<string, number>();
  for (const a of areas) {
    const city = a.split(", ").pop()!;
    count.set(city, (count.get(city) ?? 0) + 1);
  }
  return [...count].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c).join(", ");
}

/** A destination's cover photo, fetched only once it's on screen. */
export function Cover({ idea, size = 500, className }: { idea: Idea; size?: number; className: string }) {
  const p = idea.places[idea.cover];
  return <WikiPhoto key={p.wiki} title={p.wiki} search={`${p.name} ${p.area}`} size={size} className={className} />;
}

/** The featured destinations, as photo cards. */
export function Popular() {
  const featured = IDEAS.filter((d) => d.featured);
  return (
    <section className="plan-group" aria-labelledby="popular">
      <h2 id="popular" className="plan-label"><Icon name="sparkle" />Popular destinations</h2>
      <ul className="pop-grid">
        {featured.map((d) => (
          <li key={d.id}>
            <Link href={explorePath(d.id)} className="pop-card">
              <Cover idea={d} className="pop-photo" />
              <span className="pop-text">
                <b>{d.name}</b>
                <span>{plural(d.places.length, "place")} · {topCities(d.places.map((p) => p.area))}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
