/**
 * @jest-environment node
 */

import { buildOtpEmail } from "@/server/email/otp-templates";

describe("buildOtpEmail", () => {
  it("builds welcome copy for new users (EN)", () => {
    const msg = buildOtpEmail({
      locale: "en",
      code: "123456",
      isNewUser: true,
    });
    expect(msg.subject.toLowerCase()).toContain("welcome");
    expect(msg.text).toContain("123456");
    expect(msg.text.toLowerCase()).toContain("thanks for joining");
    expect(msg.html).toContain("123456");
    expect(msg.html).toContain("Welcome to Solviax.app");
    expect(msg.html).toContain("expires in 10 minutes");
    expect(msg.html).toContain('src="cid:icon.png"');
    expect(msg.html).toMatch(/href="[^"]+".*>Solviax\.app</);
  });

  it("builds sign-in copy for returning users (EN)", () => {
    const msg = buildOtpEmail({
      locale: "en",
      code: "654321",
      isNewUser: false,
    });
    expect(msg.subject.toLowerCase()).not.toContain("welcome");
    expect(msg.text).toContain("654321");
    expect(msg.html).toContain("654321");
    expect(msg.html).not.toContain("Thanks for joining");
  });

  it("builds Finnish welcome for new users", () => {
    const msg = buildOtpEmail({
      locale: "fi",
      code: "111222",
      isNewUser: true,
    });
    expect(msg.subject.toLowerCase()).toContain("tervetuloa");
    expect(msg.text).toContain("111222");
    expect(msg.html).toContain("Tervetuloa Solviax.appiin");
    expect(msg.html).toContain("10 minuutin");
  });

  it("escapes HTML-sensitive characters in the code slot", () => {
    const msg = buildOtpEmail({
      locale: "en",
      code: "12<script>",
      isNewUser: false,
    });
    expect(msg.html).not.toContain("<script>");
    expect(msg.html).toContain("&lt;script&gt;");
  });
});
