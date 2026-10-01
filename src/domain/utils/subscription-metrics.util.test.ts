import { describe, expect, it } from "bun:test";
import {
  buildPlanDistribution,
  calculateMrrFromPlanGroups,
} from "@/domain/utils/subscription-metrics.util";

describe("subscription-metrics.util", () => {
  it("calculates MRR only from provided paying plan groups", () => {
    const mrr = calculateMrrFromPlanGroups(
      [
        { planId: "essential", count: 2 },
        { planId: "growth", count: 1 },
      ],
      [
        { id: "essential", priceMonthlyBrl: 49.9 },
        { id: "growth", priceMonthlyBrl: 99.9 },
      ],
    );

    expect(mrr).toBeCloseTo(199.7);
  });

  it("ignores plan groups without matching plan prices", () => {
    const mrr = calculateMrrFromPlanGroups(
      [{ planId: "unknown", count: 3 }],
      [{ id: "essential", priceMonthlyBrl: 49.9 }],
    );

    expect(mrr).toBe(0);
  });

  it("builds plan distribution sorted by count", () => {
    const distribution = buildPlanDistribution(
      [
        { planId: "essential", count: 1 },
        { planId: "growth", count: 3 },
      ],
      [
        { id: "essential", name: "Essential" },
        { id: "growth", name: "Growth" },
      ],
    );

    expect(distribution).toEqual([
      { planId: "growth", planName: "Growth", count: 3 },
      { planId: "essential", planName: "Essential", count: 1 },
    ]);
  });
});
