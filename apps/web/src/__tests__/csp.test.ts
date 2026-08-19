import { buildContentSecurityPolicy, sha256Base64 } from "@/middleware";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { CONSENT_MODE_DEFAULT_SCRIPT } from "@/lib/consent";

describe("buildContentSecurityPolicy", () => {
  it("uses nonce + strict-dynamic, theme hash, and omits script unsafe-inline", async () => {
    const themeHash = await sha256Base64(THEME_BOOT_SCRIPT);
    const consentHash = await sha256Base64(CONSENT_MODE_DEFAULT_SCRIPT);
    const csp = buildContentSecurityPolicy("testNonce", [themeHash, consentHash]);
    expect(csp).toContain(
      `script-src 'self' 'nonce-testNonce' 'strict-dynamic' 'sha256-${themeHash}' 'sha256-${consentHash}'`,
    );
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("child-src 'self' blob:");
    expect(csp).toContain("object-src 'none'");
  });

  it("includes unsafe-eval only in development", async () => {
    const themeHash = await sha256Base64(THEME_BOOT_SCRIPT);
    const consentHash = await sha256Base64(CONSENT_MODE_DEFAULT_SCRIPT);
    const hashes = [themeHash, consentHash];
    const prev = process.env.NODE_ENV;
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      configurable: true,
    });
    expect(buildContentSecurityPolicy("n", hashes)).not.toMatch(
      /script-src[^;]*'unsafe-eval'/,
    );
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      configurable: true,
    });
    expect(buildContentSecurityPolicy("n", hashes)).toMatch(
      /script-src[^;]*'unsafe-eval'/,
    );
    Object.defineProperty(process.env, "NODE_ENV", {
      value: prev,
      configurable: true,
    });
  });
});
