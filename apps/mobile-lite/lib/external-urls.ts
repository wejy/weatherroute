/**
 * URLs that must leave the WebView (store billing + OS handlers).
 * See STORE.md — never complete Stripe Checkout inside the WebView.
 */

const STRIPE_HOST_SUFFIXES = [
  "stripe.com",
  "stripe.network",
  "stripecdn.com",
] as const;

export function isStripeHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return STRIPE_HOST_SUFFIXES.some(
    (s) => host === s || host.endsWith(`.${s}`),
  );
}

export function isMailOrTel(url: string): boolean {
  return /^(mailto:|tel:|sms:)/i.test(url);
}

export function isMapsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h === "maps.apple.com" || h === "maps.google.com") return true;
    if (h === "www.google.com" && u.pathname.startsWith("/maps")) return true;
    if (h.endsWith(".google.com") && u.pathname.startsWith("/maps")) return true;
    return false;
  } catch {
    return false;
  }
}

export function sameWebOrigin(url: string, webOrigin: string): boolean {
  try {
    const a = new URL(url);
    const b = new URL(webOrigin);
    return a.origin === b.origin;
  } catch {
    return false;
  }
}

export type NavigationDecision =
  | { action: "allow" }
  | { action: "cancel" }
  | { action: "external-browser"; url: string }
  | { action: "os-link"; url: string };

/**
 * Decide how to handle a top-level navigation request.
 */
export function classifyNavigation(
  url: string,
  webOrigin: string,
): NavigationDecision {
  if (!url || url === "about:blank") return { action: "allow" };
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return { action: "allow" };
  }
  if (isMailOrTel(url)) return { action: "os-link", url };
  if (isMapsUrl(url)) return { action: "os-link", url };

  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { action: "os-link", url };
    }
    if (sameWebOrigin(url, webOrigin)) return { action: "allow" };
    if (isStripeHost(u.hostname)) {
      return { action: "external-browser", url };
    }
    // Other https (Wikipedia, docs): stay in WebView for continuity.
    return { action: "allow" };
  } catch {
    return { action: "cancel" };
  }
}
