import type {
  Publication as PrismaPublication,
  PublicationTarget as PrismaPublicationTarget,
} from "../../../../../generated/prisma";
import {
  Publication,
  PublicationTarget,
} from "@/domain/entities/publication.entity";
import {
  PublicationDestinationScopeEnum,
  PublicationStatusEnum,
  PublicationTargetStatusEnum,
  PublicationTypeEnum,
} from "@/domain/enums/publication.enum";
import {
  SocialPlatformEnum,
  isSocialPlatform,
} from "@/domain/enums/social-platform.enum";

type TPrismaPublicationWithTargets = PrismaPublication & {
  targets: PrismaPublicationTarget[];
};

export class PublicationMapper {
  static toDomain(row: TPrismaPublicationWithTargets): Publication {
    return Publication.restore({
      id: row.id,
      userId: row.userId,
      type: PublicationMapper.toPublicationType(row.type),
      destinationScope: PublicationMapper.toDestinationScope(row.destinationScope),
      caption: row.caption,
      mediaUrl: row.mediaUrl,
      objectKey: row.objectKey,
      objectKeys: row.objectKeys.length > 0 ? row.objectKeys : row.objectKey ? [row.objectKey] : [],
      zernioPostId: row.zernioPostId,
      idempotencyKey: row.idempotencyKey,
      status: PublicationMapper.toPublicationStatus(row.status),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      targets: row.targets.map((target) => ({
        id: target.id,
        publicationId: target.publicationId,
        socialConnectedAccountId: target.socialConnectedAccountId,
        platform: PublicationMapper.toPlatform(target.platform),
        zernioAccountId: target.zernioAccountId,
        status: PublicationMapper.toTargetStatus(target.status),
        platformPostId: target.platformPostId,
        platformPostUrl: target.platformPostUrl,
        errorMessage: target.errorMessage,
        errorCode: target.errorCode,
        createdAt: target.createdAt,
        updatedAt: target.updatedAt,
      })),
    });
  }

  static toPrismaCreate(publication: Publication) {
    const data = publication.toObject();

    return {
      userId: data.userId,
      type: data.type,
      destinationScope: data.destinationScope,
      caption: data.caption,
      mediaUrl: data.mediaUrl,
      objectKey: data.objectKey,
      objectKeys: data.objectKeys,
      zernioPostId: data.zernioPostId,
      idempotencyKey: data.idempotencyKey,
      status: data.status,
      targets: {
        create: data.targets.map((target) => ({
          socialConnectedAccountId: target.socialConnectedAccountId,
          platform: target.platform,
          zernioAccountId: target.zernioAccountId,
          status: target.status,
          platformPostId: target.platformPostId,
          platformPostUrl: target.platformPostUrl,
          errorMessage: target.errorMessage,
          errorCode: target.errorCode,
        })),
      },
    };
  }

  static targetToPrismaUpdate(target: PublicationTarget) {
    const data = target.toObject();

    return {
      status: data.status,
      platformPostId: data.platformPostId,
      platformPostUrl: data.platformPostUrl,
      errorMessage: data.errorMessage,
      errorCode: data.errorCode,
      updatedAt: data.updatedAt,
    };
  }

  static publicationToPrismaUpdate(publication: Publication) {
    const data = publication.toObject();

    return {
      status: data.status,
      zernioPostId: data.zernioPostId,
      objectKey: data.objectKey,
      objectKeys: data.objectKeys,
      updatedAt: data.updatedAt,
    };
  }

  private static toPublicationType(type: string): PublicationTypeEnum {
    return type === PublicationTypeEnum.STORY
      ? PublicationTypeEnum.STORY
      : PublicationTypeEnum.POST;
  }

  private static toDestinationScope(
    scope: string,
  ): PublicationDestinationScopeEnum {
    return scope === PublicationDestinationScopeEnum.SELECTED
      ? PublicationDestinationScopeEnum.SELECTED
      : PublicationDestinationScopeEnum.ALL;
  }

  private static toPublicationStatus(status: string): PublicationStatusEnum {
    switch (status) {
      case PublicationStatusEnum.PROCESSING:
        return PublicationStatusEnum.PROCESSING;
      case PublicationStatusEnum.COMPLETED:
        return PublicationStatusEnum.COMPLETED;
      case PublicationStatusEnum.PARTIAL_FAILURE:
        return PublicationStatusEnum.PARTIAL_FAILURE;
      case PublicationStatusEnum.FAILED:
        return PublicationStatusEnum.FAILED;
      case PublicationStatusEnum.UNVERIFIED:
        return PublicationStatusEnum.UNVERIFIED;
      default:
        return PublicationStatusEnum.PENDING;
    }
  }

  private static toTargetStatus(status: string): PublicationTargetStatusEnum {
    switch (status) {
      case PublicationTargetStatusEnum.PROCESSING:
        return PublicationTargetStatusEnum.PROCESSING;
      case PublicationTargetStatusEnum.SUCCESS:
        return PublicationTargetStatusEnum.SUCCESS;
      case PublicationTargetStatusEnum.FAILED:
        return PublicationTargetStatusEnum.FAILED;
      case PublicationTargetStatusEnum.UNVERIFIED:
        return PublicationTargetStatusEnum.UNVERIFIED;
      default:
        return PublicationTargetStatusEnum.PENDING;
    }
  }

  private static toPlatform(platform: string): SocialPlatformEnum {
    return isSocialPlatform(platform)
      ? platform
      : SocialPlatformEnum.INSTAGRAM;
  }
}
