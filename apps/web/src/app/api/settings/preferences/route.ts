import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import {
  getEffectiveSameCountryOnly,
  writeSameCountryOnlyPreference,
} from "@/server/dal/user-prefs";
import { withApiLog } from "@/lib/api-log";

export async function GET(request: Request) {
  return withApiLog(request, "settings.preferences", async () => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    const sameCountry = await getEffectiveSameCountryOnly();
    return NextResponse.json({
      sameCountryOnly: sameCountry.preference,
      sameCountryOnlyEffective: sameCountry.effective,
      tier: sameCountry.tier,
    });
  });
}

export async function PATCH(request: Request) {
  return withApiLog(request, "settings.preferences.patch", async ({ log }) => {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const raw =
      body &&
      typeof body === "object" &&
      "sameCountryOnly" in body
        ? (body as { sameCountryOnly: unknown }).sameCountryOnly
        : undefined;

    if (typeof raw !== "boolean") {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }

    await writeSameCountryOnlyPreference(user.id, raw);
    const sameCountry = await getEffectiveSameCountryOnly();
    log.info(
      { userId: user.id, sameCountryOnly: raw, tier: sameCountry.tier },
      "same-country preference saved",
    );

    return NextResponse.json({
      sameCountryOnly: sameCountry.preference,
      sameCountryOnlyEffective: sameCountry.effective,
      tier: sameCountry.tier,
    });
  });
}
