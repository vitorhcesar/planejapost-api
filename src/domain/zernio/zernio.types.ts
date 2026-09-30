import type { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";

export type TZernioPlatform = SocialPlatformEnum;

export interface IZernioProfile {
  profileId: string;
  name: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface ICreateZernioProfileInput {
  name: string;
  description?: string;
}

export interface IZernioConnectUrlInput {
  platform: TZernioPlatform;
  profileId: string;
  redirectUrl: string;
  scopes?: string;
  headless?: boolean;
  loginMethod?: string;
}

export interface IZernioConnectUrlResult {
  authUrl: string;
}

export interface IZernioAccount {
  accountId: string;
  profileId: string;
  platform: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
}

export interface IZernioAccountHealth {
  accountId: string;
  canPost: boolean;
  needsReconnect: boolean;
  permissions: Record<string, unknown> | null;
}

export interface IZernioPresignUploadInput {
  filename: string;
  contentType: string;
  size: number;
}

export interface IZernioPresignUploadResult {
  uploadUrl: string;
  publicUrl: string;
}

export interface IZernioMediaItem {
  type: "image" | "video";
  url: string;
}

export interface IZernioPostPlatformInput {
  platform: TZernioPlatform;
  accountId: string;
  platformSpecificData?: Record<string, unknown>;
}

export interface ICreateZernioPostInput {
  content?: string | null;
  mediaItems: IZernioMediaItem[];
  publishNow?: boolean;
  scheduledFor?: string;
  timezone?: string;
  queuedFromProfile?: string;
  queueId?: string;
  platforms: IZernioPostPlatformInput[];
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
  tiktokSettings?: Record<string, unknown>;
}

export interface IUpdateZernioPostInput {
  postId: string;
  scheduledFor: string;
  timezone?: string;
}

export interface IZernioPostPlatformEntry {
  accountId: string;
  platformPostId: string | null;
  publishedUrl: string | null;
  status: string;
  errorMessage: string | null;
  errorCode: string | null;
}

export interface IZernioPost {
  postId: string;
  status: string;
  scheduledFor: string | null;
  timezone: string | null;
  platforms: IZernioPostPlatformEntry[];
}

export interface IZernioSelectionOption {
  id: string;
  name: string;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
}

export interface IZernioSelectFacebookPageInput {
  profileId: string;
  tempToken: string;
  pageId: string;
  connectToken?: string;
}

export interface IZernioSelectLinkedInOrganizationInput {
  profileId: string;
  tempToken: string;
  organizationId: string;
  connectToken?: string;
}

export interface IZernioApiErrorShape {
  statusCode: number;
  message: string;
  code?: string;
  type?: string;
  details?: Record<string, unknown>;
}
