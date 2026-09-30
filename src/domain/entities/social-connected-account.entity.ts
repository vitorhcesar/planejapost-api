import { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";
import type { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";

export interface ISocialConnectedAccountProps {
  id: string;
  userId: string;
  accountSlotId: string | null;
  platform: SocialPlatformEnum;
  zernioAccountId: string;
  zernioProfileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: SocialAccountStatusEnum;
  canPost: boolean;
  needsReconnect: boolean;
  permissions: Record<string, unknown> | null;
  connectedAt: Date;
  disconnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISocialConnectedAccountCreateProps {
  userId: string;
  accountSlotId: string | null;
  platform: SocialPlatformEnum;
  zernioAccountId: string;
  zernioProfileId: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  canPost?: boolean;
  needsReconnect?: boolean;
  permissions?: Record<string, unknown> | null;
}

export class SocialConnectedAccount {
  private props: ISocialConnectedAccountProps;

  private constructor(props: ISocialConnectedAccountProps) {
    this.props = props;
  }

  static create(props: ISocialConnectedAccountCreateProps): SocialConnectedAccount {
    const now = new Date();

    return new SocialConnectedAccount({
      id: "",
      userId: props.userId,
      accountSlotId: props.accountSlotId,
      platform: props.platform,
      zernioAccountId: props.zernioAccountId,
      zernioProfileId: props.zernioProfileId,
      username: props.username,
      displayName: props.displayName ?? null,
      avatarUrl: props.avatarUrl ?? null,
      status: SocialAccountStatusEnum.CONNECTED,
      canPost: props.canPost ?? true,
      needsReconnect: props.needsReconnect ?? false,
      permissions: props.permissions ?? null,
      connectedAt: now,
      disconnectedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: ISocialConnectedAccountProps): SocialConnectedAccount {
    return new SocialConnectedAccount(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get accountSlotId(): string | null {
    return this.props.accountSlotId;
  }

  get platform(): SocialPlatformEnum {
    return this.props.platform;
  }

  get zernioAccountId(): string {
    return this.props.zernioAccountId;
  }

  get zernioProfileId(): string {
    return this.props.zernioProfileId;
  }

  get username(): string {
    return this.props.username;
  }

  get displayName(): string | null {
    return this.props.displayName;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  get status(): SocialAccountStatusEnum {
    return this.props.status;
  }

  get canPost(): boolean {
    return this.props.canPost;
  }

  get needsReconnect(): boolean {
    return this.props.needsReconnect;
  }

  get permissions(): Record<string, unknown> | null {
    return this.props.permissions;
  }

  get connectedAt(): Date {
    return this.props.connectedAt;
  }

  get disconnectedAt(): Date | null {
    return this.props.disconnectedAt;
  }

  isConnected(): boolean {
    return this.props.status === SocialAccountStatusEnum.CONNECTED;
  }

  markAsDisconnected(): void {
    this.props.status = SocialAccountStatusEnum.DISCONNECTED;
    this.props.disconnectedAt = new Date();
    this.props.accountSlotId = null;
    this.props.updatedAt = new Date();
  }

  markAsError(): void {
    this.props.status = SocialAccountStatusEnum.ERROR;
    this.props.updatedAt = new Date();
  }

  updateHealth(input: {
    canPost: boolean;
    needsReconnect: boolean;
    permissions?: Record<string, unknown> | null;
  }): void {
    this.props.canPost = input.canPost;
    this.props.needsReconnect = input.needsReconnect;

    if (input.permissions !== undefined) {
      this.props.permissions = input.permissions;
    }

    this.props.updatedAt = new Date();
  }

  updateProfileSnapshot(input: {
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }): void {
    if (input.username !== undefined) {
      this.props.username = input.username;
    }

    if (input.displayName !== undefined) {
      this.props.displayName = input.displayName;
    }

    if (input.avatarUrl !== undefined) {
      this.props.avatarUrl = input.avatarUrl;
    }

    this.props.updatedAt = new Date();
  }

  reconnect(input: {
    accountSlotId: string;
    username: string;
    displayName?: string | null;
    avatarUrl?: string | null;
    canPost?: boolean;
    needsReconnect?: boolean;
    permissions?: Record<string, unknown> | null;
  }): void {
    this.props.accountSlotId = input.accountSlotId;
    this.props.username = input.username;
    this.props.displayName = input.displayName ?? this.props.displayName;
    this.props.avatarUrl = input.avatarUrl ?? this.props.avatarUrl;
    this.props.status = SocialAccountStatusEnum.CONNECTED;
    this.props.canPost = input.canPost ?? true;
    this.props.needsReconnect = input.needsReconnect ?? false;
    this.props.permissions = input.permissions ?? this.props.permissions;
    this.props.connectedAt = new Date();
    this.props.disconnectedAt = null;
    this.props.updatedAt = new Date();
  }

  assignSlot(accountSlotId: string): void {
    this.props.accountSlotId = accountSlotId;
    this.props.updatedAt = new Date();
  }

  setId(id: string): void {
    this.props.id = id;
  }

  toObject(): ISocialConnectedAccountProps {
    return { ...this.props };
  }
}
