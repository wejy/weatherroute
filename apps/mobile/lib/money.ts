/** Format Stripe amount (cents) for EN/FI display. */
export function formatPaymentAmount(
  amountCents: number,
  currency: string,
  locale: "en" | "fi",
): string {
  const tag = locale === "fi" ? "fi-FI" : "en-GB";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: (currency || "eur").toUpperCase(),
  }).format(amountCents / 100);
}
