import {adminWriteGuard,adminWriteCondition} from './admin-write-guard';
import type {StaffIdentity} from './staff-auth';
import { purgeWorkspace } from "./workspace-documents";
import { and,lte,sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, comments, contactRequests, rateLimits, membershipApplications } from "@/db/schema";

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
  ]);
  if(actor&&!result[4].length)throw new PurgeAuthorizationError();
  return { cutoff, trigger };
}

export class PurgeAuthorizationError extends Error {}
