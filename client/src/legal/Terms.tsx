import { useTitle, Link } from "../router";

/**
 * The Terms and Conditions and the privacy notice people agree to when they make an account. Bump TERMS_VERSION
 * whenever the wording changes in a way that matters: the server records which version each account agreed to.
 *
 * This is a plain-language starting point, not legal advice. Have it checked before NinRe takes real sign-ups.
 */
export const TERMS_VERSION = "2026-11-10";
export const MIN_AGE = 13;
const CONTACT = "support@ninre.app";

export function TermsText({ headingId }: { headingId?: string }) {
  return (
    <article className="terms">
      <p className="terms-kicker">Updated 10 November 2026</p>
      <h1 id={headingId}>Terms and Conditions</h1>
      <p className="terms-lead">
        NinRe is a place to keep the books of your trips, on your own or with the people you travel with. These terms are
        the agreement between you and NinRe when you make an account. We've kept them short and plain. Please read them.
      </p>

      <h2>1. Your account</h2>
      <ul>
        <li>You need to be at least {MIN_AGE} years old to make an account. If the law where you live sets an older age, you need to be that age.</li>
        <li>Give us your real name, age and an email address you can open. Keep them up to date.</li>
        <li>Keep your password to yourself. You're responsible for what happens in your account.</li>
        <li>One person, one account. Don't make an account for someone else without their say.</li>
      </ul>

      <h2>2. Your books, photos and words</h2>
      <ul>
        <li>What you put in NinRe stays yours. We don't claim it.</li>
        <li>So we can run NinRe, you let us store your books, make copies for backups, resize your photos and show them to you and to the people you share each book with. That's all we use them for.</li>
        <li>Only put in what you have the right to share: your own photos, or ones you have permission to use.</li>
        <li>When you share a book, the people in it can see it, and add to it if you let them. Think about what you share before you share it.</li>
      </ul>

      <h2>3. What's not allowed</h2>
      <ul>
        <li>Anything illegal, hateful, or meant to harass, threaten or exploit anyone, children above all.</li>
        <li>Photos or details of other people that they wouldn't want shared.</li>
        <li>Trying to get into accounts or books that aren't yours, or to break, overload or copy the service.</li>
      </ul>
      <p>We can remove things that break these rules, and close accounts that keep breaking them.</p>

      <h2>4. Plans and payments</h2>
      <ul>
        <li>The free plan has one book shared by up to two people, with no card needed.</li>
        <li>Paid plans show their price before you pay. You pay for a set number of months up front, and they don't renew by themselves: nothing is charged again unless you choose to pay again.</li>
        <li>When paid months run out, your account goes back to the free plan's limits.</li>
      </ul>

      <h2 id="privacy">5. Privacy: what we keep and why</h2>
      <ul>
        <li><b>What you tell us when you sign up:</b> your first and last name, age, email, your phone number if you give it, and your answers about how you travel.</li>
        <li><b>What you make:</b> your books, pages, photos, notes and who you share them with.</li>
        <li><b>What keeps you signed in:</b> a session on each device, and basic records of when you sign in, to keep your account safe.</li>
        <li>We use this to run NinRe, keep your account safe, make your first book fit how you travel, and answer you when you contact us.</li>
        <li>Your age is there to make sure you're old enough. Your phone number is only for reaching you about your account. We don't send marketing to it.</li>
        <li>We don't sell your details or your photos, and we don't show you ads based on them. Payments are handled by our payment provider; we never see your full card number.</li>
        <li>You can see and change your details from your account, and deleting your account deletes your books, photos and details from NinRe. Backups clear within 30 days.</li>
      </ul>

      <h2>6. The service</h2>
      <ul>
        <li>We work hard to keep NinRe running and your books safe, but we can't promise it will never go down or lose something. Keep copies of photos that matter to you.</li>
        <li>NinRe is provided as it is. As far as the law allows, we aren't liable for losses that come from using it, beyond what you paid us in the last 12 months.</li>
        <li>We may change or stop parts of NinRe. If we ever close it, we'll tell you in good time so you can save your books.</li>
      </ul>

      <h2>7. Ending</h2>
      <p>You can delete your account whenever you like. We may suspend or close an account that breaks these terms, and we'll tell you why unless the law stops us.</p>

      <h2>8. Changes to these terms</h2>
      <p>If we change these terms in a way that matters, we'll tell you in the app before the change applies, and ask you to agree again.</p>

      <h2>9. Contact</h2>
      <p>Questions about these terms or your details? Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
    </article>
  );
}

/** The terms on their own page, for linking to from the website. */
export function TermsPage() {
  useTitle("Terms and Conditions");
  return (
    <div className="daylight terms-page">
      <header className="terms-top"><Link href="/" className="onb-word">NinRe</Link></header>
      <main><TermsText /></main>
    </div>
  );
}
