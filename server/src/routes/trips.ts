import { Router } from "express";
import { limiter, userOf } from "../auth.ts";
import type { Store } from "../db.ts";
import { parsePlanRequest, type TripPlanner } from "../itinerary.ts";
import { parseTrip, type PlaceSuggester, type Suggestions } from "../trips.ts";
import { HttpError } from "../types.ts";

const MAX_TRIPS = 50;
const SUGGESTIONS_PER_DAY = 40;
const PLANS_PER_DAY = 20;
const CACHE_MS = 7 * 864e5;
const CACHE_SIZE = 500;

/** Trip plans, places to see suggested for a destination, and whole trips planned by NinRe AI. */
export function tripRoutes(store: Store, suggester: PlaceSuggester | null, planner: TripPlanner | null) {
  const r = Router();
  const asking = limiter(SUGGESTIONS_PER_DAY, 864e5);
  const planning = limiter(PLANS_PER_DAY, 864e5);
  // The first suggestions for a destination are the same for everyone, so they're kept for a week.
  const cache = new Map<string, { at: number; out: Suggestions }>();

  r.get("/", (_req, res) => {
    res.set("Cache-Control", "no-store").json({ trips: store.trips.list(userOf(res).id), suggestions: Boolean(suggester), planner: Boolean(planner) });
  });

  r.post("/", (req, res) => {
    const me = userOf(res);
    if (store.trips.count(me.id) >= MAX_TRIPS) throw new HttpError(409, `You can keep up to ${MAX_TRIPS} trips. Delete an old one to plan another.`);
    res.status(201).json(store.trips.create(me.id, parseTrip(req.body)));
  });

  r.post("/suggest", async (req, res) => {
    if (!suggester) throw new HttpError(503, "Suggesting places isn't set up on this server. You can still add places yourself.");
    const me = userOf(res);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const destination = typeof body.destination === "string" ? body.destination.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    if (!destination) throw new HttpError(400, "Say where you're going.");
    const exclude = (Array.isArray(body.exclude) ? body.exclude : [])
      .filter((n): n is string => typeof n === "string")
      .map((n) => n.replace(/\s+/g, " ").trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 80);

    const key = destination.toLowerCase();
    const kept = exclude.length ? undefined : cache.get(key);
    if (kept && Date.now() - kept.at < CACHE_MS) return void res.json(kept.out);

    if (asking.blocked(me.id)) throw new HttpError(429, `You can ask for suggestions ${SUGGESTIONS_PER_DAY} times a day. Try again tomorrow, or add places yourself.`);
    asking.hit(me.id);
    const out = await suggester.suggest(destination, exclude);
    if (!exclude.length && out.found) {
      cache.delete(key);
      cache.set(key, { at: Date.now(), out });
      if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
    }
    res.json(out);
  });

  // NinRe AI plans the trip day by day. Nothing is saved until the person keeps the plan as a trip.
  r.post("/plan", async (req, res) => {
    if (!planner) throw new HttpError(503, "NinRe AI isn't switched on on this server yet.");
    const me = userOf(res);
    const ask = parsePlanRequest(req.body);
    if (planning.blocked(me.id)) throw new HttpError(429, `NinRe can plan ${PLANS_PER_DAY} trips a day for you. Try again tomorrow.`);
    planning.hit(me.id);
    res.set("Cache-Control", "no-store").json(await planner.plan(ask));
  });

  r.get("/:id", (req, res) => void res.set("Cache-Control", "no-store").json(store.trips.get(userOf(res).id, String(req.params.id))));
  r.put("/:id", (req, res) => void res.json(store.trips.save(userOf(res).id, String(req.params.id), parseTrip(req.body))));
  r.delete("/:id", (req, res) => {
    store.trips.remove(userOf(res).id, String(req.params.id));
    res.status(204).end();
  });

  return r;
}
