# Follow-ups

## Public transit travel mode

- [ ] Add `transit` travel mode (UI already reserved in i18n: `travel.transit`)
- [ ] Integrate Digitransit / OpenTripPlanner (or regional OTP) for itineraries
- [ ] Mapbox does **not** support transit Directions profiles — needs a separate provider
- [ ] Show legs (walk → bus/train → walk), duration, transfers; graceful “unavailable outside coverage”

Related: car + bike already use Mapbox `driving` / `cycling` via `getMapboxRoute`.

## Mobile Expo parity (phase 2–3)

Expo app (`apps/mobile`, SDK 57) talks to web `/api/*`.

- [x] Travel mode (`driving` / `cycling`) + route screen (API + chips)
- [x] Anon quota / soft paywall (HTTP 402) + share create/redeem
- [x] Auth OTP session via SecureStore (`X-Solviax-Session` + `/api/auth/verify-otp`)
- [x] Map tab = nearby list from last Discover (+ destination Wikipedia already done)
- [ ] Full Mapbox GL map on mobile (optional later)
- [ ] Route polyline / save-trip parity
- [ ] Keep DTO/types in sync with `apps/web`

## Appearance

- [ ] Dark mode (settings UI already has disabled Light/Dark toggle on `/settings`)

## Discover result caps (tiered)

| Tier | Display | Weather pool |
|------|---------|--------------|
| Anon | 10 | ~14 (+ radius bump) |
| Signed-in free | 20 | ~24–28 |
| Pro (`subscriptions.status` active/trial) | default 30, max 50 | ~display×1.2 |

Logic: [`discover-limits.ts`](apps/web/src/server/dal/discover-limits.ts). Pro settings UI later.

## Ops

Deployment runbook: **[DEPLOYMENT.md](./DEPLOYMENT.md)** (nginx *or* Caddy, env, PM2, migrate).

- [ ] Provision VPS (e.g. UpCloud) + Managed Postgres + TLS (Caddy or nginx+certbot)
- [ ] Set production env (`AUTH_SECRET`, Resend, Mapbox, CORS, Upstash) per DEPLOYMENT.md
- [ ] `CRON_ENABLED=true` in production
- [ ] Resend (`EMAIL_MODE=resend`) for OTP email
- [ ] Point mobile `EXPO_PUBLIC_API_URL` at production API and rebuild
