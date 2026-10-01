import { describe, expect, it, mock } from "bun:test";
import { AdminDeleteInvoiceUseCase } from "@/app/usecases/admin/admin-subscription.usecases";
import { SubscriptionInvoiceStatusEnum } from "@/domain/enums/subscription.enum";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";

describe("AdminDeleteInvoiceUseCase", () => {
  it("deletes unpaid invoices", async () => {
    const deleteInvoice = mock(async () => undefined);
    const repository = {
      findInvoiceById: async () => ({
        id: "invoice-1",
        subscriptionId: "sub-1",
        status: SubscriptionInvoiceStatusEnum.OPEN,
      }),
      findById: async () => ({
        id: "sub-1",
        userId: "user-1",
      }),
      deleteInvoice,
    } as unknown as ISubscriptionRepository;

    const useCase = new AdminDeleteInvoiceUseCase(repository);
    await useCase.execute({ invoiceId: "invoice-1" });

    expect(deleteInvoice).toHaveBeenCalledWith("invoice-1");
  });

  it("rejects deleting paid invoices", async () => {
    const repository = {
      findInvoiceById: async () => ({
        id: "invoice-1",
        subscriptionId: "sub-1",
        status: SubscriptionInvoiceStatusEnum.PAID,
      }),
      findById: async () => ({
        id: "sub-1",
        userId: "user-1",
      }),
      deleteInvoice: async () => undefined,
    } as unknown as ISubscriptionRepository;

    const useCase = new AdminDeleteInvoiceUseCase(repository);

    await expect(useCase.execute({ invoiceId: "invoice-1" })).rejects.toThrow(
      "Não é possível excluir faturas pagas",
    );
  });

  it("validates invoice ownership by user", async () => {
    const repository = {
      findInvoiceById: async () => ({
        id: "invoice-1",
        subscriptionId: "sub-1",
        status: SubscriptionInvoiceStatusEnum.OPEN,
      }),
      findById: async () => ({
        id: "sub-1",
        userId: "user-2",
      }),
      deleteInvoice: async () => undefined,
    } as unknown as ISubscriptionRepository;

    const useCase = new AdminDeleteInvoiceUseCase(repository);

    await expect(
      useCase.execute({ invoiceId: "invoice-1", userId: "user-1" }),
    ).rejects.toThrow("Fatura não encontrada");
  });
});
