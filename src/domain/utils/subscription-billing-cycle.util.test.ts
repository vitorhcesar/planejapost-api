import { describe, expect, it } from "bun:test";
import {
  buildMonthlyBillingCycle,
  syncTrialBillingDates,
} from "@/domain/utils/subscription-billing-cycle.util";

describe("subscription-billing-cycle.util", () => {
  it("builds a monthly billing cycle from the start date", () => {
    const startAt = new Date("2026-01-15T10:00:00.000Z");
    const cycle = buildMonthlyBillingCycle(startAt);

    expect(cycle.currentPeriodStart).toEqual(startAt);
    expect(cycle.currentPeriodEnd.toISOString()).toBe("2026-02-15T10:00:00.000Z");
    expect(cycle.dueAt.toISOString()).toBe("2026-02-15T10:00:00.000Z");
  });

  it("syncs trial billing dates from dueAt", () => {
    const dueAt = new Date("2026-03-01T00:00:00.000Z");
    const synced = syncTrialBillingDates({ dueAt });

    expect(synced).toEqual({
      dueAt,
      currentPeriodEnd: dueAt,
      trialEndsAt: dueAt,
    });
  });
});
