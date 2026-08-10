# Solviax.app monorepo

npm workspaces: `apps/web` (Next.js), `apps/mobile` (Expo), `apps/mobile-lite` (WebView store shell), `packages/i18n` (shared EN/FI), `packages/logger` (Pino).

## Dual-platform rule (always)

When you change product behavior, UI copy, features, or API contracts:

1. Update **both** `apps/web` and `apps/mobile` unless the change is platform-specific (e.g. Mapbox GL web map, Expo location permissions).
2. Update **both** English and Finnish strings in `packages/i18n` (`src/en.ts` **and** `src/fi.ts`). Never ship a key in only one locale.
3. Prefer shared packages (`packages/i18n`, future `packages/*`) over duplicating dictionaries or DTOs.
4. **`apps/mobile-lite`** loads the web UI in a WebView — product changes go in `apps/web`; only shell/bridges/store policy in lite (see `apps/mobile-lite/STORE.md`).

```text
❌ Add a button label only in apps/web and only in en.ts
✅ Add the string in packages/i18n en.ts + fi.ts, use it in web and mobile
```

## Next.js (apps/web)

This is NOT the Next.js you know from older training data. APIs and file structure may differ — read `node_modules/next/dist/docs/` (or the version installed in `apps/web`) before writing code. Heed deprecation notices.

## Expo (apps/mobile)

Read versioned Expo docs for the SDK in `apps/mobile/package.json` (currently SDK 57): https://docs.expo.dev/versions/v57.0.0/

Mobile talks to the web API via `EXPO_PUBLIC_API_URL` (see `apps/mobile/.env.example`). Run `npm run dev:web` for the API, then `npm run dev:mobile`.

## Expo Lite (apps/mobile-lite)

WebView shell over `EXPO_PUBLIC_WEB_URL`. Scheme `solviaxlite://`, bundle `com.solviax.lite`. Day-1 store rules: `apps/mobile-lite/STORE.md`. Run `npm run dev:web` then `npm run dev:mobile-lite`.

## Commands (repo root)

- `npm install` — all workspaces
- `npm run dev:web` / `npm run dev:mobile` / `npm run dev:mobile-lite`
- `npm run build` — web production build
