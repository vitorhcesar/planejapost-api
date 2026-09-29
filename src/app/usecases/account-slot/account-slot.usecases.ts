import { AppError } from "@/domain/errors/app.error";
import {
  addSlotDuration,
  calculateSlotPurchaseTotal,
  getSlotPricingCatalog,
} from "@/domain/constants/account-slot-pricing.util";
import {
  AccountSlotStatusEnum,
  isSlotComboQuantity,
  SLOT_PRICE_BRL,
  type SlotComboQuantity,
} from "@/domain/enums/account-slot.enum";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { IWalletRepository } from "@/domain/repositories/wallet.repository";
import { WalletTransactionTypeEnum } from "@/domain/enums/wallet.enum";
import type {
  IAccountSlotDto,
  IAccountSlotPricingDto,
  IPurchaseAccountSlotsResultDto,
  IRenewAccountSlotResultDto,
} from "@/app/usecases/account-slot/dto/account-slot.dto";
import { mapAccountSlotToDto } from "@/app/usecases/account-slot/map-account-slot-to-dto.util";

export class GetAccountSlotPricingUseCase {
  execute(): IAccountSlotPricingDto {
    return getSlotPricingCatalog();
  }
}

export class ListAccountSlotsUseCase {
  constructor(private readonly accountSlotRepository: IAccountSlotRepository) {}

  async execute(userId: string): Promise<IAccountSlotDto[]> {
    await this.accountSlotRepository.expireOverdueSlots(userId);
    const slots = await this.accountSlotRepository.findByUserId(userId);
    return slots.map(mapAccountSlotToDto);
  }
}

export class PurchaseAccountSlotsUseCase {
  constructor(
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(input: {
    userId: string;
    quantity?: number;
    combo?: SlotComboQuantity;
  }): Promise<IPurchaseAccountSlotsResultDto> {
    if (input.quantity !== undefined && input.combo !== undefined) {
      throw new AppError(
        "Informe apenas quantidade ou combo, não ambos",
        400,
        "slot_purchase_invalid_input",
      );
    }

    if (input.quantity === undefined && input.combo === undefined) {
      throw new AppError(
        "Informe a quantidade de slots ou um combo",
        400,
        "slot_purchase_missing_input",
      );
    }

    if (input.combo !== undefined && !isSlotComboQuantity(input.combo)) {
      throw new AppError("Combo inválido", 400, "slot_purchase_invalid_combo");
    }

    let pricing: ReturnType<typeof calculateSlotPurchaseTotal>;

    try {
      pricing = calculateSlotPurchaseTotal({
        quantity: input.quantity,
        combo: input.combo,
      });
    } catch {
      throw new AppError(
        "Quantidade de slots inválida",
        400,
        "slot_purchase_invalid_quantity",
      );
    }

    const wallet = await this.walletRepository.getOrCreateByUserId(input.userId);
    const referenceKey = `slot-purchase:${input.userId}:${crypto.randomUUID()}`;

    const updatedWallet = await this.walletRepository.debitWallet({
      walletId: wallet.id,
      amount: pricing.total,
      type: WalletTransactionTypeEnum.DEBIT,
      description: pricing.hasDiscount
        ? `Compra de combo de ${pricing.quantity} slots`
        : `Compra de ${pricing.quantity} slot(s)`,
      referenceKey,
      metadata: {
        quantity: pricing.quantity,
        unitPrice: pricing.unitPrice,
        hasDiscount: pricing.hasDiscount,
        combo: input.combo ?? null,
      },
    });

    const expiresAt = addSlotDuration();
    const createdSlots = await this.accountSlotRepository.createMany(
      input.userId,
      Array.from({ length: pricing.quantity }, () => ({ expiresAt })),
    );

    const allSlots = await this.accountSlotRepository.findByUserId(input.userId);
    const createdIds = new Set(createdSlots.map((slot) => slot.id));
    const newSlots = allSlots
      .filter((slot) => createdIds.has(slot.id))
      .map(mapAccountSlotToDto);

    return {
      slots: newSlots,
      totalCharged: pricing.total,
      newBalance: updatedWallet.balance,
    };
  }
}

export class RenewAccountSlotUseCase {
  constructor(
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly walletRepository: IWalletRepository,
  ) {}

  async execute(userId: string, slotId: string): Promise<IRenewAccountSlotResultDto> {
    await this.accountSlotRepository.expireOverdueSlots(userId);

    const slot = await this.accountSlotRepository.findByIdAndUserId(slotId, userId);

    if (!slot) {
      throw new AppError("Slot não encontrado", 404, "account_slot_not_found");
    }

    const isExpired =
      slot.status === AccountSlotStatusEnum.EXPIRED ||
      slot.expiresAt.getTime() < Date.now();

    if (!isExpired) {
      throw new AppError(
        "Este slot ainda está ativo e não precisa de renovação",
        400,
        "account_slot_not_expired",
      );
    }

    const wallet = await this.walletRepository.getOrCreateByUserId(userId);
    const referenceKey = `slot-renew:${slotId}:${crypto.randomUUID()}`;

    const updatedWallet = await this.walletRepository.debitWallet({
      walletId: wallet.id,
      amount: SLOT_PRICE_BRL,
      type: WalletTransactionTypeEnum.DEBIT,
      description: "Renovação de slot de conta Instagram",
      referenceKey,
      metadata: { slotId },
    });

    const renewedSlot = await this.accountSlotRepository.renew(
      slotId,
      addSlotDuration(),
    );

    const slots = await this.accountSlotRepository.findByUserId(userId);
    const slotWithAccount = slots.find((item) => item.id === renewedSlot.id);

    if (!slotWithAccount) {
      throw new AppError("Slot não encontrado", 404, "account_slot_not_found");
    }

    return {
      slot: mapAccountSlotToDto(slotWithAccount),
      totalCharged: SLOT_PRICE_BRL,
      newBalance: updatedWallet.balance,
    };
  }
}
