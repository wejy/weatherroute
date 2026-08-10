# Solviax Lite (`apps/mobile-lite`)

WebView-first store shell: loads production (or local) `apps/web` full-screen. Native = permissions, Stripe-out-of-WebView, offline shell, deep links (`solviaxlite://`).

See **[STORE.md](./STORE.md)** for day-1 App Store / Play constraints.

## Run

```bash
# Terminal 1 — web (API + UI the WebView loads)
npm run dev:web

# Terminal 2 — lite shell
npm run dev:mobile-lite
```

Set `EXPO_PUBLIC_WEB_URL` in `apps/mobile-lite/.env` (see `.env.example`). On a physical device use your LAN IP, not `localhost`.

## Relation to `apps/mobile`

| | `apps/mobile` | `apps/mobile-lite` |
|--|---------------|-------------------|
| UI | Native Expo screens | Web in WebView |
| Auth | `X-Solviax-Session` header | Web Auth.js cookies |
| Scheme | `solviax://` | `solviaxlite://` |
| Bundle | `com.solviax.app` | `com.solviax.lite` |
