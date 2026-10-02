import type { IPublicationAnalyticsCacheRepository } from "@/domain/repositories/publication-analytics-cache.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { IZernioAnalyticsSyncStateRepository } from "@/domain/repositories/zernio-analytics-sync-state.repository";
import type { IZernioAnalyticsService } from "@/domain/zernio/zernio-analytics.service";
import { mapZernioAnalyticsToDto } from "@/app/usecases/publication/map-zernio-analytics-to-dto.util";

const MAX_DELTA_PAGES = 10;
const DELTA_PAGE_LIMIT = 100;

export interface ISyncPublicationAnalyticsFromDeltaResult {
  updatedPublicationIds: string[];
  affectedPostIds: string[];
}

async function refreshPublicationAnalyticsCache(
  publicationId: string,
  zernioPostId: string,
  zernioAnalyticsService: IZernioAnalyticsService,
  publicationAnalyticsCacheRepository: IPublicationAnalyticsCacheRepository,
): Promise<boolean> {
  const analytics = await zernioAnalyticsService.getPostAnalytics(zernioPostId);

  if (!analytics) {
    return false;
  }

  await publicationAnalyticsCacheRepository.upsert({
    publicationId,
    zernioPostId,
    analytics: mapZernioAnalyticsToDto(analytics),
    syncedAt: new Date(),
  });

  return true;
}

export async function syncPublicationAnalyticsFromZernioDelta(input: {
  zernioAnalyticsService: IZernioAnalyticsService;
  zernioAnalyticsSyncStateRepository: IZernioAnalyticsSyncStateRepository;
  publicationRepository: IPublicationRepository;
  publicationAnalyticsCacheRepository: IPublicationAnalyticsCacheRepository;
}): Promise<ISyncPublicationAnalyticsFromDeltaResult> {
  const state = await input.zernioAnalyticsSyncStateRepository.getState();
  let cursor = state.nextCursor ?? undefined;
  const affectedPostIds = new Set<string>();

  for (let page = 0; page < MAX_DELTA_PAGES; page += 1) {
    const delta = await input.zernioAnalyticsService.getAnalyticsDelta({
      cursor,
      limit: DELTA_PAGE_LIMIT,
    });

    if (delta.nextCursor) {
      await input.zernioAnalyticsSyncStateRepository.saveNextCursor(delta.nextCursor);
    }

    for (const entry of delta.data) {
      if (!entry.isDeleted) {
        affectedPostIds.add(entry.postId);
      }
    }

    cursor = delta.nextCursor || undefined;

    if (!delta.hasMore) {
      break;
    }
  }

  const updatedPublicationIds: string[] = [];

  for (const postId of affectedPostIds) {
    const publication = await input.publicationRepository.findByZernioPostId(postId);

    if (!publication?.zernioPostId) {
      continue;
    }

    const updated = await refreshPublicationAnalyticsCache(
      publication.id,
      publication.zernioPostId,
      input.zernioAnalyticsService,
      input.publicationAnalyticsCacheRepository,
    );

    if (updated) {
      updatedPublicationIds.push(publication.id);
    }
  }

  return {
    updatedPublicationIds,
    affectedPostIds: Array.from(affectedPostIds),
  };
}

export async function refreshPublicationAnalyticsForZernioAccount(input: {
  zernioAccountId: string;
  zernioAnalyticsService: IZernioAnalyticsService;
  publicationRepository: IPublicationRepository;
  publicationAnalyticsCacheRepository: IPublicationAnalyticsCacheRepository;
}): Promise<string[]> {
  const publications =
    await input.publicationRepository.findAnalyticsEligibleByZernioAccountId(
      input.zernioAccountId,
    );

  const updatedPublicationIds: string[] = [];

  for (const publication of publications) {
    if (!publication.zernioPostId) {
      continue;
    }

    const updated = await refreshPublicationAnalyticsCache(
      publication.id,
      publication.zernioPostId,
      input.zernioAnalyticsService,
      input.publicationAnalyticsCacheRepository,
    );

    if (updated) {
      updatedPublicationIds.push(publication.id);
    }
  }

  return updatedPublicationIds;
}
