/**
 * Detect Postgres / network failures without exposing SQL or connection strings.
 * Safe to call from API wrappers, logging, and unit tests (no server-only).
 */
export function isDatabaseUnavailableError(err: unknown): boolean {
  const seen = new Set<unknown>();
  const stack: unknown[] = [err];

  while (stack.length > 0) {
    const cur = stack.pop();
    if (cur == null || seen.has(cur)) continue;
    seen.add(cur);

    if (typeof cur === "string") {
      if (matchesUnavailableText(cur)) return true;
      continue;
    }

    if (typeof cur !== "object") continue;

    const obj = cur as Record<string, unknown>;
    const code = String(obj.code ?? obj.errno ?? "");
    if (UNAVAILABLE_CODES.has(code)) return true;

    const msg = String(obj.message ?? "");
    if (matchesUnavailableText(msg)) return true;

    if (Array.isArray(obj.errors)) {
      for (const e of obj.errors) stack.push(e);
    }
    if (obj.cause) stack.push(obj.cause);
  }

  return false;
}

const UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
  "08000", // connection_exception
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08003", // connection_does_not_exist
  "08006", // connection_failure
  "08004", // sqlserver_rejected_establishment
]);

function matchesUnavailableText(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("connect_timeout") ||
    t.includes("connection refused") ||
    t.includes("econnrefused") ||
    t.includes("etimedout") ||
    t.includes("enotfound") ||
    t.includes("getaddrinfo") ||
    t.includes("could not connect") ||
    t.includes("connection terminated") ||
    t.includes("server closed the connection") ||
    t.includes("too many connections") ||
    t.includes("remaining connection slots") ||
    t.includes("the database system is starting up") ||
    t.includes("the database system is shutting down") ||
    t.includes("no pg_hba.conf entry") ||
    (t.includes("connect") && t.includes("timeout"))
  );
}

/** Public API / UI code — never include SQL or host details. */
export const SERVICE_UNAVAILABLE_CODE = "SERVICE_UNAVAILABLE" as const;
