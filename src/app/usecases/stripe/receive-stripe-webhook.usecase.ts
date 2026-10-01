import { ProcessSubscriptionInvoicePaymentUseCase } from "@/app/usecases/subscription/subscription.usecases";
import type { IStripeWebhookRepository } from "@/domain/repositories/stripe-webhook.repository";
import type { ISubscriptionRepository } from "@/domain/repositories/subscription.repository";
import type { ILogger } from "@/domain/services/logger.service";
import type { IStripeService } from "@/infra/stripe/stripe.client";

const STRIPE_WEBHOOK_SCOPE = "Stripe Webhook";

export class ReceiveStripeWebhookUseCase {
  constructor(
    private readonly stripeWebhookRepository: IStripeWebhookRepository,
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly processInvoicePaymentUseCase: ProcessSubscriptionInvoicePaymentUseCase,
    private readonly stripeService: IStripeService,
    private readonly logger: ILogger,
  ) {}

  async execute(payload: string, signature: string): Promise<void> {
    const event = await this.stripeService.constructWebhookEvent(payload, signature);
    const eventId = String(event.id ?? "");
    const eventType = String(event.type ?? "");

    if (!eventId) {
      return;
    }

    const existing = await this.stripeWebhookRepository.findByEventId(eventId);

    if (existing) {
      return;
    }

    await this.stripeWebhookRepository.save({
      eventId,
      eventType,
      payload: event,
    });

    this.logger.info(STRIPE_WEBHOOK_SCOPE, "Webhook recebido", {
      eventId,
      eventType,
    });

    if (
      eventType !== "checkout.session.completed" &&
      eventType !== "payment_intent.succeeded"
    ) {
      return;
    }

    const invoiceId = this.extractInvoiceId(event);

    if (!invoiceId) {
      return;
    }

    try {
      await this.processInvoicePaymentUseCase.execute(invoiceId);
    } catch (error) {
      this.logger.error(
        STRIPE_WEBHOOK_SCOPE,
        "Falha ao processar pagamento Stripe",
        error,
        { eventId, invoiceId },
      );
    }
  }

  private extractInvoiceId(event: Record<string, unknown>): string | null {
    const data = event.data as { object?: Record<string, unknown> } | undefined;
    const object = data?.object;

    if (!object) {
      return null;
    }

    const metadata = object.metadata as Record<string, unknown> | undefined;
    const metadataInvoiceId = metadata?.subscriptionInvoiceId;

    if (typeof metadataInvoiceId === "string") {
      return metadataInvoiceId;
    }

    const sessionId =
      typeof object.id === "string" ? object.id : undefined;

    if (!sessionId) {
      return null;
    }

    return null;
  }
}
