# `@weathertrip/logger`

Shared [Pino](https://getpino.io/) logger for WeatherTrip **web** (Next.js server) and **mobile** (Expo).

## Usage

```ts
import { createLogger } from "@weathertrip/logger";

const log = createLogger({ name: "weathertrip-web" });
log.info({ route: "/api/discover" }, "request ok");
log.warn({ err }, "fallback");
log.error({ err }, "failed");

const child = log.child({ module: "mapbox" });
child.debug("cache hit");
```

## Environment

| Variable | Meaning |
|---|---|
| `LOG_LEVEL` / `PINO_LOG_LEVEL` | `trace` … `fatal` (default: `debug` in development, `info` in production) |
| `LOG_PRETTY=0` | Disable `pino-pretty` in Node even in development |
| `NODE_ENV=production` | JSON logs to stdout (no pretty transport) |

## Platform notes

- **Node / Next.js server**: real Pino + optional `pino-pretty` in dev. Add `pino` / `pino-pretty` to Next `serverExternalPackages`.
- **Expo / browser**: Pino `browser.asObject` mode (console), same API — no Node worker threads.
- Sensitive keys (`token`, `cookie`, OTP `code`, session headers, etc.) are redacted by default.

## What is instrumented

- **Web API**: `withApiLog` on product routes (discover, search, routes, weather, geo, wikipedia, share, OTP, auth/me) — requestId, IP, status, duration, `X-Request-Id` header.
- **Mobile**: API client (requestId + failures), discover, routes, location (coarse/precise), session OTP, paywall share/redeem, app startup.
