import { createLogger, type Logger } from "@solviax/logger";

/** Root Expo logger (Pino browser / RN console destination). */
export const logger: Logger = createLogger({
  name: "solviax-mobile",
  browser: true,
});

export function createModuleLogger(module: string): Logger {
  return logger.child({ module });
}

export type { Logger };
