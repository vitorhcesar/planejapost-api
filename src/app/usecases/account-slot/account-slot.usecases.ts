import type { IAccountSlotDto } from "@/app/usecases/account-slot/dto/account-slot.dto";
import { mapAccountSlotToDto } from "@/app/usecases/account-slot/map-account-slot-to-dto.util";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";

export class ListAccountSlotsUseCase {
  constructor(private readonly accountSlotRepository: IAccountSlotRepository) {}

  async execute(userId: string): Promise<IAccountSlotDto[]> {
    const slots = await this.accountSlotRepository.findByUserId(userId);
    return slots.map(mapAccountSlotToDto);
  }
}
