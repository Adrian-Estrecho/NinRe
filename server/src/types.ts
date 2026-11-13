import type { Design } from "./design.ts";
import type { Figure } from "./figure.ts";
import type { Plan, PlanId } from "./plans.ts";

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
  color: string;
  createdAt: number;
  updatedAt: number;
}

/** What a book is for: each kind reads differently, from its pages to its contents. */
export const BOOK_KINDS = ["album", "journal"] as const;
export type BookKind = (typeof BOOK_KINDS)[number];

/** How an album page arranges its photos. Pages in other kinds of book leave it empty. */
export const PAGE_LAYOUTS = ["grid", "feature", "collage", "strip", "spread"] as const;
export type PageLayout = (typeof PAGE_LAYOUTS)[number];

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

/** One place across every book a person writes in, gathered from the pages set there. */
export interface PlaceVisit {
  name: string;
  region: string;
  lat: number | null;
  lng: number | null;
  pages: number;
  first: string;
  last: string;
  /** The latest page set here, which a tap opens. */
  bookId: string;
  pageId: string;
}

/** A page from this day (or this week) in an earlier year. */
export interface Memory {
  bookId: string;
  bookTitle: string;
  pageId: string;
  title: string;
  date: string;
  kind: string;
  place: { name: string; region: string };
  years: number;
  photo: { url: string; caption: string } | null;
}

/** What the signed-in home shows, across every book the person writes in. */
export interface Dashboard {
  totals: { books: number; pages: number; photos: number; places: number; people: number; since: string | null };
  places: PlaceVisit[];
  onThisDay: { match: "day" | "week" | "none"; pages: Memory[] };
}

/* ---------- The library: the signed-in home's pinboard and the things on top of the bookcase ---------- */

export const BOARD_MATERIALS = ["cork", "linen", "felt", "chalk", "steel"] as const;
export const PIN_STYLES = ["pin", "tape", "clip"] as const;
export const DECOR_KINDS = ["plant", "globe", "camera", "lamp", "postcards", "jar", "suitcase", "girl", "figure"] as const;
export type BoardMaterial = (typeof BOARD_MATERIALS)[number];
export type PinStyle = (typeof PIN_STYLES)[number];
export type DecorKind = (typeof DECOR_KINDS)[number];

/** How a person has arranged their library. Positions are percentages of the board, or of the bookcase's width. */
export interface Room {
  board: { material: BoardMaterial; pins: PinStyle; title: string };
  photos: { id: string; x: number; y: number; r: number }[];
  /**
   * The magnets the person has moved or written on. An id that is a lowercase country code is the magnet earned there
   * (one not listed takes a spot of its own); a code with a suffix, as in "ph-k3x9", is one they made. `text` replaces
   * the country's name on the ribbon.
   */
  magnets: { id: string; x: number; y: number; r: number; text?: string }[];
  /** A `figure` carries the traits it is drawn from. */
  decor: { k: DecorKind; x: number; fig?: Figure }[];
  /** Every minifigure the person has made, kept whether or not it's on the bookcase right now. */
  figures: Figure[];
}

/** A photo from one of the person's books, as the board and its picker show it. */
export interface BoardPhoto {
  id: string;
  url: string;
  caption: string;
  width: number;
  height: number;
  bookId: string;
  bookTitle: string;
  pageId: string;
  pageTitle: string;
}

export const DEFAULT_ROOM: Room = {
  board: { material: "cork", pins: "pin", title: "" },
  photos: [],
  magnets: [],
  decor: [{ k: "plant", x: 7 }, { k: "globe", x: 84 }],
  figures: [],
};

export interface Library {
  room: Room;
  /** The pinned photos the person can still see, in the board's order. */
  photos: BoardPhoto[];
  /** Every place on a page with a photo in the person's books; the board turns their countries into magnets. */
  visits: PlaceVisit[];
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
}

/** What someone told us while signing up, so the first book and later features fit how they travel. All of it can be skipped. */
export const TRAVEL_WITH = ["partner", "friends", "family", "solo", "mix"] as const;
export const TRIP_KINDS = ["beach", "mountains", "city", "food", "road", "backpacking", "weekend", "abroad"] as const;
export const TRAVEL_OFTEN = ["monthly", "few", "yearly", "starting"] as const;
export const HEARD_FROM = ["tiktok", "instagram", "facebook", "friend", "search", "store", "other"] as const;

export interface Profile {
  travelWith: (typeof TRAVEL_WITH)[number] | "";
  trips: (typeof TRIP_KINDS)[number][];
  often: (typeof TRAVEL_OFTEN)[number] | "";
  keep: BookKind | "";
  heardFrom: (typeof HEARD_FROM)[number] | "";
  /** Where they heard of NinRe, in their words, when it was somewhere else. */
  heardOther: string;
}

export const EMPTY_PROFILE: Profile = { travelWith: "", trips: [], often: "", keep: "", heardFrom: "", heardOther: "" };

/** The rest of the sign-up form, and which version of the terms they agreed to. Private: never shown to other people. */
export interface SignupDetails {
  lastName: string;
  /** Their age when they signed up. */
  age: number;
  /** Empty when they didn't give one. */
  phone: string;
  termsVersion: string;
}

/** The youngest someone can be to make an account. Keep in step with MIN_AGE in client/src/legal/Terms.tsx. */
export const MIN_AGE = 13;

export interface User {
  id: string;
  email: string;
  name: string;
  /** How friends find each other: lowercase letters, digits, dots and underscores. */
  username: string;
  /** They've confirmed their email from the link we sent. Until then they can only wait for it, resend it, or log out. */
  verified: boolean;
  createdAt: number;
}

/* ---------- Friends and notifications (the store fills these in) ---------- */

/** What one person sees of another: no email, nothing from their books. */
export interface PublicPerson {
  id: string;
  name: string;
  username: string;
  bio: string;
  home: string;
  /** The viewer follows them. */
  following: boolean;
  /** They follow the viewer. Both together make them friends. */
  followsYou: boolean;
}

export const NOTIFY_KINDS = ["follows", "books", "joins", "pages", "notes"] as const;
export type NotifyKind = (typeof NOTIFY_KINDS)[number];

export interface Settings {
  /** Shown in search by name. Anyone can still find them by their exact username. */
  discoverable: boolean;
  /** "friends": a friend can put them straight into a book. "ask": they get a request to accept first. */
  addToBooks: "friends" | "ask";
  /** Which notifications to keep. A request to join a book always arrives, since it waits on an answer. */
  notify: Record<NotifyKind, boolean>;
}

export const DEFAULT_SETTINGS: Settings = {
  discoverable: true,
  addToBooks: "friends",
  notify: { follows: true, books: true, joins: true, pages: true, notes: true },
};

export const NOTIFICATION_KINDS = ["follow", "book_add", "book_invite", "join", "page", "note"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface Notification {
  id: string;
  kind: NotificationKind;
  actor: Person | null;
  /** Whether the reader follows the actor, so a new follower can be followed back. */
  actorFollowed: boolean;
  book: { id: string; title: string } | null;
  pageId: string | null;
  /** A page's title, or a note's first words, as it was when this happened. */
  text: string;
  /** Pages added to the same book by the same person while unread are counted together. */
  count: number;
  /** For a request to join a book: unanswered, accepted or declined. */
  state: "" | "accepted" | "declined";
  read: boolean;
  createdAt: number;
}

/** The account's own page in settings. */
export interface AccountSettings {
  user: User;
  bio: string;
  home: string;
  travel: Profile;
  settings: Settings;
  /** Signed-in devices, this one included. */
  sessions: number;
}

export interface Subscription {
  plan: PlanId;
  paidUntil: number;
}

export interface BillingState {
  /** The plan bought, even if its time has run out. */
  plan: PlanId;
  paidUntil: number;
  /** The plan in force now: the bought plan while paid time remains, otherwise Free. */
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

/** What the client sends to create or update a page. Photos are uploaded first and referenced by id. */
export interface PageInput {
  title: string;
  date: string;
  kind: string;
  layout: PageLayout | "";
  place: Place;
  story: string;
  photos: { id: string; caption: string }[];
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
