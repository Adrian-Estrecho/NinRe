/**
 * Sending email. With RESEND_API_KEY set, mail goes out through Resend's HTTP API (no SMTP library needed). Without
 * it, nothing is sent: the message is written to the server's log instead, so sign-up can be tried locally by
 * copying the confirmation link from the terminal.
 */
export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  kind: "resend" | "log";
  send(mail: Mail): Promise<void>;
}

export function resendMailer(opts: { apiKey: string; from: string; log: (m: string) => void }): Mailer {
  return {
    kind: "resend",
    async send(mail) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: opts.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        opts.log(`Email to ${mail.to} failed: ${res.status} ${(await res.text().catch(() => "")).slice(0, 300)}`);
        throw new Error("The email couldn't be sent.");
      }
    },
  };
}

export function logMailer(log: (m: string) => void): Mailer {
  return {
    kind: "log",
    async send(mail) {
      log(`\n--- Email (not sent: no RESEND_API_KEY) ---\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n--- End of email ---\n`);
    },
  };
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** The confirmation email: one button, and the link written out for mail apps that hide buttons. */
export function confirmationMail(to: string, name: string, link: string): Mail {
  const hi = name ? `Hi ${name},` : "Hi,";
  return {
    to,
    subject: "Confirm your email for NinRe",
    text: [
      hi,
      "",
      "Tap the link below to confirm your email and open your book:",
      link,
      "",
      "The link works for 24 hours. If you didn't sign up for NinRe, you can ignore this email.",
      "",
      "NinRe",
    ].join("\n"),
    html: `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#14202b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1d6a4b;padding:22px 28px;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px">NinRe</td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 12px;font-size:16px">${escape(hi)}</p>
<p style="margin:0 0 24px;font-size:16px;line-height:1.5">Confirm your email and your first book will be waiting for you.</p>
<a href="${escape(link)}" style="display:inline-block;background:#ffd23f;color:#14202b;text-decoration:none;font-weight:700;font-size:16px;padding:14px 26px;border-radius:999px">Confirm my email</a>
<p style="margin:24px 0 6px;font-size:13px;color:#5f6b75">Or paste this link into your browser:</p>
<p style="margin:0 0 20px;font-size:13px;word-break:break-all"><a href="${escape(link)}" style="color:#2257b8">${escape(link)}</a></p>
<p style="margin:0;font-size:13px;color:#5f6b75;line-height:1.5">The link works for 24 hours. If you didn't sign up for NinRe, you can ignore this email.</p>
</td></tr></table></td></tr></table></body></html>`,
  };
}
