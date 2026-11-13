import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { createApp } from "../src/app.ts";
import type { Mail, Mailer } from "../src/mailer.ts";
import { paymongo, type Payments } from "../src/paymongo.ts";
import { addMonths } from "../src/plans.ts";
import { fixedTripPlanner, parseItinerary, type TripPlanner } from "../src/itinerary.ts";
import { fixedPlaceSuggester, parseSuggestions, type PlaceSuggester } from "../src/trips.ts";

const FAKE_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
// Response bodies in these tests are checked field by field, so read them loosely typed.
const j = (r: Response): Promise<any> => r.json();

/** Every email the test servers "send", newest last, so tests can follow the links in them. */
const sent: Mail[] = [];
const mailer: Mailer = { kind: "log", send: async (m) => void sent.push(m) };
/** The token in the newest confirmation link sent to an address. */
function linkFor(email: string): string {
  const mail = sent.findLast((m) => m.to.toLowerCase() === email.toLowerCase());
  assert.ok(mail, `no email was sent to ${email}`);
  return /token=([A-Za-z0-9_-]+)/.exec(mail.text)![1];
}

async function start(payments?: Payments, places?: PlaceSuggester, planner?: TripPlanner) {
  const dataDir = mkdtempSync(join(tmpdir(), "ninre-test-"));
  const { app, close } = createApp({ dataDir, payments, mailer, places, planner });
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    base,
    async stop() {
      await new Promise((r) => server.close(r));
      close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

/** A person with their own cookie jar. */
function person(base: string) {
  let cookie = "";
  async function call(path: string, init: RequestInit = {}) {
    const res = await fetch(base + path, { ...init, headers: { ...(init.headers as Record<string, string>), ...(cookie ? { Cookie: cookie } : {}) } });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0];
    return res;
  }
  const send = (method: string, path: string, body?: unknown) =>
    call(path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return {
    get: (path: string) => call(path),
    post: (path: string, body?: unknown) => send("POST", path, body ?? {}),
    put: (path: string, body?: unknown) => send("PUT", path, body ?? {}),
    del: (path: string, body?: unknown) => send("DELETE", path, body),
    upload(bookId: string, bytes = FAKE_JPEG) {
      const form = new FormData();
      form.append("width", "1600");
      form.append("height", "1200");
      form.append("photo", new Blob([bytes], { type: "image/jpeg" }), "photo.jpg");
      return call(`/api/books/${bookId}/photos`, { method: "POST", body: form });
    },
    get cookie() {
      return cookie;
    },
  };
}

/** The rest of the sign-up form, which every sign-up needs: a last name, an age, and the terms agreed to. */
const FORM = { lastName: "Reyes", age: 30, acceptTerms: true, termsVersion: "2026-11-10" };

async function signup(base: string, name: string, email: string) {
  const p = person(base);
  const res = await p.post("/api/auth/signup", { name, email, password: "correct horse", ...FORM });
  assert.equal(res.status, 201);
  await confirmEmail(base, email);
  return p;
}

/** Follows the confirmation link in the newest email to that address, as the person would from their inbox. */
async function confirmEmail(base: string, email: string) {
  const res = await person(base).post("/api/auth/verify", { token: linkFor(email) });
  assert.equal(res.status, 200);
}

const PAGE = {
  title: "Five days of salt and sunburn",
  date: "2025-04-17",
  kind: "Trip",
  place: { name: "Siargao", region: "Surigao del Norte", code: "sia", lat: 9.787, lng: 126.156 },
  story: "Our first plane trip together.",
};

describe("accounts", () => {
  let t: Awaited<ReturnType<typeof start>>;
  before(async () => { t = await start(); });
  after(() => t.stop());

  test("anonymous visitors get no user, and private routes ask them to log in", async () => {
    assert.deepEqual(await j(await fetch(`${t.base}/api/me`)), { user: null });
    assert.equal((await fetch(`${t.base}/api/books/b_000000000000000000`)).status, 401);
    assert.equal((await fetch(`${t.base}/api/billing`)).status, 401);
  });

  test("signs up, sees an empty shelf on the free plan, logs out and back in", async () => {
    const mara = await signup(t.base, "Mara", "Mara@Example.com");
    const me = await j(await mara.get("/api/me"));
    assert.equal(me.user.email, "mara@example.com");
    assert.deepEqual(me.books, []);
    assert.equal(me.billing.active.id, "free");

    assert.equal((await mara.post("/api/auth/logout")).status, 200);
    assert.deepEqual(await j(await mara.get("/api/me")), { user: null });

    const bad = await mara.post("/api/auth/login", { email: "mara@example.com", password: "wrong one" });
    assert.equal(bad.status, 401);
    const ok = await mara.post("/api/auth/login", { email: "MARA@example.com", password: "correct horse" });
    assert.equal(ok.status, 200);
    assert.equal((await j(await mara.get("/api/me"))).user.name, "Mara");
  });

  test("refuses duplicate emails, weak passwords and cross-site posts", async () => {
    const p = person(t.base);
    assert.equal((await p.post("/api/auth/signup", { name: "M", email: "mara@example.com", password: "correct horse", ...FORM })).status, 409);
    assert.equal((await p.post("/api/auth/signup", { name: "Z", email: "z@example.com", password: "short", ...FORM })).status, 400);
    const cross = await fetch(`${t.base}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ name: "E", email: "e@example.com", password: "correct horse", ...FORM }),
    });
    assert.equal(cross.status, 403);
  });

  test("needs the terms agreed to, a last name and an age of 13 or more; the phone number is optional", async () => {
    const p = person(t.base);
    const base = { name: "Rae", email: "rae@example.com", password: "correct horse", ...FORM };
    const status = async (body: object) => (await p.post("/api/auth/signup", body)).status;
    assert.equal(await status({ ...base, acceptTerms: undefined }), 400);
    assert.equal(await status({ ...base, acceptTerms: "yes" }), 400);
    assert.equal(await status({ ...base, termsVersion: "" }), 400);
    assert.equal(await status({ ...base, lastName: "  " }), 400);
    assert.equal(await status({ ...base, age: 12 }), 400);
    assert.equal(await status({ ...base, age: "30" }), 400);
    assert.equal(await status({ ...base, age: 30.5 }), 400);
    assert.equal(await status({ ...base, phone: "call me" }), 400);
    assert.equal(await status({ ...base, phone: "123" }), 400);
    assert.equal(await status({ ...base, phone: "+63 912 345 6789" }), 201);
    assert.equal(await status({ ...base, email: "rae2@example.com", phone: undefined, age: 13 }), 201);
  });

  test("a new account waits for its email to be confirmed from the link sent to it", async () => {
    const p = person(t.base);
    const res = await p.post("/api/auth/signup", { name: "Vi", email: "Vi@Example.com", password: "correct horse", ...FORM });
    assert.equal(res.status, 201);
    const body = await j(res);
    assert.equal(body.user.verified, false);
    assert.equal(body.emailSent, true);
    assert.match(sent.at(-1)!.text, /\/verify-email\?token=/);

    // Signed in, but nothing works until the email is confirmed.
    assert.equal((await j(await p.get("/api/me"))).user.verified, false);
    const blocked = await p.post("/api/books", { title: "Too soon" });
    assert.equal(blocked.status, 403);
    assert.equal((await j(blocked)).code, "verify");

    // Asking again sends a new link, and only the newest one works.
    const first = linkFor("vi@example.com");
    assert.equal((await j(await p.post("/api/auth/verify/resend"))).emailSent, true);
    const second = linkFor("vi@example.com");
    assert.notEqual(first, second);
    const anyone = person(t.base);
    assert.equal((await anyone.post("/api/auth/verify", { token: first })).status, 400);
    assert.equal((await anyone.post("/api/auth/verify", { token: "not-a-real-token-at-all-000" })).status, 400);

    // The link works from any browser, once.
    const ok = await anyone.post("/api/auth/verify", { token: second });
    assert.equal(ok.status, 200);
    assert.equal((await j(ok)).email, "vi@example.com");
    assert.equal((await anyone.post("/api/auth/verify", { token: second })).status, 400);
    assert.equal((await j(await p.get("/api/me"))).user.verified, true);
    assert.equal((await p.post("/api/books", { title: "Now" })).status, 201);

    // A confirmed address can't be signed up for again; an unconfirmed one goes to whoever can confirm it.
    assert.equal((await person(t.base).post("/api/auth/signup", { name: "X", email: "vi@example.com", password: "correct horse", ...FORM })).status, 409);
    const typo = person(t.base);
    assert.equal((await typo.post("/api/auth/signup", { name: "Typo", email: "owner@example.com", password: "correct horse", ...FORM })).status, 201);
    assert.equal((await person(t.base).post("/api/auth/signup", { name: "Owner", email: "owner@example.com", password: "correct horse", ...FORM })).status, 201);
    assert.equal((await j(await typo.get("/api/me"))).user, null);
  });

  test("a new email only replaces the old one once it's confirmed", async () => {
    const p = await signup(t.base, "Cy", "cy@example.com");
    assert.equal((await p.put("/api/account/email", { email: "cy.new@example.com", password: "wrong" })).status, 403);
    const res = await j(await p.put("/api/account/email", { email: "cy.new@example.com", password: "correct horse" }));
    assert.equal(res.user.email, "cy@example.com");
    assert.equal(res.pendingEmail, "cy.new@example.com");
    assert.equal((await j(await p.get("/api/account/settings"))).pendingEmail, "cy.new@example.com");
    // Still usable, and still logs in with the old address while waiting.
    assert.equal((await p.get("/api/dashboard")).status, 200);
    await confirmEmail(t.base, "cy.new@example.com");
    const me = (await j(await p.get("/api/me"))).user;
    assert.equal(me.email, "cy.new@example.com");
    assert.equal(me.verified, true);
    assert.equal((await j(await p.get("/api/account/settings"))).pendingEmail, null);
  });

  test("keeps the sign-up answers, and refuses ones that aren't on the lists", async () => {
    const p = person(t.base);
    const profile = { travelWith: "partner", trips: ["beach", "food", "beach"], often: "few", keep: "album", heardFrom: "other", heardOther: "  A wedding  " };
    assert.equal((await p.post("/api/auth/signup", { name: "Lia", email: "lia@example.com", password: "correct horse", ...FORM, profile })).status, 201);
    await confirmEmail(t.base, "lia@example.com");
    assert.deepEqual(await j(await p.get("/api/account/profile")), { ...profile, trips: ["beach", "food"], heardOther: "A wedding" });

    const q = person(t.base);
    const base = { name: "Q", email: "q@example.com", password: "correct horse", ...FORM };
    assert.equal((await q.post("/api/auth/signup", { ...base, profile: { travelWith: "aliens" } })).status, 400);
    assert.equal((await q.post("/api/auth/signup", { ...base, profile: { trips: ["moon"] } })).status, 400);
    assert.equal((await q.post("/api/auth/signup", base)).status, 201);
    await confirmEmail(t.base, "q@example.com");
    assert.deepEqual(await j(await q.get("/api/account/profile")), { travelWith: "", trips: [], often: "", keep: "", heardFrom: "", heardOther: "" });
  });

  test("changing the password needs the current one", async () => {
    const p = await signup(t.base, "Pat", "pat@example.com");
    assert.equal((await p.put("/api/account/password", { current: "nope", next: "a new password" })).status, 403);
    assert.equal((await p.put("/api/account/password", { current: "correct horse", next: "a new password" })).status, 200);
    await p.post("/api/auth/logout");
    assert.equal((await p.post("/api/auth/login", { email: "pat@example.com", password: "a new password" })).status, 200);
  });

  test("the phone app signs in with a bearer token and loads photos with its photo key", async () => {
    const app = (path: string, init: RequestInit = {}, token?: string) => fetch(t.base + path, {
      ...init,
      headers: { "Content-Type": "application/json", Origin: "https://localhost", "X-NinRe-App": "1", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers as Record<string, string>) },
    });

    const pre = await app("/api/me", { method: "OPTIONS", headers: { "Access-Control-Request-Method": "PUT" } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get("access-control-allow-origin"), "https://localhost");
    assert.match(pre.headers.get("access-control-allow-headers") ?? "", /Authorization/);

    const res = await app("/api/auth/signup", { method: "POST", body: JSON.stringify({ name: "Ana", email: "ana@example.com", password: "correct horse", ...FORM }) });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get("set-cookie"), null);
    const { session } = await j(res);
    assert.match(session.token, /^[A-Za-z0-9_-]{43}$/);
    assert.match(session.photoKey, /^[a-f0-9]{64}$/);
    assert.equal((await j(await app("/api/me", {}, session.token))).user.name, "Ana");
    await confirmEmail(t.base, "ana@example.com");

    const book = await j(await app("/api/books", { method: "POST", body: JSON.stringify({ title: "On the road" }) }, session.token));
    const form = new FormData();
    form.append("width", "10"); form.append("height", "10");
    form.append("photo", new Blob([FAKE_JPEG], { type: "image/jpeg" }), "p.jpg");
    const photo = await j(await fetch(`${t.base}/api/books/${book.id}/photos`, { method: "POST", body: form, headers: { Origin: "https://localhost", Authorization: `Bearer ${session.token}` } }));
    await app(`/api/books/${book.id}/pages`, { method: "POST", body: JSON.stringify({ ...PAGE_FOR_APP, photos: [{ id: photo.id, caption: "" }] }) }, session.token);
    assert.equal((await fetch(`${t.base}${photo.url}?k=${session.photoKey}`)).status, 200);
    assert.equal((await fetch(`${t.base}${photo.url}?k=${"0".repeat(64)}`)).status, 401);
    // The photo key opens photos and nothing else.
    assert.equal((await fetch(`${t.base}/api/me?k=${session.photoKey}`).then(j)).user, null);

    await app("/api/auth/logout", { method: "POST" }, session.token);
    assert.equal((await j(await app("/api/me", {}, session.token))).user, null);
    assert.equal((await fetch(`${t.base}${photo.url}?k=${session.photoKey}`)).status, 401);
  });
});

const PAGE_FOR_APP = { title: "First stop", date: "2025-04-17", kind: "Trip", place: { name: "Siargao" }, story: "" };

describe("a shared book", () => {
  let t: Awaited<ReturnType<typeof start>>;
  let mara: ReturnType<typeof person>, josh: ReturnType<typeof person>, kai: ReturnType<typeof person>;
  let bookId = "";
  before(async () => {
    t = await start();
    mara = await signup(t.base, "Mara", "mara@example.com");
    josh = await signup(t.base, "Josh", "josh@example.com");
    kai = await signup(t.base, "Kai", "kai@example.com");
  });
  after(() => t.stop());

  test("creates a book with a design, and Free allows only one", async () => {
    const res = await mara.post("/api/books", { title: "Salt & Sunburn", design: { cloth: "#B5532F", foil: "silver", stickers: [{ k: "plane", x: 20, y: 30, r: -8, s: 1 }] } });
    assert.equal(res.status, 201);
    const book = await j(res);
    bookId = book.id;
    assert.equal(book.cover.title, "Salt & Sunburn");
    assert.equal(book.design.cloth, "#b5532f");
    assert.equal(book.design.foil, "silver");
    assert.equal(book.design.stickers.length, 1);
    assert.equal(book.role, "owner");
    assert.equal(book.kind, "album");

    const second = await mara.post("/api/books", { title: "Another" });
    assert.equal(second.status, 402);
  });

  test("rejects designs outside the choices", async () => {
    assert.equal((await mara.put(`/api/books/${bookId}/design`, { foil: "platinum" })).status, 400);
    assert.equal((await mara.put(`/api/books/${bookId}/design`, { cloth: "red" })).status, 400);
    assert.equal((await mara.put(`/api/books/${bookId}/design`, { stickers: [{ k: "skull", x: 1, y: 1, r: 0, s: 1 }] })).status, 400);
  });

  test("keeps books private to their members", async () => {
    assert.equal((await josh.get(`/api/books/${bookId}`)).status, 404);
    assert.equal((await josh.post(`/api/books/${bookId}/pages`, PAGE)).status, 404);
  });

  test("invites a partner by link; a third person is refused on Free", async () => {
    const inv = await j(await mara.post(`/api/books/${bookId}/invites`));
    assert.match(inv.code, /^[A-Za-z0-9_-]{12}$/);

    const preview = await j(await fetch(`${t.base}/api/invites/${inv.code}`));
    assert.equal(preview.book.title, "Salt & Sunburn");
    assert.equal(preview.inviter, "Mara");
    assert.equal(preview.full, false);

    assert.equal((await josh.post(`/api/invites/${inv.code}/accept`)).status, 200);
    const book = await j(await josh.get(`/api/books/${bookId}`));
    assert.equal(book.role, "editor");
    assert.deepEqual(book.members.map((m: { name: string }) => m.name), ["Mara", "Josh"]);

    assert.equal((await kai.post(`/api/invites/${inv.code}/accept`)).status, 402);
    assert.equal((await mara.post(`/api/books/${bookId}/invites`)).status, 402);
  });

  test("both write pages with photos; photos are only served to members", async () => {
    const up = await josh.upload(bookId);
    assert.equal(up.status, 201);
    const photo = await j(up);
    const res = await josh.post(`/api/books/${bookId}/pages`, { ...PAGE, photos: [{ id: photo.id, caption: "the swing" }] });
    assert.equal(res.status, 201);
    const page = await j(res);
    assert.equal(page.author.name, "Josh");
    assert.equal(page.place.code, "SIA");
    assert.equal(page.photos[0].caption, "the swing");

    assert.equal((await mara.get(page.photos[0].url)).status, 200);
    assert.equal((await kai.get(page.photos[0].url)).status, 404);
    assert.equal((await fetch(t.base + page.photos[0].url)).status, 401);

    const edited = await j(await mara.put(`/api/books/${bookId}/pages/${page.id}`, { ...PAGE, title: "Salt, sun, scooters", photos: [{ id: photo.id, caption: "" }] }));
    assert.equal(edited.title, "Salt, sun, scooters");
    assert.equal(edited.author.name, "Josh");

    const designed = await mara.put(`/api/books/${bookId}/design`, { coverPhoto: photo.id });
    assert.equal(designed.status, 200);
    const shelf = await j(await mara.get("/api/me"));
    assert.equal(shelf.books[0].coverPhotoUrl, page.photos[0].url);
  });

  test("a book can become an album, whose pages keep how their photos are laid out", async () => {
    assert.equal((await mara.put(`/api/books/${bookId}/kind`, { kind: "scrapbook" })).status, 400);
    assert.deepEqual(await j(await josh.put(`/api/books/${bookId}/kind`, { kind: "album" })), { kind: "album" });
    assert.equal((await j(await mara.get("/api/me"))).books[0].kind, "album");

    assert.equal((await mara.post(`/api/books/${bookId}/pages`, { ...PAGE, layout: "mosaic" })).status, 400);
    const page = await j(await mara.post(`/api/books/${bookId}/pages`, { ...PAGE, layout: "collage" }));
    assert.equal(page.layout, "collage");
    const moved = await j(await mara.put(`/api/books/${bookId}/pages/${page.id}`, { ...PAGE, layout: "strip" }));
    assert.equal(moved.layout, "strip");
    const plain = await j(await mara.put(`/api/books/${bookId}/pages/${page.id}`, PAGE));
    assert.equal(plain.layout, "");

    assert.equal((await mara.del(`/api/books/${bookId}/pages/${page.id}`)).status, 204);
    await mara.put(`/api/books/${bookId}/kind`, { kind: "journal" });
  });

  test("notes belong to their writer; the owner can tidy them away", async () => {
    const page = (await j(await mara.get(`/api/books/${bookId}`))).pages[0];
    const withNote = await j(await josh.post(`/api/books/${bookId}/pages/${page.id}/notes`, { text: "Best fish of my life", color: "sky" }));
    const note = withNote.notes[0];
    assert.equal(note.author.name, "Josh");
    assert.equal(note.color, "sky");

    assert.equal((await mara.put(`/api/books/${bookId}/pages/${page.id}/notes/${note.id}`, { text: "edited by Mara" })).status, 403);
    assert.equal((await josh.put(`/api/books/${bookId}/pages/${page.id}/notes/${note.id}`, { text: "Best grilled fish of my life", color: "mint" })).status, 200);
    const after = await j(await mara.del(`/api/books/${bookId}/pages/${page.id}/notes/${note.id}`));
    assert.deepEqual(after.notes, []);
  });

  test("the home gathers totals, places and this day in earlier years across a person's books", async () => {
    await mara.post(`/api/books/${bookId}/pages`, { ...PAGE, title: "Back on the boardwalk", date: "2026-04-20" });
    await mara.post(`/api/books/${bookId}/pages`, { ...PAGE, title: "Taal, for ten seconds", date: "2024-04-17", place: { name: "Tagaytay", region: "Cavite", lat: 14.1153, lng: 120.9621 } });

    const home = await j(await mara.get("/api/dashboard?today=2026-04-17"));
    assert.deepEqual(home.totals, { books: 1, pages: 3, photos: 1, places: 2, people: 1, since: "2024-04-17" });
    assert.deepEqual(home.places.map((p: { name: string; pages: number; last: string }) => [p.name, p.pages, p.last]), [["Siargao", 2, "2026-04-20"], ["Tagaytay", 1, "2024-04-17"]]);
    assert.equal(home.onThisDay.match, "day");
    assert.deepEqual(home.onThisDay.pages.map((p: { title: string; years: number }) => [p.title, p.years]), [["Salt, sun, scooters", 1], ["Taal, for ten seconds", 2]]);
    assert.equal(home.onThisDay.pages[0].bookTitle, "Salt & Sunburn");
    assert.match(home.onThisDay.pages[0].photo.url, new RegExp(`^/uploads/${bookId}/`));
    assert.equal(home.onThisDay.pages[1].photo, null);

    // Nothing on the day itself, so the week around it; then nothing at all.
    const week = await j(await josh.get("/api/dashboard?today=2027-04-15"));
    assert.equal(week.onThisDay.match, "week");
    assert.equal(week.onThisDay.pages.length, 2);
    assert.equal((await j(await josh.get("/api/dashboard?today=2026-12-01"))).onThisDay.match, "none");

    const empty = await j(await kai.get("/api/dashboard"));
    assert.deepEqual(empty.totals, { books: 0, pages: 0, photos: 0, places: 0, people: 0, since: null });
    assert.equal((await fetch(`${t.base}/api/dashboard`)).status, 401);
  });

  test("the library pins photos from a person's own books and keeps the room as arranged", async () => {
    const fresh = await j(await kai.get("/api/library"));
    assert.equal(fresh.room.board.material, "cork");
    assert.deepEqual(fresh.photos, []);

    const choices = await j(await josh.get("/api/library/photos"));
    assert.equal(choices.length, 1);
    assert.equal(choices[0].bookTitle, "Salt & Sunburn");
    const photoId = choices[0].id;

    const room = { board: { material: "chalk", pins: "tape", title: "Best of the year" }, photos: [{ id: photoId, x: 40, y: 120, r: 30 }], decor: [{ k: "lamp", x: 50 }] };
    const saved = await j(await josh.put("/api/library", room));
    assert.deepEqual(saved.room.board, room.board);
    assert.deepEqual(saved.room.photos, [{ id: photoId, x: 40, y: 100, r: 12 }]);
    assert.equal(saved.photos[0].pageTitle, "Salt, sun, scooters");
    assert.deepEqual((await j(await josh.get("/api/library"))).room, saved.room);

    // Someone outside the book can't pin its photos, and nobody can put just anything on the bookcase.
    assert.equal((await kai.put("/api/library", { ...room, decor: [] })).status, 400);
    assert.equal((await josh.put("/api/library", { ...room, decor: [{ k: "piano", x: 10 }] })).status, 400);
    assert.equal((await fetch(`${t.base}/api/library`)).status, 401);
  });

  test("the library lists the places on a person's pages with photos, and keeps what their magnets say", async () => {
    const lib = await j(await josh.get("/api/library"));
    assert.ok(lib.visits.length > 0);
    assert.ok(lib.visits.every((v: { bookId: string; pageId: string; pages: number }) => v.bookId && v.pageId && v.pages > 0));
    // Only a page with a photo on it earns its country.
    const withPhotos = new Set((await j(await josh.get("/api/library/photos"))).map((p: { pageId: string }) => p.pageId));
    assert.ok(lib.visits.every((v: { pageId: string }) => withPhotos.has(v.pageId)));
    const dash = await j(await josh.get("/api/dashboard"));
    assert.ok(dash.places.length >= lib.visits.length);
    assert.deepEqual((await j(await kai.get("/api/library"))).visits, []);

    const room = { ...lib.room, board: { ...lib.room.board, material: "steel" }, magnets: [{ id: "jp", x: 30, y: -5, r: 20 }] };
    const saved = await j(await josh.put("/api/library", room));
    assert.equal(saved.room.board.material, "steel");
    assert.deepEqual(saved.room.magnets, [{ id: "jp", x: 30, y: 0, r: 12 }]);
    assert.equal((await josh.put("/api/library", { ...room, magnets: [{ id: "japan", x: 1, y: 1, r: 0 }] })).status, 400);

    // Magnets the person made, with words of their own; blank words aren't kept.
    const made = [{ id: "ph", x: 20, y: 50, r: 0, text: "  Palawan " }, { id: "ph-k3x9", x: 60, y: 50, r: 2, text: "Vigan" }, { id: "jp", x: 80, y: 40, r: 0, text: " " }];
    const withWords = await j(await josh.put("/api/library", { ...room, magnets: made }));
    assert.deepEqual(withWords.room.magnets, [{ id: "ph", x: 20, y: 50, r: 0, text: "Palawan" }, { id: "ph-k3x9", x: 60, y: 50, r: 2, text: "Vigan" }, { id: "jp", x: 80, y: 40, r: 0 }]);
    assert.equal((await josh.put("/api/library", { ...room, magnets: [{ id: "ph", x: 1, y: 1, r: 0, text: "x".repeat(17) }] })).status, 400);
    assert.equal((await josh.put("/api/library", { ...room, magnets: [{ id: "jp", x: 1, y: 1, r: 0 }, { id: "jp", x: 2, y: 2, r: 0 }] })).status, 400);
  });

  test("a member can leave; only the owner deletes the book", async () => {
    const book = await j(await mara.get(`/api/books/${bookId}`));
    const joshId = book.members[1].id;
    assert.equal((await josh.del(`/api/books/${bookId}`)).status, 403);
    assert.equal((await josh.del(`/api/books/${bookId}/people/${joshId}`)).status, 204);
    assert.equal((await josh.get(`/api/books/${bookId}`)).status, 404);
    assert.equal((await mara.del(`/api/books/${bookId}`)).status, 204);
    assert.deepEqual((await j(await mara.get("/api/me"))).books, []);
  });
});

describe("billing", () => {
  test("test checkout upgrades to Plus, lifting the book and member limits", async () => {
    const t = await start();
    try {
      const mara = await signup(t.base, "Mara", "mara@example.com");
      const plans = await j(await fetch(`${t.base}/api/plans`));
      assert.equal(plans.provider, "test");
      assert.deepEqual(plans.plans.map((p: { id: string; price: number }) => [p.id, p.price]), [["free", 0], ["plus", 19900], ["crew", 44900]]);

      assert.equal((await mara.post("/api/billing/checkout", { plan: "free", months: 1 })).status, 400);
      assert.equal((await mara.post("/api/billing/checkout", { plan: "plus", months: 5 })).status, 400);
      const co = await j(await mara.post("/api/billing/checkout", { plan: "plus", months: 6 }));
      assert.equal(co.url, `/checkout/test/${co.id}`);

      const pending = await j(await mara.get(`/api/billing/payments/${co.id}`));
      assert.equal(pending.payment.status, "pending");
      assert.equal(pending.payment.amount, 19900 * 6);

      const paid = await j(await mara.post(`/api/billing/payments/${co.id}/test-pay`));
      assert.equal(paid.payment.status, "paid");
      assert.equal(paid.billing.active.id, "plus");
      const months = (paid.billing.paidUntil - Date.now()) / 864e5;
      assert.ok(months > 180 && months < 186, `about six months, got ${months} days`);

      // Paying twice for the same checkout changes nothing.
      const again = await j(await mara.post(`/api/billing/payments/${co.id}/test-pay`));
      assert.equal(again.billing.paidUntil, paid.billing.paidUntil);

      assert.equal((await mara.post("/api/books", { title: "One" })).status, 201);
      assert.equal((await mara.post("/api/books", { title: "Two" })).status, 201);

      const josh = await signup(t.base, "Josh", "josh@example.com");
      assert.equal((await josh.post(`/api/billing/payments/${co.id}/test-pay`)).status, 404);
    } finally {
      await t.stop();
    }
  });

  test("PayMongo webhooks are checked against their signature", async () => {
    const secret = "whsk_test";
    const t = await start(paymongo({ secretKey: "sk_test_x", webhookSecret: secret, methods: ["card"], log: () => {} }));
    try {
      const body = JSON.stringify({ data: { attributes: { type: "checkout_session.payment.paid", data: { id: "cs_unknown", attributes: {} } } } });
      const ts = Math.floor(Date.now() / 1000);
      const sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
      const post = (header: string) => fetch(`${t.base}/api/billing/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "Paymongo-Signature": header }, body });
      assert.equal((await post(`t=${ts},te=${"0".repeat(64)},li=`)).status, 401);
      assert.equal((await post(`t=${ts},te=${sig},li=`)).status, 200);
    } finally {
      await t.stop();
    }
  });

  test("adds calendar months without spilling into the next month", () => {
    assert.equal(new Date(addMonths(Date.UTC(2026, 0, 31), 1)).toISOString().slice(0, 10), "2026-02-28");
    assert.equal(new Date(addMonths(Date.UTC(2026, 10, 15), 12)).toISOString().slice(0, 10), "2027-11-15");
  });
});

describe("profile and settings", () => {
  let t: Awaited<ReturnType<typeof start>>;
  before(async () => { t = await start(); });
  after(() => t.stop());

  test("every account gets a username from its name; the profile and settings can be changed", async () => {
    const ana = await signup(t.base, "Ana Reyes", "ana@example.com");
    const twin = await signup(t.base, "Ana Reyes", "ana2@example.com");
    const a = await j(await ana.get("/api/account/settings"));
    const b = await j(await twin.get("/api/account/settings"));
    assert.equal(a.user.username, "anareyes");
    assert.match(b.user.username, /^anareyes\d{2,}$/);
    assert.equal(a.settings.discoverable, true);
    assert.equal(a.settings.notify.pages, true);
    assert.equal(a.sessions, 1);

    const travel = { travelWith: "friends", trips: ["beach"], often: "few", keep: "album", heardFrom: "", heardOther: "" };
    assert.equal((await ana.put("/api/account/profile", { name: "Ana", username: b.user.username, bio: "", home: "", travel })).status, 409);
    assert.equal((await ana.put("/api/account/profile", { name: "Ana", username: "no spaces", travel })).status, 400);
    const saved = await j(await ana.put("/api/account/profile", { name: "Ana", username: "@Ana.Travels", bio: "Island hopper", home: "Cebu", travel }));
    assert.equal(saved.user.username, "ana.travels");
    const again = await j(await ana.get("/api/account/settings"));
    assert.equal(again.bio, "Island hopper");
    assert.equal(again.travel.keep, "album");

    const s = await j(await ana.put("/api/account/settings", { discoverable: false, addToBooks: "ask", notify: { pages: false } }));
    assert.deepEqual(s, { discoverable: false, addToBooks: "ask", notify: { follows: true, books: true, joins: true, pages: false, notes: true } });
  });

  test("changing the email needs the password and a free address", async () => {
    const lea = await signup(t.base, "Lea", "lea@example.com");
    assert.equal((await lea.put("/api/account/email", { email: "lea@new.example", password: "wrong one" })).status, 403);
    assert.equal((await lea.put("/api/account/email", { email: "ana@example.com", password: "correct horse" })).status, 409);
    const ok = await j(await lea.put("/api/account/email", { email: "Lea@New.example", password: "correct horse" }));
    // The new address waits for its confirmation link before it replaces the old one.
    assert.equal(ok.user.email, "lea@example.com");
    assert.equal(ok.pendingEmail, "lea@new.example");
    await confirmEmail(t.base, "lea@new.example");
    assert.equal((await j(await lea.get("/api/me"))).user.email, "lea@new.example");
  });

  test("signs out other devices and exports the account's data", async () => {
    const tom = await signup(t.base, "Tom", "tom@example.com");
    const laptop = person(t.base);
    await laptop.post("/api/auth/login", { email: "tom@example.com", password: "correct horse" });
    assert.equal((await j(await tom.get("/api/account/settings"))).sessions, 2);
    assert.equal((await j(await tom.post("/api/account/sessions/others"))).sessions, 1);
    assert.equal((await j(await laptop.get("/api/me"))).user, null);

    await tom.post("/api/books", { title: "Tom's trips" });
    const res = await tom.get("/api/account/export");
    assert.match(res.headers.get("content-disposition") ?? "", /attachment; filename="ninre-tom.json"/);
    const data = await j(res);
    assert.equal(data.account.email, "tom@example.com");
    assert.equal(data.books[0].cover.title, "Tom's trips");
    assert.equal(data.account.passHash, undefined);
  });
});

describe("friends and notifications", () => {
  let t: Awaited<ReturnType<typeof start>>;
  let mara: ReturnType<typeof person>, josh: ReturnType<typeof person>, kai: ReturnType<typeof person>;
  const ids: Record<string, string> = {};
  before(async () => {
    t = await start();
    mara = await signup(t.base, "Mara", "mara@example.com");
    josh = await signup(t.base, "Josh", "josh@example.com");
    kai = await signup(t.base, "Kai", "kai@example.com");
    for (const [k, p] of Object.entries({ mara, josh, kai })) ids[k] = (await j(await p.get("/api/me"))).user.id;
  });
  after(() => t.stop());

  test("finds people by name or username; someone hidden from search is found only by their exact username", async () => {
    const found = await j(await mara.get("/api/people/search?q=jo"));
    assert.deepEqual(found.people.map((p: { username: string }) => p.username), ["josh"]);
    assert.equal(found.people[0].email, undefined);
    assert.equal((await j(await mara.get("/api/people/search?q=mara"))).people.length, 0, "you don't find yourself");

    await kai.put("/api/account/settings", { discoverable: false });
    assert.equal((await j(await mara.get("/api/people/search?q=ka"))).people.length, 0);
    assert.equal((await j(await mara.get("/api/people/search?q=@kai"))).people[0].id, ids.kai);
    await kai.put("/api/account/settings", { discoverable: true });
  });

  test("following notifies once; following back makes friends; a follower can be removed", async () => {
    assert.equal((await mara.post(`/api/people/${ids.mara}/follow`)).status, 400);
    await mara.post(`/api/people/${ids.josh}/follow`);
    await mara.del(`/api/people/${ids.josh}/follow`);
    const p = await j(await mara.post(`/api/people/${ids.josh}/follow`));
    assert.equal(p.following, true);
    assert.equal(p.followsYou, false);

    const n = await j(await josh.get("/api/notifications"));
    assert.equal(n.unread, 1);
    assert.equal(n.items[0].kind, "follow");
    assert.equal(n.items[0].actor.name, "Mara");
    assert.equal(n.items[0].actorFollowed, false);

    await josh.post(`/api/people/${ids.mara}/follow`);
    const friends = await j(await mara.get("/api/people/friends"));
    assert.equal(friends.following[0].followsYou, true);
    assert.equal(friends.followers[0].id, ids.josh);
    assert.equal((await j(await josh.post("/api/notifications/read"))).unread, 0);

    await kai.post(`/api/people/${ids.mara}/follow`);
    await mara.del(`/api/people/${ids.kai}/follower`);
    assert.equal((await j(await mara.get("/api/people/friends"))).followers.length, 1);
  });

  test("an owner adds a friend straight into a book; others need an invite link", async () => {
    const book = await j(await mara.post("/api/books", { title: "Bohol" }));
    assert.equal((await mara.post(`/api/books/${book.id}/people`, { userId: ids.kai })).status, 403, "not friends");
    assert.equal((await josh.post(`/api/books/${book.id}/people`, { userId: ids.mara })).status, 404, "not in the book");
    assert.deepEqual(await j(await mara.post(`/api/books/${book.id}/people`, { userId: ids.josh })), { status: "added" });
    assert.equal((await mara.post(`/api/books/${book.id}/people`, { userId: ids.josh })).status, 409);
    assert.equal((await j(await josh.get(`/api/books/${book.id}`))).role, "editor");

    const n = await j(await josh.get("/api/notifications"));
    assert.equal(n.items[0].kind, "book_add");
    assert.equal(n.items[0].book.title, "Bohol");

    // Pages from one person in one book collect into one notification; notes reach the page's writer.
    const p1 = await j(await josh.post(`/api/books/${book.id}/pages`, PAGE));
    await josh.post(`/api/books/${book.id}/pages`, { ...PAGE, title: "Chocolate Hills" });
    const forMara = await j(await mara.get("/api/notifications"));
    const pages = forMara.items.filter((i: { kind: string }) => i.kind === "page");
    assert.equal(pages.length, 1);
    assert.equal(pages[0].count, 2);
    assert.equal(pages[0].text, "Chocolate Hills");
    await mara.post(`/api/books/${book.id}/pages/${p1.id}/notes`, { text: "Best day of the trip", color: "sky" });
    const note = (await j(await josh.get("/api/notifications"))).items[0];
    assert.equal(note.kind, "note");
    assert.equal(note.text, "Best day of the trip");

    // Leaving the book clears its news.
    await josh.del(`/api/books/${book.id}/people/${ids.josh}`);
    assert.equal((await j(await josh.get("/api/notifications"))).items.some((i: { book: { id: string } | null }) => i.book?.id === book.id), false);
  });

  test("someone who asked to be asked gets a request to accept, and the owner hears when they join", async () => {
    await josh.put("/api/account/settings", { addToBooks: "ask", notify: { pages: false } });
    const book = (await j(await mara.get("/api/me"))).books[0];
    assert.deepEqual(await j(await mara.post(`/api/books/${book.id}/people`, { userId: ids.josh })), { status: "asked" });
    assert.equal((await josh.get(`/api/books/${book.id}`)).status, 404, "not in until they accept");
    assert.deepEqual((await j(await mara.get(`/api/books/${book.id}/people`))).asked.map((p: { id: string }) => p.id), [ids.josh]);

    const req = (await j(await josh.get("/api/notifications"))).items[0];
    assert.equal(req.kind, "book_invite");
    assert.equal(req.state, "");
    assert.deepEqual(await j(await josh.post(`/api/notifications/${req.id}/accept`)), { bookId: book.id });
    assert.equal((await josh.post(`/api/notifications/${req.id}/accept`)).status, 409);
    assert.equal((await j(await josh.get(`/api/books/${book.id}`))).role, "editor");
    assert.equal((await j(await mara.get("/api/notifications"))).items[0].kind, "join");

    // Josh turned page news off, so Mara's new page doesn't reach him.
    await mara.post(`/api/books/${book.id}/pages`, PAGE);
    assert.equal((await j(await josh.get("/api/notifications"))).items.some((i: { kind: string }) => i.kind === "page"), false);
  });
});

describe("trip plans", () => {
  let t: Awaited<ReturnType<typeof start>>;
  let mara: ReturnType<typeof person>, josh: ReturnType<typeof person>;
  let asked = 0;
  const SIGHTS = [
    { name: "Fushimi Inari Taisha", area: "Kyoto", kind: "culture" as const, why: "Thousands of red gates up a forested hill.", time: "2-3 hours" },
    { name: "Mount Fuji", area: "Yamanashi", kind: "nature" as const, why: "Japan's highest peak.", time: "A full day" },
  ];
  before(async () => {
    const fixed = fixedPlaceSuggester(SIGHTS);
    const STOPS = [{ name: "Senso-ji", area: "Tokyo", kind: "culture" as const, when: "Morning" as const, note: "Go early.", lat: 35.7148, lng: 139.7967 }];
    t = await start(undefined, { suggest: (d, x) => { asked++; return fixed.suggest(d, x); } }, fixedTripPlanner(STOPS));
    mara = await signup(t.base, "Mara", "mara@example.com");
    josh = await signup(t.base, "Josh", "josh@example.com");
  });
  after(() => t.stop());

  test("a trip is planned, filled with places, and kept to its owner", async () => {
    const list = await j(await mara.get("/api/trips"));
    assert.deepEqual(list.trips, []);
    assert.equal(list.suggestions, true);

    assert.equal((await mara.post("/api/trips", { destination: " " })).status, 400);
    assert.equal((await mara.post("/api/trips", { destination: "Japan", start: "2026-04-05", end: "2026-04-01" })).status, 400);
    const res = await mara.post("/api/trips", { destination: "Japan", start: "2026-04-01", end: "2026-04-05" });
    assert.equal(res.status, 201);
    const trip = await j(res);

    const saved = await j(await mara.put(`/api/trips/${trip.id}`, {
      ...trip,
      places: [
        { id: "p1", name: "Mount Fuji", area: "Yamanashi", kind: "nature", day: 2 },
        // A day past the end of the trip goes back to "some time"; an unknown kind becomes a landmark.
        { id: "p2", name: "Tokyo Tower", kind: "spaceship", day: 9 },
      ],
    }));
    assert.equal(saved.places.length, 2);
    assert.equal(saved.places[0].day, 2);
    assert.equal(saved.places[1].day, null);
    assert.equal(saved.places[1].kind, "landmark");
    assert.equal((await mara.put(`/api/trips/${trip.id}`, { ...trip, places: [{ id: "p1", name: "A" }, { id: "p1", name: "B" }] })).status, 400);

    assert.equal((await josh.get(`/api/trips/${trip.id}`)).status, 404);
    assert.equal((await josh.put(`/api/trips/${trip.id}`, saved)).status, 404);
    assert.equal((await josh.del(`/api/trips/${trip.id}`)).status, 404);

    assert.equal((await mara.del(`/api/trips/${trip.id}`)).status, 204);
    assert.equal((await mara.get(`/api/trips/${trip.id}`)).status, 404);
  });

  test("a trip can last some days before it has dates", async () => {
    const trip = await j(await mara.post("/api/trips", {
      destination: "Japan", days: 5,
      places: [{ id: "p1", name: "Senso-ji", day: 3 }, { id: "p2", name: "Dotonbori", day: 6 }],
    }));
    assert.equal(trip.days, 5);
    assert.equal(trip.places[0].day, 3);
    assert.equal(trip.places[1].day, null, "a day past the end goes back to some time");
    // Dates, once set, decide the length.
    const dated = await j(await mara.put(`/api/trips/${trip.id}`, { ...trip, start: "2026-04-01", end: "2026-04-02" }));
    assert.equal(dated.days, 2);
    assert.equal(dated.places[0].day, null);
    assert.equal((await j(await mara.post("/api/trips", { destination: "Bali", days: 400 }))).days, 90);
  });

  test("NinRe AI plans a trip day by day", async () => {
    assert.equal((await j(await mara.get("/api/trips"))).planner, true);
    const plan = await j(await mara.post("/api/trips/plan", { destination: "Japan", days: 3, pace: "relaxed", company: "couple", interests: ["food", "moon"], mustSee: ["Senso-ji"] }));
    assert.equal(plan.found, true);
    assert.equal(plan.days.length, 3);
    assert.equal(plan.days[0].stops[0].name, "Senso-ji");
    assert.equal((await mara.post("/api/trips/plan", { destination: "Japan", days: 0 })).status, 400);
    assert.equal((await mara.post("/api/trips/plan", { destination: "Japan", days: 15 })).status, 400);
    assert.equal((await mara.post("/api/trips/plan", { destination: "", days: 3 })).status, 400);
    assert.equal((await mara.post("/api/trips/plan", { destination: "Japan", days: 3, start: "soon" })).status, 400);
  });

  test("NinRe's plan is tidied: extra days dropped, bad coordinates left off", () => {
    const req = { destination: "Japan", days: 1, start: "", pace: "balanced" as const, company: "solo" as const, interests: [], mustSee: [] };
    const out = parseItinerary({
      found: true, destination: "Japan", title: "T", summary: "S", tips: ["Tip"],
      days: [
        { day: 1, title: "A", base: "Tokyo", stops: [{ name: "Senso-ji", area: "Tokyo", kind: "x", when: "Noon", note: "", lat: 200, lng: 139 }, { name: "" }] },
        { day: 2, title: "B", base: "Kyoto", stops: [{ name: "Kinkaku-ji" }] },
      ],
    }, req);
    assert.equal(out.days.length, 1);
    assert.deepEqual(out.days[0].stops, [{ name: "Senso-ji", area: "Tokyo", kind: "landmark", when: "Morning", note: "", lat: null, lng: null }]);
    assert.equal(parseItinerary({ found: false, days: [] }, req).found, false);
  });

  test("suggests places for a destination, leaves out ones already shown, and remembers the first answer", async () => {
    asked = 0;
    const first = await j(await mara.post("/api/trips/suggest", { destination: "Japan" }));
    assert.equal(first.found, true);
    assert.deepEqual(first.places.map((p: { name: string }) => p.name), ["Fushimi Inari Taisha", "Mount Fuji"]);
    await j(await josh.post("/api/trips/suggest", { destination: "  japan " }));
    assert.equal(asked, 1, "the same destination is answered from memory");

    const more = await j(await mara.post("/api/trips/suggest", { destination: "Japan", exclude: ["Mount Fuji"] }));
    assert.deepEqual(more.places.map((p: { name: string }) => p.name), ["Fushimi Inari Taisha"]);
    assert.equal(asked, 2);
    assert.equal((await mara.post("/api/trips/suggest", { destination: "" })).status, 400);
  });

  test("without a suggester, places can still be added by hand", async () => {
    const plain = await start();
    try {
      const kai = await signup(plain.base, "Kai", "kai@example.com");
      assert.equal((await j(await kai.get("/api/trips"))).suggestions, false);
      assert.equal((await kai.post("/api/trips/suggest", { destination: "Japan" })).status, 503);
      assert.equal((await kai.post("/api/trips/plan", { destination: "Japan", days: 3 })).status, 503);
    } finally {
      await plain.stop();
    }
  });

  test("Claude's answer is tidied: duplicates dropped, unknown places found nothing", () => {
    const out = parseSuggestions({
      found: true, destination: "Japan", summary: "Temples and neon.",
      places: [{ name: "Kinkaku-ji", area: "Kyoto", kind: "culture", why: "Gold.", time: "1 hour" }, { name: "kinkaku-ji", area: "", kind: "x", why: "", time: "" }],
    }, "japan");
    assert.equal(out.places.length, 1);
    const none = parseSuggestions({ found: false, destination: "", summary: "x", places: [] }, "Qwzx");
    assert.deepEqual(none, { destination: "Qwzx", found: false, summary: "", places: [] });
  });
});
