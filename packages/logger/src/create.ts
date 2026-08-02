import pino, { type Logger, type LoggerOptions } from "pino";
import { REDACT_PATHS } from "./redact";

export type CreateLoggerOptions = {
  /** Logger name / service id (appears as `name` on every line). */
  name?: string;
  /** Override level: trace | debug | info | warn | error | fatal */
  level?: string;
  /**
   * Force browser / React Native destination (console).
   * Auto-detected when omitted.
   */
  browser?: boolean;
};

function envLevel(): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env.LOG_LEVEL?.trim() || process.env.PINO_LOG_LEVEL?.trim();
}

function envNodeEnv(): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  return process.env.NODE_ENV;
}

function isBrowserLike(): boolean {
  if (typeof window !== "undefined") return true;
  // React Native
  if (
    typeof navigator !== "undefined" &&
    typeof (navigator as { product?: string }).product === "string" &&
    (navigator as { product?: string }).product === "ReactNative"
  ) {
    return true;
  }
  // Expo / RN often have no process.versions.node
  if (typeof process !== "undefined" && process.versions?.node) return false;
  return typeof document !== "undefined";
}

function resolveLevel(explicit?: string): string {
  if (explicit) return explicit;
  const fromEnv = envLevel();
  if (fromEnv) return fromEnv;
  return envNodeEnv() === "production" ? "info" : "debug";
}

/**
 * Create a Pino logger.
 * - Node (Next.js server / scripts): JSON stdout in production; optional pretty in dev.
 * - Browser / Expo: `browser.asObject` → structured console output (no Node streams).
 */
export function createLogger(opts: CreateLoggerOptions = {}): Logger {
  const name = opts.name ?? "solviax";
  const level = resolveLevel(opts.level);
  const useBrowser = opts.browser ?? isBrowserLike();

  const base: LoggerOptions = {
    name,
    level,
    redact: {
      paths: [...REDACT_PATHS],
      remove: true,
    },
  };

  if (useBrowser) {
    // Expo / Metro may expose LOG_LEVEL only via EXPO_PUBLIC_* 
    const expoLevel =
      (typeof process !== "undefined" &&
        process.env?.EXPO_PUBLIC_LOG_LEVEL?.trim()) ||
      undefined;
    return pino({
      ...base,
      level: opts.level ?? expoLevel ?? level,
      browser: {
        asObject: true,
        serialize: true,
      },
    });
  }

  const isProd = envNodeEnv() === "production";
  const prettyDisabled =
    typeof process !== "undefined" && process.env?.LOG_PRETTY === "0";

  // Avoid pino-pretty worker transport in production and when disabled —
  // Next.js bundling + Edge are happier with plain JSON to stdout.
  if (!isProd && !prettyDisabled) {
    try {
      return pino({
        ...base,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      });
    } catch {
      return pino(base);
    }
  }

  return pino(base);
}

export function createChildLogger(
  parent: Logger,
  bindings: Record<string, unknown>,
): Logger {
  return parent.child(bindings);
}

export type { Logger };
export { REDACT_PATHS } from "./redact";
