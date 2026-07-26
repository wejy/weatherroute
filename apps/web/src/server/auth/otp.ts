import "server-only";

import { createHash, randomInt } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { env } from "@/lib/env";
import { getDb } from "@/db";
import { emailOtps, users } from "@/db/schema";

function hashCode(email: string, code: string): string {
  return createHash("sha256")
    .update(`${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  const subject = "Your WeatherTrip sign-in code";
  const body = `Your WeatherTrip code is ${code}. It expires in 10 minutes.`;

  if (env.emailMode === "resend" && env.resendApiKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [email],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Resend failed: ${res.status} ${text}`);
    }
    return;
  }

  console.info(`[email:console] to=${email} code=${code} — ${body}`);
}

/** Create + send a 6-digit OTP. Returns true when queued/sent. */
export async function requestEmailOtp(emailRaw: string): Promise<{ ok: true }> {
  const email = emailRaw.toLowerCase().trim();
  if (!email.includes("@")) {
    throw new Error("Invalid email");
  }

  const db = getDb();
  if (!db) {
    throw new Error("Database required for email OTP");
  }

  const code = String(randomInt(100000, 999999));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.delete(emailOtps).where(eq(emailOtps.email, email));
  await db.insert(emailOtps).values({
    email,
    codeHash: hashCode(email, code),
    expiresAt,
  });

  await sendOtpEmail(email, code);
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

  if (row.attempts >= 5) {
    throw new Error("Too many attempts");
  }

  await db
    .update(emailOtps)
    .set({ attempts: row.attempts + 1 })
    .where(eq(emailOtps.id, row.id));

  if (row.codeHash !== hashCode(email, code)) {
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
  return { userId: created.id, email: created.email, name: created.name };
}
