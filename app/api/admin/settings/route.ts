import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {adminWriteGuard} from '@/lib/admin-write-guard';
import { currentAuthorizedUser, isConfiguredOwner } from "@/lib/authz";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { editableSettingKeys, parseSettings, readSettingsRecord } from "@/lib/site-settings";
import { jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";

export async function PATCH(request: Request) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !isConfiguredOwner(actor.email)) return noStoreJson({ error: "Solo la persona propietaria puede guardar esta configuración." }, { status: 403 });
  let payload: { values?: unknown; expectedUpdatedAt?: unknown };
  try { payload = await readJsonBody(request, 64_000); }
  catch (error) { return jsonBodyErrorResponse(error); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ error: "Configuración inválida." }, { status: 400 });
  let values;
  try { values = parseSettings(payload.values); } catch (error) { return noStoreJson({ error: error instanceof Error ? error.message : "Configuración inválida." }, { status: 400 }); }
  if (values.MEMBERSHIP_ENABLED === "1" && (!getRuntimeEnv().DB || (getRuntimeEnv().RATE_LIMIT_SECRET?.length ?? 0) < 32)) return noStoreJson({ error: "El registro requiere base de datos y protección de límites configuradas en el servidor. Puedes guardar los datos del aviso con la recepción cerrada." }, { status: 503 });
    const expected = Number(payload.expectedUpdatedAt);
  if (!Number.isSafeInteger(expected) || expected < 0) return noStoreJson({ error: "Actualiza la configuración antes de guardar." }, { status: 400 });
  try {
    const current = await readSettingsRecord();
    if (current.updatedAt !== expected) return noStoreJson({ error: "La configuración cambió mientras la editabas. Lo que escribiste sigue aquí. Carga la versión actual antes de guardar." }, { status: 409 });
    const db = getRuntimeEnv().DB!, guard=adminWriteGuard(actor,[]);
    const now = Math.max(Date.now(), expected + 1);
    const update = expected === 0
      ? db.prepare("INSERT INTO site_settings (id, values_json, updated_at, updated_by) SELECT 'public', ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM site_settings WHERE id = 'public') AND "+guard.sql).bind(JSON.stringify(values), now, actor.email,...guard.values)
      : db.prepare("UPDATE site_settings SET values_json = ?, updated_at = ?, updated_by = ? WHERE id = 'public' AND updated_at = ? AND "+guard.sql).bind(JSON.stringify(values), now, actor.email, expected,...guard.values);
    const changedFields = editableSettingKeys.filter(key => values[key] !== current.values[key]);
    const [result] = await db.batch([update, db.prepare("INSERT INTO audit_logs (id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'settings.update','settings','public',?,? WHERE changes() > 0").bind(crypto.randomUUID(), actor.email, JSON.stringify({ changedFields }), now)]);
    if (!result.meta.changes) return noStoreJson({ error: "La configuración cambió mientras la editabas. Actualiza la página antes de guardar." }, { status: 409 });
    return noStoreJson({ record: { values, updatedAt: now }, message: values.MEMBERSHIP_ENABLED === '1' ? 'Configuración guardada. La recepción de incorporaciones está abierta.' : 'Configuración guardada. La recepción de incorporaciones sigue cerrada.' });
  } catch { return noStoreJson({ error: "No fue posible guardar la configuración." }, { status: 503 }); }
}
