import type { IAdminDashboardMetricsDto } from "@/app/usecases/admin/dto/admin-dashboard.dto";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IPublicationRepository } from "@/domain/repositories/publication.repository";
import { PublicationTypeEnum } from "@/domain/enums/publication.enum";
import { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";

export class GetAdminDashboardMetricsUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly socialAccountRepository: ISocialConnectedAccountRepository,
    private readonly publicationRepository: IPublicationRepository,
  ) {}

  async execute(): Promise<IAdminDashboardMetricsDto> {
    const [totalUsers, totalSocialAccounts, totalPosts, totalStories] =
      await Promise.all([
        this.userRepository.count(),
        this.socialAccountRepository.countByStatus(
          SocialAccountStatusEnum.CONNECTED,
        ),
        this.publicationRepository.countByType(PublicationTypeEnum.POST),
        this.publicationRepository.countByType(PublicationTypeEnum.STORY),
      ]);

    return {
      totalUsers,
      totalSocialAccounts,
      totalPosts,
      totalStories,
    };
  }
}
