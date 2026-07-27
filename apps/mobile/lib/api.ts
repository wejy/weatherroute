import type { Locale } from "@weathertrip/i18n";
import { getDeviceId } from "@/lib/device-id";

/** Base URL of the Next.js API (apps/web). Use LAN IP for physical devices. */
export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error("MISSING_API_URL");
  }

  const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const deviceId = await getDeviceId();

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-WeatherTrip-Device": deviceId,
    },
  }).catch(() => {
    throw new Error("NETWORK");
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type { Locale };
