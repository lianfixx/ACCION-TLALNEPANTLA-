import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {adminWriteGuard} from '@/lib/admin-write-guard';
import { activityDb, listActivities, parseActivity } from "@/lib/activities";
import { currentAuthorizedUser, canPublish } from "@/lib/authz";
import { noStoreJson, requestIsSameOrigin, requestHasJsonContentType, readJsonBody, jsonBodyErrorResponse } from "@/lib/security";

export async function GET() {
  try { return noStoreJson({ activities: await listActivities() }); }
  catch { return noStoreJson({ error: "La agenda no está disponible en este momento." }, { status: 503 }); }
}
export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canPublish(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  let payload: Record<string, unknown>;
  try { payload = await readJsonBody(request, 16000); } catch (error) { return jsonBodyErrorResponse(error); }
  const parsed = parseActivity(payload);
  if (parsed.error) return noStoreJson({ error: parsed.error }, { status: 400 });
  const item = parsed.value, id = crypto.randomUUID(), now = Date.now();
  try {
    const db = activityDb(), guard=adminWriteGuard(actor,["admin","editor"]);
    const [result]=await db.batch([
      db.prepare("INSERT INTO activities (id,title,description,location,starts_at,ends_at,registration_url,status,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE "+guard.sql).bind(id,item.title,item.description,item.location,item.startsAt,item.endsAt,item.registrationUrl,item.status,now,now,...guard.values),
      db.prepare("INSERT INTO audit_logs (id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()>0").bind(crypto.randomUUID(),actor.email,"activity.create","activity",id,JSON.stringify({ status: item.status }),now),
    ]);
    if(!result.meta.changes)return noStoreJson({error:"Tu acceso cambió. Vuelve a entrar antes de guardar."},{status:409});
    return noStoreJson({ id, message: "Actividad guardada." }, { status: 201 });
  } catch { return noStoreJson({ error: "No se pudo guardar. Conservamos los campos para que vuelvas a intentarlo." }, { status: 503 }); }
}
