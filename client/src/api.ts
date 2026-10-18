import type { Design } from "./book/design";
import type {
  Allowance, Billing, Book, Cover, Invite, InvitePreview, Me, Member, Page, PageDraft, Payment, Photo, Plan, Plans, PlanId, User,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const OFFLINE = "Can't reach NinRe right now. Check your connection and try again.";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: "same-origin", ...init });
  } catch {
    throw new ApiError(0, OFFLINE);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (body && typeof body.error === "string" && body.error) || `The server answered ${res.status}.`);
  return body as T;
}

const send = (method: string, data?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data ?? {}),
});

const b = (id: string) => `/api/books/${encodeURIComponent(id)}`;

export const api = {
  me: () => call<Me | { user: null }>("/api/me"),
  signup: (name: string, email: string, password: string) => call<{ user: User }>("/api/auth/signup", send("POST", { name, email, password })),
  login: (email: string, password: string) => call<{ user: User }>("/api/auth/login", send("POST", { email, password })),
  logout: () => call<void>("/api/auth/logout", send("POST")),

  rename: (name: string) => call<{ user: User }>("/api/account", send("PUT", { name })),
  changePassword: (current: string, next: string) => call<void>("/api/account/password", send("PUT", { current, next })),
  deleteAccount: (password: string) => call<void>("/api/account", send("DELETE", { password })),

  plans: () => call<Plans>("/api/plans"),
  billing: () => call<Billing>("/api/billing"),
  checkout: (plan: PlanId, months: number) => call<{ id: string; url: string }>("/api/billing/checkout", send("POST", { plan, months })),
  payment: (id: string) => call<{ payment: Payment; plan: Plan }>(`/api/billing/payments/${encodeURIComponent(id)}`),
  syncPayment: (id: string) => call<{ payment: Payment; billing: Billing }>(`/api/billing/payments/${encodeURIComponent(id)}/sync`, send("POST")),
  testPay: (id: string) => call<{ payment: Payment; billing: Billing }>(`/api/billing/payments/${encodeURIComponent(id)}/test-pay`, send("POST")),

  createBook: (cover: Partial<Cover>, design?: Design) => call<Book>("/api/books", send("POST", { ...cover, design })),
  book: (id: string) => call<Book>(b(id)),
  saveCover: (id: string, cover: Cover) => call<Cover>(`${b(id)}/cover`, send("PUT", cover)),
  saveDesign: (id: string, design: Design) => call<Design>(`${b(id)}/design`, send("PUT", design)),
  deleteBook: (id: string) => call<void>(b(id), { method: "DELETE" }),

  people: (id: string) => call<{ members: Member[]; invites: Invite[]; allowance: Allowance }>(`${b(id)}/people`),
  removePerson: (id: string, userId: string) => call<void>(`${b(id)}/people/${encodeURIComponent(userId)}`, { method: "DELETE" }),
  createInvite: (id: string) => call<Invite>(`${b(id)}/invites`, send("POST")),
  revokeInvite: (id: string, code: string) => call<void>(`${b(id)}/invites/${encodeURIComponent(code)}`, { method: "DELETE" }),
  invite: (code: string) => call<InvitePreview>(`/api/invites/${encodeURIComponent(code)}`),
  acceptInvite: (code: string) => call<{ bookId: string }>(`/api/invites/${encodeURIComponent(code)}/accept`, send("POST")),

  createPage: (id: string, draft: PageDraft) => call<Page>(`${b(id)}/pages`, send("POST", draft)),
  updatePage: (id: string, pageId: string, draft: PageDraft) => call<Page>(`${b(id)}/pages/${encodeURIComponent(pageId)}`, send("PUT", draft)),
  deletePage: (id: string, pageId: string) => call<void>(`${b(id)}/pages/${encodeURIComponent(pageId)}`, { method: "DELETE" }),

  addNote: (id: string, pageId: string, text: string, color: string) => call<Page>(`${b(id)}/pages/${encodeURIComponent(pageId)}/notes`, send("POST", { text, color })),
  editNote: (id: string, pageId: string, noteId: string, text: string, color: string) =>
    call<Page>(`${b(id)}/pages/${encodeURIComponent(pageId)}/notes/${encodeURIComponent(noteId)}`, send("PUT", { text, color })),
  deleteNote: (id: string, pageId: string, noteId: string) =>
    call<Page>(`${b(id)}/pages/${encodeURIComponent(pageId)}/notes/${encodeURIComponent(noteId)}`, { method: "DELETE" }),

  uploadPhoto(id: string, blob: Blob, width: number, height: number) {
    const form = new FormData();
    form.append("width", String(width)); // fields first, so the server sees them before the file
    form.append("height", String(height));
    form.append("photo", blob, "photo.jpg");
    return call<Photo>(`${b(id)}/photos`, { method: "POST", body: form });
  },
};

export const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
