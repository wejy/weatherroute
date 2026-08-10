# Solviax Lite — store constraints (day 1)

This app (`apps/mobile-lite`) is a **WebView-first** store binary. Product UI lives in `apps/web`. Native code is only permissions, bridges, and a thin shell.

These rules are **design constraints from day 1**, not submit-week polish.

## Apple 4.2 / minimum functionality

The binary must not look like a website bookmark. Ship with:

- Native **location** permission + WebView geolocation bridge (Discover depends on it)
- Native **offline / error** shell (retry), not a blank WKWebView
- **Share / mailto / maps** via OS when appropriate
- Stripe / billing portal opened in **system browser / Custom Tabs / SFSafariViewController**, not inside the WebView
- Review notes draft (below) explaining native value

## Billing policy

| Do | Do not |
|----|--------|
| Open `checkout.stripe.com` / `billing.stripe.com` externally | Complete digital Pro purchase inside the WebView |
| Return user to WebView `/pro` after browser session | Rely on in-WebView 3DS / Apple Pay in WKWebView |
| Keep marketing + account UI on `/pro` in the WebView | Ship IAP + Stripe dual checkout without legal review |

Aligns with full Expo guidance in [EXPO_DEPLOYMENT.md](../../EXPO_DEPLOYMENT.md).

## Privacy

- iOS `NSLocationWhenInUseUsageDescription` and Android location permissions are required in `app.json` before TestFlight / internal testing.
- Request location when the shell starts (or on first geo prompt) with a clear purpose string (EN/FI in `app.json`).

## Deep links

| App | Scheme | Bundle ID |
|-----|--------|-----------|
| Full Expo (`apps/mobile`) | `solviax://` | `com.solviax.app` |
| Lite (`apps/mobile-lite`) | `solviaxlite://` | `com.solviax.lite` |

Do **not** reuse `solviax://` for lite. Web `/open-app` accepts both schemes.

## Review notes draft (EN)

> Solviax Lite wraps our weather-first trip planner (https://solviax.app) in a native shell. The shell requests location so Discover can center on the user, handles offline errors, opens Share/Maps/mailto via the OS, and opens Stripe Checkout / Customer Portal in the system browser for store billing compliance. All trip planning, maps (Mapbox), and account UI run in the first-party WebView session (cookies), not as a third-party iframe.

## Finnish equivalent (for internal use)

> Solviax Lite on natiivikuori sääpohjaiselle matkasuunnittelulle. Kuori pyytää sijaintiluvan, näyttää offline-virheen, avaa jaon/kartat/sähköpostin käyttöjärjestelmän kautta ja Stripe-maksut järjestelmäselaimessa. Tuote-UI on first-party WebViewissä.

## Checklist before first store build

- [ ] `EXPO_PUBLIC_WEB_URL` is HTTPS production origin
- [ ] Location permission strings present
- [ ] Stripe domains forced external
- [ ] Offline shell tested airplane mode
- [ ] `solviaxlite://` opens paths in WebView
- [ ] Review notes pasted into App Store Connect / Play Console
