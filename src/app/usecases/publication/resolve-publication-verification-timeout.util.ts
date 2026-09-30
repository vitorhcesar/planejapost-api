import type { Publication } from "@/domain/entities/publication.entity";
import { PUBLICATION_VERIFICATION_TIMEOUT_MS } from "@/domain/constants/publication-verification.constant";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import type { ILogger } from "@/domain/services/logger.service";

const PUBLICATION_SCOPE = "Publicação";

export async function resolvePublicationVerificationTimeout(
  publication: Publication,
  publicationRepository: IPublicationRepository,
  logger: ILogger,
  timeoutMs: number = PUBLICATION_VERIFICATION_TIMEOUT_MS,
): Promise<Publication> {
  if (!publication.applyVerificationTimeoutIfStale(timeoutMs)) {
    return publication;
  }

  logger.warn(PUBLICATION_SCOPE, "Timeout de verificação — marcada como não verificada", {
    publicationId: publication.id,
    zernioPostId: publication.zernioPostId,
    timeoutMin: Math.round(timeoutMs / 60_000),
  });

  return publicationRepository.save(publication);
}
