import { OasyfyPixTestStatusEnum } from "@/domain/enums/oasyfy-pix-test.enum";
import type {
  ICreateOasyfyPixTestPaymentInput,
  IOasyfyPixTestPayment,
  IOasyfyPixTestRepository,
  IUpdateOasyfyPixTestAfterPixCreationInput,
} from "@/domain/repositories/oasyfy-pix-test.repository";
import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";

function mapRow(row: {
  id: string;
  createdByUserId: string;
  amount: { toNumber?: () => number } | number | string;
  status: string;
  oasyfyTransactionId: string | null;
  pixCode: string | null;
  pixImageUrl: string | null;
  pixExpiresAt: Date | null;
  paidAt: Date | null;
  webhookEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): IOasyfyPixTestPayment {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    amount: Number(row.amount),
    status: row.status as OasyfyPixTestStatusEnum,
    oasyfyTransactionId: row.oasyfyTransactionId,
    pixCode: row.pixCode,
    pixImageUrl: row.pixImageUrl,
    pixExpiresAt: row.pixExpiresAt,
    paidAt: row.paidAt,
    webhookEventId: row.webhookEventId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaOasyfyPixTestRepository
  extends BasePrismaRepository
  implements IOasyfyPixTestRepository
{
  async create(input: ICreateOasyfyPixTestPaymentInput): Promise<IOasyfyPixTestPayment> {
    const row = await this.getPrismaClient().oasyfyPixTestPayment.create({
      data: {
        createdByUserId: input.createdByUserId,
        amount: input.amount,
        status: OasyfyPixTestStatusEnum.PENDING,
      },
    });

    return mapRow(row);
  }

  async findById(id: string): Promise<IOasyfyPixTestPayment | null> {
    const row = await this.getPrismaClient().oasyfyPixTestPayment.findUnique({
      where: { id },
    });

    return row ? mapRow(row) : null;
  }

  async findByOasyfyTransactionId(
    transactionId: string,
  ): Promise<IOasyfyPixTestPayment | null> {
    const row = await this.getPrismaClient().oasyfyPixTestPayment.findFirst({
      where: { oasyfyTransactionId: transactionId },
    });

    return row ? mapRow(row) : null;
  }

  async updateAfterPixCreation(
    id: string,
    input: IUpdateOasyfyPixTestAfterPixCreationInput,
  ): Promise<IOasyfyPixTestPayment> {
    const row = await this.getPrismaClient().oasyfyPixTestPayment.update({
      where: { id },
      data: input,
    });

    return mapRow(row);
  }

  async markPaid(
    id: string,
    input?: { webhookEventId?: string },
  ): Promise<IOasyfyPixTestPayment> {
    const row = await this.getPrismaClient().oasyfyPixTestPayment.update({
      where: { id },
      data: {
        status: OasyfyPixTestStatusEnum.PAID,
        paidAt: new Date(),
        webhookEventId: input?.webhookEventId ?? null,
      },
    });

    return mapRow(row);
  }

  async markFailed(id: string): Promise<IOasyfyPixTestPayment> {
    const row = await this.getPrismaClient().oasyfyPixTestPayment.update({
      where: { id },
      data: {
        status: OasyfyPixTestStatusEnum.FAILED,
      },
    });

    return mapRow(row);
  }
}
