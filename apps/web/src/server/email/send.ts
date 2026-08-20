import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { env } from "@/lib/env";

const log = createModuleLogger("server.email");

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

async function sendViaResend(msg: TransactionalEmail): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [msg.to],
      reply_to: env.emailReplyTo,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error(
      { status: res.status, body: text.slice(0, 200) },
      "Resend email failed",
    );
    throw new Error("Failed to send code");
  }
}

function mailgunFromAddress(): string {
  const configured = env.emailFrom.trim();
  const domain = env.mailgunDomain;
  // Extract email inside <...> or bare address
  const match =
    /<([^>]+)>/.exec(configured)?.[1]?.trim() ||
    configured.match(/\S+@\S+/)?.[0]?.trim() ||
    "";
  const at = match.lastIndexOf("@");
  const fromHost = at >= 0 ? match.slice(at + 1).toLowerCase() : "";
  if (fromHost && fromHost === domain.toLowerCase()) {
    return configured;
  }
  // Sandbox / unverified custom domain: From must be on MAILGUN_DOMAIN
  const display =
    configured.includes("<") && configured.indexOf("<") > 0
      ? configured.slice(0, configured.indexOf("<")).trim() || "Solviax.app"
      : "Solviax.app";
  const rewritten = `${display} <postmaster@${domain}>`;
  log.warn(
    { configured, rewritten, domain },
    "EMAIL_FROM host does not match MAILGUN_DOMAIN — using sandbox-safe From",
  );
  return rewritten;
}

async function sendViaMailgun(msg: TransactionalEmail): Promise<void> {
  const domain = env.mailgunDomain;
  const base = env.mailgunApiBaseUrl.replace(/\/$/, "");
  const url = `${base}/v3/${domain}/messages`;
  const from = mailgunFromAddress();

  const form = new FormData();
  form.set("from", from);
  form.set("to", msg.to);
  form.set("h:Reply-To", env.emailReplyTo);
  form.set("subject", msg.subject);
  form.set("text", msg.text);
  form.set("html", msg.html);

  const auth = Buffer.from(`api:${env.mailgunApiKey}`).toString("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log.error(
      { status: res.status, body: text.slice(0, 400), from, to: msg.to },
      "Mailgun email failed",
    );
    throw new Error("Failed to send code");
  }
}
/** Send transactional email via configured provider (mailgun | resend | console). */
export async function sendTransactionalEmail(
  msg: TransactionalEmail,
): Promise<void> {
  if (env.emailMode === "mailgun" && env.mailgunApiKey && env.mailgunDomain) {
    await sendViaMailgun(msg);
    return;
  }

  if (env.emailMode === "resend" && env.resendApiKey) {
    await sendViaResend(msg);
    return;
  }

  if (env.isProduction) {
    throw new Error("Email provider not configured");
  }

  log.info(
    { to: msg.to, subject: msg.subject, mode: env.emailMode },
    "console email sent (body not logged)",
  );
  if (process.env.LOG_OTP_CODE === "1") {
    const codeMatch = msg.text.match(/\b(\d{6})\b/);
    log.warn(
      { to: msg.to, debugCode: codeMatch?.[1] ?? "(see text)" },
      "LOG_OTP_CODE=1 — OTP visible",
    );
  }
}
