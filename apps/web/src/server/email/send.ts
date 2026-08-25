import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { env } from "@/lib/env";
import {
  EMAIL_BRAND_ICON_CID,
  loadEmailBrandIcon,
  type EmailInlineFile,
} from "@/server/email/brand-assets";

const log = createModuleLogger("server.email");

export type TransactionalEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Extra inline images (CID = filename). Brand icon is attached automatically when HTML uses cid:icon.png. */
  inline?: EmailInlineFile[];
};

function resolveInlineFiles(msg: TransactionalEmail): EmailInlineFile[] {
  const files = [...(msg.inline ?? [])];
  if (
    msg.html.includes(`cid:${EMAIL_BRAND_ICON_CID}`) &&
    !files.some((f) => f.filename === EMAIL_BRAND_ICON_CID)
  ) {
    try {
      files.push(loadEmailBrandIcon());
    } catch (err) {
      log.warn({ err }, "email brand icon missing from public/ — skipping inline");
    }
  }
  return files;
}

function isSimpleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendViaResend(msg: TransactionalEmail): Promise<void> {
  const inline = resolveInlineFiles(msg);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [msg.to],
      ...(isSimpleEmail(env.emailReplyTo)
        ? { reply_to: env.emailReplyTo }
        : {}),
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      ...(inline.length > 0
        ? {
            attachments: inline.map((file) => ({
              filename: file.filename,
              content: file.content.toString("base64"),
              content_id: file.filename,
              content_type: file.contentType,
            })),
          }
        : {}),
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
  // Sandbox / root domain From: Mailgun requires From on MAILGUN_DOMAIN
  const display =
    configured.includes("<") && configured.indexOf("<") > 0
      ? configured.slice(0, configured.indexOf("<")).trim() || "Solviax.app"
      : "Solviax.app";
  const rewritten = `${display} <noreply@${domain}>`;
  log.warn(
    { configured, rewritten, domain },
    "EMAIL_FROM host does not match MAILGUN_DOMAIN — using domain-safe From",
  );
  return rewritten;
}

async function postMailgunMessage(
  msg: TransactionalEmail,
  inline: EmailInlineFile[],
): Promise<Response> {
  const domain = env.mailgunDomain;
  const base = env.mailgunApiBaseUrl.replace(/\/$/, "");
  const url = `${base}/v3/${domain}/messages`;
  const from = mailgunFromAddress();

  const form = new FormData();
  form.set("from", from);
  form.set("to", msg.to);
  if (isSimpleEmail(env.emailReplyTo)) {
    form.set("h:Reply-To", env.emailReplyTo);
  }
  form.set("subject", msg.subject);
  form.set("text", msg.text);
  form.set("html", msg.html);

  for (const file of inline) {
    // File (not bare Blob) keeps a stable filename for Mailgun cid: mapping.
    const bytes = new Uint8Array(file.content);
    form.append(
      "inline",
      new File([bytes], file.filename, { type: file.contentType }),
    );
  }

  const auth = Buffer.from(`api:${env.mailgunApiKey}`).toString("base64");
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: form,
  });
}

async function sendViaMailgun(msg: TransactionalEmail): Promise<void> {
  const inline = resolveInlineFiles(msg);
  const from = mailgunFromAddress();

  let res = await postMailgunMessage(msg, inline);
  if (!res.ok && inline.length > 0) {
    const text = await res.text().catch(() => "");
    log.warn(
      { status: res.status, body: text.slice(0, 400), from, to: msg.to },
      "Mailgun failed with inline attachments — retrying without them",
    );
    res = await postMailgunMessage(msg, []);
  }

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
