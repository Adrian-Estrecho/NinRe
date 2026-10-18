/**
 * Plans and their limits. Prices are in centavos (₱1 = 100). `null` means unlimited.
 * Photo allowances are counted across every book a person owns.
 */
export type PlanId = "free" | "plus" | "crew";

export interface Plan {
  id: PlanId;
  name: string;
  /** Price for one month, in centavos. */
  price: number;
  books: number | null;
  members: number;
  photos: number;
}

export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", name: "Free", price: 0, books: 1, members: 2, photos: 300 },
  plus: { id: "plus", name: "Plus", price: 19900, books: null, members: 6, photos: 5000 },
  crew: { id: "crew", name: "Crew", price: 44900, books: null, members: 20, photos: 25000 },
};

export const PAID_PLANS: PlanId[] = ["plus", "crew"];

/** How many months can be paid for at once. Paid months never renew by themselves. */
export const MONTH_CHOICES = [1, 6, 12];

export const isPlanId = (v: unknown): v is PlanId => typeof v === "string" && v in PLANS;

/** Adds calendar months to a timestamp, keeping the time of day. */
export function addMonths(ms: number, months: number): number {
  const d = new Date(ms);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.getTime();
}
