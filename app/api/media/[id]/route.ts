import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {adminWriteCondition} from '@/lib/admin-write-guard';
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, media, posts } from "@/db/schema";
import { canPublish, currentAuthorizedUser } from "@/lib/authz";
import { cleanText, jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";
import { getRuntimeEnv } from "@/lib/runtime-env";

const MAX_JSON_BYTES = 2_000;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const [record] = await getDb().select().from(media).where(eq(media.id, id)).limit(1);
    if (!record || record.visibility !== "public") return noStoreJson({ error: "Imagen no encontrada." }, { status: 404 });
    const object = await getRuntimeEnv().BUCKET?.get(record.objectKey);
    if (!object) return noStoreJson({ error: "Imagen no encontrada." }, { status: 404 });
    const [current] = await getDb().select({ id: media.id }).from(media).where(and(eq(media.id,id),eq(media.objectKey,record.objectKey),eq(media.visibility,"public"))).limit(1);
    if (!current) { await object.body.cancel().catch(()=>undefined); return noStoreJson({error:"Imagen no encontrada."},{status:404}); }
    return new Response(object.body, { headers: { "Content-Type": record.mimeType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch {
    return noStoreJson({ error: "Imagen no disponible." }, { status: 503 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canPublish(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  const { id } = await context.params;
  let payload: { visibility?: unknown; altText?: unknown; expectedUpdatedAt?: unknown };
  try {
    payload = await readJsonBody<typeof payload>(request, MAX_JSON_BYTES);
  }
  catch (error) { return jsonBodyErrorResponse(error); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });
  const expectedUpdatedAt = Number(payload.expectedUpdatedAt);
  if (!['number','string'].includes(typeof payload.expectedUpdatedAt) || payload.expectedUpdatedAt === undefined || payload.expectedUpdatedAt === null || payload.expectedUpdatedAt === '' || !Number.isSafeInteger(expectedUpdatedAt) || expectedUpdatedAt < 0) return noStoreJson({ error: "Actualiza la imagen antes de guardar los cambios." }, { status: 400 });
  const visibility: "public" | "private" | null | undefined = payload.visibility === undefined ? undefined : payload.visibility === "public" || payload.visibility === "private" ? payload.visibility : null;
  const altText = payload.altText === undefined ? undefined : cleanText(payload.altText, 240);
  if (visibility === null || (altText !== undefined && altText.length < 8) || (visibility === undefined && altText === undefined)) return noStoreJson({ error: "Completa una visibilidad o descripción válida." }, { status: 400 });
  try {
    const db = getDb();
    const [current] = await db.select({ id: media.id, visibility: media.visibility, updatedAt: media.updatedAt }).from(media).where(eq(media.id, id)).limit(1);
    if (!current) return noStoreJson({ error: "Imagen no encontrada." }, { status: 404 });
    if (current.updatedAt !== expectedUpdatedAt) return noStoreJson({ error: "La imagen cambió mientras la editabas. Tu borrador sigue aquí. Revisa la versión actual antes de guardar.", code: "stale_record" }, { status: 409 });
    if (visibility === "private" && current.visibility !== "private") {
      const [usage] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.coverMediaId, id), eq(posts.status, "published"))).limit(1);
      if (usage) return noStoreJson({ error: "La imagen es portada de una publicación visible. Retira o cambia esa portada antes de privatizarla.", code: "media_in_use" }, { status: 409 });
    }
    const now = Math.max(Date.now(), current.updatedAt + 1);
    const changes = { ...(visibility === undefined ? {} : { visibility }), ...(altText === undefined ? {} : { altText }) };
    const usageCondition = visibility === "private"
      ? sql`NOT EXISTS (SELECT 1 FROM ${posts} WHERE ${posts.coverMediaId} = ${id} AND ${posts.status} = 'published')`
      : undefined;
    const [updated] = await db.batch([
      db.update(media).set({ ...changes, updatedAt: now }).where(and(eq(media.id, id), eq(media.updatedAt, expectedUpdatedAt), usageCondition,adminWriteCondition(actor,["admin","editor"]))).returning(),
      db.insert(auditLogs).select(sql`
        SELECT ${crypto.randomUUID()}, ${actor.email}, ${"media.update"}, ${"media"}, ${id}, ${JSON.stringify({ changedFields: Object.keys(changes), fromVisibility: current.visibility, toVisibility: visibility ?? current.visibility })}, ${now}
        WHERE changes() > 0
      `),
    ]);
    const record = updated[0];
    if (!record) return noStoreJson({ error: "La imagen cambió o pasó a utilizarse como portada. Tu borrador sigue aquí. Revisa la versión actual antes de guardar.", code: "stale_record" }, { status: 409 });
    return noStoreJson({ media: record });
  } catch {
    return noStoreJson({ error: "No fue posible actualizar la imagen." }, { status: 500 });
  }
}
