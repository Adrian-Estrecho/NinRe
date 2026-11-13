import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type InputHTMLAttributes, type ReactNode, type RefObject } from "react";
import { ApiError, api, errorText } from "../api";
import { Book3D } from "../book/Book3D";
import type { Design } from "../book/design";
import { Dialog } from "../components/Dialog";
import { Icon, type IconName } from "../components/Icon";
import { MIN_AGE, TERMS_VERSION, TermsText } from "../legal/Terms";
import { BOOK_KINDS, kindOf } from "../lib/kinds";
import { appLike } from "../lib/native";
import {
  HEARD, OFTEN, TRIPS, WITH, clearAnswers, kindFor, lookFor, namesFor, profileOf, readAnswers, saveAnswers, suggestKind, titleFor, tripsPhrase,
  type Answers, type Choice,
} from "../lib/onboarding";
import { clearPending, readPending } from "../lib/pending";
import { holdStatusBar, onBack } from "../lib/shell";
import { Link, navigate, useLocation, useTitle } from "../router";
import { useSession } from "../session";
import { CheckInbox } from "./VerifyEmail";

type Step = "name" | "with" | "trips" | "often" | "keep" | "heard" | "account";
type Phase = "ask" | "inbox" | "making" | "ready";

/** Questions that can be passed over. The name and the account can't. */
const SKIPPABLE = new Set<Step>(["with", "trips", "often", "heard"]);
const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Where Back goes from the first question or the log-in screen: the welcome screen in the app, the website's front page on the web. */
export function leaveSignIn(carry: string) {
  navigate(appLike ? `/welcome${carry ? `?${carry}` : ""}` : "/");
}

export function carryOf(query: URLSearchParams) {
  return new URLSearchParams([...query.entries()].filter(([k]) => ["invite", "plan", "next"].includes(k))).toString();
}

/**
 * Signing up, one question to a screen: name, who they travel with, what trips, how often, what kind of book, where
 * they heard of NinRe, then the account. Their first book is made from the answers and handed over at the end.
 */
export function Onboarding() {
  const { query } = useLocation();
  const { refresh } = useSession();
  const invite = query.get("invite");
  const plan = query.get("plan");
  const carry = carryOf(query);
  const pending = useState(readPending)[0];
  // Someone joining another person's book doesn't get a first book of their own, so isn't asked what kind.
  const steps: Step[] = invite ? ["name", "with", "trips", "often", "heard", "account"] : ["name", "with", "trips", "often", "keep", "heard", "account"];

  const [a, setA] = useState<Answers>(readAnswers);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<"next" | "back">("next");
  const [phase, setPhase] = useState<Phase>("ask");
  const [acct, setAcct] = useState<Acct>(EMPTY_ACCT);
  const [bad, setBad] = useState<Bad>({});
  const [show, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [terms, setTerms] = useState<false | "top" | "privacy">(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; exists?: boolean } | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const step = steps[Math.min(i, steps.length - 1)];

  useTitle(phase === "ready" ? "Your book is ready" : invite ? "Join the book" : "Start your book");
  // The account step sits on a green band like the log-in's blue one, so the status bar over it turns light.
  const onBand = phase === "ask" && step === "account";
  useEffect(() => holdStatusBar(onBand ? "dark" : "light"), [onBand]);
  useEffect(() => saveAnswers(a), [a]);

  // Picking an answer only marks it; Continue moves on, so a mis-tap can be changed before it counts.
  const set = (patch: Partial<Answers>) => setA((cur) => ({ ...cur, ...patch }));
  const go = (delta: number) => {
    setDir(delta < 0 ? "back" : "next");
    setError(null);
    setI((cur) => Math.max(0, Math.min(steps.length - 1, cur + delta)));
  };
  const back = () => (i === 0 ? leaveSignIn(carry) : go(-1));

  // Android's Back steps back through the questions, and does nothing while the book is being made.
  useEffect(() => onBack(() => {
    if (terms) {
      setTerms(false);
      return true;
    }
    if (phase === "inbox") {
      backToDetails();
      return true;
    }
    if (phase !== "ask") return true;
    if (busy || i === 0) return busy;
    go(-1);
    return true;
  }), [phase, busy, i, terms]);

  // Each new question is read out from its heading; the ones you type into put the cursor in the box instead.
  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (step !== "name" && step !== "account") heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [i, phase]);

  const answered: Record<Step, boolean> = {
    name: a.name.trim().length > 0,
    with: Boolean(a.travelWith),
    trips: a.trips.length > 0,
    often: Boolean(a.often),
    keep: true,
    heard: Boolean(a.heardFrom),
    account: agreed,
  };

  /** Types into one of the account's fields, and clears what was wrong with it. */
  const put = (k: keyof Acct) => (v: string) => {
    setAcct((cur) => ({ ...cur, [k]: v }));
    setBad((cur) => (cur[k] ? { ...cur, [k]: undefined } : cur));
  };

  async function createAccount() {
    const found = checkAccount(a.name, acct);
    const firstBad = FIELD_ORDER.find((k) => found[k]);
    if (firstBad) {
      setBad(found);
      setError(null);
      return document.getElementById(`onb-${firstBad}`)?.focus();
    }
    if (!agreed) return setError({ text: "Tick the box to agree to the Terms and Conditions first." });
    setBusy(true);
    setError(null);
    try {
      const made = await api.signup({
        name: a.name.trim(), lastName: acct.last.trim(), age: Number(acct.age), phone: acct.phone.trim(), email: acct.email.trim(), password: acct.password,
        acceptTerms: true, termsVersion: TERMS_VERSION, profile: profileOf({ ...a, keep: invite ? a.keep : kindFor(a) }),
      });
      setEmailSent(made.emailSent !== false);
    } catch (err) {
      setBusy(false);
      return setError({ text: errorText(err, "Couldn't reach NinRe. Check your connection and try again."), exists: err instanceof ApiError && err.status === 409 });
    }
    // The account is made but waits for its email to be confirmed. The answers are kept until then, to make the book.
    setBusy(false);
    setPhase("inbox");
  }

  /** The wrong email: sign out of the unconfirmed account and go back to the form, with everything still filled in. */
  function backToDetails() {
    void api.logout().catch(() => {});
    setPhase("ask");
    window.setTimeout(() => document.getElementById("onb-email")?.focus(), 50);
  }

  /** Once the email is confirmed: into the book they were invited to, or their own first book, made from the answers. */
  async function afterConfirmed() {
    clearAnswers();
    await refresh();
    if (invite) return navigate(`/join/${encodeURIComponent(invite)}`, { replace: true });

    setPhase("making");
    const started = Date.now();
    try {
      const book = await api.createBook({ title: pending?.title || titleFor(a), subtitle: namesFor(a) }, lookFor(a, pending?.design ?? null), kindFor(a));
      clearPending();
      await refresh();
      await wait(Math.max(0, (calm() ? 600 : 2900) - (Date.now() - started)));
      setBookId(book.id);
      setPhase("ready");
    } catch {
      // The account is made; the library has its own way to start a book.
      navigate("/app", { replace: true });
    }
  }

  function finish() {
    if (plan === "plus" || plan === "crew") return navigate(`/app/account?upgrade=${plan}`, { replace: true });
    const next = query.get("next");
    if (next && /^\/(app|checkout)\//.test(next)) return navigate(next, { replace: true });
    navigate(bookId ? `/app/book/${bookId}?welcome=1` : "/app", { replace: true });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (step === "account") return void createAccount();
    if (step === "name" && !answered.name) return setError({ text: "Tell us your name. It goes on the pages you write." });
    go(1);
  }

  const design = lookFor(a, pending?.design ?? null);
  const title = pending?.title || titleFor(a);
  const names = namesFor(a) || a.name.trim() || undefined;

  if (phase === "inbox") {
    return <CheckInbox email={acct.email.trim()} emailSent={emailSent} onConfirmed={() => void afterConfirmed()} onBack={backToDetails} onWrongEmail={backToDetails} />;
  }
  if (phase !== "ask") {
    return (
      <div className="daylight onb solo">
        <div className="onb-frame">
          {phase === "making" ? <Making a={a} design={design} title={title} names={names} /> : (
            <Ready a={a} design={design} title={title} names={names} headingRef={heading} onOpen={finish} />
          )}
        </div>
      </div>
    );
  }

  const name = a.name.trim();
  const suggested = suggestKind(a);
  let body: ReactNode;
  switch (step) {
    case "name":
      body = (
        <>
          <h1 ref={heading} tabIndex={-1} id="onb-q">First, what's your name?</h1>
          <p className="sub">It goes on the cover, and on every page you write.</p>
          <input className="onb-input" type="text" autoComplete="given-name" autoCapitalize="words" maxLength={40} placeholder="Your name" aria-labelledby="onb-q"
            value={a.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </>
      );
      break;
    case "with":
      body = (
        <>
          <h1 ref={heading} tabIndex={-1} id="onb-q">Who do you travel with?</h1>
          <p className="sub">{name ? `Nice to meet you, ${name}. ` : ""}A book can be shared, so everyone adds their own pages.</p>
          <Options label="onb-q" choices={WITH} isOn={(id) => a.travelWith === id}
            onPick={(id) => set({ travelWith: id })} />
          {a.travelWith === "partner" && (
            <More>
              <label htmlFor="onb-partner">Their name, for the cover</label>
              <input id="onb-partner" className="onb-input small" type="text" autoCapitalize="words" maxLength={18} placeholder="Optional"
                value={a.partner} onChange={(e) => set({ partner: e.target.value })} />
            </More>
          )}
        </>
      );
      break;
    case "trips":
      body = (
        <>
          <h1 ref={heading} tabIndex={-1} id="onb-q">What trips do you take?</h1>
          <p className="sub">Pick as many as you like.</p>
          <Options label="onb-q" choices={TRIPS} grid multi isOn={(id) => a.trips.includes(id)}
            onPick={(id) => set({ trips: a.trips.includes(id) ? a.trips.filter((t) => t !== id) : [...a.trips, id] })} />
        </>
      );
      break;
    case "often":
      body = (
        <>
          <h1 ref={heading} tabIndex={-1} id="onb-q">How often do you get away?</h1>
          <p className="sub">There's no wrong answer. Some books fill up in a year, some take ten.</p>
          <Options label="onb-q" choices={OFTEN} isOn={(id) => a.often === id} onPick={(id) => set({ often: id })} />
        </>
      );
      break;
    case "keep":
      body = (
        <>
          <h1 ref={heading} tabIndex={-1} id="onb-q">How do you want to keep them?</h1>
          <p className="sub">We picked one for how you travel. You can start other kinds of book later.</p>
          <Options label="onb-q" isOn={(id) => kindFor(a) === id} onPick={(id) => set({ keep: id })}
            choices={BOOK_KINDS.map((k) => ({ id: k.id, label: k.name, hint: k.blurb, icon: k.icon as IconName, tag: k.id === suggested ? "Suggested" : undefined }))} />
        </>
      );
      break;
    case "heard":
      body = (
        <>
          <h1 ref={heading} tabIndex={-1} id="onb-q">Where did you hear about NinRe?</h1>
          <p className="sub">It helps us find more people who travel like you.</p>
          <Options label="onb-q" choices={HEARD} grid isOn={(id) => a.heardFrom === id}
            onPick={(id) => set({ heardFrom: id })} />
          {a.heardFrom === "other" && (
            <More>
              <label htmlFor="onb-other">Where was it?</label>
              <input id="onb-other" className="onb-input small" type="text" maxLength={60} value={a.heardOther} onChange={(e) => set({ heardOther: e.target.value })} autoFocus />
            </More>
          )}
        </>
      );
      break;
    case "account":
      body = (
        <>
          <div className="su-hero">
            <h1 ref={heading} tabIndex={-1}>{invite ? "Last step: your account" : "Last step: save your book"}</h1>
            <p className="sub">{invite ? "Then you're straight into the book you were invited to." : "Free for one book and two people. No card needed."}</p>
          </div>
          {/* Everything to fill in, on one white card over the edge of the green. */}
          <div className="su-card">
          <fieldset className="su-group">
            <legend>About you</legend>
            <div className="su-row">
              <Field k="first" label="First name" error={bad.first} autoComplete="given-name" autoCapitalize="words" maxLength={40}
                value={a.name} onChange={(v) => { set({ name: v }); setBad((cur) => ({ ...cur, first: undefined })); }} autoFocus={!a.name.trim()} />
              <Field k="last" label="Last name" error={bad.last} autoComplete="family-name" autoCapitalize="words" maxLength={40}
                value={acct.last} onChange={put("last")} autoFocus={Boolean(a.name.trim())} />
            </div>
            <div className="su-row age">
              <Field k="age" label="Age" error={bad.age} inputMode="numeric" autoComplete="off" maxLength={3}
                value={acct.age} onChange={(v) => put("age")(v.replace(/\D/g, ""))} />
              <Field k="phone" label="Mobile number" optional error={bad.phone} type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="+63 912 345 6789"
                value={acct.phone} onChange={put("phone")} />
            </div>
          </fieldset>
          <fieldset className="su-group">
            <legend>Signing in</legend>
            <Field k="email" label="Email" error={bad.email} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              placeholder="you@example.com" maxLength={254} value={acct.email} onChange={put("email")} ok={looksLikeEmail(acct.email)} />
            <Field k="password" label="Password" error={bad.password} type={show ? "text" : "password"} autoComplete="new-password" maxLength={200}
              value={acct.password} onChange={put("password")} described="onb-password-hint"
              trail={<button type="button" className="su-show" onClick={() => setShow(!show)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>}>
              {!bad.password && <Meter id="onb-password-hint" n={acct.password.length} />}
            </Field>
            <Field k="password2" label="Confirm password" error={bad.password2} type={show ? "text" : "password"} autoComplete="new-password" maxLength={200}
              value={acct.password2} onChange={put("password2")} ok={acct.password.length >= MIN_PASSWORD && acct.password2 === acct.password} />
          </fieldset>
          <div className="su-agree">
            <input id="onb-agree" type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setError(null); }} />
            <label htmlFor="onb-agree">
              <span className="su-box-tick" aria-hidden="true"><Icon name="check" /></span>
              <span>I agree to NinRe's Terms and Conditions and Privacy notice.</span>
            </label>
            <p className="su-read">
              Read the <button type="button" onClick={() => setTerms("top")}>Terms and Conditions</button> and
              the <button type="button" onClick={() => setTerms("privacy")}>Privacy notice</button>.
            </p>
          </div>
          </div>
        </>
      );
      break;
  }

  const last = step === "account";
  const pad = (n: number) => String(n).padStart(2, "0");
  // The account can't be made until the terms are agreed to; everything else on it is checked when they press the button.
  const ready = step === "name" || step === "keep" || answered[step];
  let cta = "Continue";
  if (last) cta = busy ? "Making your account…" : "Create my account";
  else if (step === "trips" && a.trips.length) cta = `Continue with ${a.trips.length} ${a.trips.length === 1 ? "kind" : "kinds"} of trip`;
  return (
    <div className={`daylight onb${onBand ? " onb-signup" : ""}`}>
      <div className="onb-frame">
        <header className="onb-top">
          <button type="button" className="onb-back" onClick={back} aria-label={i === 0 ? "Back" : "Previous question"} disabled={busy}><Icon name="back" /></button>
          <Stops at={i} of={steps.length} />
          <span className="onb-count" aria-hidden="true">{pad(i + 1)}<i>/{pad(steps.length)}</i></span>
        </header>
        <form className="onb-step" onSubmit={submit} noValidate>
          <div className="onb-body" key={step} data-dir={dir}>
            {body}
            {error && (
              <p className="onb-err" role="alert">
                {error.text}
                {error.exists && <> <Link href={`/login${carry ? `?${carry}` : ""}`}>Log in instead</Link></>}
              </p>
            )}
          </div>
          <footer className="onb-foot">
            <button type="submit" className="btn sun" disabled={busy || !ready}>
              {cta}
              {!last && <Icon name="right" />}
            </button>
            {SKIPPABLE.has(step) && <button type="button" className="onb-skip" onClick={() => go(1)}>Skip this question</button>}
            {(i === 0 || last) && (
              <p className="onb-switch">Already have an account? <Link href={`/login${carry ? `?${carry}` : ""}`}>Log in</Link></p>
            )}
          </footer>
        </form>
      </div>
      <BookAside design={design} title={title} subtitle={names} note={invite ? "You'll write in theirs" : "Your first book, taking shape"} />
      {terms && (
        <TermsSheet at={terms} onClose={() => setTerms(false)} onAgree={() => { setAgreed(true); setError(null); setTerms(false); }} />
      )}
    </div>
  );
}

/** The terms over the form, so nothing typed is lost; agreeing from here ticks the box. */
function TermsSheet({ at, onClose, onAgree }: { at: "top" | "privacy"; onClose: () => void; onAgree: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (at === "privacy") box.current?.querySelector("#privacy")?.scrollIntoView({ block: "start" });
  }, [at]);
  return (
    <Dialog onRequestClose={onClose} labelledBy="terms-h" closeButton>
      <div className="terms-sheet" ref={box}>
        <TermsText headingId="terms-h" />
        <footer className="terms-foot">
          <button type="button" className="btn sun" onClick={onAgree}>I agree</button>
        </footer>
      </div>
    </Dialog>
  );
}

/** The trip so far: one leg per question, inked in behind a paper plane that sits on the current one. */
function Stops({ at, of }: { at: number; of: number }) {
  return (
    <div className="onb-stops" role="progressbar" aria-label={`Question ${at + 1} of ${of}`} aria-valuemin={1} aria-valuemax={of} aria-valuenow={at + 1}>
      {Array.from({ length: of }, (_, n) => (
        <span key={n} className={`onb-leg${n < at ? " done" : n === at ? " here" : ""}`}>
          {n === at && <Icon name="plane" className="onb-plane" />}
        </span>
      ))}
    </div>
  );
}

/** A field that opens under an answer (their partner's name, somewhere else), brought into view above the Continue button. */
function More({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: calm() ? "auto" : "smooth" });
  }, []);
  return <div ref={ref} className="onb-fld onb-more">{children}</div>;
}

/** Paper stocks for the ticket stubs, taken in turn: mint, sun, blush, sky, manila, lilac. */
const STOCKS = ["#dff0e2", "#ffeaa6", "#ffdbe1", "#dbe8fb", "#f0e2c2", "#e6defb"];

/** On wide screens, the book the answers are making stands beside the questions. */
export function BookAside({ design, title, subtitle, note }: { design: Design; title: string; subtitle?: string; note: string }) {
  return (
    <aside className="onb-aside" aria-hidden="true">
      <Book3D design={design} title={title} subtitle={subtitle} width="min(300px, 24vw)" turnable={false} />
      <p className="onb-aside-note">{note}</p>
    </aside>
  );
}

function Options<T extends string>({ choices, isOn, onPick, multi, grid, label }: {
  choices: (Choice<T> & { tag?: string })[];
  isOn: (id: T) => boolean;
  onPick: (id: T) => void;
  multi?: boolean;
  grid?: boolean;
  label: string;
}) {
  return (
    <div className={`onb-opts${grid ? " grid" : ""}`} role="group" aria-labelledby={label}>
      {choices.map((c, n) => (
        <button key={c.id} type="button" className="onb-opt" aria-pressed={isOn(c.id)} onClick={() => onPick(c.id)} style={{ "--stock": STOCKS[n % STOCKS.length] } as CSSProperties}>
          <span className="onb-opt-icon"><Icon name={c.icon} /></span>
          <span className="onb-opt-text">
            <span className="onb-opt-label">{c.label}{c.tag && <span className="onb-tag">{c.tag}</span>}</span>
            {c.hint && !grid && <span className="onb-opt-hint">{c.hint}</span>}
          </span>
          <span className={`onb-tick${multi ? " box" : ""}`}><Icon name="check" /></span>
        </button>
      ))}
    </div>
  );
}

/* ---------- The account form ---------- */

const MIN_PASSWORD = 8;
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
/** The email is typed once (the link sent to it confirms it); the password twice, since nothing else would catch a slip. */
interface Acct { last: string; age: string; phone: string; email: string; password: string; password2: string }
type Bad = Partial<Record<"first" | keyof Acct, string>>;
const EMPTY_ACCT: Acct = { last: "", age: "", phone: "", email: "", password: "", password2: "" };
/** Top to bottom, so the first field with something wrong is the one the cursor goes to. */
const FIELD_ORDER = ["first", "last", "age", "phone", "email", "password", "password2"] as const;

/** Everything wrong with the account form, field by field. Matches what the server checks. */
function checkAccount(first: string, f: Acct): Bad {
  const bad: Bad = {};
  if (!first.trim()) bad.first = "Add your first name.";
  if (!f.last.trim()) bad.last = "Add your last name.";
  const age = Number(f.age);
  if (!f.age) bad.age = "Add your age.";
  else if (age < MIN_AGE) bad.age = `You need to be ${MIN_AGE} or older to use NinRe.`;
  else if (age > 120) bad.age = "Check your age.";
  const digits = f.phone.replace(/\D/g, "").length;
  if (f.phone.trim() && (!/^\+?[\d\s().-]+$/.test(f.phone.trim()) || digits < 7 || digits > 15)) bad.phone = "Check this number, or leave it empty.";
  if (!f.email.trim()) bad.email = "Add your email address.";
  else if (!looksLikeEmail(f.email)) bad.email = "That doesn't look like an email address.";
  if (f.password.length < MIN_PASSWORD) bad.password = `Use at least ${MIN_PASSWORD} characters.`;
  else if (f.password2 !== f.password) bad.password2 = f.password2 ? "The two passwords don't match." : "Type your password again.";
  return bad;
}

/** One labelled box: a tick once it's right, what's wrong under it in red, anything else (Show, the meter) where it fits. */
function Field({ k, label, optional, ok, error, trail, described, onChange, children, ...input }: {
  k: string;
  label: string;
  optional?: boolean;
  ok?: boolean;
  error?: string;
  trail?: ReactNode;
  described?: string;
  onChange: (v: string) => void;
  children?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "id">) {
  const id = `onb-${k}`;
  return (
    <div className="su-fld">
      <label htmlFor={id}>{label}{optional && <span className="su-optional">Optional</span>}</label>
      <div className={`su-box${error ? " off" : ""}`}>
        <input id={id} {...input} onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : described} />
        {ok && !error && <Icon name="check" className="su-ok" />}
        {trail}
      </div>
      {error && <span className="su-err" id={`${id}-err`} role="alert">{error}</span>}
      {children}
    </div>
  );
}

/** Notches that fill up to the eight characters a password needs. */
function Meter({ id, n }: { id: string; n: number }) {
  const ok = n >= MIN_PASSWORD;
  return (
    <div className={`su-meter${ok ? " ok" : ""}`}>
      <span className="su-notches" aria-hidden="true">
        {Array.from({ length: MIN_PASSWORD }, (_, k) => <i key={k} className={k < n ? "on" : undefined} />)}
      </span>
      <span id={id}>{ok ? "Good to go" : n === 0 ? `At least ${MIN_PASSWORD} characters` : `${MIN_PASSWORD - n} more to go`}</span>
    </div>
  );
}

const WHO: Record<string, string> = {
  partner: "the two of you", friends: "you and your friends", family: "the whole family", solo: "your own trips", mix: "you and whoever comes along",
};

/** While the account's first book is made: the book, and what's going into it, ticked off one by one. */
function Making({ a, design, title, names }: { a: Answers; design: Design; title: string; names?: string }) {
  const kind = kindOf(kindFor(a));
  const lines = [
    `Binding your ${kind.name.toLowerCase()}`,
    names ? `Writing ${names} on the cover` : "Setting the title on the cover",
    `Leaving room for ${tripsPhrase(a.trips)}`,
    "Putting it on your shelf",
  ];
  return (
    <div className="onb-making" role="status" aria-live="polite">
      <div className="onb-making-book"><Book3D design={design} title={title} subtitle={names} width="min(170px, 42vw)" turnable={false} /></div>
      <h1>Making your book</h1>
      <ul className="onb-list">
        {lines.map((l, n) => (
          <li key={l} style={{ "--n": n } as CSSProperties}><span className="onb-tick"><Icon name="check" /></span>{l}</li>
        ))}
      </ul>
    </div>
  );
}

function Ready({ a, design, title, names, headingRef, onOpen }: {
  a: Answers; design: Design; title: string; names?: string; headingRef: RefObject<HTMLHeadingElement | null>; onOpen: () => void;
}) {
  const kind = kindOf(kindFor(a));
  const name = a.name.trim();
  const partner = a.travelWith === "partner" ? a.partner.trim() : "";
  return (
    <div className="onb-ready">
      <div className="onb-ready-book"><Book3D design={design} title={title} subtitle={names} width="min(250px, 58vw, 34svh)" label={`${title}, your new ${kind.name.toLowerCase()}. Drag to turn it.`} /></div>
      <h1 ref={headingRef} tabIndex={-1}>{name ? `Your book is ready, ${name}` : "Your book is ready"}</h1>
      <p className="sub">
        A {kind.name.toLowerCase()} for {WHO[a.travelWith] ?? WHO.mix}. Start with the last trip you took: a day, a place, a photo or two.
        {partner && ` You can invite ${partner} to write in it from the book.`}
      </p>
      <footer className="onb-foot">
        <button type="button" className="btn sun" onClick={onOpen} autoFocus>Open my book</button>
      </footer>
    </div>
  );
}
