import { AppError } from "@/domain/errors/app.error";
import type { IOmegaPayWebhookRepository } from "@/domain/repositories/omegapay-webhook.repository";
import type { IAdminOmegaPayWebhookDetailsDto } from "@/app/usecases/admin/dto/admin-omegapay-webhook.dto";

export class GetAdminOmegaPayWebhookDetailsUseCase {
  constructor(
    private readonly omegaPayWebhookRepository: IOmegaPayWebhookRepository,
  ) {}

  async execute(webhookId: string): Promise<IAdminOmegaPayWebhookDetailsDto> {
    const webhook = await this.omegaPayWebhookRepository.findById(webhookId);

    if (!webhook) {
      throw new AppError("Webhook não encontrado", 404, "webhook_not_found");
    }

    return {
      id: webhook.id,
      event: webhook.event,
      token: webhook.token,
      receivedAt: webhook.receivedAt.toISOString(),
      payload: webhook.payload,
    };
  }
}
