import { BasePrismaRepository } from "@/infra/database/prisma/repositories/base-prisma.repository";
import { UserMapper } from "@/infra/database/prisma/mappers/user.mapper";
import type { User } from "@/domain/entities/user.entity";
import type {
  IUserListParams,
  IUserRepository,
} from "@/domain/repositories/user.repository";
import type { AppRoleEnum } from "@/domain/enums/app-role.enum";
import type { Prisma } from "../../../../../generated/prisma";

export class PrismaUserRepository
  extends BasePrismaRepository
  implements IUserRepository
{
  async findById(id: string): Promise<User | null> {
    const row = await this.getPrismaClient().user.findUnique({
      where: { id },
    });

    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.getPrismaClient().user.findUnique({
      where: { email },
    });

    return row ? UserMapper.toDomain(row) : null;
  }

  async findMany(params: IUserListParams): Promise<User[]> {
    const rows = await this.getPrismaClient().user.findMany({
      where: this.buildSearchWhere(params.search),
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: "desc" },
    });

    return rows.map(UserMapper.toDomain);
  }

  async count(search?: string): Promise<number> {
    return this.getPrismaClient().user.count({
      where: this.buildSearchWhere(search),
    });
  }

  async updateRole(id: string, role: AppRoleEnum): Promise<User> {
    const row = await this.getPrismaClient().user.update({
      where: { id },
      data: { role },
    });

    return UserMapper.toDomain(row);
  }

  async markEmailVerified(id: string): Promise<User> {
    const row = await this.getPrismaClient().user.update({
      where: { id },
      data: { emailVerified: true },
    });

    return UserMapper.toDomain(row);
  }

  async updateZernioProfileId(id: string, zernioProfileId: string): Promise<User> {
    const row = await this.getPrismaClient().user.update({
      where: { id },
      data: { zernioProfileId },
    });

    return UserMapper.toDomain(row);
  }

  async deleteById(id: string): Promise<void> {
    await this.getPrismaClient().user.delete({
      where: { id },
    });
  }

  async countSocialAccountsByUserId(userId: string): Promise<number> {
    return this.getPrismaClient().socialConnectedAccount.count({
      where: { userId },
    });
  }

  async countWorkspacesByUserId(userId: string): Promise<number> {
    return this.getPrismaClient().workspace.count({
      where: { userId, archivedAt: null },
    });
  }

  async countPublicationsByUserId(userId: string): Promise<number> {
    return this.getPrismaClient().publication.count({
      where: { userId },
    });
  }

  private buildSearchWhere(search?: string): Prisma.UserWhereInput {
    if (!search?.trim()) {
      return {};
    }

    const term = search.trim();

    return {
      OR: [
        { id: term },
        { email: { contains: term, mode: "insensitive" } },
      ],
    };
  }
}
