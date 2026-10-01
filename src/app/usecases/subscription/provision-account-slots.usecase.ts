import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";

export class ProvisionAccountSlotsUseCase {
  constructor(private readonly accountSlotRepository: IAccountSlotRepository) {}

  async execute(userId: string, connectionsLimit: number): Promise<void> {
    const slots = await this.accountSlotRepository.findByUserId(userId);
    const activeSlots = slots.filter(
      (slot) => slot.status === AccountSlotStatusEnum.ACTIVE,
    );

    if (activeSlots.length < connectionsLimit) {
      const toCreate = connectionsLimit - activeSlots.length;
      await this.accountSlotRepository.createMany(
        userId,
        Array.from({ length: toCreate }, () => ({})),
      );
      return;
    }

    if (activeSlots.length > connectionsLimit) {
      const removable = activeSlots
        .filter((slot) => !slot.socialConnectedAccountId)
        .slice(0, activeSlots.length - connectionsLimit);

      for (const slot of removable) {
        await this.accountSlotRepository.deactivate(slot.id);
      }
    }
  }

  async releaseAll(userId: string): Promise<void> {
    const slots = await this.accountSlotRepository.findByUserId(userId);

    for (const slot of slots) {
      await this.accountSlotRepository.deactivate(slot.id);
    }
  }
}
