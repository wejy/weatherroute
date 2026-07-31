import { getClientIpFromHeaders } from "@/lib/client-ip";
import { peekRateLimit, rateLimit } from "@/lib/rate-limit";

describe("rateLimit peek vs consume", () => {
  it("peek does not increment count", async () => {
    const key = `test-peek-${Date.now()}`;
    const first = await rateLimit(key, 2, 60_000);
    expect(first.count).toBe(1);

    const peek = await peekRateLimit(key, 2, 60_000);
    expect(peek.count).toBe(1);

    const second = await rateLimit(key, 2, 60_000);
    expect(second.count).toBe(2);
  });
});

describe("getClientIpFromHeaders", () => {
  it("prefers x-vercel-forwarded-for", () => {
    const h = new Headers({
      "x-vercel-forwarded-for": "1.2.3.4, 5.6.7.8",
      "x-forwarded-for": "9.9.9.9",
    });
    expect(getClientIpFromHeaders(h)).toBe("1.2.3.4");
  });

  it("falls back to x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" });
    expect(getClientIpFromHeaders(h)).toBe("9.9.9.9");
  });
});
