import { isDatabaseUnavailableError } from "@/lib/db-errors";

describe("isDatabaseUnavailableError", () => {
  it("detects ECONNREFUSED", () => {
    const err = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:5432"), {
      code: "ECONNREFUSED",
    });
    expect(isDatabaseUnavailableError(err)).toBe(true);
  });

  it("detects CONNECT_TIMEOUT", () => {
    const err = Object.assign(new Error("write CONNECT_TIMEOUT"), {
      code: "CONNECT_TIMEOUT",
    });
    expect(isDatabaseUnavailableError(err)).toBe(true);
  });

  it("detects nested cause", () => {
    const cause = Object.assign(new Error("connection refused"), {
      code: "ECONNREFUSED",
    });
    expect(isDatabaseUnavailableError(new Error("query failed", { cause }))).toBe(
      true,
    );
  });

  it("ignores unrelated errors", () => {
    expect(isDatabaseUnavailableError(new Error("Invalid query"))).toBe(false);
    expect(isDatabaseUnavailableError(new Error("Rate limit exceeded"))).toBe(
      false,
    );
  });
});
