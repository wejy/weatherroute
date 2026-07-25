# WeatherTrip

Map-based weather trip planner SaaS (MVP). Find sunny destinations, inspect forecasts, and plan dry driving routes.

## Stack

- **Next.js App Router** + TypeScript
- **Tailwind CSS** (WeatherTrip design tokens from `designs/`)
- **Zod** validation on API routes
- **Drizzle** schema ready for Supabase Postgres
- **Open-Meteo** weather (no API key) with **yr.no**-shaped fallback + mocks
- **Mapbox** search/map stubs until a token is set
- **Mock auth** cookie session until Supabase keys are set

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|---|---|
| `/` | Discover — search island, weather filters, weekend picks |
| `/map` | Map explorer with destination list (mock map) |
| `/routes` | Route weather timeline (Helsinki → Tampere demo) |
| `/destinations/[slug]` | Detailed forecast + trip suitability |
| `/trips` | Saved trips (in-memory demo store) |
| `/login` | Demo sign-in (no keys) |

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/weather?lat=&lon=` | Weather DTO (cached ~10 min) |
| `GET /api/search?q=` | Place search (Open-Meteo geocoding, free) |
| `GET /api/geocode/reverse?lat=&lon=` | Reverse geocode (OSM Nominatim, free) |
| `GET /api/discover?...` | Ranked destinations |
| `GET /api/routes?from=&to=` | Route weather plan |

### Free place APIs used

- **[Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api)** — city/town search worldwide, no API key
- **[OSM Nominatim](https://nominatim.org/)** — reverse geocode (coords → place); fair-use / User-Agent required
- Mapbox remains optional when a token is set later

## Env

See `.env.example`. With `USE_MOCKS=true` (default) the app runs fully without Supabase/Mapbox/DB keys. Open-Meteo is still attempted for live forecasts when the network is available.

## Design source

UI patterns and tokens come from `designs/` (WeatherTripPlanner + Luminous Navigation systems and HTML mockups).
