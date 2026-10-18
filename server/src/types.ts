import type { Design } from "./design.ts";
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
  cover: Cover;
  design: Design;
  role: Role;
  owner: Person;
  members: Person[];
  counts: { pages: number; photos: number };
  coverPhotoUrl: string | null;
  updatedAt: number;
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
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
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
