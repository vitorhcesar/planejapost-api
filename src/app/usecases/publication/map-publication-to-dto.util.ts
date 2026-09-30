import type { Publication } from "@/domain/entities/publication.entity";
import type { IPublicationDto } from "@/app/usecases/publication/dto/publication.dto";

export function mapPublicationToDto(publication: Publication): IPublicationDto {
  const data = publication.toObject();
  const objectKeys = data.objectKeys.length > 0
    ? data.objectKeys
    : data.objectKey
      ? [data.objectKey]
      : [];

  const mediaUrls =
    objectKeys.length > 0 &&
    (objectKeys[0]?.startsWith("http://") || objectKeys[0]?.startsWith("https://"))
      ? objectKeys
      : [data.mediaUrl];

  return {
    id: data.id,
    type: data.type,
    destinationScope: data.destinationScope,
    caption: data.caption,
    mediaUrl: data.mediaUrl,
    mediaUrls,
    zernioPostId: data.zernioPostId,
    status: data.status,
    targets: data.targets.map((target) => ({
      id: target.id,
      socialConnectedAccountId: target.socialConnectedAccountId,
      platform: target.platform,
      zernioAccountId: target.zernioAccountId,
      status: target.status,
      platformPostId: target.platformPostId,
      platformPostUrl: target.platformPostUrl,
      errorMessage: target.errorMessage,
      errorCode: target.errorCode,
    })),
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  };
}
