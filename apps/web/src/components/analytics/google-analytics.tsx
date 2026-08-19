import { GoogleAnalytics } from "@next/third-parties/google";
import { getGaMeasurementId } from "@/lib/analytics";

/** Renders GA4 only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set. */
export function AppGoogleAnalytics() {
  const gaId = getGaMeasurementId();
  if (!gaId.startsWith("G-")) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
