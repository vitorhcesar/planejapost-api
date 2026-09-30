import { describe, expect, test } from "bun:test";
import { getRetryAfterSeconds } from "@/domain/zernio/map-zernio-error.util";

describe("getRetryAfterSeconds", () => {
  test("reads retryAfterSeconds from error details", () => {
    const seconds = getRetryAfterSeconds({
      statusCode: 429,
      message: "Rate limited",
      details: { retryAfterSeconds: 7 },
    });

    expect(seconds).toBe(7);
  });

  test("falls back to getSecondsUntilReset when available", () => {
    const seconds = getRetryAfterSeconds({
      statusCode: 429,
      message: "Rate limited",
      getSecondsUntilReset: () => 12,
    });

    expect(seconds).toBe(12);
  });

  test("defaults to 1 second", () => {
    expect(getRetryAfterSeconds(new Error("unknown"))).toBe(1);
  });
});
