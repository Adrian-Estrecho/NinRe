import type { NumberedPage, Page, Place, SortOrder } from "../types";
import { SAMPLES } from "./samples";

export interface Shelf {
  /** Every page in the book, oldest first, numbered from 1. */
  list: NumberedPage[];
  /** True while the book is empty and the sample pages stand in. */
  sample: boolean;
}

export function shelve(pages: Page[]): Shelf {
  const sample = pages.length === 0;
  const list = (sample ? SAMPLES : pages)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt || a.id.localeCompare(b.id))
    .map((p, i) => ({ ...p, n: i + 1 }));
  return { list, sample };
}

export interface Chapter {
  year: string;
  number: number;
  pages: NumberedPage[];
}

/** One chapter per year. Chapter numbers follow time, whichever way the book is read. */
export function chapters(list: NumberedPage[], sort: SortOrder): Chapter[] {
  const byYear = new Map<string, NumberedPage[]>();
  for (const p of list) {
    const y = p.date.slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), p]);
  }
  const out = [...byYear.keys()].sort().map((year, i) => ({ year, number: i + 1, pages: byYear.get(year)! }));
  return sort === "asc" ? out : out.reverse().map((c) => ({ ...c, pages: c.pages.slice().reverse() }));
}

const placeKey = (p: Page) => (p.place.lat == null || p.place.lng == null ? null : `${p.place.lat.toFixed(2)},${p.place.lng.toFixed(2)}`);

export function stats(list: Page[]) {
  const places = new Set(list.map(placeKey).filter(Boolean));
  return {
    pages: list.length,
    places: places.size,
    photos: list.reduce((n, p) => n + p.photos.length, 0),
    chapters: new Set(list.map((p) => p.date.slice(0, 4))).size,
  };
}

export const isPinned = <T extends Page>(p: T): p is T & { place: Place & { lat: number; lng: number } } => p.place.lat != null && p.place.lng != null;
