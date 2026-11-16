"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { useAdminFetch } from "../../AdminSessionBoundary";
import { commissionName } from "@/lib/commissions";
import type { EnlacesRecord } from "@/lib/enlaces-admin";
import { ageOn, cityTies, communityKinds, communityMinimumScore, enlacesDocumentCategories, enlacesLimits, enlacesSeats, enlacesStatuses, enlacesTracks, scoreCriteria, type EnlacesPhase, type EnlacesSeat, type EnlacesStatus, type ScoreKey } from "@/lib/enlaces-shared";

const moment = (value: number) => new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(value);
const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const tone = (status: EnlacesStatus) => status === "selected" ? "ok" : status === "not_selected" || status === "withdrawn" ? "off" : "wait";
const auditLabels: Record<string, string> = {
  "enlaces.started": "Empezó su postulación", "enlaces.submitted": "Envió su postulación", "enlaces.updated": "Cambió su postulación", "enlaces.withdrawn": "Retiró su postulación", "enlaces.documents_deleted": "Borró sus documentos", "enlaces.name_unpublished": "Quitó la autorización para publicar su nombre",
  "enlaces.scored": "Puntaje capturado", "enlaces.status": "Cambio de estado", "enlaces.interview_note": "Nota de entrevista",
};
const options: EnlacesStatus[] = ["submitted", "in_review", "interview", "selected", "substitute", "not_selected"];

function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return <section className="people-panel"><div className="people-panel-head"><h2>{title}</h2>{aside}</div>{children}</section>;
}

export default function EnlacesReview({ record, ageReference, phase }: { record: EnlacesRecord; ageReference: string; phase: EnlacesPhase }) {
  const { application, score, documents, audit } = record;
  const request = useAdminFetch(), router = useRouter(), lock = useRef(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [points, setPoints] = useState<Record<ScoreKey, string>>(() => Object.fromEntries(scoreCriteria.map(criterion => [criterion.key, score ? String(score[criterion.key]) : ""])) as Record<ScoreKey, string>);
  const [status, setStatus] = useState<EnlacesStatus>(application.status), [seat, setSeat] = useState<EnlacesSeat | "">(application.seat), [note, setNote] = useState(application.interviewNote);
  const seated = status === "selected" && application.track === "comision";
  // Nothing is evaluated while the person can still change the application.
  const withdrawn = application.status === "withdrawn" || phase === "before" || phase === "open";
  const total = scoreCriteria.reduce((sum, criterion) => sum + (Number(points[criterion.key]) || 0), 0);
  const complete = scoreCriteria.every(criterion => points[criterion.key] !== "" && Number.isInteger(Number(points[criterion.key])) && Number(points[criterion.key]) >= 0 && Number(points[criterion.key]) <= criterion.max);

  async function act(body: Record<string, unknown>) {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage("");
    try {
      const response = await request("/api/admin/enlaces", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, id: application.id, expectedUpdatedAt: application.updatedAt }) });
      const data = await response.json().catch(() => ({})) as { error?: string; message?: string };
      setMessage(data.error ?? data.message ?? "Guardado.");
      if (response.ok || response.status === 409) router.refresh();
    } catch { setMessage("No pudimos guardar. Revisa tu conexión."); }
    finally { lock.current = false; setBusy(false); }
  }

  return <div className="people-page people-record admin-section">
    <div className="people-hero">
      <div>
        <p className="admin-label">Postulación · {application.referenceCode}</p>
        <h1>{application.name}</h1>
        <p className="people-identity">{application.username ? `@${application.username}` : "Sin usuario"} · <span>{application.email}</span> · <Link className="text-link" href={`/admin/personas/${application.accountId}`}>Abrir su ficha</Link></p>
      </div>
      <div className="people-chips">
        <span className="people-chip" data-tone={tone(application.status)}>{enlacesStatuses[application.status]}{application.seat ? ` · ${enlacesSeats[application.seat]}` : ""}</span>
        <span className="people-chip" data-tone={score ? "ok" : "off"}>{score ? `${score.total} de 100` : "Sin puntaje"}</span>
        <span className="people-chip" data-tone={application.publishNameOk ? "ok" : "off"}>{application.publishNameOk ? "Autoriza publicar su nombre" : "No autoriza publicar su nombre"}</span>
      </div>
    </div>
    <p className="people-feedback" role="status" aria-live="polite">{message}</p>
    {application.status === "withdrawn" ? <p className="admin-empty">La persona retiró esta postulación. Sus respuestas y sus cartas se borraron.</p>
      : withdrawn && <p className="admin-empty">La evaluación se abre al cierre de postulaciones. Hasta entonces la persona puede cambiar sus respuestas y sus documentos.</p>}

    <div className="people-grid">
      <div className="people-main">
        <Panel title="Postulación">
          <dl className="people-facts">
            <div><dt>Modalidad</dt><dd>{application.track ? enlacesTracks[application.track] : "Sin indicar"}</dd></div>
            {application.track === "comision" && <div><dt>Comisión</dt><dd>{commissionName(application.commission)}</dd></div>}
            {application.track === "comunidad" && <div><dt>{application.communityKind ? communityKinds[application.communityKind] : "Comunidad"}</dt><dd>{application.communityName}</dd></div>}
            {application.birthDate && <div><dt>Edad al cierre</dt><dd>{ageOn(application.birthDate, ageReference)} años</dd></div>}
            {application.cityTie && <div><dt>Vínculo</dt><dd>{cityTies[application.cityTie]} · {application.cityTieDetail}</dd></div>}
            {application.submittedAt && <div><dt>Enviada</dt><dd>{moment(application.submittedAt)}</dd></div>}
          </dl>
          {application.motivesText && <div className="enl-admin-text"><h3>Carta de motivos</h3><p>{application.motivesText}</p></div>}
          {application.previousParticipation && <div className="enl-admin-text"><h3>Participación previa</h3><p>{application.previousParticipation}</p></div>}
          {application.proposal && <div className="enl-admin-text"><h3>Propuesta</h3><p>{application.proposal}</p></div>}
        </Panel>

        <Panel title="Documentos" aside={<span className="people-chip" data-tone={documents.length ? "ok" : "off"}>{documents.length} {documents.length === 1 ? "archivo" : "archivos"}</span>}>
          {documents.length === 0 ? <p className="people-empty">Sin archivos.</p> :
            <ul className="people-rows">{documents.map(document => <li key={document.id}>
              <span><strong>{enlacesDocumentCategories[document.category]}</strong><small>{document.name} · {size(document.size)} · {moment(document.createdAt)}</small></span>
              <a className="text-link" href={`/api/espacio/documentos/${document.id}`}>Descargar</a>
            </li>)}</ul>}
          <p className="people-note">Cada descarga usa tu sesión de administración. Los archivos no tienen dirección pública.</p>
        </Panel>

        <Panel title="Historial">
          {audit.length === 0 ? <p className="people-empty">Sin movimientos.</p> :
            <ol className="people-log">{audit.map((entry, index) => {
              let detail = "";
              try { const meta = JSON.parse(entry.metadata ?? "{}") as { to?: EnlacesStatus; seat?: EnlacesSeat; total?: number }; detail = meta.to ? ` a «${enlacesStatuses[meta.to] ?? meta.to}${meta.seat ? ", " + (enlacesSeats[meta.seat]?.toLowerCase() ?? meta.seat) : ""}»` : typeof meta.total === "number" ? ` · ${meta.total} de 100` : ""; } catch { /* Plain entry. */ }
              return <li key={index}><strong>{auditLabels[entry.action] ?? entry.action}{detail}</strong><small>{entry.actorEmail} · <time dateTime={new Date(entry.createdAt).toISOString()}>{moment(entry.createdAt)}</time></small></li>;
            })}</ol>}
        </Panel>
      </div>

      <div className="people-side">
        <Panel title="Puntaje" aside={<span className="people-chip" data-tone={complete ? "ok" : "off"}>{total} de 100</span>}>
          <form className="people-form enl-score" onSubmit={event => { event.preventDefault(); void act({ action: "score", ...Object.fromEntries(scoreCriteria.map(criterion => [criterion.key, Number(points[criterion.key])])) }); }}>
            {scoreCriteria.map(criterion => <label key={criterion.key}><span>{criterion.label}<small>de 0 a {criterion.max}</small></span>
              <input type="number" inputMode="numeric" min={0} max={criterion.max} step={1} required disabled={busy || withdrawn} value={points[criterion.key]} onChange={event => setPoints(current => ({ ...current, [criterion.key]: event.target.value }))} />
            </label>)}
            {application.track === "comunidad" && <p className="people-note">En Comunidad se necesita un mínimo de {communityMinimumScore} puntos para seleccionar.</p>}
            <button className="button button-primary" disabled={busy || withdrawn || !complete}>Guardar puntaje</button>
            {score && <p className="people-note">Capturado por {score.scoredBy} el {moment(score.scoredAt)}.</p>}
          </form>
        </Panel>

        <Panel title="Estado">
          <form className="people-form" onSubmit={event => { event.preventDefault(); void act({ action: "status", status, ...(seated ? { seat } : {}) }); }}>
            <label>Estado de la postulación<select value={status} disabled={busy || withdrawn} onChange={event => setStatus(event.target.value as EnlacesStatus)}>{options.map(option => <option key={option} value={option}>{enlacesStatuses[option]}</option>)}{application.status === "withdrawn" && <option value="withdrawn">{enlacesStatuses.withdrawn}</option>}</select></label>
            {seated && <label>Plaza en la comisión<select value={seat} disabled={busy} required onChange={event => setSeat(event.target.value as EnlacesSeat | "")}><option value="">Elige la plaza</option>{(Object.keys(enlacesSeats) as EnlacesSeat[]).map(option => <option key={option} value={option}>{enlacesSeats[option]}</option>)}</select></label>}
            <button className="button button-secondary" disabled={busy || withdrawn || (seated && !seat) || (status === application.status && (!seated || seat === application.seat))}>Cambiar estado</button>
            <p className="people-note">{phase === "results" ? "Los resultados están publicados. La persona ve este estado en su cuenta." : "La persona verá «Seleccionada», «Suplente» o «No seleccionada» cuando publiques los resultados. Antes ve «En revisión»."}</p>
          </form>
        </Panel>

        <Panel title="Entrevista">
          <form className="people-form" onSubmit={event => { event.preventDefault(); void act({ action: "note", note }); }}>
            <label>Nota de la entrevista<textarea rows={5} maxLength={enlacesLimits.interviewNote} value={note} disabled={busy || withdrawn} onChange={event => setNote(event.target.value)} placeholder="Solo la ve administración." /></label>
            <button className="button button-secondary" disabled={busy || withdrawn || note === application.interviewNote}>Guardar nota</button>
          </form>
        </Panel>
      </div>
    </div>
  </div>;
}
