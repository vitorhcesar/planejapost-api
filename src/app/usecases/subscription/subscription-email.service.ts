import type { IEmailService } from "@/domain/services/email.service";

export class SubscriptionEmailService {
  constructor(private readonly emailService: IEmailService) {}

  async sendRenewalReminder(input: {
    to: string;
    planName: string;
    amount: number;
    dueAt: Date;
    daysBeforeDue: number;
  }): Promise<void> {
    const dueDate = input.dueAt.toLocaleDateString("pt-BR");

    await this.emailService.sendEmail({
      to: input.to,
      subject: `Sua assinatura ${input.planName} vence em ${input.daysBeforeDue} dias`,
      text: `Olá! Sua assinatura ${input.planName} (R$ ${input.amount.toFixed(2)}) vence em ${dueDate}. Acesse o PlanejaPost para pagar.`,
      html: `<p>Olá!</p><p>Sua assinatura <strong>${input.planName}</strong> (R$ ${input.amount.toFixed(2)}) vence em <strong>${dueDate}</strong>.</p><p><a href="/subscription/billing">Pagar agora</a></p>`,
    });
  }

  async sendPastDueNotice(input: {
    to: string;
    planName: string;
    gracePeriodDays: number;
  }): Promise<void> {
    await this.emailService.sendEmail({
      to: input.to,
      subject: `Pagamento em atraso — ${input.planName}`,
      text: `Sua assinatura ${input.planName} está em atraso. Você tem ${input.gracePeriodDays} dias de tolerância antes da suspensão.`,
      html: `<p>Sua assinatura <strong>${input.planName}</strong> está em atraso.</p><p>Você tem <strong>${input.gracePeriodDays} dias</strong> de tolerância.</p><p><a href="/subscription/billing">Regularizar pagamento</a></p>`,
    });
  }

  async sendExpiredNotice(input: {
    to: string;
    planName: string;
  }): Promise<void> {
    await this.emailService.sendEmail({
      to: input.to,
      subject: `Assinatura cancelada — ${input.planName}`,
      text: `Sua assinatura ${input.planName} foi cancelada por falta de pagamento. Todas as contas sociais foram desconectadas.`,
      html: `<p>Sua assinatura <strong>${input.planName}</strong> foi cancelada por falta de pagamento.</p><p>Todas as contas sociais foram desconectadas.</p><p><a href="/pricing">Reassinar</a></p>`,
    });
  }

  async sendActivatedNotice(input: {
    to: string;
    planName: string;
  }): Promise<void> {
    await this.emailService.sendEmail({
      to: input.to,
      subject: `Assinatura ativada — ${input.planName}`,
      text: `Sua assinatura ${input.planName} foi ativada com sucesso!`,
      html: `<p>Sua assinatura <strong>${input.planName}</strong> foi ativada com sucesso!</p>`,
    });
  }
}
