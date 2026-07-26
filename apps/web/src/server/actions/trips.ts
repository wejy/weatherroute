"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  requireUser,
  signInDemo,
  signInWithOtp,
  signOut,
} from "@/server/auth/session";
import { requestEmailOtp } from "@/server/auth/otp";
import { createTrip, deleteTrip } from "@/server/dal/trips";

export async function loginDemoAction() {
  await signInDemo();
  redirect("/trips");
}

export async function requestOtpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) {
    redirect("/login?error=email");
  }
  try {
    await requestEmailOtp(email);
  } catch {
    redirect("/login?error=send");
  }
  redirect(`/login?email=${encodeURIComponent(email)}&sent=1`);
}

export async function verifyOtpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const code = String(formData.get("code") || "").trim();
  try {
    await signInWithOtp(email, code);
  } catch {
    redirect(
      `/login?email=${encodeURIComponent(email)}&error=code`,
    );
  }
  redirect("/trips");
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}

export async function saveTripAction(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") || "Saved trip");
  const originName = String(formData.get("originName") || "Helsinki");
  const destinationName = String(formData.get("destinationName") || "");
  const destinationLat = Number(formData.get("destinationLat") || 0);
  const destinationLon = Number(formData.get("destinationLon") || 0);
  const weatherGoal = String(formData.get("weatherGoal") || "sun");
  const distanceKm = Number(formData.get("distanceKm") || 0);

  await createTrip(user.id, {
    title,
    originName,
    destinationName,
    destinationLat,
    destinationLon,
    weatherGoal,
    distanceKm,
  });

  revalidatePath("/trips");
  redirect("/trips");
}

export async function deleteTripAction(formData: FormData) {
  const user = await requireUser();
  const tripId = String(formData.get("tripId") || "");
  await deleteTrip(user.id, tripId);
  revalidatePath("/trips");
}
