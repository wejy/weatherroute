import { GoogleAnalytics } from "@next/third-parties/google";
import { getGaMeasurementId } from "@/lib/analytics";

/** Renders GA4 only when enabled and NEXT_PUBLIC_GA_MEASUREMENT_ID is set. */
export function AppGoogleAnalytics({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  const gaId = getGaMeasurementId();
  if (!gaId.startsWith("G-")) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
