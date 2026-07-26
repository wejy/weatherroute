# Follow-ups

## Public transit travel mode

- [ ] Add `transit` travel mode (UI already reserved in i18n: `travel.transit`)
- [ ] Integrate Digitransit / OpenTripPlanner (or regional OTP) for itineraries
- [ ] Mapbox does **not** support transit Directions profiles — needs a separate provider
- [ ] Show legs (walk → bus/train → walk), duration, transfers; graceful “unavailable outside coverage”

Related: car + bike already use Mapbox `driving` / `cycling` via `getMapboxRoute`.

## Mobile Expo parity (phase 2–3)

Expo app (`apps/mobile`, ~57) talks to web `/api/*` but is behind the web client.

- [ ] Travel mode (`driving` / `cycling`) + route screen parity
- [ ] Anon quota / soft paywall (handle HTTP 402 from `/api/discover`) + share redeem
- [ ] Auth.js session (SecureStore + cookie/header) / deep-link to web login
- [ ] Map / nearby / Wikipedia popup (does not need 1:1 Mapbox on day one)
- [ ] Keep DTO/types in sync with `apps/web`

Do this after web auth + quota + places seed are stable.

## Discover result caps (tiered)

| Tier | Display | Weather pool |
|------|---------|--------------|
| Anon | 10 | ~14 (+ radius bump) |
| Signed-in free | 20 | ~24–28 |
| Pro (`subscriptions.status` active/trial) | default 30, max 50 | ~display×1.2 |

Logic: [`discover-limits.ts`](apps/web/src/server/dal/discover-limits.ts). Pro settings UI later.

## Ops

- [ ] UpCloud VPS + Managed Postgres + Caddy TLS
- [ ] `CRON_ENABLED=true` in production
- [ ] Resend (`EMAIL_MODE=resend`) for OTP email
