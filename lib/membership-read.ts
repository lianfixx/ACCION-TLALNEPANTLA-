import { adminWriteGuard } from './admin-write-guard';
import { getRuntimeEnv } from './runtime-env';
import { sessionWriteGuard } from './session-write-guard';
import type { StaffIdentity } from './staff-auth';

/** Recheck private records after their profile, notice and history have loaded. */
export async function membershipReadIsCurrent(actor: StaffIdentity, applicationIds: string[], administrative = false) {
  const live = administrative ? adminWriteGuard(actor, ['admin']) : sessionWriteGuard(actor);
  const ids = [...new Set(applicationIds)], now = Date.now();
  let condition = live.sql;
  const values: unknown[] = [...live.values];
  if (ids.length) {
    condition += ` AND (SELECT count(*) FROM membership_applications current_application WHERE current_application.id IN (${ids.map(() => '?').join(',')}) AND current_application.retention_until>?`;
    values.push(...ids, now);
    if (!administrative) {
      condition += ' AND current_application.owner_email=?';
      values.push(actor.email);
    }
    condition += ')=?';
    values.push(ids.length);
  }
  return Boolean(await getRuntimeEnv().DB!.prepare('SELECT 1 WHERE ' + condition).bind(...values).first());
}

export async function contactReadIsCurrent(actor: StaffIdentity, requestId: string) {
  const live = adminWriteGuard(actor, ['admin']);
  return Boolean(await getRuntimeEnv().DB!.prepare('SELECT 1 WHERE ' + live.sql + ' AND EXISTS (SELECT 1 FROM contact_requests current_request WHERE current_request.id=? AND current_request.retention_until>?)').bind(...live.values, requestId, Date.now()).first());
}
