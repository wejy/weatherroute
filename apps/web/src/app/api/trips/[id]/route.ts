import { NextRequest, NextResponse } from "next/server";
import { withApiLog } from "@/lib/api-log";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/server/auth/session";
import { deleteTrip } from "@/server/dal/trips";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Params) {
  return withApiLog(request, "trips.delete", async ({ log, ip }) => {
    const limited = await rateLimit(`trips-write:${ip}`, 30);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Missing trip id" }, { status: 400 });
    }

    const ok = await deleteTrip(user.id, id.trim());
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    log.info({ userId: user.id, tripId: id }, "trip deleted");
    return NextResponse.json({ ok: true });
  });
}
