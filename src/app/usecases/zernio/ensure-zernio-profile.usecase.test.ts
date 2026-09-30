import { describe, expect, test } from "bun:test";
import { EnsureZernioProfileUseCase } from "@/app/usecases/zernio/ensure-zernio-profile.usecase";
import { User } from "@/domain/entities/user.entity";
import { AppError } from "@/domain/errors/app.error";
import { AppRoleEnum } from "@/domain/enums/app-role.enum";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { IZernioProfileService } from "@/domain/zernio/zernio-profile.service";

class InMemoryUserRepository implements Partial<IUserRepository> {
  constructor(public user: User | null) {}

  findById = async () => this.user;

  updateZernioProfileId = async (_id: string, zernioProfileId: string) => {
    if (this.user) {
      this.user.setZernioProfileId(zernioProfileId);
    }

    return this.user!;
  };
}

class StubZernioProfileService implements IZernioProfileService {
  createCalls = 0;

  constructor(private readonly result: { profileId: string } | AppError) {}

  createProfile = async () => {
    this.createCalls += 1;

    if (this.result instanceof AppError) {
      throw this.result;
    }

    return {
      profileId: this.result.profileId,
      name: "user-1",
      isDefault: false,
      createdAt: new Date(),
    };
  };

  listProfiles = async () => [];

  getProfile = async () => null;
}

function createUser(withProfile = false): User {
  return User.restore({
    id: "user-1",
    name: "User",
    email: "user@example.com",
    emailVerified: true,
    image: null,
    role: AppRoleEnum.CLIENT,
    zernioProfileId: withProfile ? "profile-existing" : null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe("EnsureZernioProfileUseCase", () => {
  test("returns existing profile id without calling Zernio", async () => {
    const user = createUser(true);
    const profileService = new StubZernioProfileService({ profileId: "profile-new" });
    const useCase = new EnsureZernioProfileUseCase(
      new InMemoryUserRepository(user) as unknown as IUserRepository,
      profileService,
    );

    const profileId = await useCase.execute("user-1");

    expect(profileId).toBe("profile-existing");
    expect(profileService.createCalls).toBe(0);
  });

  test("creates profile and persists zernioProfileId", async () => {
    const user = createUser(false);
    const profileService = new StubZernioProfileService({ profileId: "profile-new" });
    const useCase = new EnsureZernioProfileUseCase(
      new InMemoryUserRepository(user) as unknown as IUserRepository,
      profileService,
    );

    const profileId = await useCase.execute("user-1");

    expect(profileId).toBe("profile-new");
    expect(profileService.createCalls).toBe(1);
    expect(user.zernioProfileId).toBe("profile-new");
  });

  test("reuses existingProfileId from conflict error", async () => {
    const user = createUser(false);
    const profileService = new StubZernioProfileService(
      new AppError("Perfil já existe", 409, "profile_name_conflict", {
        existingProfileId: "profile-from-error",
      }),
    );
    const useCase = new EnsureZernioProfileUseCase(
      new InMemoryUserRepository(user) as unknown as IUserRepository,
      profileService,
    );

    const profileId = await useCase.execute("user-1");

    expect(profileId).toBe("profile-from-error");
    expect(user.zernioProfileId).toBe("profile-from-error");
  });
});
