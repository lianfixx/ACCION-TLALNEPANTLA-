import {matchesExpectedAccount} from '@/lib/security';
import {sessionWriteGuard} from "@/lib/session-write-guard";
import { getStaffIdentity } from "@/lib/staff-auth";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { cleanEmail, jsonBodyErrorResponse, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";
import { membershipColumns, membershipConfiguration, membershipJson } from "@/lib/membership";
import { membershipReadIsCurrent } from "@/lib/membership-read";
import { membershipConsent, parseMembershipFields, type MembershipApplication } from "@/lib/membership-shared";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function GET(request:Request) {
  const user = await getStaffIdentity(), email = cleanEmail(user?.email);
  if (!user || !email) return membershipJson({error:"Inicia sesión para consultar tus solicitudes."},{status:401});
  if(!matchesExpectedAccount(request,user.accountId))return membershipJson({error:"La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario."},{status:412});
  try {
    const result = await getRuntimeEnv().DB!.prepare(`SELECT ${membershipColumns} FROM membership_applications WHERE owner_email=? AND retention_until>? ORDER BY created_at DESC,id DESC LIMIT 25`).bind(email,Date.now()).all<MembershipApplication>();
    if (!await membershipReadIsCurrent(user, result.results.map(application => application.id))) return membershipJson({error:"Tu sesión o el acceso a las solicitudes cambió. Vuelve a entrar para consultarlas."},{status:403});
    return membershipJson({ applications:result.results });
  } catch { return membershipJson({error:"No pudimos consultar el registro. Intenta de nuevo."},{status:503}); }
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return membershipJson({error:"Origen no permitido."},{status:403});
  if (!requestHasJsonContentType(request)) return membershipJson({error:"No pudimos leer los datos enviados. Actualiza la página e inténtalo de nuevo."},{status:415});
  const user = await getStaffIdentity(), email = cleanEmail(user?.email);
  if (!user || !email) return membershipJson({error:"Inicia sesión antes de enviar."},{status:401});
  if(!matchesExpectedAccount(request,user.accountId))return membershipJson({error:"La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario."},{status:412});
  let body: Record<string,unknown>;
  try { body=await readJsonBody(request,48000); } catch(error){ return jsonBodyErrorResponse(error); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return membershipJson({error:"Solicitud inválida."},{status:400});
  let fields;
  try { fields=parseMembershipFields(body); } catch(error) { return membershipJson({error:(error as Error).message},{status:400}); }
  if (body.consent !== true || body.adultSelfDeclared !== true) return membershipJson({error:"Confirma que tienes 18 años cumplidos, que presentas la solicitud por ti mismo y que aceptas el aviso."},{status:400});
  try {
    const config = await membershipConfiguration();
    if (!config.enabled) return membershipJson({error:"La recepción del registro interno todavía no está abierta."},{status:503});
    if (body.noticeToken !== config.noticeToken) return membershipJson({error:"El aviso cambió. Actualiza la página y revísalo antes de enviar."},{status:409});
    if (!await consumeRateLimit("membership-create",email,5,60*60*1000)) return membershipJson({error:"Has realizado varios envíos en poco tiempo. Inténtalo más tarde."},{status:429});
    const db=getRuntimeEnv().DB!, now=Date.now(), id=crypto.randomUUID(), reference=`APJ-${crypto.randomUUID().replaceAll("-","").slice(0,12).toUpperCase()}`;
    const guard=sessionWriteGuard(user,now);
    const results=await db.batch([
      db.prepare(`DELETE FROM membership_applications WHERE owner_email=? AND retention_until<=? AND ${guard.sql}`).bind(email,now,...guard.values),
      db.prepare(`INSERT INTO membership_applications (id,owner_email,name,commission,note,profile_json,reference_code,status,notice_version,notice_snapshot,consent_text,consent_at,adult_self_declared,retention_until,created_at,updated_at) SELECT ?,?,?,?,?,?,?,'submitted',?,?,?,?,1,?,?,? WHERE NOT EXISTS (SELECT 1 FROM membership_applications WHERE owner_email=? AND status IN ('submitted','in_review','accepted')) AND ${guard.sql}`).bind(id,email,fields.name,fields.commission,fields.note,fields.profileJson,reference,config.notice.version,config.snapshot,membershipConsent,now,now+config.notice.retentionDays*86400000,now,now,email,...guard.values),
      db.prepare("INSERT INTO membership_events (id,application_id,kind,body,actor_type,actor_email,created_at) SELECT ?,?,'submitted','Solicitud recibida.','applicant',?,? WHERE changes()>0").bind(crypto.randomUUID(),id,email,now),
    ]);
    const record=await db.prepare(`SELECT ${membershipColumns} FROM membership_applications WHERE owner_email=? AND status IN ('submitted','in_review','accepted') AND retention_until>? AND ${guard.sql} LIMIT 1`).bind(email,now,...guard.values).first<MembershipApplication>();
    if(!record)return membershipJson({error:"Tu sesión o solicitud cambió durante el envío. Vuelve a entrar y comprueba el estado antes de enviarla otra vez."},{status:409});
    return membershipJson({application:record,message:results[1].meta.changes ? "Solicitud recibida. Conserva tu folio y consulta aquí el seguimiento." : "Ya tienes una solicitud activa. Puedes consultar su seguimiento."},{status:results[1].meta.changes ? 201 : 200});
  } catch { return membershipJson({error:"No pudimos confirmar el envío. Consulta tus solicitudes antes de volver a intentarlo."},{status:503}); }
}
