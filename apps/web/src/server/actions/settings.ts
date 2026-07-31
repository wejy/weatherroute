"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  DISCOVER_DISPLAY_COOKIE,
  DISCOVER_DISPLAY_OPTIONS,
  getDiscoverTierForSettings,
} from "@/server/dal/discover-limits";
import {
  EARLIEST_DEPARTURE_COOKIE,
  EARLIEST_DEPARTURE_HOURS,
} from "@/server/dal/user-prefs";
import { getCurrentUser, signOut } from "@/server/auth/session";
import { DISCOVER_PRO_DISPLAY_MAX } from "@/lib/distance";

export async function saveDiscoverDisplayAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  const raw = Number(formData.get("display"));
  if (!DISCOVER_DISPLAY_OPTIONS.includes(raw as (typeof DISCOVER_DISPLAY_OPTIONS)[number])) {
    redirect("/settings?error=display");
  }

  const { tier } = await getDiscoverTierForSettings();
  // Free users may store preference, but discover clamps to 20 until Pro.
  const value = Math.min(DISCOVER_PRO_DISPLAY_MAX, Math.max(10, raw));
  if (tier === "free" && value > 20) {
    // Still save preference for after upgrade, but OK
  }

  const jar = await cookies();
  jar.set(DISCOVER_DISPLAY_COOKIE, String(value), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/");
  revalidatePath("/map");
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function saveEarliestDepartureAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  const raw = String(formData.get("earliestDeparture") ?? "any");
  let value = "any";
  if (raw !== "any") {
    const hour = Number(raw);
    if (!EARLIEST_DEPARTURE_HOURS.includes(hour)) {
      redirect("/settings?error=earliest");
    }
    value = String(hour);
  }

  // Preference is stored for all signed-in users; routes apply it only for Pro.
  const jar = await cookies();
  jar.set(EARLIEST_DEPARTURE_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/routes");
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function settingsSignOutAction() {
  await signOut();
  redirect("/");
}
