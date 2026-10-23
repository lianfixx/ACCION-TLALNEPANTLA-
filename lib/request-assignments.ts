import { getDb } from "@/db";
import { userRoles } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getRuntimeEnv } from "@/lib/runtime-env";

export async function requestAssignees() {
  const owners = [getRuntimeEnv().ADMIN_EMAILS, getRuntimeEnv().OWNER_ACCOUNT_EMAIL].filter(Boolean).join(",").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  const delegates = await getDb().select({ email: userRoles.email }).from(userRoles).where(and(eq(userRoles.role, "admin"), isNull(userRoles.revokedAt)));
  return [...new Set([...owners, ...delegates.map(x => x.email)])].sort();
}
