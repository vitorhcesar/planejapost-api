type TZernioRecord = Record<string, unknown>;

function asRecord(value: unknown): TZernioRecord {
  return value && typeof value === "object" ? (value as TZernioRecord) : {};
}

function asRecordArray(value: unknown): TZernioRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export interface IZernioPostWebhookPlatformEntry {
  accountId: string;
  platformPostId: string | null;
  publishedUrl: string | null;
  status: string;
  errorMessage: string | null;
  errorCode: string | null;
}

export function extractZernioPostId(payload: TZernioRecord): string | null {
  const post = asRecord(payload.post);

  return (
    asNonEmptyString(post.id) ??
    asNonEmptyString(post._id) ??
    asNonEmptyString(payload.postId)
  );
}

export function extractZernioPublicationIdFromMetadata(
  payload: TZernioRecord,
): string | null {
  const post = asRecord(payload.post);
  const metadata = asRecord(post.metadata);

  return asNonEmptyString(metadata.publicationId);
}

export function extractZernioAccountId(payload: TZernioRecord): string | null {
  const account = asRecord(payload.account);

  return (
    asNonEmptyString(account.accountId) ??
    asNonEmptyString(account._id) ??
    asNonEmptyString(account.id) ??
    asNonEmptyString(payload.accountId)
  );
}

export function extractPlatformPublishedUrl(platformBlock: TZernioRecord): string | null {
  return (
    asNonEmptyString(platformBlock.publishedUrl) ??
    asNonEmptyString(platformBlock.platformPostUrl) ??
    asNonEmptyString(platformBlock.url)
  );
}

export function extractPlatformPostId(platformBlock: TZernioRecord): string | null {
  return (
    asNonEmptyString(platformBlock.platformPostId) ??
    asNonEmptyString(platformBlock.postId)
  );
}

export function extractPostWebhookPlatformEntries(
  payload: TZernioRecord,
): IZernioPostWebhookPlatformEntry[] {
  const post = asRecord(payload.post);

  return mapZernioPostRecordToPlatformEntries(post);
}

export function mapZernioPostRecordToPlatformEntries(
  post: TZernioRecord,
): IZernioPostWebhookPlatformEntry[] {
  return asRecordArray(post.platforms)
    .map((entry) => ({
      accountId: asNonEmptyString(entry.accountId) ?? "",
      platformPostId: asNonEmptyString(entry.platformPostId),
      publishedUrl:
        asNonEmptyString(entry.publishedUrl) ??
        asNonEmptyString(entry.platformPostUrl) ??
        asNonEmptyString(entry.url),
      status: String(entry.status ?? ""),
      errorMessage: asNonEmptyString(entry.error),
      errorCode:
        asNonEmptyString(entry.errorCategory) ?? asNonEmptyString(entry.errorCode),
    }))
    .filter((entry) => entry.accountId.length > 0);
}

export function mapZernioPostPlatformEntriesToWebhookEntries(
  platforms: Array<{
    accountId: string;
    platformPostId: string | null;
    publishedUrl: string | null;
    status: string;
    errorMessage: string | null;
    errorCode: string | null;
  }>,
): IZernioPostWebhookPlatformEntry[] {
  return platforms.map((entry) => ({
    accountId: entry.accountId,
    platformPostId: entry.platformPostId,
    publishedUrl: entry.publishedUrl,
    status: entry.status,
    errorMessage: entry.errorMessage,
    errorCode: entry.errorCode,
  }));
}
