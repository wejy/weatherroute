# Update e2e plan

Date: 2026-08-25 (done)  
Command: `npm run test:e2e -w @solviax/web`

## Final run

| Result | Count |
|--------|------:|
| Passed | 34 |
| Failed | 0 |
| Skipped | 22 (`map-locale` × 4 — no Mapbox `pk.` in env; `mobile-header` × 18 — mobile-chrome only) |

---

## Auth matrix (guest vs signed-in)

Yes — **separate smoke where chrome differs**; do not duplicate identical layout tests.

| Surface | Guest | Signed-in (mock) |
|---------|-------|------------------|
| Header on `/`, `/map`, `/routes` | `nav-sign-in`; no `nav-account` | `nav-account`; no `nav-sign-in` |
| Responsive layout / filters / routes form | Guest only | Same under mocks |
| OTP / Mailgun / real Auth.js | Out of smoke | Out of smoke |

Signed-in uses `wt_session=demo` via `e2e/helpers/auth.ts` when Playwright’s webServer runs with `USE_MOCKS=true`.

---

## What was fixed

1. Consent cookie helper — banner no longer intercepts clicks  
2. Routes testid union (need-destination / paywall / full)  
3. `mobile-header.spec.ts` — guest vs demo signed-in (mobile-chrome only)  
4. `dev:e2e` + webServer on `:3100`; fresh server by default (`PLAYWRIGHT_REUSE=1` to attach)  
5. **USE_MOCKS gate:** `no_session` / `no_db` no longer SoftPaywall discover/routes UI (filters stay mounted)  
6. Tablet brand: TopNav brand `shrink-0` (was collapsing to 0 width at 768px)  
7. Weather filters: seed `lat`/`lon` so coarse geo cannot overwrite `weatherGoal`  

---

## Commands

```bash
cd apps/web && npx playwright install chromium
npm run test:e2e -w @solviax/web
```
