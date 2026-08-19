import { isNextRedirectError, shouldShowOtpVerify } from "@/lib/login-otp-flow";

describe("login-otp-flow", () => {
  describe("shouldShowOtpVerify", () => {
    it("shows verify only after successful send", () => {
      expect(shouldShowOtpVerify(true)).toBe(true);
      expect(shouldShowOtpVerify(false)).toBe(false);
    });
  });

  describe("isNextRedirectError", () => {
    it("detects NEXT_REDIRECT digest from server actions", () => {
      expect(
        isNextRedirectError({
          digest: "NEXT_REDIRECT;replace;/login?sent=1;307;",
        }),
      ).toBe(true);
    });

    it("rejects ordinary errors", () => {
      expect(isNextRedirectError(new Error("fail"))).toBe(false);
      expect(isNextRedirectError(null)).toBe(false);
      expect(isNextRedirectError({ digest: "OTHER" })).toBe(false);
    });
  });
});
