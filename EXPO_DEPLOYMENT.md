# Solviax.app — Expo mobile release guide

How to ship **`apps/mobile`** (Expo SDK 57) to TestFlight / Play Store, and what to mind for API URLs, tokens, and store compliance.

The mobile app is a **thin client**: weather, search, routes, auth OTP, and quota all run on the **production web API** (`apps/web`). There is **no** Mapbox, Mailgun/Resend, or database secret inside the Expo binary.

Related docs:

- Web/API VPS: **[DEPLOYMENT.md](./DEPLOYMENT.md)**
- Local Expo Go (WSL2 / tunnel): **[README.md](./README.md)**

Official Expo references (SDK 57):

- [EAS Build setup](https://docs.expo.dev/build/setup/)
- [eas.json](https://docs.expo.dev/build/eas-json/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [Environment variables in EAS](https://docs.expo.dev/eas/environment-variables/)
- [Monorepos](https://docs.expo.dev/guides/monorepos/)

---

## Architecture

```text
Phone / tablet (Solviax.app)
   │  HTTPS
   │  headers: X-Solviax-Anon, X-Solviax-Device,
   │           X-Solviax-Session (after login)
   ▼
https://solviax.app   ← apps/web (Next.js)
   │
   ├─ Postgres, Auth.js OTP (Mailgun)
   ├─ Mapbox (server token), Open-Meteo
   └─ Upstash rate limits
```

| Layer | Responsibility |
|---|---|
| **Expo app** | UI, location permission, SecureStore session JWT, `EXPO_PUBLIC_API_URL` |
| **Web API** | All secrets, geocoding, weather, paywall, email OTP |

Native `fetch` does **not** use browser CORS. Still configure production `CORS_ALLOWED_ORIGINS` for the **website** and any Expo **web** build you host.

---

## Prerequisites

1. **Production API live** (HTTPS) per [DEPLOYMENT.md](./DEPLOYMENT.md) — OTP email, Postgres, Mapbox server token, etc.
2. **Expo account** — [expo.dev](https://expo.dev) (free tier is enough to start).
3. **Apple Developer Program** (iOS / TestFlight) — paid membership.
4. **Google Play Console** (Android) — one-time registration fee.
5. **EAS CLI** on a machine that can run builds remotely (WSL/Linux/macOS all fine; EAS builds in the cloud).

```bash
npm install -g eas-cli
eas login
```

---

## Secrets & tokens — what goes where

### Do **not** put these in the mobile app

| Secret | Why |
|---|---|
| `MAPBOX_ACCESS_TOKEN` (`sk.…`) | Server-only; used by Next `/api/*` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` (`pk.…`) | Web Mapbox GL only — mobile map tab does not embed Mapbox GL today |
| `AUTH_SECRET`, `DATABASE_URL`, `MAILGUN_*` / `RESEND_*` | Web/API only |
| `UPSTASH_*` | Web/API only |

Anything named `EXPO_PUBLIC_*` is **baked into the JS bundle** and is readable by anyone who unpacks the app. Treat it as public configuration, not a secret.

### Mobile env (public)

| Variable | Production value | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `https://solviax.app` | **No trailing slash.** Must be HTTPS in store builds. Changing it requires a **new binary** (or EAS Update if you adopt OTA later). |

Local / Expo Go: see `apps/mobile/.env.example` (LAN IP or tunnel). Never ship a build that still points at `localhost` or a private `192.168.*` address.

### Web API env that mobile depends on

Ensure production web has at least:

| Variable | Why mobile needs it |
|---|---|
| `NEXT_PUBLIC_APP_URL` / `AUTH_URL` | Canonical links, Auth.js |
| `AUTH_SECRET` | Session JWT for `X-Solviax-Session` |
| `EMAIL_MODE=mailgun` + `MAILGUN_*` (or `resend`) | Mobile login OTP |
| `MAPBOX_ACCESS_TOKEN` | Search / reverse / routes via API |
| `DATABASE_URL` | Users, quota, share codes |
| `CORS_ALLOWED_ORIGINS` | Web + optional Expo web; native app OK without listing a mobile origin |
| Rate limits / Upstash | Shared abuse protection (mobile IPs vary) |

Mobile sends:

- `X-Solviax-Anon` — freemium quota cookie substitute  
- `X-Solviax-Device` — device id  
- `X-Solviax-Session` — Auth.js-compatible JWT after OTP (SecureStore on device)

---

## One-time project setup (EAS)

From the **monorepo**, work in the mobile app directory:

```bash
cd apps/mobile
eas build:configure
```

This creates / updates:

- `eas.json` — build & submit profiles  
- Expo project id (linked on [expo.dev](https://expo.dev))  
- Often adds `extra.eas.projectId` into `app.json` / `app.config`

### Suggested `eas.json`

Place at `apps/mobile/eas.json` (adjust after `eas build:configure`):

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging.solviax.app"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://solviax.app"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://solviax.app"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal"
      },
      "ios": {
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID"
      }
    }
  }
}
```

Prefer storing `EXPO_PUBLIC_API_URL` as an **EAS environment variable** (project → Environment variables) for `production` / `preview` instead of committing URLs you might rotate — either approach works; do not commit real store credentials.

### Monorepo note

Solviax.app is an **npm workspaces** repo. EAS must install from the **repository root** so `@solviax/i18n` resolves. After `eas build:configure`, confirm EAS detects the monorepo (Expo docs: [Monorepos](https://docs.expo.dev/guides/monorepos/)). Typical pattern:

- Run `eas` from `apps/mobile`
- Set `"workingDirectories"` / Expo dashboard monorepo settings if prompted
- Ensure `packages/i18n` is not gitignored

### App identity (already in `app.json`)

| Field | Current value | Action before store |
|---|---|---|
| `expo.name` | Solviax.app | OK or rebrand |
| `expo.slug` | solviax | Must match Expo project |
| `expo.version` | `0.1.0` | Bump for each store release |
| `ios.bundleIdentifier` | `com.solviax.app` | Unique; cannot change casually after first release |
| `android.package` | `com.solviax.app` | Same |
| Location permission strings | EN + FI in `app.json` | Align with store privacy answers |

Bump **`version`** (user-facing) and Android **`versionCode`** / iOS **build number** (EAS `autoIncrement` helps).

---

## Build

### Internal / QA (APK or ad hoc)

```bash
cd apps/mobile
eas build --profile preview --platform android
# or
eas build --profile preview --platform ios
```

Install via Expo dashboard QR / link. Confirm the app hits **production** (or staging) API: open Settings and check the API URL line, or watch server logs for `/api/discover` with `X-Solviax-*` headers.

### Store binaries

```bash
cd apps/mobile
eas build --profile production --platform android
eas build --profile production --platform ios
# or both:
eas build --profile production --platform all
```

First iOS build will walk through Apple credentials (distribution cert, provisioning). Prefer **EAS-managed credentials** unless you have an existing cert pipeline.

---

## Submit to stores

### Android (Google Play)

1. Create the app in Play Console (`com.solviax.app`).
2. Complete store listing, content rating, Data safety (location, approximate/precise).
3. Upload a signing key — EAS can generate / manage Play App Signing.
4. Submit:

```bash
cd apps/mobile
eas submit --platform android --profile production --latest
```

Start with `track: "internal"` or `"alpha"`, then promote to production in Play Console.

### iOS (App Store / TestFlight)

1. Create the app in App Store Connect (bundle id `com.solviax.app`).
2. Privacy Nutrition Labels — location used for nearby destinations / origin.
3. Submit:

```bash
cd apps/mobile
eas submit --platform ios --profile production --latest
```

TestFlight first; then App Review.

Build + submit in one step:

```bash
eas build --platform all --profile production --auto-submit
```

---

## Pre-release checklist

### Product / API

- [ ] `EXPO_PUBLIC_API_URL` is `https://…` (not LAN / localhost)
- [ ] Production API: discover, search, reverse geocode, routes, weather, Wikipedia
- [ ] OTP login from a real device (email delivery)
- [ ] Soft paywall / share redeem against production quota
- [ ] SecureStore session survives app restart
- [ ] Location permission copy matches what the app does
- [ ] EN + FI UI (`packages/i18n`) verified on device language + Settings switcher

### Security

- [ ] No `sk.` / DB / Mailgun/Resend keys in mobile env or source
- [ ] API rate limits enabled (Upstash recommended)
- [ ] HTTPS only; certificate valid on the API host
- [ ] Auth cookies remain httpOnly on web; mobile uses header JWT only

### Store

- [ ] Icons / splash / screenshots (phone + tablet if you claim tablets)
- [ ] Privacy policy URL (host on the website)
- [ ] Support URL / contact email
- [ ] Export compliance / encryption questions (standard HTTPS → usually exempt)
- [ ] Android: target API level required by Play (EAS SDK 57 defaults usually OK — verify before submit)
- [ ] **Billing:** set `EXPO_PUBLIC_ALLOW_STRIPE_CHECKOUT=0` on production/store EAS profiles (digital Pro must not sell via Stripe inside the store binary). Buy on the website; same account unlocks Pro in the app.
- [ ] Optional: `EXPO_PUBLIC_WEB_ORIGIN=https://solviax.app` if the marketing site differs from the API host

### Billing / Pro (mobile)

| Build | `EXPO_PUBLIC_ALLOW_STRIPE_CHECKOUT` | Behavior |
|---|---|---|
| Expo Go / `__DEV__` | omit or `1` | In-app CTA → Stripe Checkout in browser → `/open-app` → `solviax://pro?checkout=…` refreshes tier |
| App Store / Play | `0` | CTAs open the website `/pro`; no Stripe session started from the binary |

After web purchase, sign in with the same email in the app (`GET /api/auth/me` → `tier: "pro"`).


### Versioning

- [ ] `expo.version` bumped
- [ ] Native build numbers incremented (or `autoIncrement: true`)
- [ ] Changelog for Testers / “What’s New”

---

## Optional later

| Topic | When |
|---|---|
| **EAS Update (OTA)** | Ship JS-only fixes without store review; still needs matching native runtime |
| **Development builds** | Custom native modules beyond Expo Go |
| **Mapbox in the app** | If you add Mapbox GL Native, use a **public** `pk.` token via `EXPO_PUBLIC_…` and URL restrictions in Mapbox dashboard |
| **Push notifications** | Extra credentials (FCM / APNs) — not in the app today |
| **CI** | `eas build` from GitHub Actions with an Expo token |
| **Solviax Lite (`apps/mobile-lite`)** | WebView store shell over production web — day-1 store rules in [`apps/mobile-lite/STORE.md`](./apps/mobile-lite/STORE.md); run `npm run dev:mobile-lite` |

---

## Solviax Lite (WebView shell)

Separate binary from `apps/mobile`:

| | Full Expo | Lite |
|--|-----------|------|
| Package | `@solviax/mobile` | `@solviax/mobile-lite` |
| Scheme | `solviax://` | `solviaxlite://` |
| Bundle ID | `com.solviax.app` | `com.solviax.lite` |
| UI | Native screens | `EXPO_PUBLIC_WEB_URL` in WebView |
| Auth | `X-Solviax-Session` | Web Auth.js cookies |

Stripe Checkout must open **outside** the WebView (already enforced in the lite shell). See **STORE.md** before any TestFlight / Play upload.

---

## Common failures

| Symptom | Likely cause |
|---|---|
| “API URL missing” / generic network error | `EXPO_PUBLIC_API_URL` not set in EAS env for that profile |
| OTP never arrives | Production `EMAIL_MODE` / Mailgun (or Resend); check web logs |
| Login works on web, not mobile | Mobile must call `/api/auth/*` with session header support (already implemented) — confirm API deploy includes those routes |
| Search/reverse empty | Server `MAPBOX_ACCESS_TOKEN` or Nominatim blocked on VPS |
| Store rejects location permission | Privacy form / purpose string mismatch |
| Monorepo build can’t resolve `@solviax/i18n` | EAS working directory / install from repo root |

---

## Quick command cheat sheet

```bash
# Login & configure (once)
npm install -g eas-cli && eas login
cd apps/mobile && eas build:configure

# QA APK
eas build --profile preview --platform android

# Production
eas build --profile production --platform all
eas submit --platform android --latest
eas submit --platform ios --latest
```

After the first successful store release, treat `bundleIdentifier` / `package` as permanent, keep API URL stable, and bump versions deliberately.
