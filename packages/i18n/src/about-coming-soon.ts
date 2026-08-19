/** Shared keys for the About “Coming soon” roadmap (web + mobile). */
export const ABOUT_COMING_SOON_KEYS = [
  "mobileApps",
  "measurementUnits",
  "mobileMap",
  "transit",
  "whyRanking",
  "timeScrubber",
  "leaveBy",
  "tripAlerts",
  "activityPresets",
] as const;

export type AboutComingSoonKey = (typeof ABOUT_COMING_SOON_KEYS)[number];

export const ABOUT_COMING_SOON_ICONS: Record<AboutComingSoonKey, string> = {
  mobileApps: "smartphone",
  mobileMap: "map",
  transit: "directions_transit",
  whyRanking: "lightbulb",
  timeScrubber: "schedule",
  leaveBy: "departure_board",
  tripAlerts: "notifications_active",
  activityPresets: "hiking",
  measurementUnits: "straighten",
};
