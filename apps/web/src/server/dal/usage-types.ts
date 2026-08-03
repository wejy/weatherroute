/** Canonical usage_events.type values. */
export const USAGE_TYPES = {
  discover: "discover",
  shareRedeem: "share_redeem",
  login: "login",
  route: "route",
  routeSave: "route_save",
  extMapboxGeocode: "ext_mapbox_geocode",
  extMapboxDirections: "ext_mapbox_directions",
  extOpenMeteo: "ext_open_meteo",
  extWikipedia: "ext_wikipedia",
  adminStatsView: "admin_stats_view",
} as const;

export type UsageEventType = (typeof USAGE_TYPES)[keyof typeof USAGE_TYPES];

export const EXTERNAL_USAGE_TYPES = [
  USAGE_TYPES.extMapboxGeocode,
  USAGE_TYPES.extMapboxDirections,
  USAGE_TYPES.extOpenMeteo,
  USAGE_TYPES.extWikipedia,
] as const;
