import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

const INDEX_ROWS = [
  {
    table: "users",
    constraint: "PK id, UNIQUE email",
    status: "OK",
    note: "Login / Auth.js lookups covered",
  },
  {
    table: "subscriptions",
    constraint: "UNIQUE user_id, UNIQUE stripe_customer_id (partial)",
    status: "OK",
    note: "1:1 entitlement model is correct",
  },
  {
    table: "subscriptions",
    constraint: "stripe_subscription_id",
    status: "Gap",
    note: "No UNIQUE (WHERE NOT NULL) — webhook races / duplicates possible",
  },
  {
    table: "anonymous_sessions",
    constraint: "UNIQUE cookie_id",
    status: "OK",
    note: "Quota path is indexed",
  },
  {
    table: "share_tokens / weather_cache",
    constraint: "UNIQUE token / cache_key",
    status: "OK",
    note: "Hot path lookups covered",
  },
  {
    table: "places",
    constraint: "lat/lon bbox, country_code",
    status: "Critical",
    note: "~33k rows; discover does gte/lte bbox — sequential scan today",
  },
  {
    table: "email_otps",
    constraint: "email (+ expires_at)",
    status: "Gap",
    note: "Every OTP send/verify filters by email",
  },
  {
    table: "trips",
    constraint: "user_id (+ created_at DESC)",
    status: "Gap",
    note: "listTripsForUser / count for save limits",
  },
  {
    table: "saved_locations / sessions / accounts",
    constraint: "user_id FK columns",
    status: "Gap",
    note: "FK without supporting index — cascade & lists slow as data grows",
  },
  {
    table: "usage_events",
    constraint: "(anon_session_id, type, created_at)",
    status: "Gap",
    note: "Quota accounting queries this combination",
  },
  {
    table: "weather_cache",
    constraint: "expires_at",
    status: "Nice",
    note: "Needed for efficient TTL purge jobs",
  },
] as const;

const DRIZZLE_ROWS = [
  {
    area: "Auth tables",
    verdict: "Solid",
    detail: "Auth.js shape, cascades, composite PK on accounts/verification_tokens",
  },
  {
    area: "subscriptions",
    verdict: "Good / tighten",
    detail: "status & plan are free text — prefer pgEnum or CHECK; partial unique on sub id",
  },
  {
    area: "places",
    verdict: "Needs geo indexes",
    detail: "No PostGIS required yet; composite btree (lat, lon) + (country_code, lat, lon) enough at this scale",
  },
  {
    area: "trips dates",
    verdict: "OK for now",
    detail: "ISO date strings work with Zod regex; native date type would be cleaner long-term",
  },
  {
    area: "Schema ↔ migrations",
    verdict: "Watch drift",
    detail: "boolean same_country_only + billing cols exist; journal OK — keep generate/migrate in sync",
  },
] as const;

const ZOD_ROWS = [
  {
    schema: "discoverQuerySchema",
    verdict: "Mostly good",
    detail: "Enums for distance/goal/mode; missing refine endDate ≥ startDate; radiusKm allows 0",
  },
  {
    schema: "routeQuerySchema",
    verdict: "Good",
    detail: "earliestHour 0–23; coords optional with names — matches Mapbox+resolve flow",
  },
  {
    schema: "saveTripInputSchema",
    verdict: "Loose",
    detail: "weatherGoal is free string (elsewhere enum); dates nullable without order check",
  },
  {
    schema: "search / weather / wikipedia",
    verdict: "Good",
    detail: "Sensible min/max, coerce for query strings, lang enum",
  },
  {
    schema: "DB enums vs Zod",
    verdict: "Split brain",
    detail: "Zod enforces API edge; DB accepts any text for status/plan/travel_mode — align with enums",
  },
] as const;

const PRIORITY_ROWS = [
  {
    p: "P0",
    item: "Index places for discover bbox",
    how: "CREATE INDEX places_lat_lon_idx ON places (lat, lon); optional BRIN if huge",
  },
  {
    p: "P0",
    item: "Index places.country_code (same-country Pro filter)",
    how: "CREATE INDEX places_country_code_idx ON places (country_code) WHERE country_code IS NOT NULL",
  },
  {
    p: "P1",
    item: "OTP + trips + usage indexes",
    how: "email_otps(email); trips(user_id, created_at DESC); usage_events(anon_session_id, type)",
  },
  {
    p: "P1",
    item: "Unique stripe_subscription_id",
    how: "Partial UNIQUE WHERE stripe_subscription_id IS NOT NULL",
  },
  {
    p: "P2",
    item: "pgEnum / CHECK for plan & status",
    how: "Mirror Zod enums in Drizzle; migrate existing rows",
  },
  {
    p: "P2",
    item: "Zod refines for date windows",
    how: "discover + saveTrip: endDate >= startDate; tighten weatherGoal enum",
  },
] as const;

export default function DbArchitectureReview() {
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>Database architecture review</H1>
        <Text tone="secondary">
          Solviax / WeatherTrip · Postgres + Drizzle + Zod · schema as of
          migrations 0000–0004
        </Text>
      </Stack>

      <Grid columns={3} gap={12}>
        <Stat value="OK" label="Auth & billing uniques" tone="success" />
        <Stat value="Weak" label="Secondary indexes" tone="warning" />
        <Stat value="P0" label="places geo queries" tone="danger" />
      </Grid>

      <Callout tone="warning" title="Verdict">
        Structure is sound for an early product: clear ownership (users →
        subscriptions 1:1), good unique keys on hot identity paths, and Zod at
        the API edge. The main performance risk is places discover: bbox
        filters on lat/lon with no supporting index, plus missing indexes on
        OTP/trips/usage. Not broken at small scale — will hurt as places (~33k+)
        and traffic grow.
      </Callout>

      <H2>Indexes & uniqueness</H2>
      <Table
        headers={["Table / key", "Constraint", "Status", "Why it matters"]}
        rows={INDEX_ROWS.map((r) => [
          r.table,
          r.constraint,
          r.status,
          r.note,
        ])}
        rowTone={INDEX_ROWS.map((r) =>
          r.status === "Critical"
            ? "danger"
            : r.status === "Gap"
              ? "warning"
              : r.status === "Nice"
                ? "info"
                : "success",
        )}
      />

      <H2>Hot query paths</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Discover → placesWithinRadius</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text>
                WHERE lat BETWEEN … AND lon BETWEEN … [AND country_code IN …]
                LIMIT ~500–2500
              </Text>
              <Row gap={8} wrap>
                <Pill tone="deleted" size="sm">
                  No lat/lon index
                </Pill>
                <Pill tone="warning" size="sm">
                  country_code unindexed
                </Pill>
              </Row>
              <Text tone="secondary" size="small">
                Postgres will seq-scan places. At ~33k rows this is still
                milliseconds locally; under load and larger GeoNames dumps it
                becomes the bottleneck.
              </Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Billing & quota</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Text>
                subscriptions by user_id / stripe_customer_id — unique ✓
              </Text>
              <Text>
                anonymous_sessions by cookie_id — unique ✓
              </Text>
              <Text>
                share_tokens by token — unique ✓ · optimistic use_count update ✓
              </Text>
              <Text tone="secondary" size="small">
                Stronger than many MVPs. Add partial unique on
                stripe_subscription_id for webhook idempotency.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <H2>Drizzle schema</H2>
      <Table
        headers={["Area", "Verdict", "Detail"]}
        rows={DRIZZLE_ROWS.map((r) => [r.area, r.verdict, r.detail])}
      />

      <Stack gap={8}>
        <H3>What is already good</H3>
        <Text>
          FK cascades on user-owned data; Auth.js-compatible keys; weather_cache
          unique key; place_extras 1:1 with places; subscriptions one row per
          user. Boolean same_country_only with default false is a clean Pro
          preference.
        </Text>
        <H3>What I would change</H3>
        <Text>
          Prefer pgEnum (or CHECK) for subscription status/plan and travel_mode.
          Consider native date columns for trip start/end. Optionally PostGIS
          later — not needed until multi-million place rows or polygon filters.
        </Text>
      </Stack>

      <H2>Zod API schemas</H2>
      <Table
        headers={["Schema", "Verdict", "Detail"]}
        rows={ZOD_ROWS.map((r) => [r.schema, r.verdict, r.detail])}
      />

      <Callout tone="info" title="Zod vs Drizzle alignment">
        Zod currently carries more domain integrity than the database (enums for
        weatherGoal, distance, mode). That is fine for a BFF, but anything that
        can be written by webhooks or scripts should also be constrained in SQL
        so bad rows cannot land silently.
      </Callout>

      <H2>Recommended next steps</H2>
      <Table
        headers={["Priority", "Action", "How"]}
        rows={PRIORITY_ROWS.map((r) => [r.p, r.item, r.how])}
        rowTone={PRIORITY_ROWS.map((r) =>
          r.p === "P0" ? "danger" : r.p === "P1" ? "warning" : "info",
        )}
      />

      <Callout tone="success" title="Migration ready">
        Indexes + partial unique are in schema.ts and
        drizzle/0005_performance_indexes.sql (journal idx 5). Run npm run
        db:migrate when Postgres is up. Zod/enum P2 items are still open.
      </Callout>

      <Text tone="secondary" size="small">
        Source: apps/web/src/db/schema.ts, drizzle/0000–0005, places.ts /
        otp.ts / trips.ts / quota.ts, lib/validation/schemas.ts
      </Text>
    </Stack>
  );
}
