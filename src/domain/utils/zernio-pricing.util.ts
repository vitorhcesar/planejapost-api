export const ZERNIO_MONTHLY_FREE_CREDIT_USD = 12;
export const ZERNIO_ACCOUNT_DAYS_DIVISOR = 30;
export const ZERNIO_MAX_ACCOUNT_DAYS_PER_MONTH = 30;

const ZERNIO_PRICING_BANDS = [
  { upTo: 10, rateUsd: 6 },
  { upTo: 100, rateUsd: 3 },
  { upTo: Number.POSITIVE_INFINITY, rateUsd: 1 },
] as const;

export interface IZernioPricingBreakdown {
  grossUsd: number;
  netUsd: number;
  creditAppliedUsd: number;
}

export interface IZernioAccountBillingInput {
  connectedAt: Date;
}

export interface IZernioCostEstimate {
  connectedAccounts: number;
  accountDaysThisMonth: number;
  projectedAccountDaysThisMonth: number;
  billableUnitsToDate: number;
  projectedBillableUnits: number;
  estimatedCostToDateUsd: number;
  projectedMonthlyCostUsd: number;
  effectiveCostPerAccountUsd: number;
  marginalRatePerAccountUsd: number;
  freeCreditUsd: number;
}

function getUtcMonthStart(referenceDate: Date): Date {
  return new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1),
  );
}

function getUtcMonthEnd(referenceDate: Date): Date {
  return new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth() + 1, 0),
  );
}

function getUtcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function countUtcDaysInclusive(start: Date, end: Date): number {
  const startDay = getUtcDayStart(start).getTime();
  const endDay = getUtcDayStart(end).getTime();

  if (endDay < startDay) {
    return 0;
  }

  return Math.floor((endDay - startDay) / 86_400_000) + 1;
}

function capAccountDays(accountDays: number): number {
  return Math.min(accountDays, ZERNIO_MAX_ACCOUNT_DAYS_PER_MONTH);
}

export function calculateBillableUnits(accountDays: number): number {
  return accountDays / ZERNIO_ACCOUNT_DAYS_DIVISOR;
}

export function calculateGraduatedCostUsd(
  billableUnits: number,
): IZernioPricingBreakdown {
  let remainingUnits = billableUnits;
  let grossUsd = 0;
  let previousCap = 0;

  for (const band of ZERNIO_PRICING_BANDS) {
    const bandCapacity =
      band.upTo === Number.POSITIVE_INFINITY
        ? remainingUnits
        : band.upTo - previousCap;
    const unitsInBand = Math.min(remainingUnits, bandCapacity);
    grossUsd += unitsInBand * band.rateUsd;
    remainingUnits -= unitsInBand;
    previousCap = band.upTo;

    if (remainingUnits <= 0) {
      break;
    }
  }

  const creditAppliedUsd = Math.min(ZERNIO_MONTHLY_FREE_CREDIT_USD, grossUsd);

  return {
    grossUsd,
    netUsd: Math.max(0, grossUsd - ZERNIO_MONTHLY_FREE_CREDIT_USD),
    creditAppliedUsd,
  };
}

export function getMarginalRateUsd(billableUnits: number): number {
  if (billableUnits < 10) {
    return 6;
  }

  if (billableUnits < 100) {
    return 3;
  }

  return 1;
}

function calculateAccountDaysInRange(
  connectedAt: Date,
  rangeStart: Date,
  rangeEnd: Date,
): number {
  const effectiveStart = connectedAt > rangeStart ? connectedAt : rangeStart;

  if (effectiveStart > rangeEnd) {
    return 0;
  }

  return capAccountDays(countUtcDaysInclusive(effectiveStart, rangeEnd));
}

export function estimateZernioCost(
  accounts: IZernioAccountBillingInput[],
  referenceDate = new Date(),
): IZernioCostEstimate {
  const monthStart = getUtcMonthStart(referenceDate);
  const monthEnd = getUtcMonthEnd(referenceDate);
  const today = getUtcDayStart(referenceDate);

  let accountDaysThisMonth = 0;
  let projectedAccountDaysThisMonth = 0;

  for (const account of accounts) {
    accountDaysThisMonth += calculateAccountDaysInRange(
      account.connectedAt,
      monthStart,
      today,
    );
    projectedAccountDaysThisMonth += calculateAccountDaysInRange(
      account.connectedAt,
      monthStart,
      monthEnd,
    );
  }

  const billableUnitsToDate = calculateBillableUnits(accountDaysThisMonth);
  const projectedBillableUnits = calculateBillableUnits(
    projectedAccountDaysThisMonth,
  );
  const costToDate = calculateGraduatedCostUsd(billableUnitsToDate);
  const projectedCost = calculateGraduatedCostUsd(projectedBillableUnits);
  const connectedAccounts = accounts.length;

  return {
    connectedAccounts,
    accountDaysThisMonth,
    projectedAccountDaysThisMonth,
    billableUnitsToDate,
    projectedBillableUnits,
    estimatedCostToDateUsd: costToDate.netUsd,
    projectedMonthlyCostUsd: projectedCost.netUsd,
    effectiveCostPerAccountUsd:
      connectedAccounts > 0
        ? projectedCost.netUsd / connectedAccounts
        : 0,
    marginalRatePerAccountUsd: getMarginalRateUsd(projectedBillableUnits),
    freeCreditUsd: ZERNIO_MONTHLY_FREE_CREDIT_USD,
  };
}
