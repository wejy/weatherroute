"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, signInDemo, signOut } from "@/server/auth/session";
import { createTrip, deleteTrip } from "@/server/dal/trips";

export async function loginDemoAction() {
  await signInDemo();
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
