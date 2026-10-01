import type { Workspace as PrismaWorkspace } from "../../../../../generated/prisma";
import { Workspace } from "@/domain/entities/workspace.entity";

export class WorkspaceMapper {
  static toDomain(row: PrismaWorkspace): Workspace {
    return Workspace.restore({
      id: row.id,
      userId: row.userId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      color: row.color,
      isDefault: row.isDefault,
      archivedAt: row.archivedAt,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  static toPrismaCreate(workspace: Workspace) {
    const data = workspace.toObject();

    return {
      userId: data.userId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      color: data.color,
      isDefault: data.isDefault,
      archivedAt: data.archivedAt,
      sortOrder: data.sortOrder,
    };
  }

  static toPrismaUpdate(workspace: Workspace) {
    const data = workspace.toObject();

    return {
      name: data.name,
      slug: data.slug,
      description: data.description,
      color: data.color,
      isDefault: data.isDefault,
      archivedAt: data.archivedAt,
      sortOrder: data.sortOrder,
      updatedAt: data.updatedAt,
    };
  }
}
