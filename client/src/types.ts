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

export interface Page {
  id: string;
  title: string;
  date: string;
  kind: string;
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
  cover: Cover;
  design: Design;
  role: Role;
  owner: Person;
  members: Person[];
  counts: { pages: number; photos: number };
  coverPhotoUrl: string | null;
  updatedAt: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
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
  place: Place;
  story: string;
  photos: { id: string; caption: string }[];
}

export type View = "chapters" | "atlas" | "album";
export type SortOrder = "asc" | "desc";
