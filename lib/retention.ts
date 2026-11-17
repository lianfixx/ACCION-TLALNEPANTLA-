import {adminWriteGuard,adminWriteCondition} from './admin-write-guard';
import type {StaffIdentity} from './staff-auth';
import { purgeWorkspace } from "./workspace-documents";
import { and,eq,lte,sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, comments, contactRequests, enlacesApplications, rateLimits, membershipApplications, staffAccounts, staffEmailVerifications } from "@/db/schema";

const unconfirmedLifetime = 7 * 86_400_000;

export async function purgeExpiredData(actorEmail: string, trigger: "manual" | "scheduled", cutoff = Date.now(),actor?:StaffIdentity) {
  const db = getDb();
  if(trigger==='manual'&&!actor)throw new PurgeAuthorizationError();
  const guard=actor?adminWriteCondition(actor,[]):sql`1=1`;
  await purgeWorkspace(cutoff,actor?adminWriteGuard(actor,[]):undefined);
  const result=await db.batch([
    db.delete(comments).where(and(lte(comments.retentionUntil, cutoff),guard)),
    db.delete(contactRequests).where(and(lte(contactRequests.retentionUntil, cutoff),guard)),
    db.delete(membershipApplications).where(and(lte(membershipApplications.retentionUntil, cutoff),guard)),
    db.delete(rateLimits).where(and(lte(rateLimits.expiresAt, cutoff),guard)),
    db.insert(auditLogs).select(sql`SELECT ${crypto.randomUUID()},${actorEmail},${`retention.purge.${trigger}`},'system','expired-data',${JSON.stringify({cutoff,trigger})},${cutoff} WHERE ${guard}`).returning({id:auditLogs.id}),
    // Enlaces APJ applications and their score sheets (deleted by cascade) expire like the rest.
    db.delete(enlacesApplications).where(and(lte(enlacesApplications.retentionUntil, cutoff),guard)),
    // Accounts created from the site that never confirmed their email are deleted after seven days,
    // so nobody can hold someone else's address or username (decision of Emi, 17-nov-2026).
    db.delete(staffEmailVerifications).where(and(sql`${staffEmailVerifications.accountId} IN (SELECT id FROM staff_accounts WHERE self_registered=1 AND email_verification_required=1 AND email_verified_at IS NULL AND created_at <= ${cutoff - unconfirmedLifetime} AND email NOT IN (SELECT email FROM user_roles))`,guard)),
    db.delete(staffAccounts).where(and(sql`${staffAccounts.selfRegistered}=1 AND ${staffAccounts.emailVerificationRequired}=1 AND ${staffAccounts.emailVerifiedAt} IS NULL AND ${staffAccounts.createdAt} <= ${cutoff - unconfirmedLifetime} AND ${staffAccounts.email} NOT IN (SELECT email FROM user_roles) AND NOT EXISTS (SELECT 1 FROM staff_sessions s WHERE s.account_id=${staffAccounts.id}) AND NOT EXISTS (SELECT 1 FROM commission_members m WHERE m.account_id=${staffAccounts.id}) AND NOT EXISTS (SELECT 1 FROM commission_documents d WHERE d.owner_id=${staffAccounts.id}) AND NOT EXISTS (SELECT 1 FROM commission_items i WHERE i.owner_id=${staffAccounts.id}) AND NOT EXISTS (SELECT 1 FROM membership_applications ma WHERE ma.owner_email=${staffAccounts.email}) AND NOT EXISTS (SELECT 1 FROM staff_email_verifications v WHERE v.account_id=${staffAccounts.id})`,guard)),
    // The history of an application goes with it. Entries about the results and anonymized ones stay.
    db.delete(auditLogs).where(and(eq(auditLogs.entityType,'enlaces'),sql`${auditLogs.entityId} LIKE '________-____-____-____-____________'`,sql`${auditLogs.entityId} NOT IN (SELECT id FROM enlaces_applications)`,guard)),
  ]);
  if(actor&&!result[4].length)throw new PurgeAuthorizationError();
  return { cutoff, trigger };
}

export class PurgeAuthorizationError extends Error {}
