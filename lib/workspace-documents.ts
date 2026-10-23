import {getRuntimeEnv} from './runtime-env';
import {wsdb,guard,type WorkspaceActor} from './workspace';
import type {WorkDocument} from './workspace-shared';
export type PrivateDoc=WorkDocument & {object_key:string;notice_snapshot:string};
export const docColumns='d.id,d.owner_id,d.item_id,d.category,d.name,d.mime,d.size,d.status,d.review_note,d.created_at,d.updated_at,d.retention_until';
export async function accessibleDocument(id:string,a:WorkspaceActor){
 const now=Date.now(),session=guard(a,a.admin);
 const scope=a.admin
  ?{sql:'(d.item_id IS NULL OR EXISTS (SELECT 1 FROM commission_items current WHERE current.id=d.item_id AND current.retention_until>?))',values:[now]}
  :{sql:"((d.item_id IS NULL AND d.owner_id=?) OR EXISTS (SELECT 1 FROM commission_items current JOIN commission_members cm ON cm.commission=current.commission WHERE current.id=d.item_id AND current.retention_until>? AND cm.account_id=? AND cm.active=1 AND (current.status<>'draft' OR current.owner_id=?)))",values:[a.accountId,now,a.accountId,a.accountId]};
 // Check the live session and current access in the same read as the document.
 return wsdb().prepare("SELECT d.* FROM commission_documents d WHERE d.id=? AND d.retention_until>? AND d.status IN ('received','checked','changes') AND "+session.sql+' AND '+scope.sql).bind(id,now,...session.values,...scope.values).first<PrivateDoc>();
}
export async function deletePrivateDocument(d:PrivateDoc){const b=getRuntimeEnv().BUCKET;if(!b)throw new Error('Storage unavailable');await b.delete(d.object_key);await wsdb().prepare('DELETE FROM commission_documents WHERE id=? AND retention_until<=?').bind(d.id,Date.now()).run();}
export async function purgeWorkspace(cutoff:number,authorization?:{sql:string;values:unknown[]}){const db=wsdb(),bucket=getRuntimeEnv().BUCKET;if(!db)return;const guard=authorization??{sql:"1=1",values:[]};
 // Object metadata remains recoverable until the corresponding R2 object is gone.
 // Advance by id even when one object fails. A failed first batch must not
 // prevent later expired files from being removed in this execution.
 if(bucket){
  let cursor='';const deadline=Date.now()+20_000;
  while(Date.now()<deadline){
   const expired=await db.prepare("SELECT d.id,d.object_key FROM commission_documents d WHERE d.id>? AND (d.retention_until<=? OR (d.item_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM commission_items i WHERE i.id=d.item_id AND i.retention_until>?))) AND "+guard.sql+" ORDER BY d.id LIMIT 200").bind(cursor,cutoff,cutoff,...guard.values).all<{id:string;object_key:string}>();
   if(!expired.results.length)break;
   for(const d of expired.results){
    if(Date.now()>=deadline)break;
    if(authorization&&!await db.prepare("SELECT 1 WHERE "+guard.sql).bind(...guard.values).first())break;
    try{await bucket.delete(d.object_key);await db.prepare('DELETE FROM commission_documents WHERE id=? AND '+guard.sql).bind(d.id,...guard.values).run();}catch{/* Keep the key for the next scheduled pass. */}
    cursor=d.id;
   }
   if(expired.results.length<200||cursor!==expired.results.at(-1)?.id)break;
  }
  const abandoned=await db.prepare('SELECT id,object_key FROM media_uploads WHERE expires_at<=? AND '+guard.sql+' ORDER BY expires_at LIMIT 200').bind(cutoff,...guard.values).all<{id:string;object_key:string}>();
  for(const upload of abandoned.results){
   if(authorization&&!await db.prepare("SELECT 1 WHERE "+guard.sql).bind(...guard.values).first())break;
   try{await bucket.delete(upload.object_key);await db.prepare('DELETE FROM media_uploads WHERE id=? AND '+guard.sql).bind(upload.id,...guard.values).run();}catch{/* The ledger remains until storage confirms deletion. */}
  }
 }
 await db.batch([db.prepare('DELETE FROM commission_affiliations WHERE retention_until<=? AND '+guard.sql).bind(cutoff,...guard.values),db.prepare('DELETE FROM commission_items WHERE retention_until<=? AND '+guard.sql).bind(cutoff,...guard.values)]);
}

export async function itemDocumentLinks(itemId:string){
 return (await wsdb().prepare("SELECT id,name FROM commission_documents WHERE item_id=? AND retention_until>? AND status<>'uploading'").bind(itemId,Date.now()).all<{id:string;name:string}>()).results;
}
