import {matchesExpectedAccount} from '@/lib/security';
import {workspaceActor,wsdb,wsReply,wsError,accessibleItem,itemGuard,auditStatement,consentGuard,combineGuards} from '@/lib/workspace';
import {parseWork} from '@/lib/workspace-shared';
import {readJsonBody,requestHasJsonContentType,requestIsSameOrigin,jsonBodyErrorResponse,cleanText} from '@/lib/security';
import {consumeRateLimit} from '@/lib/rate-limit';
type Context={params:Promise<{id:string}>};
export async function GET(r:Request,c:Context){try{const a=await workspaceActor();if(!a)return wsError('Entra a tu cuenta.',401);if(!matchesExpectedAccount(r,a.accountId))return wsError('La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario.',412);const item=await accessibleItem((await c.params).id,a);if(!item)return wsError('Esta actividad no está disponible.',404);
 const db=wsdb(),total=(await db.prepare('SELECT count(*) n FROM commission_messages WHERE item_id=?').bind(item.id).first<{n:number}>())?.n??0,pages=Math.max(1,Math.ceil(total/50)),requestedPage=Number(new URL(r.url).searchParams.get('page')??1),page=Math.min(pages,Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1);
 const messages=(await db.prepare('SELECT m.id,m.body,m.created_at,a.name AS author_name FROM commission_messages m JOIN staff_accounts a ON a.id=m.author_id WHERE item_id=? ORDER BY m.created_at DESC,m.id DESC LIMIT 50 OFFSET ?').bind(item.id,(page-1)*50).all()).results.reverse();
 const current=await accessibleItem(item.id,a);if(!current)return wsError('Esta actividad no está disponible.',404);
 return wsReply({item:current,messages,messagePagination:{page,pages,total}});}catch{return wsError('No pudimos cargar la actividad.',503);}}
export async function PATCH(r:Request,c:Context){if(!requestIsSameOrigin(r))return wsError('No pudimos comprobar el origen.',403);if(!requestHasJsonContentType(r))return wsError('No pudimos leer los datos.',415);let x:Record<string,unknown>;try{x=await readJsonBody(r,160000);}catch(e){return jsonBodyErrorResponse(e);}if(!x||typeof x!=='object')return wsError('Revisa el formulario.');
 try{const a=await workspaceActor();if(!a)return wsError('Entra a tu cuenta.',401);if(!matchesExpectedAccount(r,a.accountId))return wsError('La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario.',412);if(!await consumeRateLimit('workspace-write',a.accountId,60,600000))return wsError('Espera un momento antes de guardar de nuevo.',429);const item=await accessibleItem((await c.params).id,a);if(!item)return wsError('Esta actividad no está disponible.',404);const db=wsdb(),now=Math.max(Date.now(),item.updated_at+1),g=a.admin?itemGuard(a,item):combineGuards(itemGuard(a,item),await consentGuard(a));const expected=Number(x.expectedUpdatedAt);let query:D1PreparedStatement;
 if(x.action==='message'){const body=cleanText(x.body,3000);if(!body)return wsError('Escribe tu mensaje.');query=db.prepare('INSERT INTO commission_messages(id,item_id,author_id,body,created_at) SELECT ?,?,?,?,? WHERE '+g.sql+" AND EXISTS (SELECT 1 FROM commission_items WHERE id=? AND retention_until>? AND status<>'archived')").bind(crypto.randomUUID(),item.id,a.accountId,body,now,...g.values,item.id,now);}
 else if(x.action==='assign'){
 if(!a.admin)return wsError('Solo administración puede cambiar a la persona responsable.',403);
 if(!['draft','changes','submitted','approved'].includes(item.status))return wsError('Esta actividad ya está cerrada.',409);
 const username=cleanText(x.username,40).toLowerCase(),note=cleanText(x.note,2000);
 if(!username||!note)return wsError('Indica el nuevo responsable y el motivo del relevo.');
 const target=await db.prepare('SELECT id,name FROM staff_accounts WHERE username=? AND disabled_at IS NULL').bind(username).first<{id:string;name:string}>();
 if(!target||target.id===item.owner_id)return wsError('Elige otra persona activa de esta comisión.');
 const original=await db.prepare('SELECT name FROM staff_accounts WHERE id=?').bind(item.owner_id).first<{name:string}>();
 const [result]=await db.batch([
 db.prepare("UPDATE commission_items SET owner_id=?,updated_at=? WHERE id=? AND updated_at=? AND status IN ('draft','changes','submitted','approved') AND retention_until>? AND "+g.sql+" AND EXISTS (SELECT 1 FROM commission_members cm JOIN staff_accounts a ON a.id=cm.account_id WHERE cm.account_id=? AND cm.commission=commission_items.commission AND cm.active=1 AND a.disabled_at IS NULL)").bind(target.id,now,item.id,expected,now,...g.values,target.id),
 db.prepare('INSERT INTO commission_messages(id,item_id,author_id,body,created_at) SELECT ?,?,?,?,? WHERE changes()>0').bind(crypto.randomUUID(),item.id,a.accountId,'Relevo de '+(original?.name||'la persona anterior')+' a '+target.name+'. '+note,now),
 auditStatement(a,'commission.assigned',item.id,now)]);
 return result.meta.changes?wsReply({ok:true}):wsError('La actividad o el equipo cambió. Revisa que la persona siga activa en esta comisión.',409);
 }else if(x.action==='edit'){
 if(item.owner_id!==a.accountId||!['draft','changes'].includes(item.status))return wsError('Solo puedes editar tus borradores o actividades con ajustes.',403);let v;try{v=parseWork({...x,kind:item.kind,commission:item.commission});}catch(e){return wsError((e as Error).message);}
 query=db.prepare("UPDATE commission_items SET title=?,details_json=?,venue=?,starts_at=?,ends_at=?,status=?,space_confirmed=0,updated_at=? WHERE id=? AND owner_id=? AND updated_at=? AND status IN ('draft','changes') AND retention_until>? AND "+g.sql).bind(v.title,JSON.stringify(v.details),v.venue,v.start,v.end,x.submit===true?'submitted':item.status,now,item.id,a.accountId,expected,now,...g.values);
 }else if(x.action==='status'){
 const target=String(x.status),allowed=a.admin?({draft:['submitted'],submitted:['changes','approved','rejected'],changes:['submitted'],approved:['completed','changes','rejected'],completed:['archived','changes'],archived:[],rejected:['changes']} as Record<string,string[]>):({draft:['submitted'],changes:['submitted'],approved:['completed']} as Record<string,string[]>);
 if(!allowed[item.status]?.includes(target)||(!a.admin&&item.owner_id!==a.accountId))return wsError('Ese cambio no está disponible.',403);
 if(target==='submitted'){try{parseWork({kind:item.kind,commission:item.commission,title:item.title,details:JSON.parse(item.details_json),venue:item.venue,startsAt:item.starts_at,endsAt:item.ends_at,submit:true});}catch(e){return wsError((e as Error).message);}}
 const note=cleanText(x.note,2000);if(a.admin&&['changes','approved','rejected','archived'].includes(target)&&!note)return wsError('Escribe la respuesta para el equipo.');
 const confirm=a.admin&&target==='approved'&&item.kind==='event'&&x.spaceConfirmed===true?1:0;
 if(item.kind==='event'&&target==='approved'&&!confirm)return wsError('Confirma el espacio y el horario antes de autorizar el evento.');
 const stateGuard=g,conflict=confirm?" AND NOT EXISTS (SELECT 1 FROM commission_items other WHERE other.id<>? AND lower(trim(other.venue))=lower(trim(commission_items.venue)) AND other.space_confirmed=1 AND other.status IN ('approved','completed','archived') AND other.retention_until>? AND other.starts_at<commission_items.ends_at AND other.ends_at>commission_items.starts_at)":"";
 query=db.prepare('UPDATE commission_items SET status=?,space_confirmed=?,updated_at=? WHERE id=? AND status=? AND updated_at=? AND retention_until>? AND '+stateGuard.sql+conflict).bind(target,target==='approved'?confirm:target==='completed'||target==='archived'?item.space_confirmed:0,now,item.id,item.status,expected,now,...stateGuard.values,...(confirm?[item.id,now]:[]));
 const [result]=await db.batch([query,db.prepare("INSERT INTO commission_messages(id,item_id,author_id,body,created_at) SELECT ?,?,?,?,? WHERE changes()>0").bind(crypto.randomUUID(),item.id,a.accountId,note||'Actualizó el estado de la actividad.',now),auditStatement(a,'commission.status.'+target,item.id,now)]);return result.meta.changes?wsReply({ok:true}):wsError('La actividad cambió o el espacio ya está ocupado en ese horario. Recarga y revisa.',409);
 }else return wsError('No encontramos esa acción.');
 const [result]=await db.batch([query,auditStatement(a,'commission.'+String(x.action),item.id,now)]);return result.meta.changes?wsReply({ok:true}):wsError('La actividad o tu acceso cambió. Recarga antes de guardar.',409);
 }catch{return wsError('No pudimos guardar el cambio.',503);}}
