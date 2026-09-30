import { z } from "zod";
import {
  isSlotComboQuantity,
  type SlotComboQuantity,
} from "@/domain/enums/account-slot.enum";

const slotComboSchema = z.custom<SlotComboQuantity>(
  (value) => typeof value === "number" && isSlotComboQuantity(value),
  { message: "Combo inválido" },
);

export const purchaseAccountSlotsBodySchema = z
  .object({
    quantity: z.number().int().min(1).optional(),
    combo: slotComboSchema.optional(),
  })
  .refine(
    (data) =>
      (data.quantity !== undefined && data.combo === undefined) ||
      (data.combo !== undefined && data.quantity === undefined),
    { message: "Informe quantity ou combo" },
  );

