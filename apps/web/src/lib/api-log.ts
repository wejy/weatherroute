import "server-only";

import { NextRequest, NextResponse } from "next/server";
import type { Logger } from "@weathertrip/logger";
import { createModuleLogger } from "@/lib/logger";
import { getClientIp } from "@/lib/client-ip";

const baseLog = createModuleLogger("api");

export type ApiLogContext = {
  log: Logger;
  requestId: string;
  ip: string;
  path: string;
  method: string;
  startedAt: number;
};

function newRequestId(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 16);
}

function resolvePath(request: Request | NextRequest): string {
  if (request instanceof NextRequest || "nextUrl" in request) {
    return (request as NextRequest).nextUrl.pathname;
  }
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}

function attachRequestId(res: Response, requestId: string): Response {
  const headers = new Headers(res.headers);
  headers.set("X-Request-Id", requestId);
  return new NextResponse(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/**
 * Wrap an API route handler with structured request/response logging:
 * requestId, IP, method, path, status, durationMs.
 */
export async function withApiLog(
  request: Request | NextRequest,
  route: string,
  handler: (ctx: ApiLogContext) => Promise<Response>,
): Promise<Response> {
  const requestId =
    request.headers.get("x-request-id")?.trim() ||
    request.headers.get("x-weathertrip-request-id")?.trim() ||
    newRequestId();
  const method = request.method;
  const path = resolvePath(request);
  const ip = getClientIp(request);
  const startedAt = Date.now();
  const hasSession = Boolean(
    request.headers.get("x-weathertrip-session")?.trim(),
  );
  const log = baseLog.child({
    requestId,
    route,
    method,
    path,
    ip,
    hasSession,
  });

  log.info("request start");

  try {
    const res = await handler({
      log,
      requestId,
      ip,
      path,
      method,
      startedAt,
    });
    const ms = Date.now() - startedAt;
    const status = res.status;
    const bindings = { status, ms };

    if (status >= 500) {
      log.error(bindings, "request end");
    } else if (status === 402) {
      log.warn(bindings, "request paywalled");
    } else if (status === 429) {
      log.warn(bindings, "request rate limited");
    } else if (status >= 400) {
      log.info(bindings, "request client error");
    } else {
      log.info(bindings, "request end");
    }

    return attachRequestId(res, requestId);
  } catch (err) {
    const ms = Date.now() - startedAt;
    log.error({ err, ms }, "request unhandled error");
    return NextResponse.json(
      { error: "Internal server error", requestId },
      { status: 500, headers: { "X-Request-Id": requestId } },
    );
  }
}
