import { NextRequest, NextResponse } from "next/server";
import { wikipediaQuerySchema } from "@/lib/validation/schemas";
import { rateLimit } from "@/lib/rate-limit";
import { fetchWikipediaPlaceSummary } from "@/server/integrations/wikipedia";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const limited = rateLimit(`wikipedia:${ip}`, 40);
  if (!limited.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const parsed = wikipediaQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, lat, lon, lang } = parsed.data;
  const summary = await fetchWikipediaPlaceSummary({ name, lat, lon, lang });
  return NextResponse.json({ summary });
}
