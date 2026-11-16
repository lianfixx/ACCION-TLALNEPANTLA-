import { enlacesAgeReference, enlacesNotice, enlacesReference, enlacesRetentionAfterClose, enlacesState, ownEnlacesApplication } from "@/lib/enlaces";
import { enlacesDocuments, missingEnlacesDocuments, removeEnlacesDocuments } from "@/lib/enlaces-documents";
import { editableStatuses, enlacesCycle, parseEnlacesFields, type EnlacesStatus } from "@/lib/enlaces-shared";
import { enlacesView } from "@/lib/enlaces-view";
import { membershipJson } from "@/lib/membership";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { jsonBodyErrorResponse, matchesExpectedAccount, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";
import { sessionWriteGuard } from "@/lib/session-write-guard";
import { getStaffIdentity } from "@/lib/staff-auth";

const fail = (error: string, status = 400) => membershipJson({ error }, { status });
const otherAccount = "La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario.";
const changed = "Tu postulación cambió en otra pestaña. Recarga la página antes de continuar.";
const closedMessage = (phase: string) => phase === "before" ? "La convocatoria todavía no abre." : "Las postulaciones ya cerraron. Tu postulación no admite cambios.";

const view = enlacesView;

export async function GET(request: Request) {
  const user = await getStaffIdentity();
  if (!user) return fail("Entra a tu cuenta para ver tu postulación.", 401);
  if (!matchesExpectedAccount(request, user.accountId)) return fail(otherAccount, 412);
  try { return membershipJson(await view(user.accountId, user.fullName || user.displayName)); }
  catch { return fail("No pudimos consultar tu postulación. Inténtalo de nuevo.", 503); }
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return fail("No pudimos comprobar el origen.", 403);
  if (!requestHasJsonContentType(request)) return fail("No pudimos leer el formulario. Recarga la página.", 415);
  const user = await getStaffIdentity();
  if (!user) return fail("Entra a tu cuenta antes de continuar.", 401);
  if (!matchesExpectedAccount(request, user.accountId)) return fail(otherAccount, 412);
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request, 32_000); } catch (error) { return jsonBodyErrorResponse(error); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return fail("Revisa los datos enviados.");
  try {
    const db = getRuntimeEnv().DB!, action = String(body.action ?? ""), now = Date.now();
    if (!await consumeRateLimit("enlaces-form", user.accountId, 240, 60 * 60_000)) return fail("Has guardado muchas veces seguidas. Espera unos minutos.", 429);
    const [state, application] = await Promise.all([enlacesState(now), ownEnlacesApplication(user.accountId)]);
    const session = sessionWriteGuard(user, now);
    const name = user.fullName || user.displayName;
    const audit = (auditAction: string, id: string) => db.prepare("INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,created_at) SELECT ?,?,?,'enlaces',?,? WHERE changes()>0").bind(crypto.randomUUID(), user.email, auditAction, id, now);

    if (action === "start") {
      if (state.phase !== "open") return fail(closedMessage(state.phase), 409);
      if (application) return fail("Ya tienes una postulación en esta convocatoria.", 409);
      const notice = await enlacesNotice();
      if (!notice.ready) return fail("El aviso de privacidad de la convocatoria todavía no está completo. Inténtalo más tarde.", 503);
      if (body.consent !== true) return fail("Para empezar, lee el aviso y marca la casilla.");
      if (body.noticeToken !== notice.token) return fail("El aviso cambió. Recarga la página, léelo de nuevo y continúa.", 409);
      const id = crypto.randomUUID();
      try {
        const [created] = await db.batch([
          db.prepare(`INSERT INTO enlaces_applications(id,account_id,cycle,status,reference_code,notice_version,notice_snapshot,consent_at,created_at,updated_at,retention_until) SELECT ?,?,?,'draft',?,?,?,?,?,?,? WHERE ${session.sql}`).bind(id, user.accountId, enlacesCycle, enlacesReference(), notice.version, notice.snapshot, now, now, now, state.closesAt + enlacesRetentionAfterClose, ...session.values),
          audit("enlaces.started", id),
        ]);
        if (!created.meta.changes) return fail("Tu sesión cambió. Vuelve a entrar.", 403);
      } catch { return fail("Ya tienes una postulación en esta convocatoria.", 409); }
      return membershipJson(await view(user.accountId, name), { status: 201 });
    }

    if (!application) return fail("Todavía no empiezas tu postulación.", 404);
    const expected = Number(body.expectedUpdatedAt);
    const at = Math.max(now, application.updatedAt + 1);

    if (action === "save" || action === "submit") {
      if (state.phase !== "open") return fail(closedMessage(state.phase), 409);
      if (!editableStatuses.includes(application.status)) return fail("Tu postulación ya está en revisión y no admite cambios.", 409);
      if (expected !== application.updatedAt) return fail(changed, 409);
      const complete = action === "submit" || application.status === "submitted";
      let fields;
      try { fields = parseEnlacesFields(body.fields && typeof body.fields === "object" ? body.fields as Record<string, unknown> : {}, complete, enlacesAgeReference()); }
      catch (error) { return fail((error as Error).message); }
      if (complete) {
        const missing = missingEnlacesDocuments(await enlacesDocuments(user.accountId), fields.motivesText);
        if (missing.length) return fail(`Para enviar falta ${missing.join(", ")}.`);
      }
      const status: EnlacesStatus = complete ? "submitted" : "draft";
      const statements = [
        db.prepare(`UPDATE enlaces_applications SET track=?,commission=?,community_kind=?,community_name=?,birth_date=?,city_tie=?,city_tie_detail=?,motives_text=?,previous_participation=?,proposal=?,publish_name_ok=?,status=?,submitted_at=CASE WHEN ?='submitted' THEN COALESCE(submitted_at,?) ELSE submitted_at END,updated_at=? WHERE id=? AND account_id=? AND updated_at=? AND status IN ('draft','submitted') AND ${session.sql}`)
          .bind(fields.track, fields.commission, fields.communityKind, fields.communityName, fields.birthDate, fields.cityTie, fields.cityTieDetail, fields.motivesText, fields.previousParticipation, fields.proposal, fields.publishNameOk ? 1 : 0, status, status, at, at, application.id, user.accountId, application.updatedAt, ...session.values),
      ];
      if (action === "submit") {
        // The identification may come from Mi comisión: it must last as long as this application.
        statements.push(db.prepare("UPDATE commission_documents SET retention_until=MAX(retention_until,?) WHERE owner_id=? AND item_id IS NULL AND category IN ('motivation_letter','recommendation_letter','ine_front','ine_back') AND status IN ('received','checked','changes') AND retention_until>? AND EXISTS (SELECT 1 FROM enlaces_applications WHERE id=? AND updated_at=?)").bind(application.retentionUntil, user.accountId, now, application.id, at));
        statements.push(db.prepare("INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,created_at) SELECT ?,?,?,'enlaces',?,? WHERE EXISTS (SELECT 1 FROM enlaces_applications WHERE id=? AND updated_at=?)").bind(crypto.randomUUID(), user.email, application.status === "submitted" ? "enlaces.updated" : "enlaces.submitted", application.id, at, application.id, at));
      }
      const [saved] = await db.batch(statements);
      if (!saved.meta.changes) return fail(changed, 409);
      return membershipJson({ ...await view(user.accountId, name), message: action === "submit" ? (application.status === "submitted" ? "Cambios guardados." : "Postulación enviada.") : "Borrador guardado." });
    }

    if (action === "withdraw") {
      // Before the results are public a decision must not show through an error message.
      if (state.phase === "results" && ["selected", "substitute", "not_selected"].includes(application.status)) return fail("Tu postulación ya tiene resultado y no puede retirarse desde aquí.", 409);
      if (expected !== application.updatedAt) return fail(changed, 409);
      const [withdrawn] = await db.batch([
        db.prepare(`UPDATE enlaces_applications SET status='withdrawn',seat='',motives_text='',previous_participation='',proposal='',city_tie_detail='',birth_date='',publish_name_ok=0,interview_note='',updated_at=?,retention_until=MIN(retention_until,?) WHERE id=? AND account_id=? AND updated_at=? AND ${session.sql}`).bind(at, at + 30 * 86_400_000, application.id, user.accountId, application.updatedAt, ...session.values),
        audit("enlaces.withdrawn", application.id),
        db.prepare("DELETE FROM enlaces_scores WHERE application_id=? AND EXISTS (SELECT 1 FROM enlaces_applications WHERE id=? AND status='withdrawn')").bind(application.id, application.id),
      ]);
      if (!withdrawn.meta.changes) return fail(changed, 409);
      const removal = await removeEnlacesDocuments(user.accountId, user.email);
      return membershipJson({ ...await view(user.accountId, name), message: removal.failed ? "Postulación retirada. Algunos archivos se borrarán en la limpieza de mañana." : "Postulación retirada. Tus cartas se borraron." });
    }

    if (action === "delete-documents") {
      if (state.phase !== "results" || application.status !== "not_selected") return fail("Esta opción estará disponible cuando se publiquen los resultados.", 409);
      const [recorded] = await db.batch([db.prepare(`INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,created_at) SELECT ?,?,'enlaces.documents_deleted','enlaces',?,? WHERE ${session.sql}`).bind(crypto.randomUUID(), user.email, application.id, now, ...session.values)]);
      if (!recorded.meta.changes) return fail("Tu sesión cambió. Vuelve a entrar.", 403);
      const removal = await removeEnlacesDocuments(user.accountId, user.email);
      return membershipJson({ ...await view(user.accountId, name), message: removal.failed ? "Algunos archivos no se pudieron borrar. Inténtalo de nuevo." : "Tus documentos se borraron." }, { status: removal.failed ? 502 : 200 });
    }
    return fail("Esta acción no está disponible.", 404);
  } catch { return fail("No pudimos guardar. Inténtalo de nuevo.", 503); }
}
