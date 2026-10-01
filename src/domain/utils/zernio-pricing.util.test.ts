import { describe, expect, it } from "bun:test";
import {
  calculateBillableUnits,
  calculateGraduatedCostUsd,
  estimateZernioCost,
  getMarginalRateUsd,
} from "@/domain/utils/zernio-pricing.util";

describe("zernio-pricing.util", () => {
  it("calculates billable units from account-days", () => {
    expect(calculateBillableUnits(314)).toBeCloseTo(10.4667, 4);
  });

  it("applies the graduated ladder and free credit from the docs example", () => {
    const result = calculateGraduatedCostUsd(10.467);

    expect(result.grossUsd).toBeCloseTo(61.4, 1);
    expect(result.netUsd).toBeCloseTo(49.4, 1);
    expect(result.creditAppliedUsd).toBe(12);
  });

  it("returns the marginal rate for the current ladder band", () => {
    expect(getMarginalRateUsd(9)).toBe(6);
    expect(getMarginalRateUsd(10.5)).toBe(3);
    expect(getMarginalRateUsd(120)).toBe(1);
  });

  it("estimates monthly Zernio cost from connected accounts", () => {
    const referenceDate = new Date("2026-10-15T12:00:00.000Z");
    const monthStart = new Date("2026-10-01T00:00:00.000Z");

    const estimate = estimateZernioCost(
      [
        { connectedAt: monthStart },
        { connectedAt: monthStart },
      ],
      referenceDate,
    );

    expect(estimate.connectedAccounts).toBe(2);
    expect(estimate.accountDaysThisMonth).toBe(30);
    expect(estimate.projectedAccountDaysThisMonth).toBe(60);
    expect(estimate.projectedBillableUnits).toBe(2);
    expect(estimate.projectedMonthlyCostUsd).toBe(0);
    expect(estimate.marginalRatePerAccountUsd).toBe(6);
  });
});
