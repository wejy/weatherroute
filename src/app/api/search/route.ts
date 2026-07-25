import { NextRequest, NextResponse } from "next/server";
import { searchQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { searchPlaces } from "@/server/integrations/mapbox";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`search:${ip}`, 40);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = searchQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const places = await searchPlaces(parsed.data.q, parsed.data.limit);
  return NextResponse.json({ results: places });
}
