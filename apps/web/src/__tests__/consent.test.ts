import {
  CONSENT_VERSION,
  defaultConsent,
  hasConsentChoice,
  parseConsentCookie,
  serializeConsent,
  shouldLoadAnalytics,
} from "@/lib/consent";

describe("consent", () => {
  it("defaults to analytics denied", () => {
    expect(defaultConsent().analytics).toBe(false);
    expect(defaultConsent().v).toBe(CONSENT_VERSION);
  });

  it("parses valid consent cookie", () => {
    const raw = serializeConsent({
      v: 1,
      analytics: true,
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    expect(parseConsentCookie(raw)).toEqual({
      v: 1,
      analytics: true,
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
  });

  it("rejects unknown version", () => {
    expect(
      parseConsentCookie(
        JSON.stringify({ v: 99, analytics: true, updatedAt: "x" }),
      ),
    ).toBeNull();
  });

  it("shouldLoadAnalytics only when opted in", () => {
    expect(shouldLoadAnalytics(null)).toBe(false);
    expect(shouldLoadAnalytics(defaultConsent())).toBe(false);
    expect(
      shouldLoadAnalytics({
        v: 1,
        analytics: true,
        updatedAt: "2026-08-19T12:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("hasConsentChoice detects stored preference", () => {
    expect(hasConsentChoice(null)).toBe(false);
    expect(hasConsentChoice(defaultConsent())).toBe(true);
  });
});
