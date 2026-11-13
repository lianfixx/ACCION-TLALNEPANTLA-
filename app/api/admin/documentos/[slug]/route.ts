import { adminWriteGuard } from "@/lib/admin-write-guard";
import { canHandleRequests, currentAuthorizedUser } from "@/lib/authz";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { cleanText, jsonBodyErrorResponse, matchesExpectedAccount, noStoreJson, readBodyBytes, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";
import { isSiteDocumentSlug, SITE_DOCUMENT_MAX_BYTES, type SiteDocumentRow } from "@/lib/site-documents";

type Context = { params: Promise<{ slug: string }> };
const changedElsewhere = "Este documento cambió mientras lo revisabas. Actualiza la página antes de continuar.";
const columns = "slug, object_key, file_name, size_bytes, sha256, uploaded_at, uploaded_by";

async function authorize(request: Request) {
  if (!requestIsSameOrigin(request)) return { error: noStoreJson({ error: "Origen no permitido." }, { status: 403 }) };
  const actor = await currentAuthorizedUser();
  if (actor && !matchesExpectedAccount(request, actor.accountId)) return { error: noStoreJson({ error: "La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario." }, { status: 412 }) };
  if (!actor || !canHandleRequests(actor.role)) return { error: noStoreJson({ error: "Solo administración puede cambiar los documentos del sitio." }, { status: 403 }) };
  return { actor };
}

const hex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, "0")).join("");

/** Upload a new version of one PDF. The body is the file itself (application/pdf). */
export async function POST(request: Request, context: Context) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const actor = auth.actor;
  const slug = (await context.params).slug;
  if (!isSiteDocumentSlug(slug)) return noStoreJson({ error: "Ese documento no existe." }, { status: 404 });
  const mime = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!["application/pdf", "application/octet-stream", ""].includes(mime)) return noStoreJson({ error: "Sube un archivo PDF." }, { status: 415 });
  const expected = Number(new URL(request.url).searchParams.get("expectedUploadedAt"));
  if (!Number.isSafeInteger(expected) || expected < 0) return noStoreJson({ error: "Actualiza la página antes de subir el archivo." }, { status: 400 });
  const { DB: db, BUCKET: bucket } = getRuntimeEnv();
  if (!db || !bucket) return noStoreJson({ error: "El almacenamiento de archivos no está disponible." }, { status: 503 });
  let bytes: Uint8Array;
  try { bytes = await readBodyBytes(request, SITE_DOCUMENT_MAX_BYTES); }
  catch (error) { return jsonBodyErrorResponse(error); }
  if (bytes.byteLength < 8 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return noStoreJson({ error: "El archivo no es un PDF válido." }, { status: 415 });
  let fileName = `${slug}.pdf`;
  try { fileName = decodeURIComponent(request.headers.get("x-file-name") ?? fileName); } catch { /* Keep the default name. */ }
  fileName = cleanText(fileName, 140).replace(/[\\/<>"\r\n]/g, "_") || `${slug}.pdf`;
  const sha256 = hex(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>));
  const objectKey = `site-documents/${slug}/${sha256}.pdf`;
  let stored = false, previousKey = "";
  try {
    const current = await db.prepare(`SELECT ${columns} FROM site_documents WHERE slug = ?`).bind(slug).first<SiteDocumentRow>();
    if ((current?.uploaded_at ?? 0) !== expected) return noStoreJson({ error: changedElsewhere }, { status: 409 });
    previousKey = current?.object_key ?? "";
    await bucket.put(objectKey, bytes, { httpMetadata: { contentType: "application/pdf" } });
    stored = objectKey !== previousKey;
    const guard = adminWriteGuard(actor, ["admin"]);
    const now = Math.max(Date.now(), expected + 1);
    const write = expected === 0
      ? db.prepare("INSERT INTO site_documents (slug, object_key, file_name, size_bytes, sha256, uploaded_at, uploaded_by) SELECT ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM site_documents WHERE slug = ?) AND " + guard.sql).bind(slug, objectKey, fileName, bytes.byteLength, sha256, now, actor.email, slug, ...guard.values)
      : db.prepare("UPDATE site_documents SET object_key = ?, file_name = ?, size_bytes = ?, sha256 = ?, uploaded_at = ?, uploaded_by = ? WHERE slug = ? AND uploaded_at = ? AND " + guard.sql).bind(objectKey, fileName, bytes.byteLength, sha256, now, actor.email, slug, expected, ...guard.values);
    const [result] = await db.batch([
      write,
      db.prepare("INSERT INTO audit_logs (id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'document.replace','site_document',?,?,? WHERE changes() > 0").bind(crypto.randomUUID(), actor.email, slug, JSON.stringify({ sizeBytes: bytes.byteLength, sha256 }), now),
    ]);
    if (!result.meta.changes) {
      if (stored) await bucket.delete(objectKey).catch(() => undefined);
      return noStoreJson({ error: changedElsewhere }, { status: 409 });
    }
    if (previousKey && previousKey !== objectKey) await bucket.delete(previousKey).catch(() => undefined);
    return noStoreJson({ document: { slug, object_key: objectKey, file_name: fileName, size_bytes: bytes.byteLength, sha256, uploaded_at: now, uploaded_by: actor.email }, message: "Listo. El sitio ya entrega la versión nueva." }, { status: 201 });
  } catch {
    if (stored) await bucket.delete(objectKey).catch(() => undefined);
    return noStoreJson({ error: "No fue posible guardar el documento." }, { status: 503 });
  }
}

/** Remove the uploaded version so the site serves the original again. */
export async function DELETE(request: Request, context: Context) {
  const auth = await authorize(request);
  if (auth.error) return auth.error;
  const actor = auth.actor;
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const slug = (await context.params).slug;
  if (!isSiteDocumentSlug(slug)) return noStoreJson({ error: "Ese documento no existe." }, { status: 404 });
  let payload: { expectedUploadedAt?: unknown };
  try { payload = await readJsonBody(request, 2_000); }
  catch (error) { return jsonBodyErrorResponse(error); }
  const expected = Number(payload?.expectedUploadedAt);
  if (!Number.isSafeInteger(expected) || expected < 1) return noStoreJson({ error: "Actualiza la página antes de continuar." }, { status: 400 });
  const { DB: db, BUCKET: bucket } = getRuntimeEnv();
  if (!db || !bucket) return noStoreJson({ error: "El almacenamiento de archivos no está disponible." }, { status: 503 });
  try {
    const current = await db.prepare(`SELECT ${columns} FROM site_documents WHERE slug = ?`).bind(slug).first<SiteDocumentRow>();
    if (!current || current.uploaded_at !== expected) return noStoreJson({ error: changedElsewhere }, { status: 409 });
    const guard = adminWriteGuard(actor, ["admin"]);
    const [result] = await db.batch([
      db.prepare("DELETE FROM site_documents WHERE slug = ? AND uploaded_at = ? AND " + guard.sql).bind(slug, expected, ...guard.values),
      db.prepare("INSERT INTO audit_logs (id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'document.reset','site_document',?,?,? WHERE changes() > 0").bind(crypto.randomUUID(), actor.email, slug, JSON.stringify({ sha256: current.sha256 }), Date.now()),
    ]);
    if (!result.meta.changes) return noStoreJson({ error: changedElsewhere }, { status: 409 });
    await bucket.delete(current.object_key).catch(() => undefined);
    return noStoreJson({ document: null, message: "Listo. El sitio vuelve a entregar el documento original." });
  } catch {
    return noStoreJson({ error: "No fue posible restaurar el documento." }, { status: 503 });
  }
}
