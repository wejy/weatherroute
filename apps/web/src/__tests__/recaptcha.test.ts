import {
  RecaptchaVerificationError,
  isMobileAppClient,
  isRecaptchaEnabled,
  verifyRecaptchaToken,
} from "@/lib/recaptcha";

describe("recaptcha", () => {
  const prevSite = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const prevSecret = process.env.RECAPTCHA_SECRET_KEY;
  const prevMinScore = process.env.RECAPTCHA_MIN_SCORE;

  afterEach(() => {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = prevSite;
    process.env.RECAPTCHA_SECRET_KEY = prevSecret;
    process.env.RECAPTCHA_MIN_SCORE = prevMinScore;
    jest.restoreAllMocks();
  });

  it("is disabled when keys are missing", () => {
    delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    delete process.env.RECAPTCHA_SECRET_KEY;
    expect(isRecaptchaEnabled()).toBe(false);
  });

  it("is enabled when both keys are set", () => {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site-key";
    process.env.RECAPTCHA_SECRET_KEY = "secret-key";
    expect(isRecaptchaEnabled()).toBe(true);
  });

  it("skips verify when disabled", async () => {
    delete process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    delete process.env.RECAPTCHA_SECRET_KEY;
    const fetchSpy = jest.spyOn(global, "fetch");
    await verifyRecaptchaToken(undefined);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("requires a token when enabled", async () => {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site-key";
    process.env.RECAPTCHA_SECRET_KEY = "secret-key";
    await expect(verifyRecaptchaToken("")).rejects.toBeInstanceOf(
      RecaptchaVerificationError,
    );
  });

  it("verifies token with Google when enabled", async () => {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site-key";
    process.env.RECAPTCHA_SECRET_KEY = "secret-key";

    const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, score: 0.9, action: "request_otp" }),
        { status: 200 },
      ),
    );

    await expect(
      verifyRecaptchaToken("token-123", {
        remoteIp: "127.0.0.1",
        expectedAction: "request_otp",
      }),
    ).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://www.google.com/recaptcha/api/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
    const body = String(fetchSpy.mock.calls[0]?.[1]?.body);
    expect(body).toContain("secret=secret-key");
    expect(body).toContain("response=token-123");
    expect(body).toContain("remoteip=127.0.0.1");
  });

  it("throws when Google rejects the token", async () => {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site-key";
    process.env.RECAPTCHA_SECRET_KEY = "secret-key";

    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          "error-codes": ["invalid-input-response"],
        }),
        { status: 200 },
      ),
    );

    await expect(verifyRecaptchaToken("bad-token")).rejects.toThrow(
      "invalid-input-response",
    );
  });

  it("throws when action mismatches", async () => {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site-key";
    process.env.RECAPTCHA_SECRET_KEY = "secret-key";

    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, score: 0.9, action: "login" }),
        { status: 200 },
      ),
    );

    await expect(
      verifyRecaptchaToken("token-123", { expectedAction: "request_otp" }),
    ).rejects.toThrow("Unexpected recaptcha action");
  });

  it("throws when score is below threshold", async () => {
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = "site-key";
    process.env.RECAPTCHA_SECRET_KEY = "secret-key";
    process.env.RECAPTCHA_MIN_SCORE = "0.8";

    jest.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, score: 0.2, action: "request_otp" }),
        { status: 200 },
      ),
    );

    await expect(verifyRecaptchaToken("token-123")).rejects.toThrow(
      "score too low",
    );
  });

  describe("isMobileAppClient", () => {
    it("detects Expo device header", () => {
      const headers = new Headers({ "X-Solviax-Device": "abc-123" });
      expect(isMobileAppClient(headers)).toBe(true);
    });

    it("returns false for web requests", () => {
      expect(isMobileAppClient(new Headers())).toBe(false);
    });
  });
});
