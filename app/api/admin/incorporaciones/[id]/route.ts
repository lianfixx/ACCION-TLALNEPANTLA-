import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {sessionWriteGuard} from "@/lib/session-write-guard";
import { currentAuthorizedUser, canHandleRequests, isConfiguredOwner } from "@/lib/authz";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { cleanText, jsonBodyErrorResponse, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";
import { membershipColumns, membershipHistory, membershipJson } from "@/lib/membership";
import { membershipReadIsCurrent } from "@/lib/membership-read";
import { canChangeMembershipStatus, membershipStatuses, type MembershipApplication, type MembershipStatus } from "@/lib/membership-shared";

type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){
  const actor=await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if(!actor||!canHandleRequests(actor.role))return membershipJson({error:"Acceso no autorizado."},{status:403});
  try{
    const {id}=await params,db=getRuntimeEnv().DB!;
    const application=await db.prepare(`SELECT ${membershipColumns},notice_snapshot AS noticeSnapshot,consent_text AS consentText,adult_self_declared AS adultSelfDeclared FROM membership_applications WHERE id=? AND retention_until>?`).bind(id,Date.now()).first();
    if(!application)return membershipJson({error:"Solicitud no disponible."},{status:404});
    const history=await membershipHistory(id,true,Number(new URL(request.url).searchParams.get('page')??1));
    if(!await membershipReadIsCurrent(actor,[id],true))return membershipJson({error:"La solicitud o tu acceso ya no está disponible."},{status:403});
    return membershipJson({application,...history});
  }catch{return membershipJson({error:"No pudimos consultar el expediente."},{status:503});}
}
export async function PATCH(request:Request,{params}:Context){
  if(!requestIsSameOrigin(request))return membershipJson({error:"Origen no permitido."},{status:403});
  if(!requestHasJsonContentType(request))return membershipJson({error:"Tipo de contenido no permitido."},{status:415});
  const actor=await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if(!actor||!canHandleRequests(actor.role))return membershipJson({error:"Acceso no autorizado."},{status:403});
  let body:Record<string,unknown>;
  try{body=await readJsonBody(request,20000);}catch(error){return jsonBodyErrorResponse(error);}
  if(!body||typeof body!=="object"||Array.isArray(body)||!Number.isSafeInteger(Number(body.expectedUpdatedAt))||!(String(body.status) in membershipStatuses))return membershipJson({error:"Revisa el estado y la versión del expediente."},{status:400});
  for(const key of ['response','note'])if(body[key]!==undefined&&(typeof body[key]!=="string"||(body[key] as string).length>1500))return membershipJson({error:"Cada nota o respuesta admite hasta 1500 caracteres."},{status:400});
  const response=cleanText(body.response,1500),note=cleanText(body.note,1500),status=body.status as MembershipStatus;
  try{
    const db=getRuntimeEnv().DB!,{id}=await params;
    const current=await db.prepare(`SELECT ${membershipColumns} FROM membership_applications WHERE id=? AND retention_until>?`).bind(id,Date.now()).first<MembershipApplication>();
    if(!current)return membershipJson({error:"Solicitud no disponible."},{status:404});
    if(current.updatedAt!==Number(body.expectedUpdatedAt))return membershipJson({error:"La solicitud cambió. Conserva tu borrador o carga la versión actual."},{status:409});
    if(!canChangeMembershipStatus(current.status,status))return membershipJson({error:"Ese cambio de estado no está permitido. Primero revisa las solicitudes recibidas; las retiradas o cerradas no se reabren."},{status:409});
    if(status==='closed'&&!response)return membershipJson({error:"Añade una respuesta para explicar el cierre a la persona solicitante."},{status:400});
    if(status===current.status&&!response&&!note)return membershipJson({error:"No has realizado cambios."},{status:400});
    const now=Math.max(Date.now(),current.updatedAt+1);
    const guard=sessionWriteGuard(actor,now);
    const statements=[db.prepare(`UPDATE membership_applications SET status=?,updated_at=? WHERE id=? AND updated_at=? AND retention_until>? AND status NOT IN ('closed','withdrawn') AND (?=1 OR EXISTS (SELECT 1 FROM user_roles WHERE email=? AND role='admin' AND revoked_at IS NULL)) AND ${guard.sql}`).bind(status,now,id,current.updatedAt,now,isConfiguredOwner(actor.email)?1:0,actor.email,...guard.values)];
    const addEvent=(kind:string,body:string)=>statements.push(db.prepare("INSERT INTO membership_events (id,application_id,kind,body,actor_type,actor_email,created_at) SELECT ?,?,?,?,'admin',?,? WHERE changes()>0").bind(crypto.randomUUID(),id,kind,body,actor.email,now));
    if(status!==current.status)addEvent('status',membershipStatuses[status]);
    if(response)addEvent('response',response);
    if(note)addEvent('note',note);
    // D1 batch is atomic; chained changes() keeps every event dependent on the successful update.
    const [result]=await db.batch(statements);
    if(!result.meta.changes)return membershipJson({error:"La solicitud cambió o venció. No se guardaron tus cambios."},{status:409});
    return membershipJson({message:"Seguimiento guardado. Las respuestas ya pueden consultarse desde la cuenta solicitante."});
  }catch{return membershipJson({error:"No pudimos guardar el seguimiento."},{status:503});}
}
