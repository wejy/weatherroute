"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  requireUser,
  signInDemo,
  signInWithOtp,
  signOut,
} from "@/server/auth/session";
import { requestEmailOtp } from "@/server/auth/otp";
import { createTrip, deleteTrip } from "@/server/dal/trips";
import { haversineKm } from "@/server/integrations/mocks/data";
import { getClientIpFromHeaders } from "@/lib/client-ip";
import { saveTripInputSchema } from "@/lib/validation/schemas";

export async function loginDemoAction() {
  await signInDemo();
  redirect("/settings");
}

export async function requestOtpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const next = safeNextPath(String(formData.get("next") || ""));
  if (!email) {
    redirect(`/login?error=email${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  try {
    const h = await headers();
    const clientKey = getClientIpFromHeaders(h);
    await requestEmailOtp(email, { clientKey });
  } catch {
    redirect(`/login?error=send${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  redirect(
    `/login?email=${encodeURIComponent(email)}&sent=1${next ? `&next=${encodeURIComponent(next)}` : ""}`,
  );
}

export async function verifyOtpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const code = String(formData.get("code") || "").trim();
  const next = safeNextPath(String(formData.get("next") || "")) || "/settings";
  try {
    await signInWithOtp(email, code);
  } catch {
    redirect(
      `/login?email=${encodeURIComponent(email)}&error=code${next !== "/settings" ? `&next=${encodeURIComponent(next)}` : ""}`,
    );
  }
  redirect(next);
}

function safeNextPath(raw: string): string {
  const v = raw.trim();
  if (!v.startsWith("/") || v.startsWith("//")) return "";
  return v;
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}

export async function saveTripAction(formData: FormData) {
  const user = await requireUser();

  const originLatRaw = formData.get("originLat");
  const originLonRaw = formData.get("originLon");
  const originLat =
    originLatRaw != null && String(originLatRaw) !== ""
      ? Number(originLatRaw)
      : null;
  const originLon =
    originLonRaw != null && String(originLonRaw) !== ""
      ? Number(originLonRaw)
      : null;

  let distanceKm = Number(formData.get("distanceKm") || 0);
  const destinationLat = Number(formData.get("destinationLat") || 0);
  const destinationLon = Number(formData.get("destinationLon") || 0);

  if (
    (!Number.isFinite(distanceKm) || distanceKm <= 0) &&
    originLat != null &&
    originLon != null &&
    Number.isFinite(originLat) &&
    Number.isFinite(originLon) &&
    Number.isFinite(destinationLat) &&
    Number.isFinite(destinationLon)
  ) {
    distanceKm = Math.round(
      haversineKm(
        { lat: originLat, lon: originLon },
        { lat: destinationLat, lon: destinationLon },
      ),
    );
  }

  const parsed = saveTripInputSchema.safeParse({
    title: String(formData.get("title") || "Saved trip"),
    originName: String(formData.get("originName") || "Helsinki"),
    destinationName: String(formData.get("destinationName") || ""),
    destinationLat,
    destinationLon,
    originLat,
    originLon,
    weatherGoal: String(formData.get("weatherGoal") || "best"),
    travelMode: String(formData.get("travelMode") || "driving"),
    datePreset: String(formData.get("datePreset") || "") || null,
    startDate: String(formData.get("startDate") || "") || null,
    endDate: String(formData.get("endDate") || "") || null,
    distanceKm: Number.isFinite(distanceKm) ? distanceKm : 0,
    durationLabel: String(formData.get("durationLabel") || "") || null,
  });

  if (!parsed.success) {
    throw new Error("Invalid trip data");
  }

  await createTrip(user.id, parsed.data);

  revalidatePath("/trips");
  redirect("/trips");
}

export async function deleteTripAction(formData: FormData) {
  const user = await requireUser();
  const tripId = String(formData.get("tripId") || "");
  await deleteTrip(user.id, tripId);
  revalidatePath("/trips");
}
