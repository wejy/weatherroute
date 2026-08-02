import {
  Callout,
  Divider,
  Grid,
  H1,
  H2,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

const CRITICAL = [
  [
    "Critical",
    "Anon quota bypass",
    "Client can rotate X-Solviax-Anon / wt_anon → new free quota. IP cap only when no anon session.",
  ],
  [
    "High",
    "Logged-in = unlimited discover",
    "loggedInHasUnlimitedDiscover() always true — free OTP signup skips freemium limits.",
  ],
  [
    "High",
    "In-memory rate limits",
    "Without Upstash, limits reset per instance/restart — weak under load / multi-node.",
  ],
  [
    "High",
    "Public costly APIs",
    "/api/discover, /routes, /weather, /search only soft IP-limited — Mapbox/Open-Meteo bill risk.",
  ],
] as const;

const MEDIUM = [
  [
    "Medium",
    "CORS defaults",
    "If CORS_ALLOWED_ORIGINS unset, localhost Expo ports allowed even in production.",
  ],
  [
    "Medium",
    "Weak CSP",
    "script-src allows unsafe-inline + unsafe-eval — limited XSS mitigation.",
  ],
  [
    "Medium",
    "Trusted proxy / IP",
    "X-Forwarded-For spoofable if edge doesn't strip client headers.",
  ],
  [
    "Medium",
    "Mobile API URL",
    "EXPO_PUBLIC_API_URL must be pinned HTTPS prod in store builds.",
  ],
] as const;

const URL_ROWS = [
  [
    "OK",
    "discover / route / weather / search",
    "Zod enums, lat/lon bounds, date regex, string max lengths — no injection surface",
  ],
  [
    "OK",
    "Prototype pollution",
    "Object.fromEntries → zod object schemas; not merging untrusted keys into prototypes",
  ],
  [
    "OK",
    "open-app deep link",
    "Only solviax:// scheme allowed",
  ],
  [
    "Low",
    "login ?next=",
    "Blocks // but not \\evil tricks — tighten to strict relative path regex",
  ],
  [
    "Low",
    "Zod error flatten",
    "Validation details returned to client — fine for now; genericize in prod if desired",
  ],
] as const;

const CHECKLIST = [
  ["1", "Fix or mitigate anon quota rotation (signed cookie / creation RL / IP bind)"],
  ["2", "Free-tier discover limits for signed-in non-Pro users"],
  ["3", "Require Upstash (or Redis) rate limiting in production"],
  ["4", "Set CORS_ALLOWED_ORIGINS explicitly (no localhost in prod)"],
  ["5", "Pin mobile EXPO_PUBLIC_API_URL to HTTPS production"],
  ["6", "Harden safeNextPath; optionally tighten CSP"],
] as const;

export default function SecurityAudit() {
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>Production security assessment</H1>
        <Text tone="secondary">
          Solviax web + mobile · full-app review (not just a branch diff) · Aug
          2026
        </Text>
      </Stack>

      <Grid columns={3} gap={12}>
        <Stat value="Ship-ready*" label="With checklist below" tone="warning" />
        <Stat value="OK" label="URL/zod parsing" tone="success" />
        <Stat value="Fix first" label="Quota + rate limits" tone="danger" />
      </Grid>

      <Callout tone="warning" title="Verdict">
        Not blocked by classic injection/XSS/SSRF. URL parameter parsing via Zod
        is solid. Before production, treat freemium abuse and distributed rate
        limiting as must-fix — otherwise discover/Mapbox costs and free-tier
        integrity break under simple client tricks.
      </Callout>

      <H2>Must address before / at launch</H2>
      <Table
        headers={["Severity", "Issue", "Why it matters"]}
        rows={CRITICAL.map((r) => [...r])}
        rowTone={CRITICAL.map((r) =>
          r[0] === "Critical" ? "danger" : "warning",
        )}
      />

      <H2>Should harden soon</H2>
      <Table
        headers={["Severity", "Issue", "Note"]}
        rows={MEDIUM.map((r) => [...r])}
        rowTone={MEDIUM.map(() => "warning")}
      />

      <H2>URL / query parsing</H2>
      <Table
        headers={["Status", "Area", "Detail"]}
        rows={URL_ROWS.map((r) => [...r])}
        rowTone={URL_ROWS.map((r) =>
          r[0] === "OK" ? "success" : "info",
        )}
      />

      <Divider />

      <H2>Already in good shape</H2>
      <Stack gap={6}>
        <Text>• OTP: hashed, timing-safe, attempt lock, dual rate limits, no console email in prod</Text>
        <Text>• Stripe webhook signature + price/amount + customer↔user binding</Text>
        <Text>• Trip IDOR: always scoped by userId</Text>
        <Text>• SSRF: fixed upstream hosts (Mapbox, Wikipedia, Open-Meteo)</Text>
        <Text>• Security headers: HSTS (prod), XFO DENY, nosniff, Permissions-Policy</Text>
        <Text>• Fail-closed env: AUTH_SECRET length, no USE_MOCKS in production</Text>
      </Stack>

      <H2>Launch checklist</H2>
      <Table
        headers={["#", "Action"]}
        rows={CHECKLIST.map((r) => [...r])}
      />

      <Text tone="secondary" size="small">
        Evidence: quota.ts, rate-limit.ts, schemas.ts, env.ts CORS, Stripe
        webhook-guards, middleware headers · explore audit agent
      </Text>
    </Stack>
  );
}
