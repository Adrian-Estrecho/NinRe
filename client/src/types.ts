import type { Design } from "./book/design";

export interface Place {
  name: string;
  region: string;
  code: string;
  lat: number | null;
  lng: number | null;
}

export interface Photo {
  id: string;
  url: string;
  caption: string;
  width: number;
  height: number;
}

export interface Person {
  id: string;
  name: string;
}

export interface Note {
  id: string;
  pageId: string;
  author: Person | null;
  text: string;
  color: NoteColor;
  createdAt: number;
  updatedAt: number;
}
export type NoteColor = "butter" | "blush" | "sky" | "mint" | "lilac";

/** What a book is for. Mirrors server/src/types.ts; lib/kinds.ts says how each one reads. */
export type BookKind = "album" | "journal";
/** How an album page arranges its photos; empty on other kinds of book. */
export type PageLayout = "grid" | "feature" | "collage" | "strip" | "spread";

export interface Page {
  id: string;
  title: string;
  date: string;
  kind: string;
  layout: PageLayout | "";
  place: Place;
  story: string;
  photos: Photo[];
  notes: Note[];
  author: Person | null;
  createdAt: number;
  updatedAt: number;
  /** Illustrative pages shown while the book is empty. */
  sample?: boolean;
}

/** A page with its position in the book, counted from the oldest. */
export interface NumberedPage extends Page {
  n: number;
}

export interface Cover {
  title: string;
  subtitle: string;
  since: string;
  sinceLabel: string;
}

export type Role = "owner" | "editor";

export interface Member extends Person {
  role: Role;
  joinedAt: number;
}

export interface Allowance {
  plan: PlanId;
  planName: string;
  members: number;
  photos: number;
  photosUsed: number;
}

export interface Book {
  id: string;
  kind: BookKind;
  cover: Cover;
  design: Design;
  role: Role;
  ownerId: string;
  members: Member[];
  pages: Page[];
  updatedAt: number;
  allowance: Allowance;
}

export interface BookSummary {
  id: string;
  kind: BookKind;
  cover: Cover;
  design: Design;
  role: Role;
  owner: Person;
  members: Person[];
  counts: { pages: number; photos: number };
  coverPhotoUrl: string | null;
  updatedAt: number;
}

export type BoardMaterial = "cork" | "linen" | "felt" | "chalk" | "steel";
export type PinStyle = "pin" | "tape" | "clip";
export type DecorKind = "plant" | "globe" | "camera" | "lamp" | "postcards" | "jar" | "suitcase" | "girl" | "figure";

export type HairStyle = "short" | "bob" | "long" | "pigtails" | "ponytail" | "bun" | "curly" | "bald";
/** The last four are for Plus and Crew. */
export type Outfit = "dress" | "skirt" | "trousers" | "shorts" | "suit" | "overalls" | "hoodie" | "raincoat";
/** Beret, crown and headphones are for Plus and Crew. */
export type FigureHat = "none" | "cap" | "beanie" | "sunhat" | "beret" | "crown" | "headphones";
/** Every accessory is for Plus and Crew. */
export type FigureAccessory = "none" | "backpack" | "camera" | "scarf" | "sunglasses";
export type FigureGender = "girl" | "boy" | "any";
export type FigureAge = "kid" | "adult";
export type FigureBuild = "slim" | "regular" | "broad";

/** A minifigure for the bookcase, drawn from these traits. Colours are #rrggbb. */
export interface Figure {
  name: string;
  /** Set by the person, never read off a photo. "any" draws neither lashes nor brows. */
  gender: FigureGender;
  age: FigureAge;
  build: FigureBuild;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  top: string;
  bottom: string;
  outfit: Outfit;
  shoes: string;
  glasses: boolean;
  beard: boolean;
  hat: FigureHat;
  hatColor: string;
  accessory: FigureAccessory;
  accessoryColor: string;
}

/** How a person has arranged their library. Positions are percentages of the board, or of the bookcase's width. */
export interface Room {
  board: { material: BoardMaterial; pins: PinStyle; title: string };
  /** Photos pinned before the board held magnets; kept so they aren't lost, but no longer shown. */
  photos: { id: string; x: number; y: number; r: number }[];
  /**
   * The magnets the person has moved or written on. An id that is a lowercase country code is the magnet earned there
   * (one not listed takes a spot of its own); a code with a suffix, as in "ph-k3x9", is one they made. `text` replaces
   * the country's name on the ribbon. Mirrors server/src/types.ts.
   */
  magnets: { id: string; x: number; y: number; r: number; text?: string }[];
  /** A `figure` carries the traits it is drawn from. */
  decor: { k: DecorKind; x: number; fig?: Figure }[];
  /** Every minifigure the person has made, kept whether or not it's on the bookcase right now. */
  figures: Figure[];
}

/** A place on the person's pages: pages sharing a pin, or a name, count as one. Mirrors server/src/types.ts. */
export interface PlaceVisit {
  name: string;
  region: string;
  lat: number | null;
  lng: number | null;
  pages: number;
  first: string;
  last: string;
  /** The latest page set here. */
  bookId: string;
  pageId: string;
}

/** A photo from one of the person's books, as the board and its picker show it. */
export interface BoardPhoto extends Photo {
  bookId: string;
  bookTitle: string;
  pageId: string;
  pageTitle: string;
}

export interface Library {
  room: Room;
  /** The pinned photos the person can still see. */
  photos: BoardPhoto[];
  /** Every place on a page with a photo in the person's books, latest first; the board turns their countries into magnets. */
  visits: PlaceVisit[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  /** They have confirmed their email from the link we sent. Until then the app shows only the "check your inbox" screen. */
  verified: boolean;
  createdAt: number;
}

/* ---------- Friends, notifications and settings. Mirror server/src/types.ts. ---------- */

export interface PublicPerson {
  id: string;
  name: string;
  username: string;
  bio: string;
  home: string;
  following: boolean;
  followsYou: boolean;
}

export type NotifyKind = "follows" | "books" | "joins" | "pages" | "notes";

export interface Settings {
  discoverable: boolean;
  addToBooks: "friends" | "ask";
  notify: Record<NotifyKind, boolean>;
}

export type NotificationKind = "follow" | "book_add" | "book_invite" | "join" | "page" | "note";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actor: Person | null;
  actorFollowed: boolean;
  book: { id: string; title: string } | null;
  pageId: string | null;
  text: string;
  count: number;
  state: "" | "accepted" | "declined";
  read: boolean;
  createdAt: number;
}

export interface AccountSettings {
  user: User;
  bio: string;
  home: string;
  travel: Profile;
  settings: Settings;
  sessions: number;
  /** A new email address waiting for its confirmation link to be opened; the old one works until then. */
  pendingEmail: string | null;
}

/** The sign-up answers. Mirrors server/src/types.ts; lib/onboarding.ts has the words for each choice. */
export type TravelWith = "partner" | "friends" | "family" | "solo" | "mix";
export type TripKind = "beach" | "mountains" | "city" | "food" | "road" | "backpacking" | "weekend" | "abroad";
export type TravelOften = "monthly" | "few" | "yearly" | "starting";
export type HeardFrom = "tiktok" | "instagram" | "facebook" | "friend" | "search" | "store" | "other";

export interface Profile {
  travelWith: TravelWith | "";
  trips: TripKind[];
  often: TravelOften | "";
  keep: BookKind | "";
  heardFrom: HeardFrom | "";
  heardOther: string;
}

export type PlanId = "free" | "plus" | "crew";

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  books: number | null;
  members: number;
  photos: number;
}

export interface Plans {
  currency: "PHP";
  provider: "paymongo" | "test";
  months: number[];
  plans: Plan[];
}

export interface BillingState {
  plan: PlanId;
  paidUntil: number;
  active: Plan;
  usage: { books: number; photos: number };
}

export interface Payment {
  id: string;
  plan: PlanId;
  months: number;
  amount: number;
  provider: "paymongo" | "test";
  status: "pending" | "paid";
  checkoutUrl: string | null;
  createdAt: number;
  paidAt: number | null;
}

export interface Billing extends BillingState {
  provider: "paymongo" | "test";
  payments: Payment[];
}

export interface Me {
  user: User;
  books: BookSummary[];
  billing: BillingState;
}

export interface Invite {
  code: string;
  createdAt: number;
  expiresAt: number;
}

export interface InvitePreview {
  book: { title: string; subtitle: string; design: Design; members: string[] };
  inviter: string;
  full: boolean;
  member: boolean;
  bookId: string | null;
}

export interface PageDraft {
  title: string;
  date: string;
  kind: string;
  layout: PageLayout | "";
  place: Place;
  story: string;
  photos: { id: string; caption: string }[];
}

export type SortOrder = "asc" | "desc";

/* ---------- Trip plans ---------- */

export type PlaceKind = "landmark" | "culture" | "nature" | "water" | "food" | "shopping" | "activity";

/** A place on a trip's plan. `day` is the day of the trip (1 = the first), or null for "some time". */
export interface TripPlace {
  id: string;
  name: string;
  area: string;
  kind: PlaceKind;
  note: string;
  day: number | null;
  done: boolean;
}

export interface Trip {
  id: string;
  destination: string;
  /** YYYY-MM-DD, or "" when not set. */
  start: string;
  end: string;
  /** How many days the trip lasts: follows the dates when both are set, or can be set without them. 0 when unknown. */
  days: number;
  places: TripPlace[];
  createdAt: number;
  updatedAt: number;
}

export type TripInput = Pick<Trip, "destination" | "start" | "end" | "days" | "places">;

/** A place suggested for a destination, before it's on the plan. */
export interface Suggestion {
  name: string;
  area: string;
  kind: PlaceKind;
  why: string;
  time: string;
}

export interface Suggestions {
  destination: string;
  found: boolean;
  summary: string;
  places: Suggestion[];
}

/* ---------- NinRe AI: a trip planned day by day ---------- */

export type Pace = "relaxed" | "balanced" | "packed";
export type Company = "solo" | "couple" | "friends" | "family";
export type Interest = "food" | "culture" | "nature" | "beaches" | "shopping" | "nightlife" | "adventure" | "photography";

export interface PlanRequest {
  destination: string;
  days: number;
  start: string;
  pace: Pace;
  company: Company;
  interests: Interest[];
  mustSee: string[];
}

export interface PlanStop {
  name: string;
  area: string;
  kind: PlaceKind;
  when: "Morning" | "Afternoon" | "Evening" | "All day";
  note: string;
  lat: number | null;
  lng: number | null;
}

export interface PlanDay {
  day: number;
  title: string;
  base: string;
  stops: PlanStop[];
}

export interface Itinerary {
  found: boolean;
  destination: string;
  title: string;
  summary: string;
  days: PlanDay[];
  tips: string[];
}
