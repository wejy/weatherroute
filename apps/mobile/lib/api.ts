import { Platform } from "react-native";
import type { Locale } from "@weathertrip/i18n";
import { getDeviceId } from "@/lib/device-id";
import { getAnonCookieId } from "@/lib/anon";
import { getSessionToken } from "@/lib/session-store";

/**
 * Base URL of the Next.js API (apps/web).
 * Physical devices: set EXPO_PUBLIC_API_URL to your machine's LAN IP.
 * Expo web on localhost: rewrites a LAN IP to localhost so the browser
 * reaches the API reliably (WSL / firewall quirks).
 */
export function getApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!raw) return "";
  let base = raw.replace(/\/$/, "");

  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    try {
      const url = new URL(base);
      if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
        url.hostname = window.location.hostname;
        base = url.origin;
      }
    } catch {
      // keep configured base
    }
  }

  return base.replace(/\/$/, "");
}

export type PublicQuota = {
  searchesUsed: number;
  bonusCredits: number;
  limit: number;
  remaining: number;
  allowed: boolean;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  get isPaywall(): boolean {
    if (this.status !== 402) return false;
    const b = this.body as { error?: string } | null;
    return b?.error === "PAYWALL" || this.status === 402;
  }

  get quota(): PublicQuota | null {
    const b = this.body as { quota?: PublicQuota | null } | null;
    return b?.quota ?? null;
  }
}

async function buildHeaders(
  extra?: Record<string, string>,
): Promise<Record<string, string>> {
  const [deviceId, anonId, sessionToken] = await Promise.all([
    getDeviceId().catch(() => "web-anon"),
    getAnonCookieId().catch(() => "web-anon"),
    getSessionToken().catch(() => null),
  ]);

  // Prefer custom headers over `Cookie` — RN/Expo often strips or mishandles Cookie.
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-WeatherTrip-Device": deviceId,
    "X-WeatherTrip-Anon": anonId,
    ...extra,
  };

  if (sessionToken) {
    headers["X-WeatherTrip-Session"] = sessionToken;
  }

  return headers;
}

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    params?: Record<string, string | number | undefined | null>;
    body?: unknown;
    signal?: AbortSignal;
  },
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new Error("MISSING_API_URL");
  }

  const url = new URL(path.startsWith("http") ? path : `${base}${path}`);
  if (options?.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (value != null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = await buildHeaders(
    options?.body != null ? { "Content-Type": "application/json" } : undefined,
  );

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: options?.body != null ? JSON.stringify(options.body) : undefined,
    signal: options?.signal,
  }).catch((err: unknown) => {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new Error("NETWORK");
  });

  const body = await parseBody(res);
  if (!res.ok) {
    const msg =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `API ${res.status}`;
    throw new ApiError(res.status, body, msg);
  }

  return body as T;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
  options?: { signal?: AbortSignal },
): Promise<T> {
  return request<T>("GET", path, { params, signal: options?.signal });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, { body });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>("DELETE", path);
}

export type { Locale };
