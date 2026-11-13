import type { Design } from "./book/design";
import type {
  AccountSettings, Allowance, Figure, AppNotification, Billing, Book, BookKind, Cover, Invite, InvitePreview, Library, Me, Member, Page, PageDraft, Payment, Person, Photo, Plan, Plans,
  Itinerary, PlanId, PlanRequest, Profile, PublicPerson, Room, Settings, Suggestions, Trip, TripInput, User,
} from "./types";
import { API, appHeaders, forApp, isApp, setSession, type AppSession } from "./lib/native";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const OFFLINE = "Can't reach NinRe right now. Check your connection and try again.";
const NO_SERVER = "NinRe's server isn't answering right now. Try again in a moment.";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    // The phone app calls the server across origins with its bearer token; the website sends its cookie.
    res = await fetch(API + path, { credentials: isApp ? "omit" : "same-origin", ...init, headers: { ...appHeaders(), ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError(0, OFFLINE);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // NinRe's API always explains itself. A bare error means the request never reached it.
    if (body && typeof body.error === "string") throw new ApiError(res.status, body.error);
    throw new ApiError(res.status, NO_SERVER);
  }
  return forApp(body as T);
}

/** Signing in from the app returns the session it keeps; the website's is a cookie and comes back empty. */
async function signIn(path: string, data: unknown) {
  const out = await call<{ user: User; session?: AppSession; emailSent?: boolean }>(path, send("POST", data));
  if (out.session) setSession(out.session);
  return { user: out.user, emailSent: out.emailSent };
}

/** Everything the sign-up form sends. The server records which version of the terms was agreed to, and when. */
export interface SignupForm {
  name: string;
  lastName: string;
  age: number;
  phone: string;
  email: string;
  password: string;
  acceptTerms: true;
  termsVersion: string;
  profile?: Profile;
}

const send = (method: string, data?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data ?? {}),
});

const b = (id: string) => `/api/books/${encodeURIComponent(id)}`;

export const api = {
  me: () => call<Me | { user: null }>("/api/me"),
  /** Makes the account and emails a link to confirm the address. `emailSent` is false when that email couldn't go out. */
  signup: (form: SignupForm) => signIn("/api/auth/signup", form),
  /** The token from the link in the confirmation email. Works signed in or not, in any browser. */
  verifyEmail: (token: string) => call<{ email: string }>("/api/auth/verify", send("POST", { token })),
  /** Sends the confirmation link again to whoever is signed in and still waiting. */
  resendVerification: () => call<{ emailSent: boolean; verified: boolean }>("/api/auth/verify/resend", send("POST")),
  login: (email: string, password: string) => signIn("/api/auth/login", { email, password }),
  logout: () => call<void>("/api/auth/logout", send("POST")).finally(() => setSession(null)),

  /** The home page's library: the pinboard, what stands on the bookcase, and the photos that could be pinned. */
  library: () => call<Library>("/api/library"),
  saveLibrary: (room: Room) => call<Library>("/api/library", send("PUT", room)),
  /** Whether this server can read a figure off a photo (it needs Claude credentials); figures can always be made by hand. */
  figureOptions: () => call<{ fromPhoto: boolean }>("/api/figure"),
  /** A bookcase figure that looks like the person in the photo. The photo isn't kept. */
  figureFromPhoto(blob: Blob) {
    const form = new FormData();
    form.append("photo", blob, "photo.jpg");
    return call<Figure>("/api/figure", { method: "POST", body: form });
  },

  accountSettings: () => call<AccountSettings>("/api/account/settings"),
  saveProfile: (p: { name: string; username: string; bio: string; home: string; travel: Profile }) => call<{ user: User }>("/api/account/profile", send("PUT", p)),
  saveSettings: (s: Settings) => call<Settings>("/api/account/settings", send("PUT", s)),
  /** The old address keeps working until the link sent to the new one is opened; `pendingEmail` is that new address. */
  changeEmail: (email: string, password: string) =>
    call<{ user: User; pendingEmail: string | null; emailSent: boolean }>("/api/account/email", send("PUT", { email, password })),
  signOutOthers: () => call<{ sessions: number }>("/api/account/sessions/others", send("POST")),
  exportData: () => call<unknown>("/api/account/export"),
  changePassword: (current: string, next: string) => call<void>("/api/account/password", send("PUT", { current, next })),

  searchPeople: (q: string) => call<{ people: PublicPerson[] }>(`/api/people/search?q=${encodeURIComponent(q)}`),
  friends: () => call<{ following: PublicPerson[]; followers: PublicPerson[] }>("/api/people/friends"),
  follow: (userId: string) => call<PublicPerson>(`/api/people/${encodeURIComponent(userId)}/follow`, send("POST")),
  unfollow: (userId: string) => call<PublicPerson | null>(`/api/people/${encodeURIComponent(userId)}/follow`, { method: "DELETE" }),
  removeFollower: (userId: string) => call<PublicPerson | null>(`/api/people/${encodeURIComponent(userId)}/follower`, { method: "DELETE" }),

  notifications: () => call<{ items: AppNotification[]; unread: number }>("/api/notifications"),
  unreadCount: () => call<{ unread: number }>("/api/notifications/count"),
  markAllRead: () => call<{ unread: number }>("/api/notifications/read", send("POST")),
  acceptRequest: (id: string) => call<{ bookId: string }>(`/api/notifications/${encodeURIComponent(id)}/accept`, send("POST")),
  declineRequest: (id: string) => call<{ ok: true }>(`/api/notifications/${encodeURIComponent(id)}/decline`, send("POST")),
  deleteAccount: (password: string) => call<void>("/api/account", send("DELETE", { password })).then(() => setSession(null)),

  trips: () => call<{ trips: Trip[]; suggestions: boolean; planner: boolean }>("/api/trips"),
  trip: (id: string) => call<Trip>(`/api/trips/${encodeURIComponent(id)}`),
  createTrip: (t: TripInput) => call<Trip>("/api/trips", send("POST", t)),
  saveTrip: (id: string, t: TripInput) => call<Trip>(`/api/trips/${encodeURIComponent(id)}`, send("PUT", t)),
  deleteTrip: (id: string) => call<void>(`/api/trips/${encodeURIComponent(id)}`, { method: "DELETE" }),
  planTrip: (req: PlanRequest) => call<Itinerary>("/api/trips/plan", send("POST", req)),
  suggestPlaces: (destination: string, exclude: string[] = []) => call<Suggestions>("/api/trips/suggest", send("POST", { destination, exclude })),

  plans: () => call<Plans>("/api/plans"),
  billing: () => call<Billing>("/api/billing"),
  checkout: (plan: PlanId, months: number) => call<{ id: string; url: string }>("/api/billing/checkout", send("POST", { plan, months })),
  payment: (id: string) => call<{ payment: Payment; plan: Plan }>(`/api/billing/payments/${encodeURIComponent(id)}`),
  syncPayment: (id: string) => call<{ payment: Payment; billing: Billing }>(`/api/billing/payments/${encodeURIComponent(id)}/sync`, send("POST")),
  testPay: (id: string) => call<{ payment: Payment; billing: Billing }>(`/api/billing/payments/${encodeURIComponent(id)}/test-pay`, send("POST")),

  createBook: (cover: Partial<Cover>, design?: Design, kind?: BookKind) => call<Book>("/api/books", send("POST", { ...cover, design, kind })),
  book: (id: string) => call<Book>(b(id)),
  saveKind: (id: string, kind: BookKind) => call<{ kind: BookKind }>(`${b(id)}/kind`, send("PUT", { kind })),
  saveCover: (id: string, cover: Cover) => call<Cover>(`${b(id)}/cover`, send("PUT", cover)),
  saveDesign: (id: string, design: Design) => call<Design>(`${b(id)}/design`, send("PUT", design)),
  deleteBook: (id: string) => call<void>(b(id), { method: "DELETE" }),

  people: (id: string) => call<{ members: Member[]; invites: Invite[]; asked: Person[]; allowance: Allowance }>(`${b(id)}/people`),
  /** Adds a friend to a book: straight in, or as a request they accept first ("asked"). */
  addFriend: (id: string, userId: string) => call<{ status: "added" | "asked" }>(`${b(id)}/people`, send("POST", { userId })),
  cancelAsk: (id: string, userId: string) => call<void>(`${b(id)}/asked/${encodeURIComponent(userId)}`, { method: "DELETE" }),
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
