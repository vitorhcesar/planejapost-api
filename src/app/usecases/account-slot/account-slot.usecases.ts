import type { IAccountSlotDto } from "@/app/usecases/account-slot/dto/account-slot.dto";
import { mapAccountSlotToDto } from "@/app/usecases/account-slot/map-account-slot-to-dto.util";
import { ProvisionAccountSlotsUseCase } from "@/app/usecases/subscription/provision-account-slots.usecase";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/domain/enums/subscription.enum";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";

export class ListAccountSlotsUseCase {
  constructor(
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly provisionAccountSlotsUseCase: ProvisionAccountSlotsUseCase,
  ) {}

  async execute(userId: string): Promise<IAccountSlotDto[]> {
    const subscription = await this.subscriptionRepository.findByUserId(userId);

    if (subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      await this.provisionAccountSlotsUseCase.execute(
        userId,
        subscription.plan.connectionsLimit,
      );
    }

    const slots = await this.accountSlotRepository.findByUserId(userId);

    return slots
      .filter((slot) => slot.status === AccountSlotStatusEnum.ACTIVE)
      .map(mapAccountSlotToDto);
  }
}
