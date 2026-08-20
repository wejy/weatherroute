import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

/** Filename / CID used in HTML as `cid:icon.png` (Mailgun inline + Resend contentId). */
export const EMAIL_BRAND_ICON_FILENAME = "icon.png";
export const EMAIL_BRAND_ICON_CID = EMAIL_BRAND_ICON_FILENAME;
export const EMAIL_BRAND_ICON_CONTENT_TYPE = "image/png";

export type EmailInlineFile = {
  filename: string;
  contentType: string;
  content: Buffer;
};

/** Load brand mark from apps/web/public for embedded email images. */
export function loadEmailBrandIcon(): EmailInlineFile {
  const filePath = path.join(process.cwd(), "public", EMAIL_BRAND_ICON_FILENAME);
  return {
    filename: EMAIL_BRAND_ICON_FILENAME,
    contentType: EMAIL_BRAND_ICON_CONTENT_TYPE,
    content: readFileSync(filePath),
  };
}
