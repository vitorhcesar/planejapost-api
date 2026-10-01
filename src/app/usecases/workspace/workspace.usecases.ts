import type {
  IListWorkspacesResultDto,
  IWorkspaceDto,
} from "@/app/usecases/workspace/dto/workspace.dto";
import { mapWorkspaceToDto } from "@/app/usecases/workspace/map-workspace-to-dto.util";
import { Workspace } from "@/domain/entities/workspace.entity";
import { AppError } from "@/domain/errors/app.error";
import type { ISocialConnectedAccountRepository } from "@/domain/repositories/social-connected-account.repository";
import type { IWorkspaceRepository } from "@/domain/repositories/workspace.repository";
import {
  generateWorkspaceSlug,
  getDefaultWorkspaceName,
  getDefaultWorkspaceSlug,
  isValidWorkspaceName,
  normalizeWorkspaceName,
  resolveUniqueWorkspaceSlug,
} from "@/domain/utils/workspace-slug.util";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

function assertValidWorkspaceColor(color: string | null | undefined): void {
  if (color !== undefined && color !== null && !HEX_COLOR_REGEX.test(color)) {
    throw new AppError("Cor inválida", 400, "workspace_color_invalid");
  }
}

export class EnsureDefaultWorkspaceUseCase {
  constructor(private readonly workspaceRepository: IWorkspaceRepository) {}

  async execute(userId: string): Promise<Workspace> {
    const existingDefault =
      await this.workspaceRepository.findDefaultByUserId(userId);

    if (existingDefault) {
      return existingDefault;
    }

    const existingSlugs = new Set(
      await this.workspaceRepository.getSlugsByUserId(userId),
    );
    const slug = resolveUniqueWorkspaceSlug(
      getDefaultWorkspaceSlug(),
      existingSlugs,
    );

    const workspace = Workspace.create({
      userId,
      name: getDefaultWorkspaceName(),
      slug,
      isDefault: true,
    });

    return this.workspaceRepository.create(workspace);
  }
}

export class ListWorkspacesUseCase {
  constructor(
    private readonly workspaceRepository: IWorkspaceRepository,
    private readonly ensureDefaultWorkspaceUseCase: EnsureDefaultWorkspaceUseCase,
  ) {}

  async execute(
    userId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<IListWorkspacesResultDto> {
    await this.ensureDefaultWorkspaceUseCase.execute(userId);

    const items = await this.workspaceRepository.findAllWithCountsByUserId(
      userId,
      options,
    );

    return {
      items: items.map(mapWorkspaceToDto),
    };
  }
}

export class CreateWorkspaceUseCase {
  constructor(private readonly workspaceRepository: IWorkspaceRepository) {}

  async execute(input: {
    userId: string;
    name: string;
    description?: string | null;
    color?: string | null;
  }): Promise<IWorkspaceDto> {
    const name = normalizeWorkspaceName(input.name);

    if (!isValidWorkspaceName(name)) {
      throw new AppError(
        "Nome do workspace deve ter entre 2 e 80 caracteres",
        400,
        "workspace_name_invalid",
      );
    }

    assertValidWorkspaceColor(input.color);

    const existingSlugs = new Set(
      await this.workspaceRepository.getSlugsByUserId(input.userId),
    );
    const baseSlug = generateWorkspaceSlug(name);
    const slug = resolveUniqueWorkspaceSlug(baseSlug, existingSlugs);

    const workspace = Workspace.create({
      userId: input.userId,
      name,
      slug,
      description: input.description ?? null,
      color: input.color ?? null,
    });

    const saved = await this.workspaceRepository.create(workspace);
    const withCounts = await this.workspaceRepository.findAllWithCountsByUserId(
      input.userId,
    );
    const created = withCounts.find((item) => item.workspace.id === saved.id);

    if (!created) {
      throw new AppError("Workspace não encontrado", 404, "workspace_not_found");
    }

    return mapWorkspaceToDto(created);
  }
}

export class UpdateWorkspaceUseCase {
  constructor(private readonly workspaceRepository: IWorkspaceRepository) {}

  async execute(input: {
    userId: string;
    workspaceId: string;
    name?: string;
    description?: string | null;
    color?: string | null;
    sortOrder?: number;
  }): Promise<IWorkspaceDto> {
    const workspace = await this.workspaceRepository.findActiveByIdAndUserId(
      input.workspaceId,
      input.userId,
    );

    if (!workspace) {
      throw new AppError("Workspace não encontrado", 404, "workspace_not_found");
    }

    const updates: {
      name?: string;
      slug?: string;
      description?: string | null;
      color?: string | null;
      sortOrder?: number;
    } = {};

    if (input.name !== undefined) {
      const name = normalizeWorkspaceName(input.name);

      if (!isValidWorkspaceName(name)) {
        throw new AppError(
          "Nome do workspace deve ter entre 2 e 80 caracteres",
          400,
          "workspace_name_invalid",
        );
      }

      updates.name = name;

      const existingSlugs = new Set(
        await this.workspaceRepository.getSlugsByUserId(input.userId),
      );
      existingSlugs.delete(workspace.slug);
      updates.slug = resolveUniqueWorkspaceSlug(
        generateWorkspaceSlug(name),
        existingSlugs,
      );
    }

    if (input.description !== undefined) {
      updates.description = input.description;
    }

    if (input.color !== undefined) {
      assertValidWorkspaceColor(input.color);
      updates.color = input.color;
    }

    if (input.sortOrder !== undefined) {
      updates.sortOrder = input.sortOrder;
    }

    workspace.update(updates);
    await this.workspaceRepository.save(workspace);

    const withCounts = await this.workspaceRepository.findAllWithCountsByUserId(
      input.userId,
    );
    const updated = withCounts.find((item) => item.workspace.id === workspace.id);

    if (!updated) {
      throw new AppError("Workspace não encontrado", 404, "workspace_not_found");
    }

    return mapWorkspaceToDto(updated);
  }
}

export class ArchiveWorkspaceUseCase {
  constructor(private readonly workspaceRepository: IWorkspaceRepository) {}

  async execute(input: {
    userId: string;
    workspaceId: string;
    moveAccountsToWorkspaceId?: string;
  }): Promise<void> {
    const workspace = await this.workspaceRepository.findActiveByIdAndUserId(
      input.workspaceId,
      input.userId,
    );

    if (!workspace) {
      throw new AppError("Workspace não encontrado", 404, "workspace_not_found");
    }

    if (workspace.isDefault) {
      throw new AppError(
        "O workspace padrão não pode ser arquivado",
        400,
        "workspace_default_protected",
      );
    }

    const connectedCount =
      await this.workspaceRepository.countConnectedAccountsByWorkspaceId(
        workspace.id,
      );

    if (connectedCount > 0) {
      if (!input.moveAccountsToWorkspaceId) {
        throw new AppError(
          "Informe o workspace destino para mover as contas conectadas",
          400,
          "workspace_reassignment_required",
        );
      }

      const destination = await this.workspaceRepository.findActiveByIdAndUserId(
        input.moveAccountsToWorkspaceId,
        input.userId,
      );

      if (!destination) {
        throw new AppError("Workspace não encontrado", 404, "workspace_not_found");
      }

      if (destination.id === workspace.id) {
        throw new AppError("Workspace não encontrado", 404, "workspace_not_found");
      }

      await this.workspaceRepository.moveAllAccountsToWorkspace(
        workspace.id,
        destination.id,
      );
    }

    workspace.archive();
    await this.workspaceRepository.save(workspace);
  }
}

export class MoveSocialAccountToWorkspaceUseCase {
  constructor(
    private readonly workspaceRepository: IWorkspaceRepository,
    private readonly socialConnectedAccountRepository: ISocialConnectedAccountRepository,
  ) {}

  async execute(input: {
    userId: string;
    accountId: string;
    workspaceId: string;
  }): Promise<void> {
    const workspace = await this.workspaceRepository.findActiveByIdAndUserId(
      input.workspaceId,
      input.userId,
    );

    if (!workspace) {
      throw new AppError("Workspace não encontrado", 404, "workspace_not_found");
    }

    const account = await this.socialConnectedAccountRepository.findByIdAndUserId(
      input.accountId,
      input.userId,
    );

    if (!account) {
      throw new AppError(
        "Conta social não encontrada",
        404,
        "social_account_not_found",
      );
    }

    account.moveToWorkspace(workspace.id);
    await this.socialConnectedAccountRepository.save(account);
  }
}
