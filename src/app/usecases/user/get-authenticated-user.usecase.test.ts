import { describe, expect, it } from "bun:test";
import { GetAuthenticatedUserUseCase } from "@/app/usecases/user/get-authenticated-user.usecase";
import { User } from "@/domain/entities/user.entity";
import { AppError } from "@/domain/errors/app.error";
import type { IUserRepository } from "@/domain/repositories/user.repository";

class InMemoryUserRepository {
  users: User[] = [];

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

  async delete() {}

  async countAll() {
    return this.users.length;
  }

  async listPaginated() {
    return { users: [], total: 0 };
  }
}

describe("GetAuthenticatedUserUseCase", () => {
  it("returns the authenticated user dto", async () => {
    const repository = new InMemoryUserRepository();
    const user = User.restore({
      id: "user-1",
      name: "Jane Doe",
      email: "jane@example.com",
      emailVerified: true,
      image: null,
      role: "client" as never,
      zernioProfileId: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    repository.users = [user];

    const result = await new GetAuthenticatedUserUseCase(
      repository as unknown as IUserRepository,
    ).execute("user-1");

    expect(result.email).toBe("jane@example.com");
    expect(result.name).toBe("Jane Doe");
  });

  it("throws when the user does not exist", async () => {
    const repository = new InMemoryUserRepository();

    try {
      await new GetAuthenticatedUserUseCase(
        repository as unknown as IUserRepository,
      ).execute("missing");
      throw new Error("Expected use case to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("user_not_found");
    }
  });
});
