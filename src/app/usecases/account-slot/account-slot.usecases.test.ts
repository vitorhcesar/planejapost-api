import { describe, expect, it } from "bun:test";
import { ListAccountSlotsUseCase } from "@/app/usecases/account-slot/account-slot.usecases";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import type {
  IAccountSlotRepository,
  IAccountSlotWithAccount,
} from "@/domain/repositories/account-slot.repository";

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

describe("ListAccountSlotsUseCase", () => {
  it("lists account slots for user", async () => {
    const repository = new InMemoryAccountSlotRepository();
    await repository.createMany("user-1", [{}]);
    const useCase = new ListAccountSlotsUseCase(repository);
    const slots = await useCase.execute("user-1");
    expect(slots).toHaveLength(1);
  });
});
