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

## Design

UI tokens and mockups live under `designs/`.
