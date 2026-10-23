import {guard,wsdb,type WorkspaceActor} from './workspace';

/** A panel can perform several reads. Recheck its scopes once before returning them. */
export async function workspaceReadIsCurrent(a:WorkspaceActor,commissions:string[]=[],itemIds:string[]=[]){
 const live=guard(a,a.admin),now=Date.now();let condition=live.sql;const values:unknown[]=[...live.values];
 if(!a.admin)for(const commission of new Set(commissions)){
  condition+=' AND EXISTS (SELECT 1 FROM commission_members current_member WHERE current_member.account_id=? AND current_member.commission=? AND current_member.active=1)';
  values.push(a.accountId,commission);
 }
 const ids=[...new Set(itemIds)];
 if(ids.length){
  condition+=` AND (SELECT count(*) FROM commission_items current_item WHERE current_item.id IN (${ids.map(()=>'?').join(',')}) AND current_item.retention_until>?`;
  values.push(...ids,now);
  if(!a.admin){
   condition+=" AND (current_item.status<>'draft' OR current_item.owner_id=?) AND EXISTS (SELECT 1 FROM commission_members current_member WHERE current_member.account_id=? AND current_member.commission=current_item.commission AND current_member.active=1)";
   values.push(a.accountId,a.accountId);
  }
  condition+=')=?';values.push(ids.length);
 }
 return Boolean(await wsdb().prepare('SELECT 1 WHERE '+condition).bind(...values).first());
}

/** Check a whole page of metadata in one query, including withdrawn or expired files. */
export async function documentReadIsCurrent(a:WorkspaceActor,documentIds:string[]){
 const live=guard(a,a.admin),ids=[...new Set(documentIds)],now=Date.now();let condition=live.sql;const values:unknown[]=[...live.values];
 if(ids.length){
  condition+=` AND (SELECT count(*) FROM commission_documents current_doc WHERE current_doc.id IN (${ids.map(()=>'?').join(',')}) AND current_doc.retention_until>? AND current_doc.status IN ('received','checked','changes') AND `;
  values.push(...ids,now);
  if(a.admin){
   condition+='(current_doc.item_id IS NULL OR EXISTS (SELECT 1 FROM commission_items current_item WHERE current_item.id=current_doc.item_id AND current_item.retention_until>?))';values.push(now);
  }else{
   condition+="((current_doc.item_id IS NULL AND current_doc.owner_id=?) OR EXISTS (SELECT 1 FROM commission_items current_item JOIN commission_members current_member ON current_member.commission=current_item.commission WHERE current_item.id=current_doc.item_id AND current_item.retention_until>? AND current_member.account_id=? AND current_member.active=1 AND (current_item.status<>'draft' OR current_item.owner_id=?)))";
   values.push(a.accountId,now,a.accountId,a.accountId);
  }
  condition+=')=?';values.push(ids.length);
 }
 return Boolean(await wsdb().prepare('SELECT 1 WHERE '+condition).bind(...values).first());
}
