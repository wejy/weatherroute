import "server-only";

import { createLogger, type Logger } from "@weathertrip/logger";

/** Root server logger for Next.js (Node runtime). */
export const logger: Logger = createLogger({
  name: "weathertrip-web",
  browser: false,
});

/** Module-scoped child logger (binds `module` on every line). */
export function createModuleLogger(module: string): Logger {
  return logger.child({ module });
}
