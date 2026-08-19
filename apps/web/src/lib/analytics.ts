/** GA4 measurement id (G-XXXXXXXXXX). Empty = analytics off. */
export function getGaMeasurementId(): string {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
}

export function isGoogleAnalyticsEnabled(): boolean {
  const id = getGaMeasurementId();
  return id.startsWith("G-");
}
