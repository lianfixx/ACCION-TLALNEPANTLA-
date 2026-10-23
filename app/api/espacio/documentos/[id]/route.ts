import {isAffiliationCategory} from '@/lib/pan-affiliation';
import {matchesExpectedAccount} from '@/lib/security';
import {workspaceActor,wsdb,wsReply,wsError,guard,itemGuard,accessibleItem,auditStatement} from '@/lib/workspace';
import {getRuntimeEnv} from '@/lib/runtime-env';
import {accessibleDocument} from '@/lib/workspace-documents';
import {requestIsSameOrigin,requestHasJsonContentType,readJsonBody,jsonBodyErrorResponse,cleanText} from '@/lib/security';
type Context={params:Promise<{id:string}>};
export async function GET(r:Request,c:Context){try{const a=await workspaceActor();if(!a)return wsError('Entra a tu cuenta.',401);if(!matchesExpectedAccount(r,a.accountId))return wsError('La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario.',412);const d=await accessibleDocument((await c.params).id,a);if(!d)return wsError('Este documento no está disponible.',404);const object=await getRuntimeEnv().BUCKET?.get(d.object_key);if(!object)return wsError('No pudimos encontrar el archivo.',404);
 const current=await accessibleDocument(d.id,a);
 if(!current||current.object_key!==d.object_key){await object.body.cancel().catch(()=>undefined);return wsError('Este documento no está disponible.',404);}
 return new Response(object.body,{headers:{'Content-Type':current.mime,'Content-Length':String(current.size), 'Content-Disposition':`attachment; filename="documento.${current.mime==='application/pdf'?'pdf':current.mime==='image/png'?'png':'jpg'}"; filename*=UTF-8''${encodeURIComponent(current.name)}`,'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"}});
 }catch{return wsError('No pudimos abrir el documento.',503);}}
export async function PATCH(r:Request,c:Context){if(!requestIsSameOrigin(r))return wsError('No pudimos comprobar el origen.',403);if(!requestHasJsonContentType(r))return wsError('No pudimos leer el formulario.',415);let x:Record<string,unknown>;try{x=await readJsonBody(r,8000);}catch(e){return jsonBodyErrorResponse(e);}try{const a=await workspaceActor();if(!a)return wsError('Entra a tu cuenta.',401);if(!matchesExpectedAccount(r,a.accountId))return wsError('La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario.',412);const d=await accessibleDocument((await c.params).id,a);if(!d)return wsError('Este documento no está disponible.',404);if(!a.admin&&d.owner_id!==a.accountId)return wsError('No puedes modificar este documento.',403);
 const g=d.item_id?itemGuard(a,(await accessibleItem(d.item_id,a))!):guard(a,a.admin),now=Math.max(Date.now(),d.updated_at+1),remove=x.action==='remove';if(!remove&&(!a.admin||!['checked','changes'].includes(String(x.status))))return wsError('No tienes acceso a esta revisión.',403);const note=cleanText(x.note,1200);if(!remove&&!note)return wsError('Escribe la respuesta para la persona que envió el documento.');
 const writes=[wsdb().prepare('UPDATE commission_documents SET status=?,review_note=?,reviewed_by=?,updated_at=?,retention_until=? WHERE id=? AND updated_at=? AND retention_until>? AND '+g.sql).bind(remove?'removed':String(x.status),note,a.accountId,now,remove?Date.now():d.retention_until,d.id,Number(x.expectedUpdatedAt),Date.now(),...g.values),auditStatement(a,remove?'document.removed':'document.reviewed',d.id,now)];
 if(isAffiliationCategory(d.category)){
  const invalidates=remove||x.status==='changes',explanation=remove?'El comprobante fue retirado. Adjunta otro para revisar la afiliación.':note;
  const assignments=[['status',"'changes'"],['note','?'],['verification_source',"''"],['verified_at','NULL'],['reviewed_by','NULL'],['verified_document_id','NULL']];
  const values=assignments.flatMap(([column])=>[d.id,invalidates?1:0,...(column==='note'?[explanation]:[])]);
  writes.push(wsdb().prepare('UPDATE commission_affiliations SET '+assignments.map(([column,value])=>column+'=CASE WHEN verified_document_id=? AND ? THEN '+value+' ELSE '+column+' END').join(',')+',updated_at=max(?,updated_at+1) WHERE account_id=? AND retention_until>? AND changes()>0').bind(...values,now,d.owner_id,Date.now()),auditStatement(a,'affiliation.evidence_changed',d.owner_id,now));
 }
 const [result]=await wsdb().batch(writes);if(!result.meta.changes)return wsError('El documento cambió. Recarga antes de guardarlo.',409);
 if(remove){try{await getRuntimeEnv().BUCKET!.delete(d.object_key);await wsdb().prepare('DELETE FROM commission_documents WHERE id=?').bind(d.id).run();}catch{/* Hidden immediately; daily purge retries deletion. */}}
 return wsReply({ok:true});}catch{return wsError('No pudimos guardar la revisión.',503);}}
