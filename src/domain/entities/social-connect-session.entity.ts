import { ConnectModeEnum } from "@/domain/enums/connect-mode.enum";
import type { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";

export interface ISocialConnectSessionProps {
  id: string;
  userId: string;
  workspaceId: string;
  accountSlotId: string;
  platform: SocialPlatformEnum;
  zernioProfileId: string;
  mode: ConnectModeEnum;
  state: string;
  tempToken: string | null;
  connectToken: string | null;
  step: string | null;
  expiresAt: Date;
  completedAt: Date | null;
  createdAt: Date;
}

export interface ISocialConnectSessionCreateProps {
  userId: string;
  workspaceId: string;
  accountSlotId: string;
  platform: SocialPlatformEnum;
  zernioProfileId: string;
  mode: ConnectModeEnum;
  state: string;
  expiresAt: Date;
}

export class SocialConnectSession {
  private props: ISocialConnectSessionProps;

  private constructor(props: ISocialConnectSessionProps) {
    this.props = props;
  }

  static create(props: ISocialConnectSessionCreateProps): SocialConnectSession {
    return new SocialConnectSession({
      id: "",
      userId: props.userId,
      workspaceId: props.workspaceId,
      accountSlotId: props.accountSlotId,
      platform: props.platform,
      zernioProfileId: props.zernioProfileId,
      mode: props.mode,
      state: props.state,
      tempToken: null,
      connectToken: null,
      step: null,
      expiresAt: props.expiresAt,
      completedAt: null,
      createdAt: new Date(),
    });
  }

  static restore(props: ISocialConnectSessionProps): SocialConnectSession {
    return new SocialConnectSession(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get workspaceId(): string {
    return this.props.workspaceId;
  }

  get accountSlotId(): string {
    return this.props.accountSlotId;
  }

  get platform(): SocialPlatformEnum {
    return this.props.platform;
  }

  get zernioProfileId(): string {
    return this.props.zernioProfileId;
  }

  get mode(): ConnectModeEnum {
    return this.props.mode;
  }

  get state(): string {
    return this.props.state;
  }

  get tempToken(): string | null {
    return this.props.tempToken;
  }

  get connectToken(): string | null {
    return this.props.connectToken;
  }

  get step(): string | null {
    return this.props.step;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get completedAt(): Date | null {
    return this.props.completedAt;
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() < Date.now();
  }

  isCompleted(): boolean {
    return this.props.completedAt !== null;
  }

  belongsToUser(userId: string): boolean {
    return this.props.userId === userId;
  }

  updateHeadlessState(input: {
    tempToken?: string | null;
    connectToken?: string | null;
    step?: string | null;
  }): void {
    if (input.tempToken !== undefined) {
      this.props.tempToken = input.tempToken;
    }

    if (input.connectToken !== undefined) {
      this.props.connectToken = input.connectToken;
    }

    if (input.step !== undefined) {
      this.props.step = input.step;
    }
  }

  markAsCompleted(): void {
    this.props.completedAt = new Date();
  }

  setId(id: string): void {
    this.props.id = id;
  }

  toObject(): ISocialConnectSessionProps {
    return { ...this.props };
  }
}
