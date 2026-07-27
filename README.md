# WeatherTrip

Map-based weather trip planner — **npm workspaces monorepo**.

| Package | Path | Role |
|---|---|---|
| `@weathertrip/web` | `apps/web` | Next.js App Router web app + API |
| `@weathertrip/mobile` | `apps/mobile` | Expo (React Native) mobile app |
| `@weathertrip/i18n` | `packages/i18n` | Shared EN + FI dictionaries |

## Quick start

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# Terminal 1 — API + web UI
npm run dev:web

# Terminal 2 — Expo
npm run dev:mobile
```

Web: [http://localhost:3000](http://localhost:3000).

For a physical phone, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your machine’s LAN IP (e.g. `http://192.168.1.10:3000`).

## Agent / contributor rules

See [AGENTS.md](./AGENTS.md) and `.cursor/rules/dual-platform-i18n.mdc`:

- Always update **English and Finnish** in `packages/i18n`.
- Always keep **web and Expo** in sync for user-facing changes.

## Web pages

| Route | Description |
|---|---|
| `/` | Discover — search, weather filters, ranked destinations |
| `/map` | Map explorer |
| `/routes` | Route weather timeline |
| `/destinations/[slug]` | Detailed forecast |
| `/trips` | Saved trips |
| `/login` | Demo sign-in |

## API (consumed by web + mobile)

| Endpoint | Purpose |
|---|---|
| `GET /api/weather?lat=&lon=` | Weather DTO |
| `GET /api/search?q=` | Place search |
| `GET /api/geocode/reverse?lat=&lon=` | Reverse geocode |
| `GET /api/discover?...` | Ranked destinations |
| `GET /api/routes?from=&to=` | Route weather plan |

## Production checklist

Before deploying with `NODE_ENV=production`, set these in the web app environment (`apps/web`):

| Variable | Requirement |
|---|---|
| `AUTH_SECRET` | Random string, **≥ 32** characters |
| `EMAIL_MODE` | `resend` (`console` is rejected at boot) |
| `RESEND_API_KEY` | Required when `EMAIL_MODE=resend` |
| `USE_MOCKS` | `false` (`true` is rejected at boot) |
| `AUTH_TRUST_HOST` | `true` **only** behind a trusted reverse proxy that sets `Host` correctly; default is `false` |
| `CORS_ALLOWED_ORIGINS` | Production web origin (+ mobile/dev origins if needed) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Recommended for multi-instance rate limits |
| `NEXT_PUBLIC_APP_URL` / `AUTH_URL` | Canonical production URL |

See `apps/web/.env.example` for the full template.

### Auth.js + proxy (`AUTH_TRUST_HOST`)

Auth.js validates the request host. Leave `AUTH_TRUST_HOST` unset (or `false`) unless the app sits behind a reverse proxy you control (Vercel, Cloudflare, nginx, etc.). Enabling trust without a trusted proxy can allow Host-header attacks.

## Design

UI tokens and mockups live under `designs/`.
