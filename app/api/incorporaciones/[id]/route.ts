import {matchesExpectedAccount} from '@/lib/security';
import {sessionWriteGuard} from "@/lib/session-write-guard";
import { getStaffIdentity } from "@/lib/staff-auth";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { cleanEmail, jsonBodyErrorResponse, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";
import { membershipConfiguration, membershipHistory, membershipJson, ownedMembership } from "@/lib/membership";
import { membershipReadIsCurrent } from "@/lib/membership-read";
import { parseMembershipFields } from "@/lib/membership-shared";
import { consumeRateLimit } from "@/lib/rate-limit";

type Context = { params:Promise<{id:string}> };
export async function GET(_request:Request, {params}:Context) {
  const user=await getStaffIdentity(), email=cleanEmail(user?.email);
  if(!user||!email)return membershipJson({error:"Inicia sesión para consultar tu solicitud."},{status:401});
  if(!matchesExpectedAccount(_request,user.accountId))return membershipJson({error:"La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario."},{status:412});
  try {
    const {id}=await params, application=await ownedMembership(id,email);
    if(!application)return membershipJson({error:"Solicitud no disponible."},{status:404});
    const proof=await getRuntimeEnv().DB!.prepare("SELECT notice_snapshot AS snapshot,consent_text AS consentText FROM membership_applications WHERE id=? AND owner_email=? AND retention_until>?").bind(id,email,Date.now()).first();
    const history=await membershipHistory(id,false,Number(new URL(_request.url).searchParams.get('page')??1));
    if(!await membershipReadIsCurrent(user,[id]))return membershipJson({error:"La solicitud o tu acceso ya no está disponible."},{status:404});
    return membershipJson({application,proof,...history});
  }catch{return membershipJson({error:"No pudimos consultar el seguimiento."},{status:503});}
}
export async function PATCH(request:Request,{params}:Context) {
  if(!requestIsSameOrigin(request))return membershipJson({error:"Origen no permitido."},{status:403});
  if(!requestHasJsonContentType(request))return membershipJson({error:"Tipo de contenido no permitido."},{status:415});
  const user=await getStaffIdentity(),email=cleanEmail(user?.email);
  if(!user||!email)return membershipJson({error:"Inicia sesión para continuar."},{status:401});
  if(!matchesExpectedAccount(request,user.accountId))return membershipJson({error:"La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario."},{status:412});
  let body:Record<string,unknown>;
  try{body=await readJsonBody(request,48000);}catch(error){return jsonBodyErrorResponse(error);}
  if(!body||typeof body!=="object"||Array.isArray(body)||!Number.isSafeInteger(body.expectedUpdatedAt)||!['withdraw','edit'].includes(String(body.action)))return membershipJson({error:"Solicitud inválida."},{status:400});
  try{
    const {id}=await params, current=await ownedMembership(id,email);
    if(!current)return membershipJson({error:"Solicitud no disponible."},{status:404});
    if(current.updatedAt!==body.expectedUpdatedAt)return membershipJson({error:"El expediente cambió. Actualiza su estado antes de continuar."},{status:409});
    if(current.status==='withdrawn'||current.status==='closed')return membershipJson({error:"Esta solicitud ya está cerrada."},{status:409});
    const now=Math.max(Date.now(),current.updatedAt+1),db=getRuntimeEnv().DB!;
    const guard=sessionWriteGuard(user,now);
    let update:D1PreparedStatement;
    if(body.action==='withdraw'){
      update=db.prepare(`UPDATE membership_applications SET status='withdrawn',updated_at=? WHERE id=? AND owner_email=? AND updated_at=? AND retention_until>? AND status IN ('submitted','in_review','accepted') AND ${guard.sql}`).bind(now,id,email,current.updatedAt,now,...guard.values);
    }else{
      if(current.status==='accepted')return membershipJson({error:"La incorporación ya fue registrada. Solicita una rectificación por el canal de privacidad o retira tu solicitud."},{status:409});
      const config=await membershipConfiguration();
      if(!config.enabled)return membershipJson({error:"La recepción de cambios está cerrada. Puedes consultar o retirar la solicitud."},{status:503});
      const acceptedNotice=await db.prepare("SELECT notice_snapshot FROM membership_applications WHERE id=? AND owner_email=?").bind(id,email).first<{notice_snapshot:string}>();
      if(acceptedNotice?.notice_snapshot!==config.snapshot)return membershipJson({error:"El aviso cambió desde que enviaste esta solicitud. Para enviar datos nuevos, retira la solicitud y presenta otra con el aviso vigente. También puedes pedir rectificación por el canal de privacidad."},{status:409});
      let fields;try{fields=parseMembershipFields(body);}catch(error){return membershipJson({error:(error as Error).message},{status:400});}
      if(fields.name===current.name&&fields.commission===current.commission&&fields.note===current.note&&fields.profileJson===current.profileJson)return membershipJson({error:"No has cambiado ningún dato."},{status:400});
      if(!await consumeRateLimit('membership-edit',email,15,3600000))return membershipJson({error:"Has realizado varias correcciones en poco tiempo. Inténtalo más tarde. Puedes consultar o retirar tu solicitud mientras tanto."},{status:429});
      update=db.prepare(`UPDATE membership_applications SET name=?,commission=?,note=?,profile_json=?,updated_at=? WHERE id=? AND owner_email=? AND updated_at=? AND retention_until>? AND status IN ('submitted','in_review') AND ${guard.sql}`).bind(fields.name,fields.commission,fields.note,fields.profileJson,now,id,email,current.updatedAt,now,...guard.values);
    }
    const kind=body.action==='withdraw'?'withdrawn':'updated', message=body.action==='withdraw'?'Solicitud retirada por su titular.':'Datos corregidos por su titular.';
    const [result]=await db.batch([update,db.prepare("INSERT INTO membership_events (id,application_id,kind,body,actor_type,actor_email,created_at) SELECT ?,?,?,?,'applicant',?,? WHERE changes()>0").bind(crypto.randomUUID(),id,kind,message,email,now)]);
    if(!result.meta.changes)return membershipJson({error:"La solicitud cambió o venció. Actualiza antes de continuar."},{status:409});
    return membershipJson({application:await ownedMembership(id,email),message});
  }catch{return membershipJson({error:"No pudimos guardar el cambio. Consulta el estado antes de repetirlo."},{status:503});}
}
