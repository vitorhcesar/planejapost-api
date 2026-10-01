const DEFAULT_WORKSPACE_NAME = "Meu workspace";
const DEFAULT_WORKSPACE_SLUG = "meu-workspace";

export function normalizeWorkspaceName(name: string): string {
  return name.trim();
}

export function isValidWorkspaceName(name: string): boolean {
  const normalized = normalizeWorkspaceName(name);
  return normalized.length >= 2 && normalized.length <= 80;
}

export function generateWorkspaceSlug(name: string): string {
  const slug = normalizeWorkspaceName(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug.length > 0 ? slug : DEFAULT_WORKSPACE_SLUG;
}

export function resolveUniqueWorkspaceSlug(
  baseSlug: string,
  existingSlugs: Set<string>,
): string {
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
}

export function getDefaultWorkspaceName(): string {
  return DEFAULT_WORKSPACE_NAME;
}

export function getDefaultWorkspaceSlug(): string {
  return DEFAULT_WORKSPACE_SLUG;
}
