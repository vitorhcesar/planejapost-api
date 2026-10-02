import { AppError } from "@/domain/errors/app.error";
import { EnvService } from "@/infra/config/env.service";
import type { IZernioAccountService } from "@/domain/zernio/zernio-account.service";
import type { IZernioConnectService } from "@/domain/zernio/zernio-connect.service";
import type { IZernioMediaService } from "@/domain/zernio/zernio-media.service";
import type { IZernioAnalyticsService } from "@/domain/zernio/zernio-analytics.service";
import type { IZernioPostService } from "@/domain/zernio/zernio-post.service";
import type { IZernioQueueService } from "@/domain/zernio/zernio-queue.service";
import type { IZernioProfileService } from "@/domain/zernio/zernio-profile.service";
import type {
  ICreateZernioPostInput,
  ICreateZernioProfileInput,
  IUpdateZernioPostInput,
  IZernioAccount,
  IZernioAccountHealth,
  IZernioConnectUrlInput,
  IZernioConnectUrlResult,
  IZernioPost,
  IZernioAnalyticsDelta,
  IZernioAnalyticsDeltaEntry,
  IZernioPostAnalytics,
  IZernioPostAnalyticsMetrics,
  IZernioPlatformPostAnalytics,
  IZernioPresignUploadInput,
  IZernioPresignUploadResult,
  IZernioProfile,
  IZernioSelectFacebookPageInput,
  IZernioSelectLinkedInOrganizationInput,
  IZernioSelectionOption,
} from "@/domain/zernio/zernio.types";
import type {
  IUpsertZernioQueueInput,
  IZernioNextQueueSlot,
  IZernioQueueSchedule,
  IZernioQueueSlot,
} from "@/domain/zernio/zernio-queue.types";
import {
  getRetryAfterSeconds,
  mapZernioErrorToAppError,
} from "@/domain/zernio/map-zernio-error.util";
import { ZERNIO_CONNECT_SCOPES } from "@/domain/zernio/zernio-connect.constants";
import { createHmac, timingSafeEqual } from "node:crypto";
import Zernio, { ZernioApiError } from "@zernio/node";

const MAX_RATE_LIMIT_RETRIES = 3;

type TZernioRecord = Record<string, unknown>;

function asRecord(value: unknown): TZernioRecord {
  return value && typeof value === "object" ? (value as TZernioRecord) : {};
}

function asRecordArray(value: unknown): TZernioRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function mapZernioAnalyticsDeltaEntry(
  entry: TZernioRecord,
): IZernioAnalyticsDeltaEntry | null {
  const postId = String(entry.postId ?? "");

  if (!postId) {
    return null;
  }

  return {
    postId,
    accountId: String(entry.accountId ?? ""),
    profileId: String(entry.profileId ?? ""),
    platform: String(entry.platform ?? ""),
    platformPostId: String(entry.platformPostId ?? ""),
    publishedAt: String(entry.publishedAt ?? ""),
    syncedAt: String(entry.syncedAt ?? ""),
    isDeleted: Boolean(entry.isDeleted),
  };
}

function mapZernioPostAnalyticsMetrics(
  analytics: TZernioRecord | null | undefined,
): IZernioPostAnalyticsMetrics | null {
  if (!analytics || typeof analytics !== "object") {
    return null;
  }

  const hasAnyMetric = [
    "impressions",
    "reach",
    "likes",
    "comments",
    "shares",
    "saves",
    "clicks",
    "views",
    "engagementRate",
  ].some((key) => typeof analytics[key] === "number");

  if (!hasAnyMetric) {
    return null;
  }

  return {
    impressions: typeof analytics.impressions === "number" ? analytics.impressions : null,
    reach: typeof analytics.reach === "number" ? analytics.reach : null,
    likes: typeof analytics.likes === "number" ? analytics.likes : null,
    comments: typeof analytics.comments === "number" ? analytics.comments : null,
    shares: typeof analytics.shares === "number" ? analytics.shares : null,
    saves: typeof analytics.saves === "number" ? analytics.saves : null,
    clicks: typeof analytics.clicks === "number" ? analytics.clicks : null,
    views: typeof analytics.views === "number" ? analytics.views : null,
    engagementRate:
      typeof analytics.engagementRate === "number" ? analytics.engagementRate : null,
    lastUpdated:
      typeof analytics.lastUpdated === "string" ? analytics.lastUpdated : null,
  };
}

function mapZernioPlatformPostAnalytics(
  entry: TZernioRecord,
): IZernioPlatformPostAnalytics | null {
  const platform = typeof entry.platform === "string" ? entry.platform : "";

  if (!platform) {
    return null;
  }

  const syncStatus = entry.syncStatus;

  return {
    platform,
    accountUsername:
      typeof entry.accountUsername === "string" ? entry.accountUsername : null,
    syncStatus:
      syncStatus === "synced" || syncStatus === "pending" || syncStatus === "unavailable"
        ? syncStatus
        : "pending",
    errorMessage:
      typeof entry.errorMessage === "string" ? entry.errorMessage : null,
    platformPostUrl:
      typeof entry.platformPostUrl === "string" ? entry.platformPostUrl : null,
    analytics: mapZernioPostAnalyticsMetrics(asRecord(entry.analytics)),
  };
}

function mapZernioPostAnalytics(
  data: TZernioRecord,
  fallbackPostId: string,
): IZernioPostAnalytics {
  const syncStatus = data.syncStatus;

  return {
    postId: String(data.postId ?? data.latePostId ?? fallbackPostId),
    syncStatus:
      syncStatus === "synced" ||
      syncStatus === "pending" ||
      syncStatus === "partial" ||
      syncStatus === "unavailable"
        ? syncStatus
        : "pending",
    message: typeof data.message === "string" ? data.message : null,
    publishedAt:
      typeof data.publishedAt === "string" ? data.publishedAt : null,
    aggregate: mapZernioPostAnalyticsMetrics(asRecord(data.analytics)),
    platforms: asRecordArray(data.platformAnalytics)
      .map(mapZernioPlatformPostAnalytics)
      .filter((entry): entry is IZernioPlatformPostAnalytics => entry !== null),
  };
}

function mapZernioPost(post: TZernioRecord, fallbackPostId = ""): IZernioPost {
  return {
    postId: String(post._id ?? post.id ?? fallbackPostId),
    status: String(post.status ?? "publishing"),
    scheduledFor:
      typeof post.scheduledFor === "string" ? post.scheduledFor : null,
    timezone: typeof post.timezone === "string" ? post.timezone : null,
    platforms: asRecordArray(post.platforms)
      .map((entry) => ({
        accountId: String(entry.accountId ?? ""),
        platformPostId:
          typeof entry.platformPostId === "string" ? entry.platformPostId : null,
        publishedUrl:
          typeof entry.publishedUrl === "string"
            ? entry.publishedUrl
            : typeof entry.platformPostUrl === "string"
              ? entry.platformPostUrl
              : null,
        status: String(entry.status ?? ""),
        errorMessage: typeof entry.error === "string" ? entry.error : null,
        errorCode:
          typeof entry.errorCategory === "string"
            ? entry.errorCategory
            : typeof entry.errorCode === "string"
              ? entry.errorCode
              : null,
      }))
      .filter((entry) => entry.accountId.length > 0),
  };
}

function mapQueueSchedule(
  schedule: TZernioRecord,
  nextSlots: string[] = [],
): IZernioQueueSchedule {
  return {
    queueId: String(schedule._id ?? schedule.id ?? ""),
    profileId: String(schedule.profileId ?? ""),
    name: String(schedule.name ?? "Default"),
    timezone: String(schedule.timezone ?? "UTC"),
    slots: asRecordArray(schedule.slots)
      .map((slot) => ({
        dayOfWeek: Number(slot.dayOfWeek ?? -1),
        time: String(slot.time ?? ""),
      }))
      .filter(
        (slot): slot is IZernioQueueSlot =>
          slot.dayOfWeek >= 0 &&
          slot.dayOfWeek <= 6 &&
          /^\d{2}:\d{2}$/.test(slot.time),
      ),
    active: Boolean(schedule.active ?? true),
    isDefault: Boolean(schedule.isDefault ?? false),
    nextSlots,
  };
}

type TZernioSdk = InstanceType<typeof Zernio>;

export interface IZernioClient
  extends IZernioProfileService,
    IZernioConnectService,
    IZernioAccountService,
    IZernioPostService,
    IZernioAnalyticsService,
    IZernioMediaService,
    IZernioQueueService {}

export class ZernioClient implements IZernioClient {
  private readonly sdk: TZernioSdk;

  constructor(private readonly env = EnvService.getInstance()) {
    if (!env.zernioApiKey) {
      throw new Error("ZERNIO_API_KEY não configurada");
    }

    this.sdk = new Zernio({
      apiKey: env.zernioApiKey,
      baseURL: env.zernioApiBaseUrl,
    });
  }

  async createProfile(input: ICreateZernioProfileInput): Promise<IZernioProfile> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.profiles.createProfile({
        body: {
          name: input.name,
          description: input.description,
        },
      }),
    );

    return this.mapProfile(asRecord(response.data?.profile), input.name);
  }

  async getProfile(profileId: string): Promise<IZernioProfile | null> {
    try {
      const response = await this.withRateLimitRetry(() =>
        this.sdk.profiles.getProfile({
          path: { profileId },
        }),
      );

      if (!response.data?.profile) {
        return null;
      }

      return this.mapProfile(asRecord(response.data?.profile));
    } catch (error) {
      if (error instanceof ZernioApiError && error.isNotFound()) {
        return null;
      }

      throw mapZernioErrorToAppError(error);
    }
  }

  async getConnectUrl(input: IZernioConnectUrlInput): Promise<IZernioConnectUrlResult> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.connect.getConnectUrl({
        path: { platform: input.platform },
        query: {
          profileId: input.profileId,
          redirect_url: input.redirectUrl,
          scopes: input.scopes ?? ZERNIO_CONNECT_SCOPES,
          headless: input.headless ? "true" : undefined,
          loginMethod: input.loginMethod,
        },
      }),
    );

    const authUrl = String(asRecord(response.data).authUrl ?? "");

    if (!authUrl) {
      throw new AppError(
        "Zernio não retornou URL de autorização",
        502,
        "zernio_connect_url_missing",
      );
    }

    return { authUrl };
  }

  async listFacebookPages(input: {
    profileId: string;
    tempToken: string;
  }): Promise<IZernioSelectionOption[]> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.connect.facebook.listFacebookPages({
        query: {
          profileId: input.profileId,
          tempToken: input.tempToken,
        },
      }),
    );

    return this.mapSelectionOptions(asRecordArray(asRecord(response.data).pages));
  }

  async selectFacebookPage(
    input: IZernioSelectFacebookPageInput,
  ): Promise<{ accountId: string; username: string }> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.connect.facebook.selectFacebookPage({
        body: {
          profileId: input.profileId,
          tempToken: input.tempToken,
          pageId: input.pageId,
          connectToken: input.connectToken,
        },
      }),
    );

    return this.mapSelectedAccount(asRecord(response.data));
  }

  async listLinkedInOrganizations(input: {
    profileId: string;
    tempToken: string;
  }): Promise<IZernioSelectionOption[]> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.connect.linkedin.listLinkedInOrganizations({
        query: {
          profileId: input.profileId,
          tempToken: input.tempToken,
        },
      }),
    );

    return this.mapSelectionOptions(
      asRecordArray(asRecord(response.data).organizations),
    );
  }

  async selectLinkedInOrganization(
    input: IZernioSelectLinkedInOrganizationInput,
  ): Promise<{ accountId: string; username: string }> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.connect.linkedin.selectLinkedInOrganization({
        body: {
          profileId: input.profileId,
          tempToken: input.tempToken,
          organizationId: input.organizationId,
          connectToken: input.connectToken,
        },
      }),
    );

    return this.mapSelectedAccount(asRecord(response.data));
  }

  async listAccounts(profileId: string): Promise<IZernioAccount[]> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.accounts.listAccounts({
        query: { profileId },
      }),
    );

    const accounts = asRecordArray(asRecord(response.data).accounts);

    return accounts.map((account) => ({
      accountId: String(account._id ?? account.id ?? ""),
      profileId: String(account.profileId ?? profileId),
      platform: String(account.platform ?? ""),
      username: String(account.username ?? account.name ?? ""),
      displayName:
        typeof account.displayName === "string"
          ? account.displayName
          : typeof account.name === "string"
            ? account.name
            : null,
      avatarUrl:
        typeof account.profilePicture === "string"
          ? account.profilePicture
          : typeof account.avatarUrl === "string"
            ? account.avatarUrl
            : null,
      status: String(account.status ?? "connected"),
    }));
  }

  async disconnectAccount(accountId: string): Promise<void> {
    await this.withRateLimitRetry(() =>
      this.sdk.accounts.deleteAccount({
        path: { accountId },
      }),
    );
  }

  async getAccountHealth(accountId: string): Promise<IZernioAccountHealth> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.accounts.getAccountHealth({
        path: { accountId },
      }),
    );

    const health = asRecord(asRecord(response.data).health ?? response.data);
    const capabilities = asRecord(health.capabilities);

    return {
      accountId,
      canPost: Boolean(health.canPost ?? capabilities.canPost ?? true),
      needsReconnect: Boolean(
        health.needsReconnect ?? health.reconnectionRequired ?? false,
      ),
      permissions:
        typeof health.permissions === "object" && health.permissions !== null
          ? (health.permissions as Record<string, unknown>)
          : null,
    };
  }

  async createPost(input: ICreateZernioPostInput): Promise<IZernioPost> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.posts.createPost({
        headers: {
          "Idempotency-Key": input.idempotencyKey,
        },
        body: {
          content: input.content ?? undefined,
          mediaItems: input.mediaItems,
          publishNow: input.publishNow,
          scheduledFor: input.scheduledFor,
          timezone: input.timezone,
          queuedFromProfile: input.queuedFromProfile,
          queueId: input.queueId,
          metadata: input.metadata,
          platforms: input.platforms.map((platform) => ({
            platform: platform.platform,
            accountId: platform.accountId,
            customContent: platform.customContent,
            platformSpecificData: platform.platformSpecificData,
          })),
          tiktokSettings: input.tiktokSettings,
        },
      }),
    );

    const post = asRecord(asRecord(response.data).post ?? response.data);

    return mapZernioPost(post);
  }

  async updatePost(input: IUpdateZernioPostInput): Promise<IZernioPost> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.posts.updatePost({
        path: { postId: input.postId },
        body: {
          scheduledFor: input.scheduledFor,
          timezone: input.timezone,
        },
      }),
    );

    const post = asRecord(asRecord(response.data).post ?? response.data);

    return mapZernioPost(post, input.postId);
  }

  async getPost(postId: string): Promise<IZernioPost | null> {
    try {
      const response = await this.withRateLimitRetry(() =>
        this.sdk.posts.getPost({
          path: { postId },
        }),
      );

      const post = asRecord(asRecord(response.data).post ?? response.data);

      if (Object.keys(post).length === 0) {
        return null;
      }

      return mapZernioPost(post, postId);
    } catch (error) {
      if (error instanceof ZernioApiError && error.isNotFound()) {
        return null;
      }

      throw mapZernioErrorToAppError(error);
    }
  }

  async cancelPost(postId: string): Promise<void> {
    await this.withRateLimitRetry(() =>
      this.sdk.posts.deletePost({
        path: { postId },
      }),
    );
  }

  async getAnalyticsDelta(input?: {
    cursor?: string;
    limit?: number;
  }): Promise<IZernioAnalyticsDelta> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.analytics.getAnalyticsDelta({
        query: {
          cursor: input?.cursor,
          limit: input?.limit,
        },
      }),
    );

    const data = asRecord(response.data);
    const entries = asRecordArray(data.data);

    return {
      data: entries
        .map(mapZernioAnalyticsDeltaEntry)
        .filter((entry): entry is IZernioAnalyticsDeltaEntry => entry !== null),
      nextCursor: String(data.nextCursor ?? ""),
      hasMore: Boolean(data.hasMore),
    };
  }

  async getPostAnalytics(postId: string): Promise<IZernioPostAnalytics | null> {
    try {
      const response = await this.withRateLimitRetry(() =>
        this.sdk.analytics.getAnalytics({
          query: { postId },
        }),
      );

      const data = asRecord(response.data);

      if (Object.keys(data).length === 0) {
        return null;
      }

      return mapZernioPostAnalytics(data, postId);
    } catch (error) {
      if (error instanceof ZernioApiError && error.isNotFound()) {
        return null;
      }

      throw mapZernioErrorToAppError(error);
    }
  }

  async getQueueSchedule(input: {
    profileId: string;
    queueId?: string;
  }): Promise<IZernioQueueSchedule | null> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.queue.listQueueSlots({
        query: {
          profileId: input.profileId,
          ...(input.queueId ? { queueId: input.queueId } : {}),
        },
      }),
    );

    const data = asRecord(response.data);
    const queues = asRecordArray(data.queues);
    const schedule = asRecord(
      data.schedule ?? (queues.length > 0 ? queues[0] : {}) ?? data,
    );

    if (!schedule._id && !schedule.id && !data.exists) {
      return null;
    }

    const nextSlots = Array.isArray(data.nextSlots)
      ? data.nextSlots.filter((value): value is string => typeof value === "string")
      : [];

    return mapQueueSchedule(schedule, nextSlots);
  }

  async upsertQueueSchedule(input: IUpsertZernioQueueInput): Promise<IZernioQueueSchedule> {
    const body = {
      profileId: input.profileId,
      name: input.name,
      timezone: input.timezone,
      slots: input.slots,
      active: input.active ?? true,
    };

    const response = input.queueId
      ? await this.withRateLimitRetry(() =>
          this.sdk.queue.updateQueueSlot({
            body: {
              ...body,
              queueId: input.queueId,
              setAsDefault: true,
            },
          }),
        )
      : await this.withRateLimitRetry(() =>
          this.sdk.queue.createQueueSlot({
            body,
          }),
        );

    const data = asRecord(response.data);
    const schedule = asRecord(data.schedule ?? data);
    const nextSlots = Array.isArray(data.nextSlots)
      ? data.nextSlots.filter((value): value is string => typeof value === "string")
      : [];

    return mapQueueSchedule(schedule, nextSlots);
  }

  async getNextQueueSlot(input: {
    profileId: string;
    queueId?: string;
  }): Promise<IZernioNextQueueSlot | null> {
    try {
      const response = await this.withRateLimitRetry(() =>
        this.sdk.queue.getNextQueueSlot({
          query: {
            profileId: input.profileId,
            ...(input.queueId ? { queueId: input.queueId } : {}),
          },
        }),
      );

      const data = asRecord(response.data);
      const nextSlot =
        typeof data.nextSlot === "string"
          ? data.nextSlot
          : typeof data.scheduledFor === "string"
            ? data.scheduledFor
            : null;

      return { scheduledFor: nextSlot };
    } catch (error) {
      if (error instanceof ZernioApiError && error.isNotFound()) {
        return null;
      }

      throw mapZernioErrorToAppError(error);
    }
  }

  async presignUpload(
    input: IZernioPresignUploadInput,
  ): Promise<IZernioPresignUploadResult> {
    const response = await this.withRateLimitRetry(() =>
      this.sdk.media.getMediaPresignedUrl({
        body: {
          filename: input.filename,
          contentType: input.contentType,
          size: input.size,
        },
      }),
    );

    const data = asRecord(response.data);
    const uploadUrl = String(data.uploadUrl ?? "");
    const publicUrl = String(data.publicUrl ?? "");

    if (!uploadUrl || !publicUrl) {
      throw new AppError(
        "Zernio não retornou URLs de upload",
        502,
        "zernio_presign_failed",
      );
    }

    return { uploadUrl, publicUrl };
  }

  async uploadToPresignedUrl(input: {
    uploadUrl: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<void> {
    const response = await fetch(input.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": input.contentType,
      },
      body: input.buffer,
    });

    if (!response.ok) {
      throw new AppError(
        "Falha ao enviar mídia para Zernio",
        response.status,
        "zernio_media_upload_failed",
      );
    }
  }

  private async withRateLimitRetry<TData = Record<string, unknown>>(
    operation: () => Promise<{ data?: TData }>,
  ): Promise<{ data?: TData }> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        const isRateLimited =
          error instanceof ZernioApiError
            ? error.isRateLimited()
            : extractStatusCode(error) === 429;

        if (!isRateLimited || attempt === MAX_RATE_LIMIT_RETRIES) {
          throw mapZernioErrorToAppError(error);
        }

        const retryAfterSeconds = getRetryAfterSeconds(error);
        await sleep(retryAfterSeconds * 1000);
      }
    }

    throw mapZernioErrorToAppError(lastError);
  }

  private mapProfile(
    profile: Record<string, unknown> | undefined,
    fallbackName?: string,
  ): IZernioProfile {
    return {
      profileId: String(profile?._id ?? profile?.id ?? ""),
      name: String(profile?.name ?? fallbackName ?? ""),
      isDefault: Boolean(profile?.isDefault ?? false),
      createdAt: profile?.createdAt
        ? new Date(String(profile.createdAt))
        : new Date(),
    };
  }

  private mapSelectionOptions(
    items: Array<Record<string, unknown>> | undefined,
  ): IZernioSelectionOption[] {
    if (!items) {
      return [];
    }

    return items.map((item) => ({
      id: String(item.id ?? item._id ?? item.pageId ?? item.organizationId ?? ""),
      name: String(item.name ?? item.username ?? item.title ?? ""),
      avatarUrl:
        typeof item.picture === "string"
          ? item.picture
          : typeof item.avatarUrl === "string"
            ? item.avatarUrl
            : null,
      metadata: item,
    }));
  }

  private mapSelectedAccount(data: Record<string, unknown> | undefined): {
    accountId: string;
    username: string;
  } {
    const account = (data?.account as Record<string, unknown> | undefined) ?? data;

    return {
      accountId: String(account?._id ?? account?.id ?? data?.accountId ?? ""),
      username: String(
        account?.username ?? account?.name ?? data?.username ?? "",
      ),
    };
  }
}

function extractStatusCode(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function verifyZernioWebhookSignature(input: {
  rawBody: string;
  signature: string | null;
  secret: string;
}): boolean {
  if (!input.signature) {
    return false;
  }

  const computed = createHmacSha256Hex(input.secret, input.rawBody);
  return timingSafeEqualHex(computed, input.signature.toLowerCase());
}

function createHmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function timingSafeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}
