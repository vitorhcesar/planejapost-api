export interface IMonthlyBillingCycle {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  dueAt: Date;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function buildMonthlyBillingCycle(
  startAt: Date = new Date(),
): IMonthlyBillingCycle {
  const currentPeriodStart = new Date(startAt);
  const currentPeriodEnd = addMonths(currentPeriodStart, 1);
  const dueAt = new Date(currentPeriodEnd);

  return {
    currentPeriodStart,
    currentPeriodEnd,
    dueAt,
  };
}

export function syncTrialBillingDates(input: {
  dueAt?: Date;
  currentPeriodEnd?: Date;
}): {
  dueAt?: Date;
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
} {
  const dueAt = input.dueAt ?? input.currentPeriodEnd;

  if (!dueAt) {
    return input;
  }

  return {
    dueAt,
    currentPeriodEnd: dueAt,
    trialEndsAt: dueAt,
  };
}
