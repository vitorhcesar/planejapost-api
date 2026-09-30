import type {
  ISocialConnectSessionDto,
  ISocialConnectedAccountDto,
  ISocialSelectionOptionDto,
} from "@/app/usecases/social/dto/social.dto";
import { mapSocialConnectedAccountToDto } from "@/app/usecases/social/map-social-connected-account-to-dto.util";
import { EnsureZernioProfileUseCase } from "@/app/usecases/zernio/ensure-zernio-profile.usecase";
import { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import { SocialConnectSession } from "@/domain/entities/social-connect-session.entity";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import { ConnectModeEnum } from "@/domain/enums/connect-mode.enum";
import {
  HEADLESS_SOCIAL_PLATFORMS,
  SocialPlatformEnum,
  isSocialPlatform,
} from "@/domain/enums/social-platform.enum";
import { AppError } from "@/domain/errors/app.error";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type { ISocialConnectSessionRepository } from "@/domain/repositories/social-connect-session.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IZernioAccountService } from "@/domain/zernio/zernio-account.service";
import type { IZernioConnectService } from "@/domain/zernio/zernio-connect.service";
import { randomBytes } from "node:crypto";

export class CreateSocialConnectSessionUseCase {
  constructor(
    private readonly ensureZernioProfileUseCase: EnsureZernioProfileUseCase,
    private readonly socialConnectSessionRepository: ISocialConnectSessionRepository,
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly zernioConnectService: IZernioConnectService,
    private readonly frontendOrigin: string,
  ) {}

  async execute(input: {
    userId: string;
    slotId: string;
    platform: string;
    loginMethod?: string;
  }): Promise<ISocialConnectSessionDto> {
    if (!isSocialPlatform(input.platform)) {
      throw new AppError("Plataforma não suportada", 400, "unsupported_platform");
    }

    await this.accountSlotRepository.expireOverdueSlots(input.userId);

    const slot = await this.accountSlotRepository.findByIdAndUserId(
      input.slotId,
      input.userId,
    );

    if (!slot) {
      throw new AppError("Slot não encontrado", 404, "account_slot_not_found");
    }

    const isExpired =
      slot.status === AccountSlotStatusEnum.EXPIRED ||
      slot.expiresAt.getTime() < Date.now();

    if (isExpired) {
      throw new AppError(
        "Este slot está vencido. Renove-o antes de conectar uma conta.",
        400,
        "account_slot_expired",
      );
    }

    if (slot.socialConnectedAccountId) {
      throw new AppError(
        "Este slot já possui uma conta conectada",
        400,
        "account_slot_occupied",
      );
    }

    const zernioProfileId = await this.ensureZernioProfileUseCase.execute(
      input.userId,
    );

    const mode = HEADLESS_SOCIAL_PLATFORMS.has(input.platform)
      ? ConnectModeEnum.HEADLESS
      : ConnectModeEnum.STANDARD;
    const state = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const session = SocialConnectSession.create({
      userId: input.userId,
      accountSlotId: slot.id,
      platform: input.platform,
      zernioProfileId,
      mode,
      state,
      expiresAt,
    });

    const savedSession =
      await this.socialConnectSessionRepository.create(session);

    const redirectUrl = `${this.frontendOrigin}/social/connect/callback?connectSessionId=${encodeURIComponent(savedSession.id)}`;

    const connectUrl = await this.zernioConnectService.getConnectUrl({
      platform: input.platform,
      profileId: zernioProfileId,
      redirectUrl,
      scopes: "posting",
      headless: mode === ConnectModeEnum.HEADLESS,
      loginMethod: input.loginMethod,
    });

    return {
      sessionId: savedSession.id,
      authorizationUrl: connectUrl.authUrl,
      state,
      expiresAt: expiresAt.toISOString(),
    };
  }
}

export class CompleteSocialConnectUseCase {
  constructor(
    private readonly socialConnectSessionRepository: ISocialConnectSessionRepository,
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly zernioAccountService: IZernioAccountService,
    private readonly zernioConnectService: IZernioConnectService,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    accountId?: string;
    username?: string;
    tempToken?: string;
    connectToken?: string;
    step?: string;
    selectionPayload?: Record<string, unknown>;
  }): Promise<ISocialConnectedAccountDto> {
    const session = await this.socialConnectSessionRepository.findByIdAndUserId(
      input.sessionId,
      input.userId,
    );

    if (!session) {
      throw new AppError("Sessão de conexão não encontrada", 404, "connect_session_not_found");
    }

    if (session.isExpired()) {
      throw new AppError("Sessão de conexão expirada", 400, "connect_session_expired");
    }

    await this.accountSlotRepository.expireOverdueSlots(input.userId);

    const slot = await this.accountSlotRepository.findByIdAndUserId(
      session.accountSlotId,
      input.userId,
    );

    if (!slot) {
      throw new AppError("Slot não encontrado", 404, "account_slot_not_found");
    }

    if (session.isCompleted()) {
      if (!slot.socialConnectedAccountId) {
        throw new AppError(
          "Sessão de conexão já concluída",
          400,
          "connect_session_completed",
        );
      }

      const existingConnectedAccount =
        await this.socialConnectedAccountRepository.findByIdAndUserId(
          slot.socialConnectedAccountId,
          input.userId,
        );

      if (!existingConnectedAccount) {
        throw new AppError(
          "Sessão de conexão já concluída",
          400,
          "connect_session_completed",
        );
      }

      return mapSocialConnectedAccountToDto(
        existingConnectedAccount,
        this.accountSlotRepository,
      );
    }

    if (slot.socialConnectedAccountId) {
      throw new AppError(
        "Este slot já possui uma conta conectada",
        400,
        "account_slot_occupied",
      );
    }

    let zernioAccountId = input.accountId;
    let username = input.username;

    if (session.mode === ConnectModeEnum.HEADLESS && input.selectionPayload) {
      const selected = await this.completeHeadlessSelection(session, input);
      zernioAccountId = selected.accountId;
      username = selected.username;
    }

    if (!zernioAccountId || !username) {
      throw new AppError(
        "Dados de conexão incompletos",
        400,
        "connect_completion_invalid",
      );
    }

    if (input.tempToken || input.connectToken || input.step) {
      session.updateHeadlessState({
        tempToken: input.tempToken ?? session.tempToken,
        connectToken: input.connectToken ?? session.connectToken,
        step: input.step ?? session.step,
      });
      await this.socialConnectSessionRepository.save(session);
    }

    const zernioAccounts = await this.zernioAccountService.listAccounts(
      session.zernioProfileId,
    );
    const zernioAccount = zernioAccounts.find(
      (account) => account.accountId === zernioAccountId,
    );

    if (!zernioAccount) {
      throw new AppError(
        "Conta não encontrada no perfil Zernio",
        400,
        "invalid_social_account",
      );
    }

    const health = await this.zernioAccountService.getAccountHealth(zernioAccountId);

    const existingAccount =
      await this.socialConnectedAccountRepository.findByUserIdAndZernioAccountId(
        input.userId,
        zernioAccountId,
      );

    const existingAccountSlot = existingAccount
      ? await this.accountSlotRepository.findBySocialConnectedAccountId(
          existingAccount.id,
        )
      : null;

    if (
      existingAccount &&
      existingAccountSlot &&
      existingAccountSlot.id !== slot.id
    ) {
      throw new AppError(
        "Esta conta já está conectada em outro slot",
        400,
        "social_account_already_connected",
      );
    }

    let account = existingAccount;

    if (account) {
      account.reconnect({
        accountSlotId: slot.id,
        username: zernioAccount.username || username,
        displayName: zernioAccount.displayName,
        avatarUrl: zernioAccount.avatarUrl,
        canPost: health.canPost,
        needsReconnect: health.needsReconnect,
        permissions: health.permissions,
      });
    } else {
      account = SocialConnectedAccount.create({
        userId: input.userId,
        accountSlotId: slot.id,
        platform: session.platform,
        zernioAccountId,
        zernioProfileId: session.zernioProfileId,
        username: zernioAccount.username || username,
        displayName: zernioAccount.displayName,
        avatarUrl: zernioAccount.avatarUrl,
        canPost: health.canPost,
        needsReconnect: health.needsReconnect,
        permissions: health.permissions,
      });
    }

    const savedAccount = await this.socialConnectedAccountRepository.save(account);
    await this.accountSlotRepository.assignAccount(slot.id, savedAccount.id);

    session.markAsCompleted();
    await this.socialConnectSessionRepository.save(session);

    return mapSocialConnectedAccountToDto(
      savedAccount,
      this.accountSlotRepository,
    );
  }

  private async completeHeadlessSelection(
    session: SocialConnectSession,
    input: {
      selectionPayload?: Record<string, unknown>;
      tempToken?: string;
      connectToken?: string;
    },
  ): Promise<{ accountId: string; username: string }> {
    const tempToken = input.tempToken ?? session.tempToken;

    if (!tempToken) {
      throw new AppError("Token temporário ausente", 400, "connect_temp_token_missing");
    }

    if (session.platform === SocialPlatformEnum.FACEBOOK) {
      const pageId = input.selectionPayload?.pageId;

      if (typeof pageId !== "string") {
        throw new AppError("Page ID é obrigatório", 400, "facebook_page_required");
      }

      return this.zernioConnectService.selectFacebookPage({
        profileId: session.zernioProfileId,
        tempToken,
        pageId,
        connectToken: input.connectToken ?? session.connectToken ?? undefined,
      });
    }

    if (session.platform === SocialPlatformEnum.LINKEDIN) {
      const organizationId = input.selectionPayload?.organizationId;

      if (typeof organizationId !== "string") {
        throw new AppError(
          "Organization ID é obrigatório",
          400,
          "linkedin_organization_required",
        );
      }

      return this.zernioConnectService.selectLinkedInOrganization({
        profileId: session.zernioProfileId,
        tempToken,
        organizationId,
        connectToken: input.connectToken ?? session.connectToken ?? undefined,
      });
    }

    throw new AppError(
      "Seleção secundária não suportada para esta plataforma",
      400,
      "unsupported_selection_step",
    );
  }
}

export class ListSocialConnectSelectionOptionsUseCase {
  constructor(
    private readonly socialConnectSessionRepository: ISocialConnectSessionRepository,
    private readonly zernioConnectService: IZernioConnectService,
  ) {}

  async execute(input: {
    userId: string;
    sessionId: string;
    tempToken?: string;
  }): Promise<ISocialSelectionOptionDto[]> {
    const session = await this.socialConnectSessionRepository.findByIdAndUserId(
      input.sessionId,
      input.userId,
    );

    if (!session) {
      throw new AppError("Sessão de conexão não encontrada", 404, "connect_session_not_found");
    }

    const tempToken = input.tempToken ?? session.tempToken;

    if (!tempToken) {
      throw new AppError("Token temporário ausente", 400, "connect_temp_token_missing");
    }

    if (session.platform === SocialPlatformEnum.FACEBOOK) {
      const options = await this.zernioConnectService.listFacebookPages({
        profileId: session.zernioProfileId,
        tempToken,
      });

      return options.map((option) => ({
        id: option.id,
        name: option.name,
        avatarUrl: option.avatarUrl,
        metadata: option.metadata,
      }));
    }

    if (session.platform === SocialPlatformEnum.LINKEDIN) {
      const options = await this.zernioConnectService.listLinkedInOrganizations({
        profileId: session.zernioProfileId,
        tempToken,
      });

      return options.map((option) => ({
        id: option.id,
        name: option.name,
        avatarUrl: option.avatarUrl,
        metadata: option.metadata,
      }));
    }

    throw new AppError(
      "Seleção secundária não suportada para esta plataforma",
      400,
      "unsupported_selection_step",
    );
  }
}

export class ListSocialConnectedAccountsUseCase {
  constructor(
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
    private readonly accountSlotRepository: IAccountSlotRepository,
  ) {}

  async execute(userId: string): Promise<ISocialConnectedAccountDto[]> {
    const accounts =
      await this.socialConnectedAccountRepository.findByUserId(userId);

    return Promise.all(
      accounts.map((account) =>
        mapSocialConnectedAccountToDto(account, this.accountSlotRepository),
      ),
    );
  }
}

export class DisconnectSocialAccountUseCase {
  constructor(
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly zernioAccountService: IZernioAccountService,
  ) {}

  async execute(userId: string, accountId: string): Promise<void> {
    const account =
      await this.socialConnectedAccountRepository.findByIdAndUserId(
        accountId,
        userId,
      );

    if (!account) {
      throw new AppError(
        "Conta social não encontrada",
        404,
        "social_account_not_found",
      );
    }

    await this.zernioAccountService.disconnectAccount(account.zernioAccountId);
    account.markAsDisconnected();
    await this.socialConnectedAccountRepository.save(account);
    await this.accountSlotRepository.releaseAccount(accountId);
  }
}
