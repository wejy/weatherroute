import { NextResponse, type NextRequest } from "next/server";

/** Must match apps/web/src/server/dal/quota.ts */
export const ANON_COOKIE = "wt_anon";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Ensure anonymous freemium cookie exists.
 * Cookie writes are illegal in Server Components — do them here instead.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
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
    /*
     * Skip static assets; run for pages + API so quota cookie is always present.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
