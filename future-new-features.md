# Solviax.app — future product ideas

Vision and idea bank for what to build next. This is **not** the execution backlog.

- Concrete engineering follow-ups: **[TODO.md](./TODO.md)**
- What Pro already unlocks today: **[PAID_FEATURES.md](./PAID_FEATURES.md)**

Use this doc when prioritizing delight, trust, and differentiation — especially ideas that deepen Discover, Map, Routes, and Pro rather than inventing a different product.

---

## 1. Purpose & north star

**Today:** help people find clearer skies nearby and plan a route around weather.

**North star:** people should *trust the decision* — not just see a ranked list. Solviax should answer: *Where should I go, when should I leave, and why will this feel better than staying put?*

Every idea below should either (a) make that answer clearer, (b) make acting on it easier (map / route / save / share), or (c) make Pro feel indispensable without breaking Free’s honest value.

---

## 2. Current baseline (shipped)

What we already have — future work should build on this, not ignore it:

- **Discover** — origin (geo / search), date window (today → ~16 days), distance presets (+ Pro radius / custom), weather goals (`best` / `sun` / `dry` / `mild` / `rain` / `warm`), travel mode carried into map/routes, tiered result caps and quotas
- **Map (web)** — Mapbox GL markers, radius, floating goal filters, nearby cards → destination / route
- **Routes** — Mapbox Directions alternatives, weather sampled along corridor, dryness / “driest” labeling, car + bike; Pro departure time window
- **Saved trips** — Pro-gated (2 on one-time, unlimited on monthly/yearly)
- **Place depth** — destination pages, Wikipedia EN/FI + images (with Mapbox static fallback)
- **Pro extras** — wider radii, more results, same-country filter, departure window, higher route quota
- **Platform** — web + Expo mobile (shared API), EN/FI i18n, dark mode, passwordless OTP + Stripe

Known gaps already tracked in `TODO.md`: **transit**, **interactive Mapbox on mobile**.

---

## 3. Close the promise gaps

Fastest path to “marketing matches product.” Users who believe About / Pro copy should not hit a soft wall.

| Gap | Why it matters | Direction |
|---|---|---|
| Mobile Map tab is a nearby list, not a map | About sells an interactive map; mobile feels unfinished | Ship Mapbox GL (or equivalent) on Expo; reuse last Discover + filters |
| Transit reserved but hidden | Urban users expect train/bus; Finland fits Digitransit | Digitransit / OTP legs; keep Mapbox for car/bike only (`TODO.md`) |
| Soft “hundreds” of Pro discovers vs 200 / 400 in tables | Trust erosion when users count | Align copy with `PAID_FEATURES.md` / env limits, or raise limits intentionally |
| Share copy often says Google only | Apple Maps share already exists | Update About / Pro / share strings on web + mobile |
| “Save destination” vs “saved routes” | Same entitlement, confusing mental model | Unify naming (e.g. “Save trip”) and empty-states that explain what is stored |

These items are mostly parity and honesty — high ROI before big bets.

---

## 4. Deepen existing product

### 4.1 Discover

- **Explainable ranking (“Why this place”)** — Show 2–4 plain-language drivers (sun hours, rain %, temp band, wind) from scores already computed in `weather-service`. Users trust lists they can audit.
- **Multi-objective clarity** — Keep a primary goal chip, but surface secondary trade-offs (“best sun, but windy”). Reduces regret when #1 is “technically best” but uncomfortable.
- **Confidence / uncertainty** — Near-horizon vs day-10 forecasts are not equal; badge reliability so weekend plans feel honest.
- **Activity presets** — Thin UX layer on goals: beach / terrace / hiking / city walk / photo day. Maps to existing goal weights + simple thresholds (UV, wind, precip) without a new product surface.
- **Multi-day “escape sequences”** — For custom date ranges, suggest *which day* inside the window is best for the top places (builds on period summarize already used on destinations).
- **Remembered defaults** — Remember last origin, preferred distance, default goal, travel mode (signed-in prefs; anon via local storage). Cuts friction on every return visit.
- **Saved-trip alerts (Pro)** — If a saved trip’s forecast worsens, nudge to re-Discover or shift dates.

### 4.2 Map

- **Time scrubber** — Scrub forecast hours/days on the same pin set (data already fetched per discover window). Makes the map a planning tool, not a snapshot.
- **Heat / choropleth layers** — Sun probability or rain risk as a soft layer under pins; reinforces weather-first brand vs generic POI map.
- **Compare mode** — Pin 2–3 places and compare key metrics side-by-side (same fields as destination cards).
- **Last-discover offline cache** — Mobile already caches discover; extend “usable without radio for a few hours” with explicit stale labeling.

### 4.3 Routes

- **Leave-by coaching** — Turn Pro departure window + corridor scores into a single recommendation: “Leave between 09:00–11:00 for the driest run.”
- **Time-of-day animation** — Animate rain/temp along the polyline across the day (reuse sampled points from `location-service`).
- **Bike comfort** — For cycling: wind, feels-like, climb proxies where available — same corridor pipeline, richer scoring.
- **Multi-stop (light)** — Origin → waypoint → destination with weather at stops; still Mapbox Directions, still weather samples.
- **Mobile alternative comparison** — Web can show corridor alternatives visually; mobile needs clearer driest vs fastest without requiring desktop.
- **Calendar / Maps depth** — Export `.ics` for departure; richer Google / Apple / HERE deep links with timing hints.

### 4.4 Destination pages

- **Pack / prepare checklist** — Generated from the period summary (rain gear, layers, sunscreen) — template-based first, no LLM required.
- **Trip narrative block** — Short structured blurb: best day, worst hour, distance, mode ETA when origin known.
- **Microclimate later** — Lake / coast / elevation bias once we have reliable place typing (Wikipedia / Wikidata path already started).

---

## 5. Service & trust (better service for end users)

- **Personalization without creep** — Signed-in: home base, favorite goals, same-country default, discover display count (Pro already). Anon: device prefs only. Always explain what is stored.
- **Forecast provenance** — “Based on Open-Meteo · updated … · horizon …” on Discover results and destination. Transparency beats fake precision.
- **Reliability UX** — Stale/partial result banners, retry that doesn’t double-charge quota unnecessarily, graceful Mapbox / Wikipedia failures (already partly there — make consistent).
- **Notifications (opt-in)** — Weekend outlook for home radius; Pro: saved-trip weather change; Free: light weekly teaser that drives Discover (watch quota messaging).
- **A11y & performance** — Beyond Lighthouse: map keyboard paths, reduced-motion for corridor animations, predictable focus in FieldSelect-style menus, image budgets on cards.
- **Support loop** — Footer contact exists; add in-app “report wrong place / weather” that attaches slug + date window for ops.

---

## 6. Keep — then exceed — marketing promises

| Promise today | Keep / tighten | Exceed |
|---|---|---|
| Rank destinations by weather for your dates | Keep goals + 16-day horizon honest | Narrative trip briefs: “Best sunny afternoon within 120 km of Oulu this Saturday” |
| Dry corridor / driest alternative | Keep corridor sampling | Confidence bands; optional backtest (“dryness score matched observed rain X% last season”) for power users |
| Interactive map with temps & rain | Finish mobile map | Time scrubber + weather layers |
| Bilingual EN/FI | Keep shared `@solviax/i18n` | Deeper locale-aware place copy (Wikipedia language already); Finnish-first SEO hubs later |
| Pro: wider radius, more results, saves, departure window | Ship what we sell | Pro-only AI brief + alerts so “Future Pro features” becomes concrete |
| Passwordless + Stripe trust | Keep | Clear quota dashboards (“12 discovers left”) and billing grace UX (cancel-at-period-end already) |

---

## 7. Algorithms & AI

Prefer **classical scoring upgrades** first; add generative AI only where it is grounded and cost-controlled.

### 7.1 Classical / statistical (high leverage)

- **Richer multi-objective score** — Explicit Pareto-aware ranking or weighted sum with visible weights; incorporate wind, UV, cloud cover, precip amount (not only probability) from Open-Meteo fields already available or easy to add.
- **Horizon discounting** — Down-weight day 10–16 automatically in “best” goal; surface as confidence.
- **Place clustering** — Avoid three suburbs that are the same weather blob; pick diverse geography within the radius.
- **Observation blend (later)** — Where recent observations exist, Bayesian-shrink forecast toward reality for “today/tomorrow.”
- **Dryness score calibration** — Log predicted corridor dryness vs later precip for internal metrics (privacy-safe aggregates).

### 7.2 Light ML (personalization)

- Learn per-user goal weights from clicks, opens, saves, and route generation — start with simple online averages, not a heavy model.
- Keep training data on-server for signed-in users; never sell profiles; allow reset in Settings.

### 7.3 Generative AI (Pro, opt-in, grounded)

Always pass **structured forecast JSON** (temps, precip %, sun hours, scores, distance). The model must not invent numbers; UI should show the same metrics beside the prose.

Candidates:

- **Trip brief** — 5–8 sentences: where, why, when to leave, what to pack (EN/FI).
- **Day plan** — Morning / afternoon suggestions for the chosen place given the hourly strip.
- **Ask Solviax** — Constrained Q&A over the current Discover result set (“Which of these is best for a stroller walk?”).

Guardrails:

- Template + rules engine first; LLM as a polish layer
- Cite which fields drove the text
- Hard cost caps / Pro-only; kill switch via env
- No free-form web browse; no unverified POI opening hours as fact

### 7.4 What not to do with AI

- Don’t replace ranking with an opaque LLM sort
- Don’t generate fake Wikipedia
- Don’t auto-charge quota for AI retries without UX consent

---

## 8. Platform & growth (still product-adjacent)

- **Shared DTO package** — Reduce web/mobile drift (`TODO.md`); unlock faster feature parity
- **Curated SEO hubs** — e.g. “Weekend weather escapes from Oulu” — small, editorial set of pages, *not* millions of thin `/destinations/{slug}` URLs in the sitemap
- **Embed / widget** — Partner sites: mini Discover for a fixed origin (API + quota key)
- **Deep links** — Universal links into Discover with prefilled params; open-app flow already exists — extend for campaigns
- **Export** — `.ics`, GPX of route corridor, share cards with OG image per trip (dynamic OG later)

---

## 9. Suggested priority waves

Rough sequencing — adjust with metrics and capacity:

| Wave | Theme | Examples |
|---|---|---|
| **A — Parity & trust** | Promise = product | Mobile Mapbox map; copy fixes; quota clarity; “why this place”; forecast provenance |
| **B — Delight on core loops** | Discover / Map / Routes depth | Time scrubber; leave-by coaching; activity presets; pack checklist; mobile route compare |
| **C — Personalization & AI** | Sticky Pro | Prefs/home base; saved-trip alerts; grounded trip briefs; light preference learning |
| **D — Scale modes & reach** | New surfaces on same spine | Transit (Digitransit); multi-stop; curated SEO hubs; embeds |

Wave A should mostly land before heavy AI spend.

---

## 10. Non-goals (for now)

Ideas that dilute the weather-first spine or explode scope:

- Generic social network / friend feeds
- Full travel OS (hotels, tickets, car rental checkout)
- Hardware weather stations / IoT
- Global coverage promises before Nordic / EU corridor quality is excellent
- Replacing Mapbox + Open-Meteo with a from-scratch stack without a clear product win

---

## 11. How to use this doc

1. Pick items that reinforce Discover → Map → Route → Save.
2. Prefer shipping Wave A honesty before Wave C magic.
3. When an idea graduates to build-ready, move a crisp checklist into **TODO.md** (or a linked issue) with acceptance criteria and dual-platform + EN/FI notes per `AGENTS.md`.
4. Revisit Pro packaging in **PAID_FEATURES.md** whenever a feature becomes entitlement-gated.

---

*Living document — update when strategy or entitlements change; keep implementation truth in code and `TODO.md`.*
