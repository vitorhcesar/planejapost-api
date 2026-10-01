import type { IOasyfyPixTestPaymentDto } from "@/app/usecases/admin/dto/oasyfy-pix-test.dto";
import {
  OASYFY_PIX_SMOKE_TEST_AMOUNT_BRL,
  OASYFY_PIX_TEST_METADATA_TYPE,
} from "@/domain/constants/oasyfy-pix-test.constant";
import type { IOasyfyService } from "@/domain/acquirer/oasyfy.service";
import type { IPublicApiConfig } from "@/domain/config/public-api.config";
import { OasyfyPixTestStatusEnum } from "@/domain/enums/oasyfy-pix-test.enum";
import { AppError } from "@/domain/errors/app.error";
import type { IBillingSettingsRepository } from "@/domain/repositories/billing-settings.repository";
import type { IOasyfyPixTestRepository } from "@/domain/repositories/oasyfy-pix-test.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";

const PIX_EXPIRATION_HOURS = 24;

function toDto(payment: {
  id: string;
  amount: number;
  status: string;
  pixCode: string | null;
  pixImageUrl: string | null;
  pixExpiresAt: Date | null;
  paidAt: Date | null;
  oasyfyTransactionId: string | null;
  webhookEventId: string | null;
  createdAt: Date;
}): IOasyfyPixTestPaymentDto {
  return {
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    pixCode: payment.pixCode,
    pixImageUrl: payment.pixImageUrl,
    expiresAt: payment.pixExpiresAt?.toISOString() ?? null,
    paidAt: payment.paidAt?.toISOString() ?? null,
    oasyfyTransactionId: payment.oasyfyTransactionId,
    webhookReceived: Boolean(payment.webhookEventId),
    createdAt: payment.createdAt.toISOString(),
  };
}

export class CreateOasyfyPixSmokeTestUseCase {
  constructor(
    private readonly oasyfyPixTestRepository: IOasyfyPixTestRepository,
    private readonly billingSettingsRepository: IBillingSettingsRepository,
    private readonly userRepository: IUserRepository,
    private readonly oasyfyService: IOasyfyService,
    private readonly publicApiConfig: IPublicApiConfig,
  ) {}

  async execute(input: {
    userId: string;
    client: { phone: string; document: string };
  }): Promise<IOasyfyPixTestPaymentDto> {
    const settings = await this.billingSettingsRepository.getOrCreate();

    if (!settings.pixPaymentsEnabled) {
      throw new AppError("Pagamento PIX desabilitado", 400, "payment_method_disabled");
    }

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    const testPayment = await this.oasyfyPixTestRepository.create({
      createdByUserId: input.userId,
      amount: OASYFY_PIX_SMOKE_TEST_AMOUNT_BRL,
    });

    try {
      const identifier = `pix_test_${testPayment.id.replace(/-/g, "")}`;
      const pixResult = await this.oasyfyService.receivePix({
        identifier,
        amount: OASYFY_PIX_SMOKE_TEST_AMOUNT_BRL,
        client: {
          name: user.name,
          email: user.email,
          phone: input.client.phone,
          document: input.client.document,
        },
        metadata: {
          type: OASYFY_PIX_TEST_METADATA_TYPE,
          pixTestId: testPayment.id,
          userId: input.userId,
        },
        callbackUrl: `${this.publicApiConfig.publicApiUrl}/api/v1/webhooks/oasyfy`,
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + PIX_EXPIRATION_HOURS);

      const updated = await this.oasyfyPixTestRepository.updateAfterPixCreation(
        testPayment.id,
        {
          oasyfyTransactionId: pixResult.transactionId,
          pixCode: pixResult.pix.code,
          pixImageUrl: pixResult.pix.image ?? null,
          pixExpiresAt: expiresAt,
          status: OasyfyPixTestStatusEnum.PENDING,
        },
      );

      return toDto(updated);
    } catch (error) {
      await this.oasyfyPixTestRepository.markFailed(testPayment.id);
      throw error;
    }
  }
}

export class GetOasyfyPixSmokeTestUseCase {
  constructor(private readonly oasyfyPixTestRepository: IOasyfyPixTestRepository) {}

  async execute(testId: string): Promise<IOasyfyPixTestPaymentDto> {
    const payment = await this.oasyfyPixTestRepository.findById(testId);

    if (!payment) {
      throw new AppError("Teste PIX não encontrado", 404, "pix_test_not_found");
    }

    return toDto(payment);
  }
}

export class ProcessOasyfyPixSmokeTestPaymentUseCase {
  constructor(private readonly oasyfyPixTestRepository: IOasyfyPixTestRepository) {}

  async execute(input: {
    testId: string;
    webhookEventId?: string;
  }): Promise<void> {
    const payment = await this.oasyfyPixTestRepository.findById(input.testId);

    if (!payment || payment.status === OasyfyPixTestStatusEnum.PAID) {
      return;
    }

    await this.oasyfyPixTestRepository.markPaid(payment.id, {
      webhookEventId: input.webhookEventId,
    });
  }
}
