import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { createApp } from "../src/app.ts";
import { paymongo, type Payments } from "../src/paymongo.ts";
import { addMonths } from "../src/plans.ts";

const FAKE_JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
// Response bodies in these tests are checked field by field, so read them loosely typed.
const j = (r: Response): Promise<any> => r.json();

async function start(payments?: Payments) {
  const dataDir = mkdtempSync(join(tmpdir(), "ninre-test-"));
  const { app, close } = createApp({ dataDir, payments });
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

async function signup(base: string, name: string, email: string) {
  const p = person(base);
  const res = await p.post("/api/auth/signup", { name, email, password: "correct horse" });
  assert.equal(res.status, 201);
  return p;
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
    assert.equal((await p.post("/api/auth/signup", { name: "M", email: "mara@example.com", password: "correct horse" })).status, 409);
    assert.equal((await p.post("/api/auth/signup", { name: "Z", email: "z@example.com", password: "short" })).status, 400);
    const cross = await fetch(`${t.base}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ name: "E", email: "e@example.com", password: "correct horse" }),
    });
    assert.equal(cross.status, 403);
  });

  test("changing the password needs the current one", async () => {
    const p = await signup(t.base, "Pat", "pat@example.com");
    assert.equal((await p.put("/api/account/password", { current: "nope", next: "a new password" })).status, 403);
    assert.equal((await p.put("/api/account/password", { current: "correct horse", next: "a new password" })).status, 200);
    await p.post("/api/auth/logout");
    assert.equal((await p.post("/api/auth/login", { email: "pat@example.com", password: "a new password" })).status, 200);
  });
});

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
