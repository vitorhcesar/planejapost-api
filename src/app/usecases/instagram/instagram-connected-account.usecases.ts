import type {
  IInstagramConnectedAccountDto,
  IInstagramConnectSessionDto,
} from "@/app/usecases/instagram/dto/instagram.dto";
import { mapInstagramConnectedAccountToDto } from "@/app/usecases/instagram/map-instagram-connected-account-to-dto.util";
import { InstagramConnectedAccount } from "@/domain/entities/instagram-connected-account.entity";
import { AccountSlotStatusEnum } from "@/domain/enums/account-slot.enum";
import type {
  IInstagramGraphService,
  IInstagramOAuthServiceFactory,
} from "@/domain/instagram/instagram.service";
import type { IAccountSlotRepository } from "@/domain/repositories/account-slot.repository";
import type {
  IInstagramConnectedAccountRepository,
  IInstagramOAuthStateRepository,
} from "@/domain/repositories/instagram-connected-account.repository";
import type { IMetaAppConfigRepository } from "@/domain/repositories/meta-app-config.repository";
import { AppError } from "@/domain/errors/app.error";
import { randomBytes } from "node:crypto";

export class CreateInstagramConnectSessionUseCase {
  constructor(
    private readonly oauthStateRepository: IInstagramOAuthStateRepository,
    private readonly instagramOAuthServiceFactory: IInstagramOAuthServiceFactory,
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly instagramConnectedAccountRepository: IInstagramConnectedAccountRepository,
    private readonly metaAppConfigRepository: IMetaAppConfigRepository,
  ) {}

  async execute(
    authUserId: string,
    slotId: string,
  ): Promise<IInstagramConnectSessionDto> {
    await this.accountSlotRepository.expireOverdueSlots(authUserId);

    const slot = await this.accountSlotRepository.findByIdAndUserId(
      slotId,
      authUserId,
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

    const connectedAccount = slot.instagramConnectedAccountId
      ? await this.instagramConnectedAccountRepository.findByIdAndUserId(
          slot.instagramConnectedAccountId,
          authUserId,
        )
      : null;
    const metaAppConfig = connectedAccount?.metaAppConfigId
      ? await this.metaAppConfigRepository.findById(
          connectedAccount.metaAppConfigId,
        )
      : await this.metaAppConfigRepository.findActiveByUserId(authUserId);

    if (!metaAppConfig || metaAppConfig.userId !== authUserId) {
      throw new AppError(
        connectedAccount
          ? "A conta precisa ser reconectada com uma configuração Meta válida"
          : "Cadastre sua Meta App antes de conectar uma conta",
        409,
        "meta_app_not_configured",
      );
    }

    const state = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.oauthStateRepository.create(
      authUserId,
      state,
      expiresAt,
      metaAppConfig.id,
      slotId,
    );

    const instagramOAuthService = this.instagramOAuthServiceFactory.create({
      appId: metaAppConfig.appId,
      appSecret: metaAppConfig.appSecret,
      redirectUri: metaAppConfig.redirectUri,
      scopes: metaAppConfig.requestedScopes,
    });

    return {
      authorizationUrl: instagramOAuthService.buildAuthorizationUrl(state),
      state,
      expiresAt: expiresAt.toISOString(),
    };
  }
}

export class CompleteInstagramConnectUseCase {
  constructor(
    private readonly oauthStateRepository: IInstagramOAuthStateRepository,
    private readonly instagramConnectedAccountRepository: IInstagramConnectedAccountRepository,
    private readonly instagramOAuthServiceFactory: IInstagramOAuthServiceFactory,
    private readonly instagramGraphService: IInstagramGraphService,
    private readonly accountSlotRepository: IAccountSlotRepository,
    private readonly metaAppConfigRepository: IMetaAppConfigRepository,
  ) {}

  async execute(input: {
    code: string;
    state: string;
  }): Promise<IInstagramConnectedAccountDto> {
    const oauthState = await this.oauthStateRepository.findValidState(
      input.state,
    );

    if (!oauthState) {
      throw new AppError(
        "State OAuth inválido ou expirado",
        400,
        "invalid_oauth_state",
      );
    }

    if (!oauthState.accountSlotId) {
      throw new AppError(
        "Sessão OAuth inválida: slot não informado",
        400,
        "account_slot_missing",
      );
    }

    const metaAppConfig = await this.metaAppConfigRepository.findById(
      oauthState.metaAppConfigId,
    );

    if (!metaAppConfig || metaAppConfig.userId !== oauthState.userId) {
      throw new AppError(
        "A configuração Meta desta sessão não está mais disponível",
        409,
        "meta_app_config_not_found",
      );
    }

    await this.accountSlotRepository.expireOverdueSlots(oauthState.userId);

    const slot = await this.accountSlotRepository.findByIdAndUserId(
      oauthState.accountSlotId,
      oauthState.userId,
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

    const instagramOAuthService = this.instagramOAuthServiceFactory.create({
      appId: metaAppConfig.appId,
      appSecret: metaAppConfig.appSecret,
      redirectUri: metaAppConfig.redirectUri,
      scopes: metaAppConfig.requestedScopes,
    });
    const tokens =
      await instagramOAuthService.exchangeAuthorizationCode(input.code);
    const profile = await this.instagramGraphService.getProfile(
      tokens.accessToken,
    );
    const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const existingAccount =
      await this.instagramConnectedAccountRepository.findByUserIdAndInstagramUserId(
        oauthState.userId,
        profile.instagramUserId,
      );

    const existingAccountSlot = existingAccount
      ? await this.accountSlotRepository.findByInstagramConnectedAccountId(
          existingAccount.id!,
        )
      : null;

    if (
      existingAccount &&
      existingAccountSlot &&
      existingAccountSlot.id !== slot.id
    ) {
      throw new AppError(
        "Esta conta Instagram já está conectada em outro slot",
        400,
        "instagram_account_already_connected",
      );
    }

    if (
      existingAccount?.metaAppConfigId &&
      existingAccount.metaAppConfigId !== metaAppConfig.id &&
      existingAccount.isConnected()
    ) {
      throw new AppError(
        "Esta conta está vinculada a outra configuração Meta",
        409,
        "instagram_account_meta_app_mismatch",
      );
    }

    if (
      slot.instagramConnectedAccountId &&
      slot.instagramConnectedAccountId !== existingAccount?.id
    ) {
      throw new AppError(
        "Este slot já possui uma conta conectada",
        400,
        "account_slot_occupied",
      );
    }

    let account = existingAccount;

    if (account) {
      account.bindToMetaAppConfigAfterAuthorization(metaAppConfig.id);
      account.updateOAuthData({
        accessToken: tokens.accessToken,
        tokenExpiresAt,
        scopes: tokens.scopes,
        username: profile.username,
        displayName: profile.displayName,
        profilePictureUrl: profile.profilePictureUrl,
      });
    } else {
      account = InstagramConnectedAccount.create({
        userId: oauthState.userId,
        instagramUserId: profile.instagramUserId,
        username: profile.username,
        displayName: profile.displayName,
        profilePictureUrl: profile.profilePictureUrl,
        accessToken: tokens.accessToken,
        tokenExpiresAt,
        scopes: tokens.scopes,
        metaAppConfigId: metaAppConfig.id,
      });
    }

    const savedAccount =
      await this.instagramConnectedAccountRepository.save(account);

    await this.accountSlotRepository.assignAccount(slot.id, savedAccount.id!);

    await this.oauthStateRepository.deleteByState(input.state);

    return mapInstagramConnectedAccountToDto(savedAccount);
  }
}

export class ListInstagramConnectedAccountsUseCase {
  constructor(
    private readonly instagramConnectedAccountRepository: IInstagramConnectedAccountRepository,
  ) {}

  async execute(authUserId: string): Promise<IInstagramConnectedAccountDto[]> {
    const accounts =
      await this.instagramConnectedAccountRepository.findByUserId(authUserId);

    return accounts.map(mapInstagramConnectedAccountToDto);
  }
}

export class DisconnectInstagramAccountUseCase {
  constructor(
    private readonly instagramConnectedAccountRepository: IInstagramConnectedAccountRepository,
    private readonly accountSlotRepository: IAccountSlotRepository,
  ) {}

  async execute(authUserId: string, accountId: string): Promise<void> {
    const account =
      await this.instagramConnectedAccountRepository.findByIdAndUserId(
        accountId,
        authUserId,
      );

    if (!account) {
      throw new AppError(
        "Conta Instagram não encontrada",
        404,
        "instagram_account_not_found",
      );
    }

    account.markAsDisconnected();
    await this.instagramConnectedAccountRepository.save(account);
    await this.accountSlotRepository.releaseAccount(accountId);
  }
}
