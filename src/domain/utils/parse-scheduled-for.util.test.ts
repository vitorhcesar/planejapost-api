import { describe, expect, test } from "bun:test";
import {
  isValidIanaTimezone,
  parseScheduledForToUtcDate,
  scheduledForHasExplicitOffset,
} from "@/domain/utils/parse-scheduled-for.util";

describe("parse-scheduled-for", () => {
  test("detects explicit offset", () => {
    expect(scheduledForHasExplicitOffset("2027-02-01T10:00:00Z")).toBe(true);
    expect(scheduledForHasExplicitOffset("2027-02-01T10:00:00-03:00")).toBe(true);
    expect(scheduledForHasExplicitOffset("2027-02-01T10:00:00")).toBe(false);
  });

  test("validates IANA timezone", () => {
    expect(isValidIanaTimezone("America/Sao_Paulo")).toBe(true);
    expect(isValidIanaTimezone("Invalid/Timezone")).toBe(false);
  });

  test("parses naive datetime with timezone to UTC", () => {
    const parsed = parseScheduledForToUtcDate(
      "2027-02-01T10:00:00",
      "America/Sao_Paulo",
    );

    expect(parsed.toISOString()).toBe("2027-02-01T13:00:00.000Z");
  });
});
