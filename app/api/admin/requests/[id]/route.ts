import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {adminWriteCondition} from '@/lib/admin-write-guard';
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { requestAssignees } from "@/lib/request-assignments";
import { getDb } from "@/db";
import { auditLogs, contactRequests } from "@/db/schema";
import { canHandleRequests, currentAuthorizedUser, isConfiguredOwner } from "@/lib/authz";
import { cleanEmail, jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";

const MAX_JSON_BYTES = 3_000;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canHandleRequests(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  const { id } = await context.params;
  let payload: Record<string, unknown>;
  try {
    payload = await readJsonBody<Record<string, unknown>>(request, MAX_JSON_BYTES);
  } catch (error) {
    return jsonBodyErrorResponse(error);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });
  const status = payload.status === "new" || payload.status === "in_review" || payload.status === "closed" ? payload.status : null;
  const assignedInput = typeof payload.assignedTo === "string" ? payload.assignedTo.trim() : "";
  const assignedTo = assignedInput ? cleanEmail(assignedInput) : null;
  const expectedUpdatedAt = Number(payload.expectedUpdatedAt);
  if (!status || (assignedInput && !assignedTo) || !Number.isInteger(expectedUpdatedAt) || expectedUpdatedAt < 0) {
    return noStoreJson({ error: "Estado, responsable o versión inválidos." }, { status: 400 });
  }
  try {
    if (assignedTo && !(await requestAssignees()).includes(assignedTo)) return noStoreJson({ error: "El responsable debe tener permiso vigente para atender solicitudes." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select({ id: contactRequests.id, status: contactRequests.status, updatedAt: contactRequests.updatedAt, createdAt: contactRequests.createdAt }).from(contactRequests).where(and(eq(contactRequests.id, id), gt(contactRequests.retentionUntil, Date.now()))).limit(1);
    if (!current) return noStoreJson({ error: "Solicitud no encontrada." }, { status: 404 });
    const currentVersion = current.updatedAt ?? current.createdAt;
    if (currentVersion !== expectedUpdatedAt) return noStoreJson({ error: "La solicitud cambió en otra sesión. Actualiza el panel.", code: "edit_conflict" }, { status: 409 });
    const now = Math.max(Date.now(), currentVersion + 1);
    const versionCondition = current.updatedAt === null ? isNull(contactRequests.updatedAt) : eq(contactRequests.updatedAt, current.updatedAt);
    const assignmentCondition = !assignedTo || isConfiguredOwner(assignedTo) ? undefined : sql`EXISTS (SELECT 1 FROM user_roles WHERE email = ${assignedTo} AND role = 'admin' AND revoked_at IS NULL)`;
    const auditInsert = db.insert(auditLogs).select(sql`
      SELECT ${crypto.randomUUID()}, ${actor.email}, ${"request.update"}, ${"contact_request"}, ${id}, ${JSON.stringify({ changedFields: ["status", "assignedTo"], fromStatus: current.status, toStatus: status })}, ${now}
      WHERE changes() > 0
    `);
    const [updated] = await db.batch([
      db.update(contactRequests).set({ status, assignedTo, handledBy: actor.email, updatedAt: now, closedAt: status === "closed" ? now : null }).where(and(eq(contactRequests.id, id), versionCondition, gt(contactRequests.retentionUntil, Date.now()), assignmentCondition,adminWriteCondition(actor,["admin"]))).returning({ id: contactRequests.id, status: contactRequests.status, assignedTo: contactRequests.assignedTo, updatedAt: contactRequests.updatedAt, closedAt: contactRequests.closedAt }),
      auditInsert,
    ]);
    const record = updated[0];
    if (!record) return noStoreJson({ error: "La solicitud cambió en otra sesión. Actualiza el panel.", code: "edit_conflict" }, { status: 409 });
    return noStoreJson({ record });
  } catch {
    return noStoreJson({ error: "No fue posible actualizar la solicitud." }, { status: 500 });
  }
}
