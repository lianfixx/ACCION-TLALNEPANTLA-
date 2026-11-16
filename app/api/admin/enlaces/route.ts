import { adminWriteGuard } from "@/lib/admin-write-guard";
import { enlacesResultsKey, enlacesRetentionAfterClose, enlacesSelectedRetention, enlacesState } from "@/lib/enlaces";
import { communityMinimumScore, enlacesCycle, enlacesLimits, enlacesStatuses, parseEnlacesScore, type EnlacesStatus } from "@/lib/enlaces-shared";
import { membershipJson } from "@/lib/membership";
import { openPeopleRequest, peopleError as fail } from "@/lib/people-route";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { cleanText } from "@/lib/security";

const changed = "La postulación cambió mientras trabajabas. Actualiza la página antes de continuar.";
const targets: readonly EnlacesStatus[] = ["submitted", "in_review", "interview", "selected", "substitute", "not_selected"];
type Row = { id: string; accountId: string; status: EnlacesStatus; track: string; commission: string; communityName: string; updatedAt: number; total: number | null };

/** Every change is written together with its audit row, under the live administrator session. */
export async function POST(request: Request) {
  const opened = await openPeopleRequest(request, 12_000, "enlaces-admin", 240);
  if ("response" in opened) return opened.response;
  const { actor, body } = opened;
  try {
    const db = getRuntimeEnv().DB!, now = Date.now(), action = String(body.action ?? ""), guard = adminWriteGuard(actor, ["admin"]);
    const audit = (auditAction: string, id: string, metadata: Record<string, unknown>, at: number) => db.prepare("INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,?,'enlaces',?,?,? WHERE changes()>0").bind(crypto.randomUUID(), actor.email, auditAction, id, JSON.stringify(metadata), at);

    if (action === "publish" || action === "unpublish") {
      const state = await enlacesState(now);
      if (action === "publish" && (state.phase === "before" || state.phase === "open")) return fail("Los resultados se publican después del cierre de postulaciones.", 409);
      const [written] = await db.batch([
        action === "publish"
          ? db.prepare(`INSERT INTO site_content(key,value_json,updated_at,updated_by) SELECT ?,?,?,? WHERE ${guard.sql} ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).bind(enlacesResultsKey, JSON.stringify({ publishedAt: now }), now, actor.email, ...guard.values)
          : db.prepare(`DELETE FROM site_content WHERE key=? AND ${guard.sql}`).bind(enlacesResultsKey, ...guard.values),
        audit(action === "publish" ? "enlaces.results_published" : "enlaces.results_unpublished", enlacesCycle, {}, now),
      ]);
      if (!written.meta.changes) return fail(action === "publish" ? "Tu acceso cambió. Vuelve a entrar." : "Los resultados no estaban publicados.", 409);
      return membershipJson({ message: action === "publish" ? "Resultados publicados. Cada persona ya ve su resultado en su cuenta." : "Resultados retirados de la página." });
    }

    const id = cleanText(body.id, 80);
    const row = await db.prepare("SELECT e.id,e.account_id AS accountId,e.status,e.track,e.commission,e.community_name AS communityName,e.updated_at AS updatedAt,s.total FROM enlaces_applications e LEFT JOIN enlaces_scores s ON s.application_id=e.id WHERE e.id=? AND e.cycle=? AND e.retention_until>?").bind(id, enlacesCycle, now).first<Row>();
    if (!row || row.status === "draft") return fail("No encontramos esa postulación.", 404);
    if (row.status === "withdrawn") return fail("Esta postulación fue retirada por la persona y ya no admite cambios.", 409);
    if (Number(body.expectedUpdatedAt) !== row.updatedAt) return fail(changed, 409);
    const at = Math.max(now, row.updatedAt + 1);
    const touch = (sets: string, values: unknown[]) => db.prepare(`UPDATE enlaces_applications SET ${sets},updated_at=? WHERE id=? AND updated_at=? AND status NOT IN ('draft','withdrawn') AND ${guard.sql}`).bind(...values, at, row.id, row.updatedAt, ...guard.values);

    if (action === "score") {
      let score;
      try { score = parseEnlacesScore(body); } catch (error) { return fail((error as Error).message); }
      const [saved] = await db.batch([
        touch("status=status", []),
        db.prepare("INSERT INTO enlaces_scores(application_id,motives,proposal,participation,recommendation,total,scored_by,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE changes()>0 ON CONFLICT(application_id) DO UPDATE SET motives=excluded.motives,proposal=excluded.proposal,participation=excluded.participation,recommendation=excluded.recommendation,total=excluded.total,scored_by=excluded.scored_by,updated_at=excluded.updated_at").bind(row.id, score.motives, score.proposal, score.participation, score.recommendation, score.total, actor.email, at),
        db.prepare("INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'enlaces.scored','enlaces',?,?,? WHERE EXISTS (SELECT 1 FROM enlaces_applications WHERE id=? AND updated_at=?)").bind(crypto.randomUUID(), actor.email, row.id, JSON.stringify({ total: score.total }), at, row.id, at),
      ]);
      return saved.meta.changes ? membershipJson({ message: `Puntaje guardado. Total ${score.total} de 100.` }) : fail(changed, 409);
    }

    if (action === "note") {
      if (typeof body.note !== "string" || body.note.length > enlacesLimits.interviewNote) return fail(`La nota admite hasta ${enlacesLimits.interviewNote} caracteres.`);
      const [saved] = await db.batch([touch("interview_note=?", [cleanText(body.note, enlacesLimits.interviewNote)]), audit("enlaces.interview_note", row.id, {}, at)]);
      return saved.meta.changes ? membershipJson({ message: "Nota de entrevista guardada." }) : fail(changed, 409);
    }

    if (action === "status") {
      const status = String(body.status ?? "") as EnlacesStatus;
      if (!targets.includes(status)) return fail("Elige un estado válido.");
      if (status === row.status) return fail("La postulación ya tiene ese estado.");
      if (status === "selected") {
        if (row.total === null) return fail("Captura el puntaje antes de marcarla como seleccionada.", 409);
        if (row.track === "comunidad" && row.total < communityMinimumScore) return fail(`En Comunidad se necesita un mínimo de ${communityMinimumScore} puntos. Esta postulación tiene ${row.total}.`, 409);
        // The convocatoria gives two places per commission and one per university or colonia.
        const taken = row.track === "comision"
          ? await db.prepare("SELECT count(*) AS n FROM enlaces_applications WHERE cycle=? AND status='selected' AND track='comision' AND commission=? AND id<>?").bind(enlacesCycle, row.commission, row.id).first<{ n: number }>()
          : await db.prepare("SELECT count(*) AS n FROM enlaces_applications WHERE cycle=? AND status='selected' AND track='comunidad' AND community_name=? COLLATE NOCASE AND id<>?").bind(enlacesCycle, row.communityName, row.id).first<{ n: number }>();
        const places = row.track === "comision" ? 2 : 1;
        if (Number(taken?.n ?? 0) >= places) return fail(row.track === "comision" ? "Esa comisión ya tiene sus dos Enlaces seleccionados. Cambia primero a uno de ellos." : "Esa universidad o colonia ya tiene su Enlace seleccionado. Cámbialo primero.", 409);
      }
      const { closesAt } = await enlacesState(now);
      const retention = status === "selected" || status === "substitute" ? enlacesSelectedRetention : closesAt + enlacesRetentionAfterClose;
      const [saved] = await db.batch([
        touch("status=?,retention_until=?", [status, retention]),
        audit("enlaces.status", row.id, { from: row.status, to: status }, at),
        // Letters and identification follow the application they belong to.
        db.prepare("UPDATE commission_documents SET retention_until=? WHERE owner_id=? AND item_id IS NULL AND category IN ('motivation_letter','recommendation_letter') AND status IN ('received','checked','changes') AND retention_until>? AND EXISTS (SELECT 1 FROM enlaces_applications WHERE id=? AND updated_at=?)").bind(retention, row.accountId, now, row.id, at),
        db.prepare("UPDATE commission_documents SET retention_until=MAX(retention_until,?) WHERE owner_id=? AND item_id IS NULL AND category IN ('ine_front','ine_back') AND status IN ('received','checked','changes') AND retention_until>? AND EXISTS (SELECT 1 FROM enlaces_applications WHERE id=? AND updated_at=?)").bind(retention, row.accountId, now, row.id, at),
      ]);
      return saved.meta.changes ? membershipJson({ message: `Estado actualizado a «${enlacesStatuses[status]}».` }) : fail(changed, 409);
    }
    return fail("Esta acción no está disponible.", 404);
  } catch { return fail("No pudimos guardar el cambio. Inténtalo de nuevo.", 503); }
}
