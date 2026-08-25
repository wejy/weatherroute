# Solviax.app

Map-based weather trip planner — **npm workspaces monorepo**.

| Package | Path | Role |
|---|---|---|
| `@solviax/web` | `apps/web` | Next.js App Router web app + API |
| `@solviax/mobile` | `apps/mobile` | Expo (React Native) mobile app |
| `@solviax/i18n` | `packages/i18n` | Shared EN + FI dictionaries |
| `@solviax/logger` | `packages/logger` | Shared Pino logger (web server + Expo) |

## Quick start

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

# Postgres + schema + demo places (see Local database below)
npm run db:up
npm run db:migrate
npm run db:seed

# Terminal 1 — API + web UI
npm run dev:web

# Terminal 2 — Expo
npm run dev:mobile
```

Web: [http://localhost:3004](http://localhost:3004) (dev port **3004**).

Confirm `DATABASE_URL` in `apps/web/.env.local` matches Docker defaults:

`postgresql://solviax:solviax@localhost:5433/solviax`

For a physical phone, set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your machine’s LAN IP (e.g. `http://192.168.1.10:3004`).

## E2E (Playwright)

Smoke tests live in `apps/web/e2e/`. They spin a **mocked** Next server on port **3100** (`USE_MOCKS=true`) — stop any other Next process in this repo first (Next keeps a per-directory dev lock; a running `:3004` will block e2e).

```bash
# Once per machine / CI image
cd apps/web && npx playwright install chromium

# From repo root
npm run test:e2e
```

Guest vs signed-in header checks use the demo cookie (`wt_session=demo`) only while mocks are on — not real OTP/Mailgun.

Map basemap locale tests skip unless `NEXT_PUBLIC_MAPBOX_TOKEN` or `PLAYWRIGHT_MAPBOX_TOKEN` is a `pk.` token.

Against an already-running app (no mock injection from config):

```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3004 npm run test:e2e
```

## Local database

Docker Compose runs Postgres 16 on host port **5433** (user / password / db: `solviax`). Commands below are from the **repo root**.

### Bring the DB up to date (typical after clone or `git pull`)

1. Start (or restart) Postgres.
2. Apply pending Drizzle migrations.
3. Seed places (safe to re-run; upserts city index data).

```bash
npm run db:up
npm run db:migrate
npm run db:seed
```

Optional denser place catalog (Geonames download; slower):

```bash
npm run db:seed:geonames
```

Optional Pro demo user(s) only (also included in `db:seed`):

```bash
npm run db:seed:pro -w @solviax/web
```

Then start the app: `npm run dev:web`.

### Command reference

| Command | What it does |
|---|---|
| `npm run db:up` | `docker compose up -d` — start Postgres |
| `npm run db:down` | Stop containers (keeps the `solviax_pgdata` volume) |
| `npm run db:migrate` | Apply SQL migrations from `apps/web/drizzle/` |
| `npm run db:seed` | Seed places (+ Pro demo users from city index / seed script) |
| `npm run db:seed:geonames` | Import denser Geonames places (optional) |
| `npm run db:generate` | After schema edits in `apps/web/src/db/schema*` — generate a new migration |
| `npm run db:studio` | Open Drizzle Studio against `DATABASE_URL` |

### Schema changes (you edited Drizzle schema)

```bash
npm run db:generate   # creates a new migration under apps/web/drizzle/
npm run db:migrate    # apply it locally
```

Commit both the schema change and the generated migration files.

### Fresh local DB (wipe volume)

Needed after renaming DB credentials (e.g. WeatherTrip → Solviax) or if the volume is corrupt:

```bash
npm run db:down
docker volume rm solviax_pgdata   # name from docker-compose.yml
npm run db:up
npm run db:migrate
npm run db:seed
```

Production migrate/seed notes: [DEPLOYMENT.md](./DEPLOYMENT.md).

### Expo Go on Android (especially WSL2)

QR / LAN usually fail under **WSL2**: the QR shows a `172.x` address that exists only inside the Linux VM, so the phone cannot reach Metro. Official notes: [expo/fyi WSL](https://github.com/expo/fyi/blob/main/wsl.md).

**Fastest fix — tunnel** (Metro via ngrok; first run may ask to install `@expo/ngrok`):

```bash
npm run dev:web
npm run dev:mobile:tunnel
```

Scan the tunnel QR in Expo Go. Keep `EXPO_PUBLIC_API_URL` on your **Windows Wi‑Fi IPv4** (`ipconfig`), e.g. `http://192.168.50.169:3004`. If the app opens but searches fail, Windows still isn’t forwarding `:3004` into WSL — use mirrored networking below (or `netsh interface portproxy` for 3004 + 8081).

**Better long-term — mirrored networking** (Windows 11): put this in `%USERPROFILE%\.wslconfig`, then `wsl --shutdown` and reopen:

```ini
[wsl2]
networkingMode=mirrored
hostAddressLoopback=true
```

After that, LAN/QR can work with `EXPO_PUBLIC_API_URL=http://<same-windows-lan-ip>:3004`. Expo Go must support SDK **57**.

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

## Production

Full VPS guide (Node, Postgres, nginx/Caddy, env vars, PM2, Mailgun, Mapbox, Upstash): **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

Expo / Play Store / TestFlight (EAS Build, `EXPO_PUBLIC_API_URL`, what not to put in the app): **[EXPO_DEPLOYMENT.md](./EXPO_DEPLOYMENT.md)**.

Quick env checklist before `NODE_ENV=production`:

| Variable | Requirement |
|---|---|
| `AUTH_SECRET` | Random string, **≥ 32** characters |
| `EMAIL_MODE` | `mailgun` (or `resend`; `console` is rejected at boot) |
| `MAILGUN_API_KEY` / `MAILGUN_DOMAIN` | Required when `EMAIL_MODE=mailgun` |
| `RESEND_API_KEY` | Required when `EMAIL_MODE=resend` |
| `USE_MOCKS` | `false` (`true` is rejected at boot) |
| `AUTH_TRUST_HOST` | `true` **only** behind a trusted reverse proxy |
| `CORS_ALLOWED_ORIGINS` | Production web origin |
| `UPSTASH_REDIS_REST_*` | Required in production for rate limits |
| `NEXT_PUBLIC_APP_URL` / `AUTH_URL` | Canonical production URL (`https://solviax.app`) |
| `DATABASE_URL` | Postgres connection string |
| `NEXT_PUBLIC_MAPBOX_TOKEN` / `MAPBOX_ACCESS_TOKEN` | Mapbox `pk.` (+ optional `sk.` server-side) |

Template: `apps/web/.env.example`. Product backlog: [TODO.md](./TODO.md). Paid / Pro entitlements: [PAID_FEATURES.md](./PAID_FEATURES.md).

## Design

UI tokens and mockups live under `designs/`.
