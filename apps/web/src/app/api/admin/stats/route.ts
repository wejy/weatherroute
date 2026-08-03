import { NextRequest, NextResponse } from "next/server";
import { withApiLog } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdminApi } from "@/server/dal/roles";
import { getAdminStats } from "@/server/dal/admin-stats";
import { recordUsageEvent } from "@/server/dal/usage";
import { USAGE_TYPES } from "@/server/dal/usage-types";

export async function GET(request: NextRequest) {
  return withApiLog(request, "admin.stats", async ({ log, ip }) => {
    const admin = await requireAdminApi();
    if (!admin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const limited = await rateLimit(`admin-stats:${admin.id}:${ip}`, 20);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    const stats = await getAdminStats({ from, to });

    recordUsageEvent({
      type: USAGE_TYPES.adminStatsView,
      userId: admin.id,
      meta: { from: stats.from, to: stats.to },
    });
    log.info(
      { userId: admin.id, from: stats.from, to: stats.to },
      "admin.stats",
    );

    return NextResponse.json(stats);
  });
}
