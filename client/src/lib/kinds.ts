import type { BookKind, Page, PageLayout } from "../types";
import { KINDS } from "./places";

export interface KindInfo {
  id: BookKind;
  name: string;
  /** One line for the picker. */
  blurb: string;
  icon: string;
  /** The title a book of this kind gets when it's left unnamed. */
  title: string;
  /** What one page is called, and what it is tagged with. */
  unit: string;
  tag: string;
  tags: string[];
  /** The title a new page starts with. */
  fresh: string;
  /** The starting look that suits it, by preset name (book/design.ts). */
  look: string;
}

export const BOOK_KINDS: KindInfo[] = [
  {
    id: "album", name: "Photo album", blurb: "Photos first, laid out your way on every page.", icon: "album",
    title: "Our Photo Album", unit: "page", tag: "Occasion", tags: ["Trip", "Celebration", "Everyday", "Family", "Friends", "Nature", "City"], fresh: "New page", look: "Road trip",
  },
  {
    id: "journal", name: "Travel journal", blurb: "A day, a place and a story, with a stamp for every stop.", icon: "journal",
    title: "Our Book of Travels", unit: "page", tag: "Kind of day", tags: KINDS, fresh: "A new day", look: "Navy & gold",
  },
];

export const kindOf = (id: BookKind | undefined) => BOOK_KINDS.find((k) => k.id === id) ?? BOOK_KINDS[0];

export const LAYOUTS: { id: PageLayout; name: string; hint: string }[] = [
  { id: "grid", name: "Grid", hint: "Even rows across both pages" },
  { id: "feature", name: "Feature", hint: "One photo filling the left page, the rest beside it" },
  { id: "collage", name: "Mosaic", hint: "One big photo with the rest packed around it" },
  { id: "strip", name: "Film strip", hint: "Frames running down the pages" },
  { id: "spread", name: "Full spread", hint: "One photo across both pages" },
];

/** An album page that hasn't chosen yet: one photo fills the spread, a few make a feature, more make a grid. */
export function layoutOf(page: Pick<Page, "layout" | "photos">): PageLayout {
  if (page.layout) return page.layout;
  const n = page.photos.length;
  return n <= 1 ? "spread" : n <= 4 ? "feature" : "grid";
}

/** About how long a story takes to read, at 220 words a minute. */
export function readingTime(story: string): string {
  const words = story.trim() ? story.trim().split(/\s+/).length : 0;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}
