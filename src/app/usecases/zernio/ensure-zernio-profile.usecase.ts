import { AppError } from "@/domain/errors/app.error";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IZernioProfileService } from "@/domain/zernio/zernio-profile.service";
import {
  getExistingProfileIdFromError,
  mapZernioErrorToAppError,
} from "@/domain/zernio/map-zernio-error.util";

export class EnsureZernioProfileUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly zernioProfileService: IZernioProfileService,
  ) {}

  async execute(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("Usuário não encontrado", 404, "user_not_found");
    }

    if (user.zernioProfileId) {
      return user.zernioProfileId;
    }

    try {
      const profile = await this.zernioProfileService.createProfile({
        name: userId,
        description: `PlanejaPost user ${user.email}`,
      });

      await this.userRepository.updateZernioProfileId(userId, profile.profileId);
      return profile.profileId;
    } catch (error) {
      const existingProfileId = getExistingProfileIdFromError(error);

      if (existingProfileId) {
        await this.userRepository.updateZernioProfileId(
          userId,
          existingProfileId,
        );
        return existingProfileId;
      }

      throw mapZernioErrorToAppError(error);
    }
  }
}
