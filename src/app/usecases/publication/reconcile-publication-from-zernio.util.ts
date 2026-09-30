import type { Publication } from "@/domain/entities/publication.entity";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ILogger } from "@/domain/services/logger.service";
import type { IZernioPostService } from "@/domain/zernio/zernio-post.service";
import {
  publicationNeedsZernioReconciliation,
  syncPublicationFromZernioPost,
} from "@/app/usecases/zernio/sync-publication-from-zernio-post.util";
import { mapZernioPostPlatformEntriesToWebhookEntries } from "@/app/usecases/zernio/parse-zernio-post-webhook-payload.util";

const PUBLICATION_SCOPE = "Publicação";

export async function reconcilePublicationFromZernio(
  publication: Publication,
  publicationRepository: IPublicationRepository,
  zernioPostService: IZernioPostService,
  logger: ILogger,
): Promise<Publication> {
  if (!publicationNeedsZernioReconciliation(publication) || !publication.zernioPostId) {
    return publication;
  }

  const zernioPost = await zernioPostService.getPost(publication.zernioPostId);

  if (!zernioPost) {
    return publication;
  }

  const changed = syncPublicationFromZernioPost({
    publication,
    postStatus: zernioPost.status,
    platformEntries: mapZernioPostPlatformEntriesToWebhookEntries(zernioPost.platforms),
  });

  if (!changed) {
    return publication;
  }

  logger.info(PUBLICATION_SCOPE, "Status reconciliado via Zernio", {
    publicationId: publication.id,
    zernioPostId: publication.zernioPostId,
    status: publication.status,
  });

  return publicationRepository.save(publication);
}
