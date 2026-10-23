import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { userRoles } from "@/db/schema";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { getStaffIdentity } from './staff-auth';

export type SiteRole = "admin" | "editor" | "moderator";

function configuredAdmins(): Set<string> {
  const value = [getRuntimeEnv().ADMIN_EMAILS, getRuntimeEnv().OWNER_ACCOUNT_EMAIL].filter(Boolean).join(",");
  return new Set(value.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean));
}

export function isConfiguredOwner(email: string) {
  return configuredAdmins().has(email.trim().toLowerCase());
}

export async function currentAuthorizedUser() {
  return authorizeIdentity(await getStaffIdentity());
}

async function authorizeIdentity<T extends { email: string; selfRegistered?:boolean }>(user: T | null) {
  if (!user) return null;
  const email = user.email.toLowerCase();
  if (user.selfRegistered && configuredAdmins().has(email)) return null;
  if (configuredAdmins().has(email)) return { ...user, email, role: "admin" as const };

  try {
    const [record] = await getDb().select().from(userRoles).where(and(eq(userRoles.email, email), isNull(userRoles.revokedAt))).limit(1);
    return record ? { ...user, email, role: record.role as SiteRole } : null;
  } catch {
    return null;
  }
}

export function canPublish(role: SiteRole) {
  return role === "admin" || role === "editor";
}

export function canModerate(role: SiteRole) {
  return role === "admin" || role === "moderator";
}

export function canHandleRequests(role: SiteRole) {
  return role === "admin";
}

export function canViewAudit(role: SiteRole) {
  return role === "admin";
}

export function canManageRoles(email: string) {
  return isConfiguredOwner(email);
}

export function adminConfigurationPresent() {
  return configuredAdmins().size > 0;
}
