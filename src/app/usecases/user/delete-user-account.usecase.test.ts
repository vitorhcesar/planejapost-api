import { describe, expect, it } from "bun:test";
import { DeleteUserAccountUseCase } from "@/app/usecases/user/delete-user-account.usecase";
import { SocialConnectedAccount } from "@/domain/entities/social-connected-account.entity";
import { User } from "@/domain/entities/user.entity";
import { SocialAccountStatusEnum } from "@/domain/enums/social-account.enum";
import { SocialPlatformEnum } from "@/domain/enums/social-platform.enum";
import { SubscriptionStatusEnum } from "@/domain/enums/subscription.enum";
import { AppError } from "@/domain/errors/app.error";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type {
  ISubscriptionRepository,
  ISubscriptionWithPlan,
} from "@/domain/repositories/subscription.repository";
import type { IUserRepository } from "@/domain/repositories/user.repository";
import type { ILogger } from "@/domain/services/logger.service";
import type { IZernioAccountService } from "@/domain/zernio/zernio-account.service";

class InMemoryUserRepository {
  users: User[] = [];
  deletedIds: string[] = [];

  async findById(id: string) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail() {
    return null;
  }

  async save(user: User) {
    this.users = [...this.users.filter((item) => item.id !== user.id), user];
    return user;
  }

  async deleteById(id: string) {
    this.deletedIds.push(id);
    this.users = this.users.filter((user) => user.id !== id);
  }

  async countAll() {
    return this.users.length;
  }

  async countSocialAccountsByUserId() {
    return 0;
  }

  async countWorkspacesByUserId() {
    return 0;
  }

  async countPublicationsByUserId() {
    return 0;
  }

  async listPaginated() {
    return { users: [], total: 0 };
  }
}

class InMemorySocialConnectedAccountRepository
  implements ISocialConnectedAccountRepository
{
  accounts: SocialConnectedAccount[] = [];

  async findById() {
    return null;
  }

  async findByIdAndUserId() {
    return null;
  }

  async findByUserId() {
    return this.accounts;
  }

  async findConnectedByWorkspaceId() {
    return [];
  }

  async findByUserIdAndZernioAccountId() {
    return null;
  }

  async findByZernioAccountId() {
    return null;
  }

  async findConnectedByUserId(userId: string) {
    return this.accounts.filter(
      (account) =>
        account.userId === userId &&
        account.status === SocialAccountStatusEnum.CONNECTED,
    );
  }

  async save(account: SocialConnectedAccount) {
    this.accounts = [
      ...this.accounts.filter((item) => item.id !== account.id),
      account,
    ];
    return account;
  }

  async deleteByIdAndUserId(id: string, userId: string) {
    this.accounts = this.accounts.filter(
      (account) => account.id !== id || account.userId !== userId,
    );
  }

  async countAll() {
    return this.accounts.length;
  }

  async countByStatus() {
    return 0;
  }
}

class InMemorySubscriptionRepository implements Partial<ISubscriptionRepository> {
  subscriptions: ISubscriptionWithPlan[] = [];
  canceledIds: string[] = [];

  async findByUserId(userId: string) {
    return this.subscriptions.find((item) => item.userId === userId) ?? null;
  }

  async setCanceled(id: string) {
    this.canceledIds.push(id);
    this.subscriptions = this.subscriptions.map((item) =>
      item.id === id
        ? { ...item, status: SubscriptionStatusEnum.CANCELED }
        : item,
    );
    return this.subscriptions.find((item) => item.id === id)!;
  }
}

class InMemoryZernioAccountService implements IZernioAccountService {
  disconnectedAccountIds: string[] = [];
  shouldFailFor: string[] = [];

  async disconnectAccount(accountId: string) {
    if (this.shouldFailFor.includes(accountId)) {
      throw new Error("Zernio unavailable");
    }

    this.disconnectedAccountIds.push(accountId);
  }

  async listAccounts() {
    return [];
  }

  async getAccountHealth(accountId: string) {
    return {
      accountId,
      canPost: true,
      needsReconnect: false,
      permissions: {},
    };
  }
}

class NoopLogger implements ILogger {
  info() {}

  warn() {}

  error() {}
}

function createConnectedAccount(userId: string, zernioAccountId: string) {
  return SocialConnectedAccount.restore({
    id: `account-${zernioAccountId}`,
    userId,
    workspaceId: "workspace-1",
    platform: SocialPlatformEnum.INSTAGRAM,
    zernioAccountId,
    zernioProfileId: "profile-1",
    username: "creator",
    displayName: "Creator",
    avatarUrl: null,
    status: SocialAccountStatusEnum.CONNECTED,
    canPost: true,
    needsReconnect: false,
    permissions: null,
    connectedAt: new Date("2026-01-01T00:00:00.000Z"),
    disconnectedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
}

function createUser(id: string) {
  return User.restore({
    id,
    name: "Jane Doe",
    email: "jane@example.com",
    emailVerified: true,
    image: null,
    role: "client" as never,
    zernioProfileId: "profile-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  });
}

function createSubscription(userId: string): ISubscriptionWithPlan {
  return {
    id: "sub-1",
    userId,
    planId: "essential",
    status: SubscriptionStatusEnum.ACTIVE,
    preferredPaymentMethod: null,
    currentPeriodStart: new Date("2026-10-01T00:00:00.000Z"),
    currentPeriodEnd: new Date("2026-11-01T00:00:00.000Z"),
    dueAt: new Date("2026-11-01T00:00:00.000Z"),
    gracePeriodEndsAt: null,
    cancelAtPeriodEnd: false,
    scheduledPlanId: null,
    stripeCustomerId: null,
    trialEndsAt: null,
    trialGrantedAt: null,
    trialGrantedByUserId: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    updatedAt: new Date("2026-10-01T00:00:00.000Z"),
    plan: {
      id: "essential",
      name: "Essencial",
      priceMonthlyBrl: 49,
      connectionsLimit: 2,
      postsPerMonthLimit: 500,
      features: {},
    },
  };
}

describe("DeleteUserAccountUseCase", () => {
  it("disconnects social accounts, cancels subscription and deletes user", async () => {
    const userRepository = new InMemoryUserRepository();
    const socialRepository = new InMemorySocialConnectedAccountRepository();
    const subscriptionRepository = new InMemorySubscriptionRepository();
    const zernioAccountService = new InMemoryZernioAccountService();

    userRepository.users = [createUser("user-1")];
    socialRepository.accounts = [
      createConnectedAccount("user-1", "zernio-acc-1"),
      createConnectedAccount("user-1", "zernio-acc-2"),
    ];
    subscriptionRepository.subscriptions = [createSubscription("user-1")];

    await new DeleteUserAccountUseCase(
      userRepository as unknown as IUserRepository,
      socialRepository,
      subscriptionRepository as unknown as ISubscriptionRepository,
      zernioAccountService,
      new NoopLogger(),
    ).execute("user-1");

    expect(zernioAccountService.disconnectedAccountIds).toEqual([
      "zernio-acc-1",
      "zernio-acc-2",
    ]);
    expect(subscriptionRepository.canceledIds).toEqual(["sub-1"]);
    expect(userRepository.deletedIds).toEqual(["user-1"]);
    expect(await userRepository.findById("user-1")).toBeNull();
  });

  it("continues deleting user when Zernio disconnect fails", async () => {
    const userRepository = new InMemoryUserRepository();
    const socialRepository = new InMemorySocialConnectedAccountRepository();
    const subscriptionRepository = new InMemorySubscriptionRepository();
    const zernioAccountService = new InMemoryZernioAccountService();

    userRepository.users = [createUser("user-1")];
    socialRepository.accounts = [
      createConnectedAccount("user-1", "zernio-acc-1"),
      createConnectedAccount("user-1", "zernio-acc-2"),
    ];
    zernioAccountService.shouldFailFor = ["zernio-acc-1"];

    await new DeleteUserAccountUseCase(
      userRepository as unknown as IUserRepository,
      socialRepository,
      subscriptionRepository as unknown as ISubscriptionRepository,
      zernioAccountService,
      new NoopLogger(),
    ).execute("user-1");

    expect(zernioAccountService.disconnectedAccountIds).toEqual(["zernio-acc-2"]);
    expect(userRepository.deletedIds).toEqual(["user-1"]);
  });

  it("throws when the user does not exist", async () => {
    const userRepository = new InMemoryUserRepository();

    try {
      await new DeleteUserAccountUseCase(
        userRepository as unknown as IUserRepository,
        new InMemorySocialConnectedAccountRepository(),
        new InMemorySubscriptionRepository() as unknown as ISubscriptionRepository,
        new InMemoryZernioAccountService(),
        new NoopLogger(),
      ).execute("missing");
      throw new Error("Expected use case to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("user_not_found");
    }
  });
});
