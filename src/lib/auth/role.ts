export type DashboardRole = "admin" | "developer" | "readonly";

const ADMIN_ROLES = new Set([
  "admin",
  "owner",
  "org:admin",
  "org:owner",
]);

const READONLY_ROLES = new Set([
  "readonly",
  "read_only",
  "viewer",
  "observer",
  "org:readonly",
]);

export function normalizeDashboardRole(
  rawRole: string | null | undefined
): DashboardRole {
  if (!rawRole) return "developer";

  const normalized = rawRole.trim().toLowerCase();
  if (ADMIN_ROLES.has(normalized)) return "admin";
  if (READONLY_ROLES.has(normalized)) return "readonly";
  return "developer";
}
