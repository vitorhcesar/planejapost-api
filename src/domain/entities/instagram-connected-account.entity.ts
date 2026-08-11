import { InstagramConnectedAccountStatusEnum } from "@/domain/enums/instagram.enum";

export interface IInstagramConnectedAccountProps {
  id: string;
  userId: string;
  instagramUserId: string;
  username: string;
  displayName: string | null;
  profilePictureUrl: string | null;
  accessToken: string;
  tokenExpiresAt: Date;
  scopes: string[];
  status: InstagramConnectedAccountStatusEnum;
  integrationSource: "legacy_project_app" | "user_meta_app";
  metaAppConfigId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInstagramConnectedAccountCreateProps {
  userId: string;
  instagramUserId: string;
  username: string;
  displayName?: string | null;
  profilePictureUrl?: string | null;
  accessToken: string;
  tokenExpiresAt: Date;
  scopes: string[];
  metaAppConfigId: string;
}

export class InstagramConnectedAccount {
  private readonly props: IInstagramConnectedAccountProps;

  private constructor(props: IInstagramConnectedAccountProps) {
    this.props = props;
  }

  static create(
    props: IInstagramConnectedAccountCreateProps,
  ): InstagramConnectedAccount {
    const now = new Date();

    return new InstagramConnectedAccount({
      id: "",
      userId: props.userId,
      instagramUserId: props.instagramUserId,
      username: props.username,
      displayName: props.displayName ?? null,
      profilePictureUrl: props.profilePictureUrl ?? null,
      accessToken: props.accessToken,
      tokenExpiresAt: props.tokenExpiresAt,
      scopes: props.scopes,
      status: InstagramConnectedAccountStatusEnum.CONNECTED,
      integrationSource: "user_meta_app",
      metaAppConfigId: props.metaAppConfigId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(
    props: IInstagramConnectedAccountProps,
  ): InstagramConnectedAccount {
    return new InstagramConnectedAccount(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get instagramUserId(): string {
    return this.props.instagramUserId;
  }

  get username(): string {
    return this.props.username;
  }

  get displayName(): string | null {
    return this.props.displayName;
  }

  get profilePictureUrl(): string | null {
    return this.props.profilePictureUrl;
  }

  get accessToken(): string {
    return this.props.accessToken;
  }

  get tokenExpiresAt(): Date {
    return this.props.tokenExpiresAt;
  }

  get scopes(): string[] {
    return [...this.props.scopes];
  }

  get status(): InstagramConnectedAccountStatusEnum {
    return this.props.status;
  }

  get integrationSource(): "legacy_project_app" | "user_meta_app" {
    return this.props.integrationSource;
  }

  get metaAppConfigId(): string | null {
    return this.props.metaAppConfigId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isConnected(): boolean {
    return this.props.status === InstagramConnectedAccountStatusEnum.CONNECTED;
  }

  isTokenExpired(referenceDate = new Date()): boolean {
    return this.props.tokenExpiresAt.getTime() <= referenceDate.getTime();
  }

  belongsToUser(userId: string): boolean {
    return this.props.userId === userId;
  }

  updateOAuthData(props: {
    accessToken: string;
    tokenExpiresAt: Date;
    scopes: string[];
    username: string;
    displayName?: string | null;
    profilePictureUrl?: string | null;
  }): void {
    this.props.accessToken = props.accessToken;
    this.props.tokenExpiresAt = props.tokenExpiresAt;
    this.props.scopes = props.scopes;
    this.props.username = props.username;
    this.props.displayName = props.displayName ?? null;
    this.props.profilePictureUrl = props.profilePictureUrl ?? null;
    this.props.status = InstagramConnectedAccountStatusEnum.CONNECTED;
    this.props.updatedAt = new Date();
  }

  bindToMetaAppConfigAfterAuthorization(metaAppConfigId: string): void {
    this.props.metaAppConfigId = metaAppConfigId;
    this.props.integrationSource = "user_meta_app";
    this.props.updatedAt = new Date();
  }

  markAsDisconnected(): void {
    this.props.status = InstagramConnectedAccountStatusEnum.DISCONNECTED;
    this.props.updatedAt = new Date();
  }

  markAsExpired(): void {
    this.props.status = InstagramConnectedAccountStatusEnum.EXPIRED;
    this.props.updatedAt = new Date();
  }

  toObject(): IInstagramConnectedAccountProps {
    return {
      ...this.props,
      scopes: [...this.props.scopes],
    };
  }
}
