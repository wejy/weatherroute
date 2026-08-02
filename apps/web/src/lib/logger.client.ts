"use client";

import { createLogger, type Logger } from "@weathertrip/logger";

/**
 * Browser / Client Component logger (Pino browser destination).
 * Prefer server `lib/logger` for API routes and Server Components.
 */
export const clientLogger: Logger = createLogger({
  name: "weathertrip-web-client",
  browser: true,
});

export function createClientModuleLogger(module: string): Logger {
  return clientLogger.child({ module });
}
