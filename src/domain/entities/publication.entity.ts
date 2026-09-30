import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTargetStatusEnum,
  PublicationTypeEnum,
  PublishModeEnum,
} from "@/domain/enums/publication.enum";
import type { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import { randomUUID } from "node:crypto";

export interface IPublicationTargetProps {
  id: string;
  publicationId: string;
  socialConnectedAccountId: string;
  platform: SocialPlatformEnum;
  zernioAccountId: string;
  status: PublicationTargetStatusEnum;
  platformPostId: string | null;
  platformPostUrl: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPublicationProps {
  id: string;
  userId: string;
  type: PublicationTypeEnum;
  destinationScope: PublicationDestinationScopeEnum;
  caption: string | null;
  mediaUrl: string;
  objectKey: string | null;
  objectKeys: string[];
  zernioPostId: string | null;
  idempotencyKey: string;
  status: PublicationStatusEnum;
  scheduledFor: Date | null;
  timezone: string | null;
  publishMode: PublishModeEnum;
  zernioQueueId: string | null;
  createdAt: Date;
  updatedAt: Date;
  targets: IPublicationTargetProps[];
}

export interface IPublicationTargetCreateInput {
  socialConnectedAccountId: string;
  platform: SocialPlatformEnum;
  zernioAccountId: string;
}

export interface IPublicationCreateProps {
  userId: string;
  type: PublicationTypeEnum;
  destinationScope: PublicationDestinationScopeEnum;
  caption?: string | null;
  mediaUrl: string;
  objectKey: string | null;
  objectKeys: string[];
  targets: IPublicationTargetCreateInput[];
  publishMode?: PublishModeEnum;
  scheduledFor?: Date | null;
  timezone?: string | null;
}

export class PublicationTarget {
  private readonly props: IPublicationTargetProps;

  private constructor(props: IPublicationTargetProps) {
    this.props = props;
  }

  static create(input: {
    publicationId: string;
    socialConnectedAccountId: string;
    platform: SocialPlatformEnum;
    zernioAccountId: string;
  }): PublicationTarget {
    const now = new Date();

    return new PublicationTarget({
      id: "",
      publicationId: input.publicationId,
      socialConnectedAccountId: input.socialConnectedAccountId,
      platform: input.platform,
      zernioAccountId: input.zernioAccountId,
      status: PublicationTargetStatusEnum.PENDING,
      platformPostId: null,
      platformPostUrl: null,
      errorMessage: null,
      errorCode: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: IPublicationTargetProps): PublicationTarget {
    return new PublicationTarget(props);
  }

  get id(): string {
    return this.props.id;
  }

  get publicationId(): string {
    return this.props.publicationId;
  }

  get socialConnectedAccountId(): string {
    return this.props.socialConnectedAccountId;
  }

  get platform(): SocialPlatformEnum {
    return this.props.platform;
  }

  get zernioAccountId(): string {
    return this.props.zernioAccountId;
  }

  get status(): PublicationTargetStatusEnum {
    return this.props.status;
  }

  get platformPostId(): string | null {
    return this.props.platformPostId;
  }

  get platformPostUrl(): string | null {
    return this.props.platformPostUrl;
  }

  get errorMessage(): string | null {
    return this.props.errorMessage;
  }

  get errorCode(): string | null {
    return this.props.errorCode;
  }

  markAsProcessing(): void {
    this.props.status = PublicationTargetStatusEnum.PROCESSING;
    this.props.updatedAt = new Date();
  }

  markAsSuccess(platformPostId: string, platformPostUrl: string | null): void {
    this.props.status = PublicationTargetStatusEnum.SUCCESS;
    this.props.platformPostId = platformPostId;
    this.props.platformPostUrl = platformPostUrl;
    this.props.errorMessage = null;
    this.props.errorCode = null;
    this.props.updatedAt = new Date();
  }

  markAsFailed(errorMessage: string, errorCode?: string | null): void {
    this.props.status = PublicationTargetStatusEnum.FAILED;
    this.props.errorMessage = errorMessage;
    this.props.errorCode = errorCode ?? null;
    this.props.updatedAt = new Date();
  }

  markAsUnverified(): void {
    this.props.status = PublicationTargetStatusEnum.UNVERIFIED;
    this.props.updatedAt = new Date();
  }

  toObject(): IPublicationTargetProps {
    return { ...this.props };
  }
}

export class Publication {
  private readonly props: IPublicationProps;

  private constructor(props: IPublicationProps) {
    this.props = props;
  }

  static create(props: IPublicationCreateProps): Publication {
    const now = new Date();
    const publicationId = "";
    const idempotencyKey = randomUUID();

    const targets = props.targets.map((target) =>
      PublicationTarget.create({
        publicationId,
        socialConnectedAccountId: target.socialConnectedAccountId,
        platform: target.platform,
        zernioAccountId: target.zernioAccountId,
      }),
    );

    return new Publication({
      id: publicationId,
      userId: props.userId,
      type: props.type,
      destinationScope: props.destinationScope,
      caption: props.caption ?? null,
      mediaUrl: props.mediaUrl,
      objectKey: props.objectKey,
      objectKeys: props.objectKeys,
      zernioPostId: null,
      idempotencyKey,
      status: PublicationStatusEnum.PENDING,
      scheduledFor: props.scheduledFor ?? null,
      timezone: props.timezone ?? null,
      publishMode: props.publishMode ?? PublishModeEnum.NOW,
      zernioQueueId: null,
      createdAt: now,
      updatedAt: now,
      targets: targets.map((target) => target.toObject()),
    });
  }

  static restore(props: IPublicationProps): Publication {
    return new Publication(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): PublicationTypeEnum {
    return this.props.type;
  }

  get destinationScope(): PublicationDestinationScopeEnum {
    return this.props.destinationScope;
  }

  get caption(): string | null {
    return this.props.caption;
  }

  get mediaUrl(): string {
    return this.props.mediaUrl;
  }

  get objectKey(): string | null {
    return this.props.objectKey;
  }

  get objectKeys(): string[] {
    if (this.props.objectKeys.length > 0) {
      return [...this.props.objectKeys];
    }

    return this.props.objectKey ? [this.props.objectKey] : [];
  }

  get zernioPostId(): string | null {
    return this.props.zernioPostId;
  }

  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  get status(): PublicationStatusEnum {
    return this.props.status;
  }

  get scheduledFor(): Date | null {
    return this.props.scheduledFor;
  }

  get timezone(): string | null {
    return this.props.timezone;
  }

  get publishMode(): PublishModeEnum {
    return this.props.publishMode;
  }

  get zernioQueueId(): string | null {
    return this.props.zernioQueueId;
  }

  get targets(): PublicationTarget[] {
    return this.props.targets.map((target) => PublicationTarget.restore(target));
  }

  belongsToUser(userId: string): boolean {
    return this.props.userId === userId;
  }

  markAsProcessing(): void {
    this.props.status = PublicationStatusEnum.PROCESSING;
    this.props.updatedAt = new Date();
    this.markAllTargetsAsProcessing();
  }

  markAsScheduled(scheduledFor: Date, timezone: string): void {
    this.props.status = PublicationStatusEnum.SCHEDULED;
    this.props.scheduledFor = scheduledFor;
    this.props.timezone = timezone;
    this.props.publishMode = PublishModeEnum.SCHEDULED;
    this.props.updatedAt = new Date();
  }

  reschedule(scheduledFor: Date, timezone: string): void {
    this.props.scheduledFor = scheduledFor;
    this.props.timezone = timezone;
    this.props.publishMode = PublishModeEnum.SCHEDULED;
    this.props.status = PublicationStatusEnum.SCHEDULED;
    this.props.updatedAt = new Date();
  }

  markAsCancelled(): void {
    this.props.status = PublicationStatusEnum.CANCELLED;
    this.props.updatedAt = new Date();
  }

  canBeCancelledOrRescheduled(): boolean {
    return (
      this.props.status === PublicationStatusEnum.SCHEDULED ||
      this.props.status === PublicationStatusEnum.DRAFT
    );
  }

  setZernioPostId(zernioPostId: string): void {
    this.props.zernioPostId = zernioPostId;
    this.props.updatedAt = new Date();
  }

  finalizeStatus(): void {
    const targets = this.targets;
    const successCount = targets.filter(
      (target) => target.status === PublicationTargetStatusEnum.SUCCESS,
    ).length;
    const failedCount = targets.filter(
      (target) => target.status === PublicationTargetStatusEnum.FAILED,
    ).length;

    if (successCount === targets.length) {
      this.props.status = PublicationStatusEnum.COMPLETED;
    } else if (successCount > 0 && failedCount > 0) {
      this.props.status = PublicationStatusEnum.PARTIAL_FAILURE;
    } else if (failedCount === targets.length) {
      this.props.status = PublicationStatusEnum.FAILED;
    }

    this.props.updatedAt = new Date();
  }

  applyAggregateStatus(status: PublicationStatusEnum): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
  }

  applyVerificationTimeoutIfStale(
    timeoutMs: number,
    now: Date = new Date(),
  ): boolean {
    if (
      this.props.status !== PublicationStatusEnum.PROCESSING &&
      this.props.status !== PublicationStatusEnum.PENDING
    ) {
      return false;
    }

    if (now.getTime() - this.props.updatedAt.getTime() < timeoutMs) {
      return false;
    }

    this.props.status = PublicationStatusEnum.UNVERIFIED;
    this.props.updatedAt = now;
    this.props.targets = this.props.targets.map((target) => {
      if (
        target.status === PublicationTargetStatusEnum.PENDING ||
        target.status === PublicationTargetStatusEnum.PROCESSING
      ) {
        return {
          ...target,
          status: PublicationTargetStatusEnum.UNVERIFIED,
          updatedAt: now,
        };
      }

      return target;
    });

    return true;
  }

  replaceTargets(targets: PublicationTarget[]): void {
    this.props.targets = targets.map((target) => target.toObject());
    this.props.updatedAt = new Date();
  }

  setId(id: string): void {
    this.props.id = id;

    this.props.targets = this.props.targets.map((target) => ({
      ...target,
      publicationId: id,
    }));
  }

  private markAllTargetsAsProcessing(): void {
    this.props.targets = this.props.targets.map((target) => ({
      ...target,
      status: PublicationTargetStatusEnum.PROCESSING,
      updatedAt: new Date(),
    }));
  }

  toObject(): IPublicationProps {
    return {
      ...this.props,
      targets: this.props.targets.map((target) => ({ ...target })),
    };
  }
}
