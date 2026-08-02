import { Linking } from "react-native";
import Constants from "expo-constants";

/**
 * In-app Stripe Checkout is for sideload / internal builds only.
 * Store binaries should set EXPO_PUBLIC_ALLOW_STRIPE_CHECKOUT=0 (or omit + production).
 *
 * Defaults: allowed in Expo Go / __DEV__; denied in release unless explicitly "1".
 */
export function isStripeCheckoutAllowed(): boolean {
  const raw = process.env.EXPO_PUBLIC_ALLOW_STRIPE_CHECKOUT?.trim().toLowerCase();
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return typeof __DEV__ !== "undefined" ? __DEV__ : false;
}

/** Marketing / account site for “buy on the web” when store checkout is disabled. */
export function getWebAppOrigin(): string {
  const explicit = process.env.EXPO_PUBLIC_WEB_ORIGIN?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const api = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (api) return api;
  return "";
}

export async function openWebProPage(): Promise<boolean> {
  const origin = getWebAppOrigin();
  if (!origin) return false;
  await Linking.openURL(`${origin}/pro`);
  return true;
}

export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}
