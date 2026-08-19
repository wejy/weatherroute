# Cookie consent plan (EU / GDPR)

Solviax.app ships Google Analytics 4 when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set. **Consent is implemented** — GA loads only after analytics opt-in; Google Consent Mode v2 defaults to deny.

## Current state

| Cookie / storage | Purpose | Consent needed? |
|---|---|---|
| `wt_anon` | Freemium quotas (httpOnly) | Strictly necessary — no banner |
| `wt_theme` / locale | UI preference | Strictly necessary |
| Auth.js session | Login | Strictly necessary when signed in |
| `wt_consent` | Analytics preference (JSON, client-readable) | Set by banner / settings |
| `_ga`, `_ga_*` | GA4 analytics | **Yes — only after opt-in** |
| reCAPTCHA (`_GRECAPTCHA`, etc.) | Bot protection on OTP | Disclosed in policy; login-only |

GA loads from `ConsentRoot` via `@next/third-parties/google` only when `wt_consent.analytics === true`. Consent Mode v2 default-deny runs in `layout.tsx` before any GA script.

## Implemented (Phase 1–3)

### Phase 1 — Policy / About ✅

- About page `#cookies` section with cookie table (EN/FI)
- Footer **Cookie settings** opens preferences dialog
- Link to [Google privacy policy](https://policies.google.com/privacy)

### Phase 2 — Consent banner (web) ✅

1. **Categories:** `necessary` (always on), `analytics` (GA4), `marketing` reserved
2. **Storage:** Cookie `wt_consent` (JSON, max-age 365d, SameSite=Lax)
3. **UI:** Bottom banner (Accept all | Reject non-essential | Customize) — EN/FI via `@solviax/i18n`
4. **GA4:** Consent Mode v2 default deny + conditional `<AppGoogleAnalytics enabled={…} />`
5. **reCAPTCHA:** Login-only; disclosed in policy, no toggle

### Phase 3 — Preferences ✅

1. Consent version `v: 1` in `wt_consent`
2. Settings → Cookie preferences (analytics toggle)
3. On reject: `clearGaCookies()` removes `_ga`, `_ga_*`

### Phase 4 — Mobile

| App | GA | Consent |
|---|---|---|
| `apps/web` | GA4 tag | Banner + settings |
| `apps/mobile-lite` (WebView) | Inherits web | Same as web |
| `apps/mobile` (native) | Not wired | No banner until native analytics |

## Implementation checklist

- [x] Keys in `packages/i18n`: `consent.*`, `about.cookies*`, `footer.cookieSettings`
- [x] `ConsentProvider` + `ConsentBanner` + preferences dialog in `apps/web/src/components/consent/`
- [x] Read `wt_consent` in `RootLayout`; pass to `ConsentRoot` / `AppGoogleAnalytics`
- [x] CSP sha256 hash for Consent Mode boot script in `middleware.ts`
- [ ] E2E: banner shows once; reject → no `_ga`; accept → GA requests (optional Playwright)
- [x] DEPLOYMENT.md: EU prod should ship with consent before GA traffic

## Env vars (analytics)

```bash
# apps/web/.env.local (not committed)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

Leave unset in dev if you do not want hits in GA. When set, users must opt in before GA loads.

## Legal note

This document is an engineering plan, not legal advice. For Finland/EU, confirm final wording and reCAPTCHA classification with counsel before high-volume marketing.
