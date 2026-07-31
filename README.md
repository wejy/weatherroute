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

### Expo Go on Android (especially WSL2)

QR / LAN usually fail under **WSL2**: the QR shows a `172.x` address that exists only inside the Linux VM, so the phone cannot reach Metro. Official notes: [expo/fyi WSL](https://github.com/expo/fyi/blob/main/wsl.md).

**Fastest fix — tunnel** (Metro via ngrok; first run may ask to install `@expo/ngrok`):

```bash
npm run dev:web
npm run dev:mobile:tunnel
```

Scan the tunnel QR in Expo Go. Keep `EXPO_PUBLIC_API_URL` on your **Windows Wi‑Fi IPv4** (`ipconfig`), e.g. `http://192.168.50.169:3000`. If the app opens but searches fail, Windows still isn’t forwarding `:3000` into WSL — use mirrored networking below (or `netsh interface portproxy` for 3000 + 8081).

**Better long-term — mirrored networking** (Windows 11): put this in `%USERPROFILE%\.wslconfig`, then `wsl --shutdown` and reopen:

```ini
[wsl2]
networkingMode=mirrored
hostAddressLoopback=true
```

After that, LAN/QR can work with `EXPO_PUBLIC_API_URL=http://<same-windows-lan-ip>:3000`. Expo Go must support SDK **57**.

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

Full VPS guide (Node, Postgres, nginx/Caddy, env vars, systemd, Resend, Mapbox, Upstash): **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

Quick env checklist before `NODE_ENV=production`:

| Variable | Requirement |
|---|---|
| `AUTH_SECRET` | Random string, **≥ 32** characters |
| `EMAIL_MODE` | `resend` (`console` is rejected at boot) |
| `RESEND_API_KEY` | Required when `EMAIL_MODE=resend` |
| `USE_MOCKS` | `false` (`true` is rejected at boot) |
| `AUTH_TRUST_HOST` | `true` **only** behind a trusted reverse proxy |
| `CORS_ALLOWED_ORIGINS` | Production web origin |
| `UPSTASH_REDIS_REST_*` | Recommended for rate limits |
| `NEXT_PUBLIC_APP_URL` / `AUTH_URL` | Canonical production URL |
| `DATABASE_URL` | Postgres connection string |
| `NEXT_PUBLIC_MAPBOX_TOKEN` / `MAPBOX_ACCESS_TOKEN` | Mapbox `pk.` (+ optional `sk.` server-side) |

Template: `apps/web/.env.example`. Product backlog: [TODO.md](./TODO.md).

## Design

UI tokens and mockups live under `designs/`.
