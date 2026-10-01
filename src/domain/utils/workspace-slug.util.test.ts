import { describe, expect, it } from "bun:test";
import {
  generateWorkspaceSlug,
  isValidWorkspaceName,
  resolveUniqueWorkspaceSlug,
} from "@/domain/utils/workspace-slug.util";

describe("workspace slug util", () => {
  it("generates kebab-case slug from name", () => {
    expect(generateWorkspaceSlug("Rayssa Pires")).toBe("rayssa-pires");
    expect(generateWorkspaceSlug("Loja XYZ")).toBe("loja-xyz");
  });

  it("validates workspace name length", () => {
    expect(isValidWorkspaceName("ab")).toBe(true);
    expect(isValidWorkspaceName("a")).toBe(false);
    expect(isValidWorkspaceName("x".repeat(81))).toBe(false);
  });

  it("resolves slug conflicts with numeric suffix", () => {
    const existing = new Set(["rayssa-pires"]);

    expect(resolveUniqueWorkspaceSlug("rayssa-pires", existing)).toBe(
      "rayssa-pires-2",
    );
  });
});
