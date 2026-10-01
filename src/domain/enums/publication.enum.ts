export enum PublicationTypeEnum {
  POST = "post",
  STORY = "story",
}

export enum PublicationDestinationScopeEnum {
  ALL = "all",
  WORKSPACE = "workspace",
  SELECTED = "selected",
}

export enum PublicationStatusEnum {
  PENDING = "pending",
  SCHEDULED = "scheduled",
  PROCESSING = "processing",
  COMPLETED = "completed",
  PARTIAL_FAILURE = "partial_failure",
  FAILED = "failed",
  UNVERIFIED = "unverified",
  CANCELLED = "cancelled",
  DRAFT = "draft",
}

export enum PublishModeEnum {
  NOW = "now",
  SCHEDULED = "scheduled",
  QUEUED = "queued",
  DRAFT = "draft",
}

export enum PublicationTargetStatusEnum {
  PENDING = "pending",
  PROCESSING = "processing",
  SUCCESS = "success",
  FAILED = "failed",
  UNVERIFIED = "unverified",
}
