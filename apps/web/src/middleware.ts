import { NextResponse, type NextRequest } from "next/server";
import { isCorsOriginAllowed } from "@/lib/env";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

/** Must match apps/web/src/server/dal/quota.ts */
export const ANON_COOKIE = "wt_anon";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** SHA-256 (base64) for CSP script-src hashes — avoids putting nonce on React-owned <script>s. */
export async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Buffer.from(digest).toString("base64");
}

/**
 * Per-request CSP. Script XSS is mitigated with nonce + strict-dynamic.
 * Theme boot uses a content hash (not a React `nonce` prop) to avoid hydration
 * mismatches — browsers hide nonce attributes after parse, which React flags.
 * Mapbox classic styles (light/dark-v11) do not need script unsafe-eval;
 * they do need style-src 'unsafe-inline' (GL injects un-nonced <style>).
 */
export function buildContentSecurityPolicy(
  nonce: string,
  themeBootScriptHash: string,
): string {
  const isDev = process.env.NODE_ENV === "development";
  const directives = [
    "default-src 'self'",
    // Next applies this nonce to framework scripts when CSP is on the request.
    // Theme boot is allowlisted by hash so layout need not set nonce={...}.
    // 'unsafe-eval' only for React Refresh / dev tooling — not required in prod or for Mapbox v11.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'sha256-${themeBootScriptHash}' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com${isDev ? " 'unsafe-eval'" : ""}`,
    // Keep unsafe-inline for styles; do not add style nonces (CSP3 would ignore unsafe-inline).
    "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: https://www.google-analytics.com https://www.googletagmanager.com",
    "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com wss: https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://www.google.com",
    "frame-src 'self' https://www.google.com https://www.recaptcha.net",
    "worker-src 'self' blob:",
    // Safari still falls back to child-src for Mapbox blob workers.
    "child-src 'self' blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  if (!isDev) {
    directives.push("upgrade-insecure-requests");
  }
  return directives.join("; ");
}

function securityHeaders(csp: string): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": csp,
  };
  if (process.env.NODE_ENV === "production") {
    headers["Strict-Transport-Security"] =
      "max-age=63072000; includeSubDomains; preload";
  }
  return headers;
}

function corsHeaders(origin: string | null): Record<string, string> | null {
  if (!origin) return null;
  if (!isCorsOriginAllowed(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Solviax-Device, X-Solviax-Session, X-Solviax-Anon, X-Request-Id, X-Solviax-Request-Id, Cookie",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Ensure anonymous freemium cookie exists.
 * Cookie writes are illegal in Server Components — do them here instead.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/");
  const origin = request.headers.get("origin");

  if (isApi && request.method === "OPTIONS") {
    const cors = corsHeaders(origin);
    if (!cors) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, { status: 204, headers: cors });
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const themeBootScriptHash = await sha256Base64(THEME_BOOT_SCRIPT);
  const csp = buildContentSecurityPolicy(nonce, themeBootScriptHash);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next reads CSP from the *request* to stamp nonces on framework scripts.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  for (const [key, value] of Object.entries(securityHeaders(csp))) {
    response.headers.set(key, value);
  }

  if (isApi) {
    const cors = corsHeaders(origin);
    if (cors) {
      for (const [key, value] of Object.entries(cors)) {
        response.headers.set(key, value);
      }
    }
  }

  if (!request.cookies.get(ANON_COOKIE)?.value) {
    const cookieId = crypto.randomUUID().replaceAll("-", "");
    response.cookies.set(ANON_COOKIE, cookieId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
