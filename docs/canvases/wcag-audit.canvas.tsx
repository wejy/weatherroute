import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
} from "cursor/canvas";

const FIXED = [
  {
    issue: "Broken aria-controls (WAVE)",
    where: "place-autocomplete, date-when-field, map-filters-panel",
    fix: "Keep controlled panels/listboxes mounted (hidden) so the ID always exists",
  },
  {
    issue: "Nested interactive in role=option",
    where: "place-autocomplete",
    fix: "option is the list item itself; removed inner button",
  },
  {
    issue: "Orphaned / unlinked labels",
    where: "search-island when + origin",
    fix: "htmlFor on origin; when uses span + aria-labelledby on the control",
  },
  {
    issue: "Fake disabled radiogroup",
    where: "settings theme",
    fix: "Static theme indicator (coming soon) — no role=radio without keyboard contract",
  },
  {
    issue: "aria-current=page on in-page filters",
    where: "trips mode filters",
    fix: "aria-current=true for same-URL filters",
  },
] as const;

const REMAINING = [
  {
    issue: "Map marker popups as dialog",
    level: "AA",
    note: "role=dialog without focus trap / restore — prefer alertdialog pattern or plain region",
  },
  {
    issue: "Mapbox canvas",
    level: "A",
    note: "Custom markers have aria-labels; canvas itself is limited — keep sr-only marker list",
  },
  {
    issue: "Contrast spot-checks",
    level: "AA",
    note: "outline / 10px hint text may fail 4.5:1 — verify with WAVE contrast tool on chips & hints",
  },
  {
    issue: "Radiogroup arrow keys",
    level: "AA",
    note: "TravelModeSelector uses buttons+radio; APG expects arrow-key roving focus (click OK)",
  },
] as const;

export default function WcagAudit() {
  return (
    <Stack gap={24}>
      <Stack gap={8}>
        <H1>WCAG / WAVE audit</H1>
        <Text tone="secondary">
          Solviax web · focus on ARIA contracts WAVE flags as broken references /
          invalid patterns · Aug 2026
        </Text>
      </Stack>

      <Grid columns={3} gap={12}>
        <Stat value="5" label="ARIA issues fixed" tone="success" />
        <Stat value="A/AA" label="Target level" tone="info" />
        <Stat value="Open" label="Map + contrast follow-ups" tone="warning" />
      </Grid>

      <Callout tone="warning" title="What WAVE meant">
        “Invalid contracts” / broken ARIA references usually mean
        aria-controls / aria-labelledby / aria-describedby pointing at IDs that
        are not in the DOM (e.g. listbox only rendered when open). That fails
        WCAG 4.1.2 Name, Role, Value.
      </Callout>

      <H2>Fixed in this pass</H2>
      <Table
        headers={["Issue", "Where", "Fix"]}
        rows={FIXED.map((r) => [r.issue, r.where, r.fix])}
        rowTone={FIXED.map(() => "success")}
      />

      <H2>Retest with WAVE</H2>
      <Grid columns={2} gap={12}>
        <Card>
          <CardHeader>Pages</CardHeader>
          <CardBody>
            <Stack gap={6}>
              <Text>/ (discover search open + closed)</Text>
              <Text>/map (filters collapsed on mobile width)</Text>
              <Text>/routes (endpoint form)</Text>
              <Text>/settings (theme block)</Text>
              <Text>/trips (mode filters)</Text>
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Expect cleared</CardHeader>
          <CardBody>
            <Stack gap={8}>
              <Row gap={8} wrap>
                <Pill tone="success" size="sm">
                  Broken ARIA reference
                </Pill>
                <Pill tone="success" size="sm">
                  Orphaned form label
                </Pill>
                <Pill tone="warning" size="sm">
                  Contrast (manual)
                </Pill>
              </Row>
              <Text tone="secondary" size="small">
                Re-run WAVE after hard refresh. Map pages may still show alerts
                for canvas / custom widgets.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      </Grid>

      <Divider />

      <H2>Still open (not blocking this pass)</H2>
      <Table
        headers={["Issue", "Level", "Note"]}
        rows={REMAINING.map((r) => [r.issue, r.level, r.note])}
        rowTone={REMAINING.map(() => "warning")}
      />

      <Text tone="secondary" size="small">
        Changes: place-autocomplete, date-when-field, map-filters-panel,
        search-island, location-origin-field, route-endpoints-form, settings,
        trips · mobile RN not in scope for ARIA DOM contracts
      </Text>
    </Stack>
  );
}
