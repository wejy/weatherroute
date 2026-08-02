# Solviax — paid (Pro) features

Billing (Stripe) is not live yet. Pro is granted via the `subscriptions` table (`status`: `active` or `trial`). Seed a Pro user locally with `npm run db:seed:pro -w @solviax/web` (or the Pro users included in `npm run db:seed`).

Tiers resolved in `resolveUserTier()`:

| Tier | Who |
|---|---|
| `anon` | Not signed in |
| `free` | Signed in, no active subscription |
| `pro` | Signed in + `subscriptions.status` ∈ `active` \| `trial` |

---

## Pro features (current)

### 1. Wider discover search radii

Free/anon may use up to **Wider Region · 200 km** (FI: Alueellinen).

| Distance key | EN | FI | Radius | Free | Pro |
|---|---|---|---:|:---:|:---:|
| near | Local Area | Lähialue | 30 km | ✓ | ✓ |
| semi | Nearby Surroundings | Lähiympäristö | 60 km | ✓ | ✓ |
| surroundings | Regional Area | Paikallisalue | 120 km | ✓ | ✓ |
| neighborhood | Wider Region | Alueellinen | 200 km | ✓ | ✓ |
| **region** | **National Level** | **Valtakunnallinen** | 300 km | — | ✓ |
| **continent** | **Continent** | **Manner** | 1 000 km | — | ✓ |
| **custom** | **Custom radius** | **Oma säde** | 0–2 000 km | — | ✓ |

Enforcement:

- **Server:** `clampDistanceForTier()` in discover (`weather-service`) — non-Pro requests for National Level / Continent / Custom are clamped to Wider Region.
- **UI:** web search island + map filters; mobile discover chips — Pro options disabled with “(Pro)” label.

Default discover distance (no query param): **neighborhood** (Wider Region / Alueellinen).

### 2. More discover result slots

| Tier | Destinations shown | Weather candidates (base) |
|---|---:|---:|
| anon | 10 | 14 |
| free | 20 | 24 |
| pro | 30 default, up to **50** (settings) | scales with display |

Settings → “Discover results” — Pro can pick 10–50; free is capped at 20 (preference still saved for after upgrade).

### 3. Earliest departure (routes)

Pro can set “Don’t leave before HH:00” in settings. Applied to route best-departure suggestions. Free/anon: preference may be stored but is **not** applied until Pro.

### 4. Soft paywall vs Pro

Anonymous users have a **daily discover search quota** (share bonus / OTP sign-in). That freemium quota is separate from Pro:

- Sign-in (free) → unlimited discovers within free radius + free result caps.
- Pro → wider radii + higher result caps + earliest departure.

---

## Not Pro (yet)

- Stripe checkout / customer portal (settings CTA shows “coming soon”).
- Route weather preference / dryness scoring beyond free.
- Dark mode, advanced alerts, etc. (product backlog).

---

## Code map

| Concern | Location |
|---|---|
| Distance helpers + Pro keys | `apps/web/src/lib/distance.ts`, `apps/mobile/lib/distance.ts` |
| Tier resolution | `apps/web/src/server/dal/user-prefs.ts` |
| Discover caps | `apps/web/src/server/dal/discover-limits.ts` |
| Discover clamp | `apps/web/src/server/services/weather-service.ts` |
| Quota / soft paywall | `apps/web/src/server/dal/quota.ts`, `discover-gate.ts` |
| Session + tier API | `GET /api/auth/me` → `{ user, tier }` |
| Subscriptions schema | `apps/web/src/db/schema.ts` → `subscriptions` |

Update this file when adding or changing paid entitlements.
