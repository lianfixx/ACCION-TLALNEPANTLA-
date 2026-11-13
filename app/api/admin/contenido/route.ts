import { adminWriteGuard } from "@/lib/admin-write-guard";
import { canHandleRequests, currentAuthorizedUser } from "@/lib/authz";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { jsonBodyErrorResponse, matchesExpectedAccount, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";
import { blockByKey, ContentValidationError, contentDefaults, parseContentBlock } from "@/lib/site-content-defaults";

const changedElsewhere = "Este bloque cambió mientras lo editabas. Lo que escribiste sigue aquí. Carga la versión actual antes de guardar.";

/** Save or reset one editable block of public text. Only administration. */
export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if (actor && !matchesExpectedAccount(request, actor.accountId)) return noStoreJson({ error: "La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario." }, { status: 412 });
  if (!actor || !canHandleRequests(actor.role)) return noStoreJson({ error: "Solo administración puede cambiar el contenido del sitio." }, { status: 403 });
  let payload: { action?: unknown; key?: unknown; value?: unknown; expectedUpdatedAt?: unknown };
  try { payload = await readJsonBody(request, 64_000); }
  catch (error) { return jsonBodyErrorResponse(error); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });
  const key = typeof payload.key === "string" ? payload.key : "";
  if (!blockByKey.has(key)) return noStoreJson({ error: "Ese bloque no existe." }, { status: 400 });
  if (payload.action !== "save" && payload.action !== "reset") return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });
  const expected = Number(payload.expectedUpdatedAt);
  if (!Number.isSafeInteger(expected) || expected < 0) return noStoreJson({ error: "Actualiza la página antes de guardar." }, { status: 400 });
  let value: Record<string, unknown> | null = null;
  if (payload.action === "save") {
    try { value = parseContentBlock(key, payload.value); }
    catch (error) { return noStoreJson({ error: error instanceof ContentValidationError ? error.message : "Revisa el contenido." }, { status: 400 }); }
  }
  const db = getRuntimeEnv().DB;
  if (!db) return noStoreJson({ error: "La base de datos no está disponible." }, { status: 503 });
  try {
    const current = await db.prepare("SELECT updated_at FROM site_content WHERE key = ?").bind(key).first<{ updated_at: number }>();
    if ((current?.updated_at ?? 0) !== expected) return noStoreJson({ error: changedElsewhere }, { status: 409 });
    const guard = adminWriteGuard(actor, ["admin"]);
    const now = Math.max(Date.now(), expected + 1);
    if (payload.action === "reset") {
      if (!current) return noStoreJson({ record: { key, value: contentDefaults[key], updatedAt: 0, updatedBy: "", custom: false }, message: "Este bloque ya usa el texto original." });
      const [result] = await db.batch([
        db.prepare("DELETE FROM site_content WHERE key = ? AND updated_at = ? AND " + guard.sql).bind(key, expected, ...guard.values),
        db.prepare("INSERT INTO audit_logs (id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'content.reset','site_content',?,?,? WHERE changes() > 0").bind(crypto.randomUUID(), actor.email, key, JSON.stringify({ previousUpdatedAt: expected }), now),
      ]);
      if (!result.meta.changes) return noStoreJson({ error: changedElsewhere }, { status: 409 });
      return noStoreJson({ record: { key, value: contentDefaults[key], updatedAt: 0, updatedBy: "", custom: false }, message: "Listo. La página vuelve a mostrar el texto original." });
    }
    const json = JSON.stringify(value);
    const write = expected === 0
      ? db.prepare("INSERT INTO site_content (key, value_json, updated_at, updated_by) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM site_content WHERE key = ?) AND " + guard.sql).bind(key, json, now, actor.email, key, ...guard.values)
      : db.prepare("UPDATE site_content SET value_json = ?, updated_at = ?, updated_by = ? WHERE key = ? AND updated_at = ? AND " + guard.sql).bind(json, now, actor.email, key, expected, ...guard.values);
    const [result] = await db.batch([
      write,
      db.prepare("INSERT INTO audit_logs (id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'content.update','site_content',?,?,? WHERE changes() > 0").bind(crypto.randomUUID(), actor.email, key, JSON.stringify({ fields: Object.keys(value ?? {}) }), now),
    ]);
    if (!result.meta.changes) return noStoreJson({ error: changedElsewhere }, { status: 409 });
    return noStoreJson({ record: { key, value, updatedAt: now, updatedBy: actor.email, custom: true }, message: "Guardado. La página pública ya muestra este texto." });
  } catch {
    return noStoreJson({ error: "No fue posible guardar el contenido." }, { status: 503 });
  }
}
