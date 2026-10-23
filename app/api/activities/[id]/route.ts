import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {adminWriteGuard} from '@/lib/admin-write-guard';
import { activityDb, parseActivity } from "@/lib/activities";
import { currentAuthorizedUser, canPublish } from "@/lib/authz";
import { noStoreJson, requestIsSameOrigin, requestHasJsonContentType, readJsonBody, jsonBodyErrorResponse } from "@/lib/security";

export async function PATCH(request: Request, context: { params: Promise<{id: string}> }) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canPublish(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  let payload: Record<string, unknown>;
  try { payload = await readJsonBody(request, 16000); } catch (error) { return jsonBodyErrorResponse(error); }
  const parsed = parseActivity(payload), version = Number(payload?.expectedUpdatedAt);
  if (parsed.error || !Number.isSafeInteger(version) || version < 0) return noStoreJson({ error: parsed.error ?? "Versión inválida." }, { status: 400 });
  const { id } = await context.params, item = parsed.value!, now = Math.max(Date.now(), version + 1);
  try {
    const db = activityDb(), guard=adminWriteGuard(actor,["admin","editor"]);
    const [result] = await db.batch([
      db.prepare("UPDATE activities SET title=?,description=?,location=?,starts_at=?,ends_at=?,registration_url=?,status=?,updated_at=? WHERE id=? AND updated_at=? AND "+guard.sql).bind(item.title,item.description,item.location,item.startsAt,item.endsAt,item.registrationUrl,item.status,now,id,version,...guard.values),
      db.prepare("INSERT INTO audit_logs (id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,?,?,?,?,? WHERE changes() > 0").bind(crypto.randomUUID(),actor.email,"activity.update","activity",id,JSON.stringify({ status: item.status }),now),
    ]);
    if (!result.meta.changes) return noStoreJson({ error: "La actividad cambió en otra sesión. Actualiza el panel antes de editarla." }, { status: 409 });
    return noStoreJson({ message: "Actividad actualizada." });
  } catch { return noStoreJson({ error: "No se pudo guardar. Conservamos los campos para que vuelvas a intentarlo." }, { status: 503 }); }
}
