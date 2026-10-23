import { guard, wsdb, type WorkspaceActor } from './workspace';

/** Withhold an already loaded print view when its live access or files change. */
export async function printReadIsCurrent(actor: WorkspaceActor, itemId: string, documentIds: string[]) {
  const live = guard(actor, actor.admin), now = Date.now(), ids = [...new Set(documentIds)];
  let condition = 'current_item.id=? AND current_item.retention_until>? AND ' + live.sql;
  const values: unknown[] = [itemId, now, ...live.values];
  if (!actor.admin) {
    condition += " AND (current_item.status<>'draft' OR current_item.owner_id=?) AND EXISTS (SELECT 1 FROM commission_members current_member WHERE current_member.account_id=? AND current_member.commission=current_item.commission AND current_member.active=1)";
    values.push(actor.accountId, actor.accountId);
  }
  if (ids.length) {
    condition += ` AND (SELECT count(*) FROM commission_documents current_document WHERE current_document.id IN (${ids.map(() => '?').join(',')}) AND current_document.item_id=current_item.id AND current_document.retention_until>? AND current_document.status IN ('received','checked','changes'))=?`;
    values.push(...ids, now, ids.length);
  }
  return Boolean(await wsdb().prepare('SELECT 1 FROM commission_items current_item WHERE ' + condition).bind(...values).first());
}
