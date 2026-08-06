# Follow-ups

## Public transit travel mode

- [ ] Add `transit` travel mode (UI **hidden** until Digitransit — i18n keys `travel.transit` / `travel.transitSoon` reserved)
- [ ] Integrate Digitransit / OpenTripPlanner (or regional OTP) for itineraries
- [ ] Mapbox does **not** support transit Directions profiles — needs a separate provider
- [ ] Show legs (walk → bus/train → walk), duration, transfers; graceful “unavailable outside coverage”

Related: car + bike already use Mapbox `driving` / `cycling` via `getMapboxRoute`. Only those modes are selectable in web + mobile.

## Mobile Expo parity (phase 2–3)

Expo app (`apps/mobile`, SDK 57) talks to web `/api/*`.

- [x] Travel mode (`driving` / `cycling`) + route screen (API + chips)
- [x] Anon quota / soft paywall (HTTP 402) + share create/redeem
- [x] Auth OTP session via SecureStore (`X-Solviax-Session` + `/api/auth/verify-otp`)
- [x] Map tab = nearby list from last Discover (+ destination Wikipedia already done)
- [ ] Full Mapbox GL map on mobile (optional later)
- [x] Route polyline preview + save-trip API parity (`/api/trips`)
- [ ] Keep DTO/types in sync with `apps/web`

## Appearance

- [x] Dark mode — System / Light / Dark on web + mobile settings (cookie / AsyncStorage)

## Discover result caps (tiered)

| Tier | Display | Weather pool |
|------|---------|--------------|
| Anon | 10 | ~14 (+ radius bump) |
| Signed-in free | 20 | ~24–28 |
| Pro (`subscriptions.status` active/trial) | default 30, max 30 | ~display×1.2 |

Logic: [`discover-limits.ts`](apps/web/src/server/dal/discover-limits.ts). Pro settings UI later.

## Ops

Deployment runbook: **[DEPLOYMENT.md](./DEPLOYMENT.md)** (nginx *or* Caddy, env, PM2, migrate).

- [ ] Provision VPS (e.g. UpCloud) + Managed Postgres + TLS (Caddy or nginx+certbot)
- [ ] Set production env (`AUTH_SECRET`, Mailgun, Mapbox, CORS, Upstash) per DEPLOYMENT.md
- [ ] `CRON_ENABLED=true` in production
- [ ] Mailgun (`EMAIL_MODE=mailgun`) for OTP email (HTML + welcome for new users)
- [ ] Point mobile `EXPO_PUBLIC_API_URL` at production API and rebuild
