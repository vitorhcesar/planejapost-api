import type { Publication } from "@/domain/entities/publication.entity";
import type { PublicationTarget } from "@/domain/entities/publication.entity";
import {
  PublicationStatusEnum,
  PublicationTargetStatusEnum,
} from "@/domain/enums/publication.enum";
import type { IZernioPostWebhookPlatformEntry } from "@/app/usecases/zernio/parse-zernio-post-webhook-payload.util";

export function applyPlatformEntryToTarget(
  target: PublicationTarget,
  entry: IZernioPostWebhookPlatformEntry,
): PublicationTarget {
  const normalizedStatus = entry.status.toLowerCase();

  if (normalizedStatus === "published" || normalizedStatus === "success") {
    target.markAsSuccess(entry.platformPostId ?? "", entry.publishedUrl);
    return target;
  }

  if (normalizedStatus === "failed" || normalizedStatus === "failure") {
    target.markAsFailed(
      entry.errorMessage ?? "Falha na publicação",
      entry.errorCode,
    );
    return target;
  }

  return target;
}

export function syncPublicationTargetsFromPlatformEntries(
  publication: Publication,
  platformEntries: IZernioPostWebhookPlatformEntry[],
): void {
  if (platformEntries.length === 0) {
    return;
  }

  const targets = publication.targets.map((target) => {
    const entry = platformEntries.find(
      (platformEntry) => platformEntry.accountId === target.zernioAccountId,
    );

    if (!entry) {
      return target;
    }

    return applyPlatformEntryToTarget(target, entry);
  });

  publication.replaceTargets(targets);
}

export function mapZernioPostAggregateStatus(
  status: string,
): PublicationStatusEnum | null {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus === "published") {
    return PublicationStatusEnum.COMPLETED;
  }

  if (normalizedStatus === "partial") {
    return PublicationStatusEnum.PARTIAL_FAILURE;
  }

  if (normalizedStatus === "failed") {
    return PublicationStatusEnum.FAILED;
  }

  if (normalizedStatus === "scheduled") {
    return PublicationStatusEnum.SCHEDULED;
  }

  if (normalizedStatus === "cancelled") {
    return PublicationStatusEnum.CANCELLED;
  }

  if (normalizedStatus === "publishing" || normalizedStatus === "processing") {
    return PublicationStatusEnum.PROCESSING;
  }

  return null;
}

export function syncPublicationFromZernioPost(input: {
  publication: Publication;
  postStatus: string;
  platformEntries: IZernioPostWebhookPlatformEntry[];
}): boolean {
  const previousStatus = input.publication.status;
  const previousTargetStatuses = input.publication.targets.map((target) => target.status);

  syncPublicationTargetsFromPlatformEntries(
    input.publication,
    input.platformEntries,
  );

  const aggregateStatus = mapZernioPostAggregateStatus(input.postStatus);

  if (aggregateStatus) {
    input.publication.applyAggregateStatus(aggregateStatus);
  }

  alignPendingTargetsWithAggregateStatus(input.publication);
  input.publication.finalizeStatus();

  const statusChanged = input.publication.status !== previousStatus;
  const targetsChanged = input.publication.targets.some(
    (target, index) => target.status !== previousTargetStatuses[index],
  );

  return statusChanged || targetsChanged;
}

export function alignPendingTargetsWithAggregateStatus(publication: Publication): void {
  if (publication.status === PublicationStatusEnum.COMPLETED) {
    const targets = publication.targets.map((target) => {
      if (
        target.status === PublicationTargetStatusEnum.PENDING ||
        target.status === PublicationTargetStatusEnum.PROCESSING
      ) {
        target.markAsSuccess(
          target.platformPostId ?? "",
          target.platformPostUrl,
        );
      }

      return target;
    });

    publication.replaceTargets(targets);
    return;
  }

  if (publication.status === PublicationStatusEnum.FAILED) {
    const targets = publication.targets.map((target) => {
      if (
        target.status === PublicationTargetStatusEnum.PENDING ||
        target.status === PublicationTargetStatusEnum.PROCESSING
      ) {
        target.markAsFailed("Falha na publicação", null);
      }

      return target;
    });

    publication.replaceTargets(targets);
  }
}

export function publicationNeedsZernioReconciliation(
  publication: Publication,
): boolean {
  return (
    (publication.status === PublicationStatusEnum.PROCESSING ||
      publication.status === PublicationStatusEnum.PENDING) &&
    Boolean(publication.zernioPostId)
  );
}

export function isPublicationStatusTerminal(status: PublicationStatusEnum): boolean {
  return (
    status === PublicationStatusEnum.COMPLETED ||
    status === PublicationStatusEnum.FAILED ||
    status === PublicationStatusEnum.PARTIAL_FAILURE ||
    status === PublicationStatusEnum.UNVERIFIED ||
    status === PublicationStatusEnum.CANCELLED
  );
}
