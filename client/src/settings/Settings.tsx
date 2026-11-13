import { useCallback, useEffect, useState } from "react";
import { api, errorText } from "../api";
import { Avatar } from "../components/Avatar";
import { Icon, type IconName } from "../components/Icon";
import { isApp } from "../lib/native";
import { Link, useTitle } from "../router";
import { useSession } from "../session";
import type { AccountSettings } from "../types";
import { FriendsSection } from "./Friends";
import { PlanSection } from "./Plan";
import { NotifySection, PrivacySection } from "./Prefs";
import { ProfileSection } from "./Profile";
import { SecuritySection } from "./Security";

export type SectionId = "profile" | "friends" | "notifications" | "privacy" | "plan" | "account";

export const SECTIONS: { id: SectionId; label: string; blurb: string; icon: IconName }[] = [
  { id: "profile", label: "Profile", blurb: "Your name, username and what friends see", icon: "user" },
  { id: "friends", label: "Friends", blurb: "Find people, follow them, add them to books", icon: "people" },
  { id: "notifications", label: "Notifications", blurb: "What you hear about", icon: "bell" },
  { id: "privacy", label: "Privacy", blurb: "Search, and who can add you to a book", icon: "lock" },
  // The app sells nothing, so there it's only the plan.
  { id: "plan", label: isApp ? "Plan" : "Plan & pricing", blurb: isApp ? "Your plan and what it holds" : "Plans, what you use, payments", icon: "card" },
  { id: "account", label: "Account & security", blurb: "Email, password, devices, your data", icon: "shield" },
];

export const isSection = (s: string | undefined): s is SectionId => SECTIONS.some((x) => x.id === s);

/** The props every section that edits the account gets. */
export interface SectionProps {
  account: AccountSettings;
  onChange: (next: AccountSettings) => void;
}

/*
 * The last account settings loaded, kept so a settings screen opens already filled in: "Loading…" swapping for
 * the form halfway through the slide up is what made it flicker. It's loaded again each time in the background.
 */
let lastAccount: AccountSettings | null = null;

/** Keeps account settings loaded elsewhere (the profile sheet loads them too) for the next settings screen. */
export function rememberAccount(a: AccountSettings) {
  lastAccount = a;
}

/**
 * Settings: a list of sections, and the open one beside it. On a phone the list is its own screen and each
 * section opens over it; on a wide screen they sit side by side, opening on the profile.
 */
export function Settings({ section }: { section?: SectionId }) {
  const shown = section ?? "profile";
  const meta = SECTIONS.find((s) => s.id === shown)!;
  useTitle(section ? meta.label : "Settings");
  const { me } = useSession();
  const [account, setAccountState] = useState<AccountSettings | null>(lastAccount?.user.id === me?.user.id ? lastAccount : null);
  const [error, setError] = useState("");
  const setAccount = useCallback((a: AccountSettings) => {
    lastAccount = a;
    setAccountState(a);
  }, []);

  const load = useCallback(() => {
    setError("");
    api.accountSettings().then(setAccount, (err) => setError(errorText(err, "Couldn't load your settings.")));
  }, [setAccount]);
  useEffect(load, [load]);

  if (!me) return null;
  const needsAccount = shown !== "friends" && shown !== "plan";

  return (
    <div className={`settings${section ? " has-section" : ""}`}>
      <nav className="set-nav" aria-label="Settings">
        <h1 className="app-title">Settings</h1>
        <Link href="/app/settings/profile" className="set-me">
          <Avatar name={me.user.name} id={me.user.id} size={44} />
          <span className="set-me-txt"><b>{me.user.name}</b><span>@{me.user.username}</span></span>
          <Icon name="right" />
        </Link>
        <ul>
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <Link href={`/app/settings/${s.id}`} aria-current={shown === s.id ? "page" : undefined}>
                <span className="set-ic"><Icon name={s.icon} /></span>
                <span className="set-lbl"><b>{s.label}</b><span>{s.blurb}</span></span>
                <Icon name="right" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Keyed by section, so each one fades in as it opens, not only the first. */}
      <section className="set-body" aria-labelledby="set-h" key={shown}>
        <header className="set-head">
          <h2 id="set-h">{meta.label}</h2>
          <p className="app-sub">{meta.blurb}.</p>
        </header>
        {needsAccount && !account ? (
          error ? (
            <p className="err" role="alert">{error} <button type="button" className="btn small line" onClick={load}>Try again</button></p>
          ) : <p className="hint">Loading…</p>
        ) : shown === "profile" ? <ProfileSection account={account!} onChange={setAccount} />
          : shown === "friends" ? <FriendsSection />
          : shown === "notifications" ? <NotifySection account={account!} onChange={setAccount} />
          : shown === "privacy" ? <PrivacySection account={account!} onChange={setAccount} />
          : shown === "plan" ? <PlanSection />
          : <SecuritySection account={account!} onChange={setAccount} />}
      </section>
    </div>
  );
}
