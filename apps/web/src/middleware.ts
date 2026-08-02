import { NextResponse, type NextRequest } from "next/server";
import { isCorsOriginAllowed } from "@/lib/env";

/** Must match apps/web/src/server/dal/quota.ts */
export const ANON_COOKIE = "wt_anon";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "X-Frame-Options": "DENY",
  };
  if (process.env.NODE_ENV === "production") {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }
  headers["Content-Security-Policy"] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com",
    // Mapbox GL + Google Material Symbols (layout.tsx)
    "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com wss:",
    "worker-src 'self' blob:",
    // next/font (self) + Material Symbols (fonts.gstatic.com)
    "font-src 'self' data: https://fonts.gstatic.com",
    "frame-ancestors 'none'",
  ].join("; ");
  return headers;
}

function corsHeaders(origin: string | null): Record<string, string> | null {
  if (!origin) return null;
  if (!isCorsOriginAllowed(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-WeatherTrip-Device, X-WeatherTrip-Session, X-WeatherTrip-Anon, X-Request-Id, X-WeatherTrip-Request-Id, Cookie",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Ensure anonymous freemium cookie exists.
 * Cookie writes are illegal in Server Components — do them here instead.
 */
export function middleware(request: NextRequest) {
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

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(securityHeaders())) {
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
