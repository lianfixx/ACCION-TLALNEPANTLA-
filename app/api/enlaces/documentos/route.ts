import { enlacesState, ownEnlacesApplication } from "@/lib/enlaces";
import { editableStatuses, enlacesDocumentCategories, isEnlacesDocumentCategory } from "@/lib/enlaces-shared";
import { membershipJson } from "@/lib/membership";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { cleanText, fileSignatureMime, imageBytesMatchMime, jsonBodyErrorResponse, matchesExpectedAccount, readBodyBytes, requestIsSameOrigin, RequestBodyTooLargeError } from "@/lib/security";
import { sessionWriteGuard } from "@/lib/session-write-guard";
import { getStaffIdentity } from "@/lib/staff-auth";

const fail = (error: string, status = 400) => membershipJson({ error }, { status });
const maxBytes = 5 * 1024 * 1024;

/** Common checks: same origin, the account's own editable application and an open window. */
async function open(request: Request) {
  if (!requestIsSameOrigin(request)) return { response: fail("No pudimos comprobar el origen.", 403) };
  const user = await getStaffIdentity();
  if (!user) return { response: fail("Entra a tu cuenta antes de continuar.", 401) };
  if (!matchesExpectedAccount(request, user.accountId)) return { response: fail("La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario.", 412) };
  const [state, application] = await Promise.all([enlacesState(), ownEnlacesApplication(user.accountId)]);
  if (state.phase !== "open") return { response: fail(state.phase === "before" ? "La convocatoria todavía no abre." : "Las postulaciones ya cerraron. No se reciben más archivos.", 409) };
  if (!application) return { response: fail("Empieza tu postulación antes de subir documentos.", 403) };
  if (!editableStatuses.includes(application.status)) return { response: fail("Tu postulación ya está en revisión y no admite cambios.", 409) };
  return { user, application };
}

/** Receives one file as the request body. A newer file of the same kind replaces the previous one. */
export async function POST(request: Request) {
  let id = "", key = "", tracked = false;
  try {
    const opened = await open(request);
    if ("response" in opened) return opened.response;
    const { user, application } = opened, env = getRuntimeEnv(), db = env.DB!, bucket = env.BUCKET;
    if (!bucket) return fail("No pudimos conectar con el archivo.", 503);
    const category = new URL(request.url).searchParams.get("category") ?? "";
    if (!isEnlacesDocumentCategory(category)) return fail("Elige qué documento subes.");
    if (!await consumeRateLimit("enlaces-upload", user.accountId, 30, 60 * 60_000)) return fail("Has subido varios archivos. Espera antes de subir otro.", 429);
    let mime = (request.headers.get("content-type") ?? "").split(";")[0];
    if (!["", "application/octet-stream", "application/pdf", "image/jpeg", "image/png"].includes(mime)) return fail("Sube un PDF, JPG o PNG.", 415);
    const bytes = await readBodyBytes(request, maxBytes);
    if (bytes.byteLength < 8) return fail("El archivo está vacío o incompleto.");
    if (!mime || mime === "application/octet-stream") mime = fileSignatureMime(bytes, true);
    const valid = mime === "application/pdf" ? new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-" : imageBytesMatchMime(bytes, mime);
    if (!valid || !["application/pdf", "image/jpeg", "image/png"].includes(mime)) return fail("El contenido no corresponde a un PDF, JPG o PNG.", 415);
    if (category === "motivation_letter" && mime !== "application/pdf") return fail("La carta de motivos se sube en PDF. También puedes escribirla en el formulario.", 415);
    let filename = "documento";
    try { filename = decodeURIComponent(request.headers.get("x-file-name") ?? "documento"); } catch { /* Keep the neutral name. */ }
    const name = cleanText(filename, 140).replace(/[\\/<>"\r\n]/g, "_") || "documento";
    id = crypto.randomUUID(); key = "private/commission/" + id;
    const now = Date.now(), session = sessionWriteGuard(user, now);
    const editable = "EXISTS (SELECT 1 FROM enlaces_applications WHERE id=? AND account_id=? AND status IN ('draft','submitted') AND retention_until>?)";
    const [created] = await db.batch([db.prepare(`INSERT INTO commission_documents(id,owner_id,item_id,category,object_key,name,mime,size,status,notice_snapshot,created_at,updated_at,retention_until) SELECT ?,?,NULL,?,?,?,?,?,'uploading',(SELECT notice_snapshot FROM enlaces_applications WHERE id=?),?,?,? WHERE ${session.sql} AND ${editable} AND (SELECT count(*) FROM commission_documents WHERE owner_id=?)<60`)
      .bind(id, user.accountId, category, key, name, mime, bytes.byteLength, application.id, now, now, now + 3_600_000, ...session.values, application.id, user.accountId, now, user.accountId)]);
    if (!created.meta.changes) return fail("Tu sesión cambió o tu cuenta ya tiene 60 archivos. Borra los que no necesites.", 409);
    tracked = true;
    await bucket.put(key, bytes, { httpMetadata: { contentType: mime } });
    const finalizedAt = Date.now(), live = sessionWriteGuard(user, finalizedAt);
    const [received] = await db.batch([db.prepare(`UPDATE commission_documents SET status='received',retention_until=? WHERE id=? AND status='uploading' AND ${live.sql} AND ${editable}`).bind(application.retentionUntil, id, ...live.values, application.id, user.accountId, finalizedAt)]);
    if (!received.meta.changes) { await bucket.delete(key); await db.prepare("DELETE FROM commission_documents WHERE id=?").bind(id).run(); return fail("Tu postulación cambió antes de terminar la carga. El archivo no se guardó.", 409); }
    // The previous file of the same kind is no longer needed.
    const previous = (await db.prepare("SELECT id,object_key AS objectKey FROM commission_documents WHERE owner_id=? AND item_id IS NULL AND category=? AND id<>? AND status<>'uploading'").bind(user.accountId, category, id).all<{ id: string; objectKey: string }>()).results;
    for (const old of previous) { try { await bucket.delete(old.objectKey); await db.prepare("DELETE FROM commission_documents WHERE id=? AND owner_id=?").bind(old.id, user.accountId).run(); } catch { /* The daily purge retries. */ } }
    return membershipJson({ id, category, label: enlacesDocumentCategories[category] }, { status: 201 });
  } catch (error) {
    if (tracked) { try { await getRuntimeEnv().BUCKET!.delete(key); await getRuntimeEnv().DB!.prepare("DELETE FROM commission_documents WHERE id=?").bind(id).run(); } catch { /* The tracked row expires within the hour. */ } }
    if (error instanceof RequestBodyTooLargeError) return fail("El archivo pesa más de 5 MB. Súbelo más ligero.", 413);
    if (error instanceof SyntaxError) return jsonBodyErrorResponse(error);
    return fail("No pudimos guardar el archivo. Inténtalo de nuevo.", 503);
  }
}

/** Removes one of the two letters while the application is still a draft. */
export async function DELETE(request: Request) {
  try {
    const opened = await open(request);
    if ("response" in opened) return opened.response;
    const { user, application } = opened, env = getRuntimeEnv(), db = env.DB!;
    if (application.status !== "draft") return fail("Tu postulación ya fue enviada. Para cambiar un documento, sube el nuevo.", 409);
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const row = await db.prepare("SELECT id,object_key AS objectKey FROM commission_documents WHERE id=? AND owner_id=? AND item_id IS NULL AND category IN ('motivation_letter','recommendation_letter')").bind(id, user.accountId).first<{ id: string; objectKey: string }>();
    if (!row) return fail("Ese archivo ya no está.", 404);
    const session = sessionWriteGuard(user);
    if (!await db.prepare("SELECT 1 WHERE " + session.sql).bind(...session.values).first()) return fail("Tu sesión cambió. Vuelve a entrar.", 403);
    await env.BUCKET!.delete(row.objectKey);
    await db.prepare("DELETE FROM commission_documents WHERE id=? AND owner_id=?").bind(row.id, user.accountId).run();
    return membershipJson({ ok: true });
  } catch { return fail("No pudimos borrar el archivo. Inténtalo de nuevo.", 503); }
}
