import { DEFAULT_DESIGN, PRESETS, normalizeDesign, type Design } from "../book/design";
import type { IconName } from "../components/Icon";
import type { BookKind, HeardFrom, Profile, TravelOften, TravelWith, TripKind } from "../types";
import { BOOK_KINDS, kindOf } from "./kinds";
import { prefs } from "./prefs";

/*
 * The questions asked while signing up, one to a screen. The answers shape the first book (its kind, look, title and
 * the names on the cover) and are kept with the account (server/src/validate.ts parseProfile).
 */

export interface Choice<T extends string> {
  id: T;
  label: string;
  hint?: string;
  icon: IconName;
}

export const WITH: Choice<TravelWith>[] = [
  { id: "partner", label: "My partner", hint: "Two names on the cover", icon: "heart" },
  { id: "friends", label: "Friends", hint: "The group chat, kept in a book", icon: "people" },
  { id: "family", label: "Family", hint: "Kids, parents, the whole lot", icon: "home" },
  { id: "solo", label: "Just me", hint: "My own trips, at my own pace", icon: "user" },
  { id: "mix", label: "A bit of everyone", hint: "It depends on the trip", icon: "sparkle" },
];

export const TRIPS: Choice<TripKind>[] = [
  { id: "beach", label: "Beaches & islands", icon: "wave" },
  { id: "mountains", label: "Mountains & hikes", icon: "mountain" },
  { id: "city", label: "City breaks", icon: "city" },
  { id: "food", label: "Food trips", icon: "food" },
  { id: "road", label: "Road trips", icon: "car" },
  { id: "backpacking", label: "Backpacking", icon: "backpack" },
  { id: "weekend", label: "Weekend getaways", icon: "calendar" },
  { id: "abroad", label: "Trips abroad", icon: "globe" },
];

export const OFTEN: Choice<TravelOften>[] = [
  { id: "monthly", label: "Every month or so", hint: "Always packing for the next one", icon: "turn" },
  { id: "few", label: "A few times a year", hint: "Holidays and long weekends", icon: "calendar" },
  { id: "yearly", label: "Once a year", hint: "One big trip to look forward to", icon: "sun" },
  { id: "starting", label: "Just getting started", hint: "The first big one is coming", icon: "plane" },
];

export const HEARD: Choice<HeardFrom>[] = [
  { id: "tiktok", label: "TikTok", icon: "video" },
  { id: "instagram", label: "Instagram", icon: "camera" },
  { id: "facebook", label: "Facebook", icon: "chat" },
  { id: "friend", label: "A friend or partner", icon: "people" },
  { id: "search", label: "Searching online", icon: "search" },
  { id: "store", label: "The app store", icon: "phone" },
  { id: "other", label: "Somewhere else", icon: "more" },
];

/** Everything asked so far. Kept on the device while signing up, so leaving halfway doesn't lose it (never the email or password). */
export interface Answers extends Profile {
  name: string;
  /** Their partner's name, for the cover. Not sent as part of the profile. */
  partner: string;
}

export const NO_ANSWERS: Answers = { name: "", partner: "", travelWith: "", trips: [], often: "", keep: "", heardFrom: "", heardOther: "" };

export const readAnswers = (): Answers => ({ ...NO_ANSWERS, ...prefs.get<Partial<Answers>>("signup", {}) });
export const saveAnswers = (a: Answers) => prefs.set("signup", a);
export const clearAnswers = () => prefs.set("signup", null);

export function profileOf(a: Answers): Profile {
  const { travelWith, trips, often, keep, heardFrom, heardOther } = a;
  return { travelWith, trips, often, keep, heardFrom, heardOther: heardFrom === "other" ? heardOther.trim() : "" };
}

/** The kind of book to suggest: the photo album, for now, whoever they travel with. */
export function suggestKind(_a: Pick<Answers, "travelWith" | "trips">): BookKind {
  return "album";
}

/** Their pick, if it's still one of the kinds (an answer saved before the diary and blog were taken out isn't). */
export const kindFor = (a: Answers): BookKind => (BOOK_KINDS.some((k) => k.id === a.keep) ? (a.keep as BookKind) : suggestKind(a));

/** The title the first book gets: the kind's own, said in the singular for someone travelling alone. */
export function titleFor(a: Answers): string {
  const t = kindOf(kindFor(a)).title;
  return a.travelWith === "solo" ? t.replace(/^Our /, "My ") : t;
}

/** The names on the cover. Left empty, the cover lists everyone in the book. */
export function namesFor(a: Answers): string {
  const me = a.name.trim();
  const them = a.travelWith === "partner" ? a.partner.trim() : "";
  return me && them ? `${me} & ${them}` : "";
}

export function lookFor(a: Answers, designed: Design | null): Design {
  if (designed) return designed;
  const preset = PRESETS.find((p) => p.name === kindOf(kindFor(a)).look);
  return normalizeDesign({ ...DEFAULT_DESIGN, ...preset?.design });
}

/** "beaches, food trips and city breaks", for the line about what the book has room for. */
export function tripsPhrase(trips: TripKind[]): string {
  const words = trips.map((t) => TRIPS.find((x) => x.id === t)!.label.toLowerCase().replace(" & ", " and "));
  if (words.length === 0) return "every trip to come";
  if (words.length === 1) return words[0];
  if (words.length > 3) return `${words.slice(0, 2).join(", ")} and ${words.length - 2} more`;
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}
