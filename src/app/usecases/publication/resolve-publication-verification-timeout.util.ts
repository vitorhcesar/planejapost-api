import type { Publication } from "@/domain/entities/publication.entity";
import { PUBLICATION_VERIFICATION_TIMEOUT_MS } from "@/domain/constants/publication-verification.constant";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ILogger } from "@/domain/services/logger.service";
import type { IZernioPostService } from "@/domain/zernio/zernio-post.service";
import { reconcilePublicationFromZernio } from "@/app/usecases/publication/reconcile-publication-from-zernio.util";
import {
  alignPendingTargetsWithAggregateStatus,
  isPublicationStatusTerminal,
} from "@/app/usecases/zernio/sync-publication-from-zernio-post.util";

const PUBLICATION_SCOPE = "Publicação";

async function repairStaleTargetStatuses(
  publication: Publication,
  publicationRepository: IPublicationRepository,
): Promise<Publication> {
  const previousTargetStatuses = publication.targets.map((target) => target.status);

  alignPendingTargetsWithAggregateStatus(publication);

  const targetsChanged = publication.targets.some(
    (target, index) => target.status !== previousTargetStatuses[index],
  );

  if (!targetsChanged) {
    return publication;
  }

  return publicationRepository.save(publication);
}

export async function resolvePublicationVerificationTimeout(
  publication: Publication,
  publicationRepository: IPublicationRepository,
  logger: ILogger,
  zernioPostService?: IZernioPostService,
  timeoutMs: number = PUBLICATION_VERIFICATION_TIMEOUT_MS,
): Promise<Publication> {
  let resolvedPublication = await repairStaleTargetStatuses(
    publication,
    publicationRepository,
  );

  if (zernioPostService) {
    resolvedPublication = await reconcilePublicationFromZernio(
      resolvedPublication,
      publicationRepository,
      zernioPostService,
      logger,
    );

    if (isPublicationStatusTerminal(resolvedPublication.status)) {
      return resolvedPublication;
    }
  }

  if (!resolvedPublication.applyVerificationTimeoutIfStale(timeoutMs)) {
    return resolvedPublication;
  }

  logger.warn(PUBLICATION_SCOPE, "Timeout de verificação — marcada como não verificada", {
    publicationId: resolvedPublication.id,
    zernioPostId: resolvedPublication.zernioPostId,
    timeoutMin: Math.round(timeoutMs / 60_000),
  });

  return publicationRepository.save(resolvedPublication);
}
