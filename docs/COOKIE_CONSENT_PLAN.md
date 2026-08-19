# Cookie consent plan (EU / GDPR)

Solviax.app ships Google Analytics 4 when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. Until consent is implemented, **treat analytics as “best effort / pre-consent”** and complete the steps below before scaling EU traffic.

## Current state (after GA4 integration)

| Cookie / storage | Purpose | Consent needed? |
|---|---|---|
| `wt_anon` | Freemium quotas (httpOnly) | Strictly necessary — no banner |
| `wt_theme` / locale | UI preference | Strictly necessary or “functional” |
| Auth.js session | Login | Strictly necessary when signed in |
| `_ga`, `_ga_*` | GA4 analytics | **Yes — marketing/analytics** |
| reCAPTCHA (`_GRECAPTCHA`, etc.) | Bot protection on OTP | **Yes — functional / security** (Google third party) |

GA loads from `layout.tsx` via `@next/third-parties/google` when the env var is set. There is **no consent gate yet**.

## Recommended approach (simple → robust)

### Phase 1 — Document + privacy policy (quick)

1. Update privacy policy / about page to list:
   - GA4 (Google), purpose: usage statistics
   - reCAPTCHA (Google), purpose: abuse prevention on login
   - Link to [Google’s policy](https://policies.google.com/privacy)
2. Add “Cookie settings” link in footer (can point to `/about#cookies` until banner exists).

**Effort:** ~1 h content + i18n (EN/FI).

### Phase 2 — Consent banner (web)

1. **Cookie categories**
   - `necessary` — always on (cannot toggle)
   - `analytics` — GA4
   - `marketing` — none today (reserve for ads later)

2. **Storage**
   - Cookie `wt_consent` (JSON or `analytics=0|1`, max-age 365d, SameSite=Lax)
   - Or `localStorage` + mirror to cookie for SSR (prefer cookie for simplicity)

3. **UI**
   - Bottom banner on first visit (EN/FI via `@solviax/i18n`)
   - Buttons: **Accept all** | **Reject non-essential** | **Customize**
   - Link to privacy / cookie policy

4. **Wire GA4 to consent**
   - **Option A (simplest):** Do not render `<AppGoogleAnalytics />` until `analytics=1`.
   - **Option B (Google Consent Mode v2):** Default deny, update on accept — better if you need conversion modeling; slightly more setup.

5. **reCAPTCHA**
   - Usually allowed under “strictly necessary” / security when only on login OTP.
   - Still disclose in policy; no toggle required unless legal counsel says otherwise.

**Effort:** ~4–8 h (web component + i18n + tests).

### Phase 3 — Consent persistence & admin

1. Log consent version (`consentPolicyVersion: 1`) inside `wt_consent` so you can re-prompt after policy changes.
2. Settings page: “Cookie preferences” to change analytics opt-in/out.
3. On reject: delete GA cookies (`_ga`, `_ga_*`) via client script.

### Phase 4 — Mobile

| App | GA | Consent |
|---|---|---|
| `apps/web` | GA4 tag | Banner (Phase 2) |
| `apps/mobile-lite` (WebView) | Inherits web | Same banner as web |
| `apps/mobile` (native) | Not wired yet | If Firebase/GA added later, use OS ATT + in-app consent |

Native Expo app does not load web GA today — no mobile banner needed until native analytics is added.

## Implementation checklist (when building Phase 2)

- [ ] Keys in `packages/i18n`: `consent.title`, `consent.description`, `consent.acceptAll`, `consent.reject`, `consent.analyticsLabel`, …
- [ ] `ConsentProvider` + `ConsentBanner` in `apps/web/src/components/consent/`
- [ ] Read `wt_consent` in `RootLayout`; pass to `AppGoogleAnalytics` (`enabled={consent.analytics}`)
- [ ] Middleware: no change required for consent cookie
- [ ] E2E: banner shows once; reject → no `_ga` cookie; accept → GA network requests
- [ ] DEPLOYMENT.md: note that prod EU launch should ship Phase 1+2

## Env vars (analytics)

```bash
# apps/web/.env.local (not committed)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Leave unset in dev if you do not want hits in GA.

## Legal note

This document is an engineering plan, not legal advice. For Finland/EU, confirm final wording and reCAPTCHA classification with counsel before high-volume marketing.
