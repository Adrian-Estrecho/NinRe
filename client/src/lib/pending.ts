import { api } from "../api";
import { normalizeDesign, type Design } from "../book/design";
import { prefs } from "./prefs";

/** A title and cover someone made on the website before they had an account. */
export interface Pending {
  title: string;
  design: Design | null;
}

export function readPending(): Pending | null {
  const p = prefs.get<{ title?: unknown; design?: unknown } | null>("pending", null);
  if (!p) return null;
  return { title: typeof p.title === "string" ? p.title : "", design: p.design ? normalizeDesign(p.design as Partial<Design>) : null };
}

export const clearPending = () => prefs.set("pending", null);

/** Creates the first book from whatever was designed on the website, then forgets it. The cover lists everyone in the book until someone sets names. */
export async function createFromPending(): Promise<string> {
  const p = readPending();
  const book = await api.createBook({ title: p?.title || "" }, p?.design ?? undefined);
  clearPending();
  return book.id;
}
