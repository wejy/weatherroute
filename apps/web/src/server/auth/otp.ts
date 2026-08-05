import "server-only";

import { createModuleLogger } from "@/lib/logger";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";
import type { Locale } from "@solviax/i18n";
import { defaultLocale } from "@solviax/i18n";
import { rateLimit } from "@/lib/rate-limit";
import { getDb } from "@/db";
import { emailOtps, users } from "@/db/schema";
import { recordUsageEvent } from "@/server/dal/usage";
import { USAGE_TYPES } from "@/server/dal/usage-types";
import { buildOtpEmail } from "@/server/email/otp-templates";
import { sendTransactionalEmail } from "@/server/email/send";

const log = createModuleLogger("server.auth.otp");
const OTP_SEND_PER_EMAIL = 3;
const OTP_SEND_PER_IP = 10;
const OTP_SEND_WINDOW_MS = 60 * 60 * 1000;
const OTP_IP_WINDOW_MS = 60_000;
const MAX_VERIFY_ATTEMPTS = 5;

function hashCode(email: string, code: string): string {
  return createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}

function codesMatch(stored: string, candidate: string): boolean {
  const a = Buffer.from(stored, "utf8");
  const b = Buffer.from(candidate, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function enforceOtpSendLimits(
  email: string,
  clientKey: string,
): Promise<void> {
  const ipLimited = await rateLimit(
    `otp:ip:${clientKey}`,
    OTP_SEND_PER_IP,
    OTP_IP_WINDOW_MS,
  );
  if (!ipLimited.ok) {
    throw new Error("Rate limit exceeded");
  }

  const emailLimited = await rateLimit(
    `otp:email:${email}`,
    OTP_SEND_PER_EMAIL,
    OTP_SEND_WINDOW_MS,
  );
  if (!emailLimited.ok) {
    throw new Error("Rate limit exceeded");
  }
}

const emailSchema = z.string().email();

/** Create + send a 6-digit OTP. */
export async function requestEmailOtp(
  emailRaw: string,
  opts?: { clientKey?: string; locale?: Locale },
): Promise<{ ok: true }> {
  const parsed = emailSchema.safeParse(emailRaw.trim());
  if (!parsed.success) {
    throw new Error("Invalid email");
  }
  const email = parsed.data.toLowerCase();
  const clientKey = opts?.clientKey ?? "unknown";
  const locale = opts?.locale ?? defaultLocale;

  const db = getDb();
  if (!db) {
    throw new Error("Failed to send code");
  }

  await enforceOtpSendLimits(email, clientKey);

  const [locked] = await db
    .select()
    .from(emailOtps)
    .where(
      and(eq(emailOtps.email, email), gt(emailOtps.expiresAt, new Date())),
    )
    .limit(1);

  if (locked && locked.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new Error("Too many attempts. Try again later.");
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const isNewUser = !existingUser;

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.delete(emailOtps).where(eq(emailOtps.email, email));
  await db.insert(emailOtps).values({
    email,
    codeHash: hashCode(email, code),
    expiresAt,
    attempts: 0,
  });

  const content = buildOtpEmail({ locale, code, isNewUser });
  try {
    await sendTransactionalEmail({
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
  } catch (err) {
    log.error({ err, email }, "OTP email send failed");
    throw err instanceof Error ? err : new Error("Failed to send code");
  }

  return { ok: true };
}

/** Verify OTP and ensure a users row exists. Returns user id. */
export async function verifyEmailOtp(
  emailRaw: string,
  codeRaw: string,
): Promise<{ userId: string; email: string; name: string | null }> {
  const email = emailRaw.toLowerCase().trim();
  const code = codeRaw.trim();
  const db = getDb();
  if (!db) throw new Error("Database required for email OTP");

  const [row] = await db
    .select()
    .from(emailOtps)
    .where(and(eq(emailOtps.email, email), gt(emailOtps.expiresAt, new Date())))
    .limit(1);

  if (!row) {
    throw new Error("Invalid or expired code");
  }

  if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new Error("Too many attempts");
  }

  const candidateHash = hashCode(email, code);
  if (!codesMatch(row.codeHash, candidateHash)) {
    await db
      .update(emailOtps)
      .set({ attempts: row.attempts + 1 })
      .where(eq(emailOtps.id, row.id));
    throw new Error("Invalid or expired code");
  }

  await db.delete(emailOtps).where(eq(emailOtps.email, email));

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ emailVerified: new Date() })
      .where(eq(users.id, existing.id));
    recordUsageEvent({
      type: USAGE_TYPES.login,
      userId: existing.id,
      meta: { newUser: false },
    });
    return {
      userId: existing.id,
      email: existing.email,
      name: existing.name,
    };
  }

  const [created] = await db
    .insert(users)
    .values({
      email,
      name: email.split("@")[0] ?? null,
      emailVerified: new Date(),
    })
    .returning();

  if (!created) throw new Error("Failed to create user");
  recordUsageEvent({
    type: USAGE_TYPES.login,
    userId: created.id,
    meta: { newUser: true },
  });
  return { userId: created.id, email: created.email, name: created.name };
}
