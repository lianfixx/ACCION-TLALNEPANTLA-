import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {adminWriteCondition} from '@/lib/admin-write-guard';
import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, comments } from "@/db/schema";
import { canModerate, currentAuthorizedUser } from "@/lib/authz";
import { jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";

const MAX_JSON_BYTES = 2_000;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canModerate(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  const { id } = await context.params;
  let payload: { status?: unknown; expectedUpdatedAt?: unknown };
  try {
    payload = await readJsonBody<typeof payload>(request, MAX_JSON_BYTES);
  }
  catch (error) { return jsonBodyErrorResponse(error); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });
  const status = payload.status === "approved" || payload.status === "rejected" ? payload.status : null;
  if (!status) return noStoreJson({ error: "Estado inválido." }, { status: 400 });
  const expectedUpdatedAt = Number(payload.expectedUpdatedAt);
  if (!["number", "string"].includes(typeof payload.expectedUpdatedAt) || String(payload.expectedUpdatedAt).trim() === "" || !Number.isSafeInteger(expectedUpdatedAt) || expectedUpdatedAt < 0) {
    return noStoreJson({ error: "Actualiza la opinión antes de guardar tu decisión." }, { status: 400 });
  }
  try {
    const db = getDb();
    const [current] = await db.select({ id: comments.id, status: comments.status, createdAt: comments.createdAt, moderatedAt: comments.moderatedAt }).from(comments).where(and(eq(comments.id, id), gt(comments.retentionUntil, Date.now()))).limit(1);
    if (!current) return noStoreJson({ error: "Opinión no encontrada." }, { status: 404 });
    const currentVersion = current.moderatedAt ?? current.createdAt;
    if (currentVersion !== expectedUpdatedAt) return noStoreJson({ error: "La opinión cambió. Actualiza el panel antes de decidir.", code: "edit_conflict" }, { status: 409 });
    const now = Math.max(Date.now(), currentVersion + 1);
    const auditInsert = db.insert(auditLogs).select(sql`
      SELECT ${crypto.randomUUID()}, ${actor.email}, ${`comment.${status}`}, ${"comment"}, ${id}, ${JSON.stringify({ fromStatus: current.status, toStatus: status })}, ${now}
      WHERE changes() > 0
    `);
    const [updated] = await db.batch([
      db.update(comments).set({ status, moderatedAt: now, moderatedBy: actor.email }).where(and(eq(comments.id, id), gt(comments.retentionUntil, Date.now()), sql`coalesce(${comments.moderatedAt}, ${comments.createdAt}) = ${expectedUpdatedAt}`,adminWriteCondition(actor,["admin","moderator"]))).returning({ id: comments.id, status: comments.status, moderatedAt: comments.moderatedAt }),
      auditInsert,
    ]);
    const comment = updated[0];
    if (!comment) return noStoreJson({ error: "La opinión cambió o dejó de estar disponible. Actualiza el panel antes de decidir.", code: "edit_conflict" }, { status: 409 });
    return noStoreJson({ comment });
  } catch {
    return noStoreJson({ error: "No fue posible moderar la opinión." }, { status: 500 });
  }
}
