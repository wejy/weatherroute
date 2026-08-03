# Solviax.app — paid (Pro) features

Billing uses **Stripe Checkout** + webhooks. Pro is stored in `subscriptions`
(`status` + `plan`). Seed a Pro user locally with `npm run db:seed:pro -w @solviax/web`
(sets `plan=monthly` without Stripe).

Tiers resolved in `resolveUserTier()` / `getBillingEntitlement()`:

| Tier | Who |
|---|---|
| `anon` | Not signed in |
| `free` | Signed in, no active paid plan |
| `pro` | Signed in + `status` ∈ `active` \| `trial` \| `past_due` **and** `plan` ∈ `one_time` \| `monthly` |
| `pro` (admin) | `users.role = admin` → **monthly-equivalent Pro** without Stripe (unlimited saves, no discover quota). Set only via DB/migration — no self-service API. |

Admin dashboard (web only): `/admin` + `GET /api/admin/stats` — usage, paying counts, and EUR cost/revenue **estimates** from `ADMIN_COST_*` / `ADMIN_PRICE_*` env (see `.env.example`).

---

## Stripe plans

| Plan key | Mode | Price | Saved routes | Other Pro features |
|---|---|---:|---:|---|
| `one_time` | Checkout `payment` | **€1** once | **2** | ✓ |
| `monthly` | Checkout `subscription` | **€2.80 / month** | Unlimited | ✓ |

Env (see `apps/web/.env.example`):

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ONE_TIME`
- `STRIPE_PRICE_MONTHLY`

Setup helpers:

```bash
STRIPE_SECRET_KEY=sk_test_... npx tsx apps/web/scripts/stripe-setup.ts
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Webhook: `POST /api/stripe/webhook`  
Checkout: server action / `POST /api/billing/checkout`  
Portal (cancel/update card): `POST /api/billing/portal` or Settings → Manage billing

If monthly cancels and the user previously bought one-time, they keep `plan=one_time`.

### Webhook hardening (security)

Pro is granted only when:

- `checkout.session.completed` has `payment_status` ∈ `paid` | `no_payment_required`
- Line-item price id matches `STRIPE_PRICE_ONE_TIME` / `STRIPE_PRICE_MONTHLY` (and amount/currency when present)
- Monthly: retrieved subscription status ∈ `active` | `trialing` (not `incomplete`)
- `customer.subscription.updated`: price must be monthly Pro; `incomplete` is ignored; `unpaid` / canceled deactivate Monthly
- Stripe customer id must match the user binding (`subscriptions.stripe_customer_id` is unique)

See `apps/web/src/server/billing/webhook-guards.ts` and `checkout.ts`.

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

### 2. More discover result slots

| Tier | Destinations shown | Weather candidates (base) |
|---|---:|---:|
| anon | 10 | 14 |
| free | 20 | 24 |
| pro | 30 default, up to **30** (settings) | scales with display |

### 3. Earliest departure (routes)

Pro can set “Don’t leave before HH:00” in settings.

### 4. Saved routes

| Plan | Max saved routes |
|---|---:|
| free / anon | 0 (cannot save) |
| one_time | 2 (Pro valid **90 days** from purchase) |
| monthly | unlimited |

### 5. Soft paywall vs Pro

Anonymous users have a **cookie + IP discover quota**. Sign-in (free) → **50 discovers per UTC calendar month** within free radius. Pro monthly → **200 discovers / month** (marketed as “hundreds”). Pro one-time (within 90 days) → **400 discovers / purchase window** (marketed as “hundreds”) + wider radii + higher caps + departure + route saves.

---

## Code map

| Concern | Location |
|---|---|
| Plans / prices | `apps/web/src/server/billing/plans.ts` |
| Checkout + webhooks | `apps/web/src/server/billing/checkout.ts`, `api/stripe/webhook` |
| Entitlements | `apps/web/src/server/dal/subscriptions.ts` |
| Marketing / buy UI | `/pro` (web + mobile) |
| Distance helpers + Pro keys | `apps/web/src/lib/distance.ts`, `apps/mobile/lib/distance.ts` |
| Tier resolution | `apps/web/src/server/dal/user-prefs.ts` |
| Session + billing API | `GET /api/auth/me` → `{ user, tier, plan, role, canSaveTrip, … }` |
| Subscriptions schema | `apps/web/src/db/schema.ts` → `subscriptions` |
| Admin role + stats | `users.role`, `apps/web/src/server/dal/roles.ts`, `/admin` |

Update this file when adding or changing paid entitlements.
