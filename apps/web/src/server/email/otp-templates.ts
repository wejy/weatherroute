import "server-only";

import {
  createTranslator,
  getDictionary,
  type Locale,
} from "@solviax/i18n";

export type OtpEmailContent = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build subject + plain text + HTML for OTP (welcome or returning). */
export function buildOtpEmail(opts: {
  locale: Locale;
  code: string;
  isNewUser: boolean;
}): OtpEmailContent {
  const t = createTranslator(getDictionary(opts.locale));
  const code = opts.code.trim();
  const safeCode = escapeHtml(code);

  const subject = opts.isNewUser
    ? t("email.otpSubjectWelcome")
    : t("email.otpSubject");
  const title = opts.isNewUser
    ? t("email.otpWelcomeTitle")
    : t("email.otpSignInTitle");
  const greeting = t("email.otpGreeting");
  const welcomeLead = opts.isNewUser ? t("email.otpWelcomeLead") : null;
  const codeIntro = t("email.otpCodeIntro");
  const expires = t("email.otpExpires");
  const ignore = t("email.otpIgnore");
  const footer = t("email.otpFooter");

  const textParts = [
    greeting,
    "",
    ...(welcomeLead ? [welcomeLead, ""] : []),
    codeIntro,
    code,
    "",
    expires,
    "",
    ignore,
    "",
    footer,
  ];

  const html = `<!DOCTYPE html>
<html lang="${opts.locale === "fi" ? "fi" : "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f5;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a2e24;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d8e5dd;">
          <tr>
            <td style="padding:28px 28px 8px;background:#0f7a45;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d8f5e6;">Solviax.app</p>
              <h1 style="margin:10px 0 0;font-size:22px;line-height:1.3;color:#ffffff;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px 8px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(greeting)}</p>
              ${
                welcomeLead
                  ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3d5348;">${escapeHtml(welcomeLead)}</p>`
                  : ""
              }
              <p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${escapeHtml(codeIntro)}</p>
              <p style="margin:0 0 20px;padding:16px 20px;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.28em;background:#f0faf4;border-radius:12px;color:#0f7a45;">${safeCode}</p>
              <p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#3d5348;">${escapeHtml(expires)}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7f74;">${escapeHtml(ignore)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.4;color:#8a9a91;">${escapeHtml(footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject,
    text: textParts.join("\n"),
    html,
  };
}
