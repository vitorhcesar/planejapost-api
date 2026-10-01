import { describe, expect, it } from "bun:test";
import { ListAccountSlotsUseCase } from "@/app/usecases/account-slot/account-slot.usecases";
import { ProvisionAccountSlotsUseCase } from "@/app/usecases/subscription/provision-account-slots.usecase";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import { SubscriptionStatusEnum } from "@/domain/enums/subscription.enum";
import type {
  IAccountSlotRepository,
  IAccountSlotWithAccount,
} from "@/domain/repositories/account-slot.repository";
import type {
  ISubscriptionRepository,
  ISubscriptionWithPlan,
} from "@/domain/repositories/subscription.repository";

class InMemoryAccountSlotRepository implements IAccountSlotRepository {
  slots: IAccountSlotWithAccount[] = [];

  async findByIdAndUserId(id: string, userId: string) {
    return this.slots.find((slot) => slot.id === id && slot.userId === userId) ?? null;
  }

  async findByUserId(userId: string) {
    return this.slots.filter((slot) => slot.userId === userId);
  }

  async findBySocialConnectedAccountId() {
    return null;
  }

  async createMany(userId: string, slots: Array<Record<string, never>>) {
    const created = slots.map((_, index) => ({
      id: `slot-${this.slots.length + index + 1}`,
      userId,
      socialConnectedAccountId: null,
      status: AccountSlotStatusEnum.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      socialAccount: null,
    }));
    this.slots.push(...created);
    return created;
  }

  async assignAccount(slotId: string, accountId: string) {
    const slot = this.slots.find((item) => item.id === slotId);
    if (!slot) throw new Error("Slot not found");
    slot.socialConnectedAccountId = accountId;
    return slot;
  }

  async releaseAccount() {}

  async deactivate(slotId: string) {
    const slot = this.slots.find((item) => item.id === slotId);
    if (slot) slot.status = AccountSlotStatusEnum.EXPIRED;
  }

  async findAvailableSlot(userId: string) {
    return (
      this.slots.find(
        (slot) =>
          slot.userId === userId &&
          slot.status === AccountSlotStatusEnum.ACTIVE &&
          !slot.socialConnectedAccountId,
      ) ?? null
    );
  }
}

class InMemorySubscriptionRepository implements Partial<ISubscriptionRepository> {
  subscription: ISubscriptionWithPlan | null = null;

  async findByUserId(userId: string) {
    if (!this.subscription || this.subscription.userId !== userId) {
      return null;
    }

    return this.subscription;
  }
}

function createSubscription(userId: string, connectionsLimit: number): ISubscriptionWithPlan {
  return {
    id: "sub-1",
    userId,
    planId: "momentum",
    status: SubscriptionStatusEnum.TRIAL,
    preferredPaymentMethod: null,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    dueAt: new Date(),
    gracePeriodEndsAt: null,
    cancelAtPeriodEnd: false,
    scheduledPlanId: null,
    stripeCustomerId: null,
    trialEndsAt: new Date(),
    trialGrantedAt: new Date(),
    trialGrantedByUserId: "admin-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    plan: {
      id: "momentum",
      name: "Impulso",
      priceMonthlyBrl: 99,
      connectionsLimit,
      postsPerMonthLimit: 1000,
      features: {},
    },
  };
}

describe("ListAccountSlotsUseCase", () => {
  it("lists only active account slots for user", async () => {
    const repository = new InMemoryAccountSlotRepository();
    await repository.createMany("user-1", [{}]);
    repository.slots.push({
      id: "slot-expired",
      userId: "user-1",
      socialConnectedAccountId: null,
      status: AccountSlotStatusEnum.EXPIRED,
      createdAt: new Date(),
      updatedAt: new Date(),
      socialAccount: null,
    });

    const subscriptionRepository = new InMemorySubscriptionRepository();
    const provisionAccountSlots = new ProvisionAccountSlotsUseCase(repository);
    const useCase = new ListAccountSlotsUseCase(
      repository,
      subscriptionRepository as unknown as ISubscriptionRepository,
      provisionAccountSlots,
    );

    const slots = await useCase.execute("user-1");

    expect(slots).toHaveLength(1);
    expect(slots[0]?.status).toBe(AccountSlotStatusEnum.ACTIVE);
  });

  it("syncs slots with subscription connections limit", async () => {
    const repository = new InMemoryAccountSlotRepository();
    await repository.createMany("user-1", [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]);

    const subscriptionRepository = new InMemorySubscriptionRepository();
    subscriptionRepository.subscription = createSubscription("user-1", 5);

    const provisionAccountSlots = new ProvisionAccountSlotsUseCase(repository);
    const useCase = new ListAccountSlotsUseCase(
      repository,
      subscriptionRepository as unknown as ISubscriptionRepository,
      provisionAccountSlots,
    );

    const slots = await useCase.execute("user-1");

    expect(slots).toHaveLength(5);
  });
});
