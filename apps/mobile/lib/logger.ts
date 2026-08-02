import { createLogger, type Logger } from "@weathertrip/logger";

/** Root Expo logger (Pino browser / RN console destination). */
export const logger: Logger = createLogger({
  name: "weathertrip-mobile",
  browser: true,
});

export function createModuleLogger(module: string): Logger {
  return logger.child({ module });
}

export type { Logger };
