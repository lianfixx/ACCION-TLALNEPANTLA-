"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { EnlacesApplicationView, EnlacesView } from "@/lib/enlaces-view";
import { cityTies, communityKinds, enlacesConsent, enlacesDate, enlacesDocumentCategories, enlacesLimits, enlacesPublishConsent, enlacesSeats, enlacesStatuses, enlacesTracks, enlacesUniversities, type EnlacesDocumentCategory, type EnlacesFields } from "@/lib/enlaces-shared";

type Props = { accountId: string; initial: EnlacesView; commissions: { id: string; name: string }[] };
type SaveState = "idle" | "saving" | "saved" | "error";
const maxBytes = 5 * 1024 * 1024;
const signIn = "/ingresar?returnTo=%2Fcuenta%2Fenlaces";
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const size = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const fieldsOf = (application: EnlacesApplicationView | null): EnlacesFields => ({
  track: application?.track ?? "", commission: application?.commission ?? "", communityKind: application?.communityKind ?? "", communityName: application?.communityName ?? "",
  birthDate: application?.birthDate ?? "", cityTie: application?.cityTie ?? "", cityTieDetail: application?.cityTieDetail ?? "", motivesText: application?.motivesText ?? "",
  previousParticipation: application?.previousParticipation ?? "", proposal: application?.proposal ?? "", publishNameOk: application?.publishNameOk ?? false,
});
const shiftYears = (date: string, years: number, days = 0) => { const value = new Date(date + "T00:00:00Z"); value.setUTCFullYear(value.getUTCFullYear() + years); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); };

type FileFieldProps = { category: EnlacesDocumentCategory; label: string; hint: string; accept: string; current?: { id: string; name: string; size: number; status: string }; loading: boolean; disabled: boolean; canRemove: boolean; onUpload: (category: EnlacesDocumentCategory, file: File | undefined) => void | Promise<void>; onRemove: (id: string) => void | Promise<void> };
/** One document: choosing a file uploads it at once. */
function FileField({ category, label, hint, accept, current, loading, disabled, canRemove, onUpload, onRemove }: FileFieldProps) {
  return <div className="enl-file" data-ready={current ? "true" : "false"}>
    <div><strong>{label}</strong><span>{current ? `${current.name} · ${size(current.size)}` : hint}</span></div>
    <div className="enl-file-actions">
      {/* An identification already checked by the administration is used as it is. */}
      {current?.status === "checked" && category !== "motivation_letter" && category !== "recommendation_letter" ? <span className="enl-file-note">Revisada en tu cuenta</span> : <label className={`button ${current ? "button-secondary" : "button-primary"}`} aria-disabled={loading || disabled}>
        <input type="file" accept={accept} disabled={loading || disabled} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void onUpload(category, file); }} />
        {loading ? "Subiendo…" : current ? "Reemplazar" : "Elegir archivo"}
      </label>}
      {current && canRemove && <button type="button" className="text-link" disabled={disabled} onClick={() => void onRemove(current.id)}>Quitar</button>}
    </div>
  </div>;
}

export default function EnlacesForm({ accountId, initial, commissions }: Props) {
  const [view, setView] = useState(initial);
  const [fields, setFields] = useState(() => fieldsOf(initial.application));
  const [otherUniversity, setOtherUniversity] = useState(() => initial.application?.communityKind === "universidad" && Boolean(initial.application.communityName) && !(enlacesUniversities as readonly string[]).includes(initial.application.communityName));
  const [motivesMode, setMotivesMode] = useState<"text" | "file">(() => initial.documents.some(document => document.category === "motivation_letter") && !initial.application?.motivesText ? "file" : "text");
  const [consent, setConsent] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<EnlacesDocumentCategory | "">("");
  const [expired, setExpired] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const latest = useRef(fields), version = useRef(initial.application?.updatedAt ?? 0), versionOf = useRef(initial.application?.id ?? ""), saving = useRef(false), again = useRef(false), dirty = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { state, application, documents, notice } = view;
  const closing = `${enlacesDate(state.closesAt)} a las 23:59 horas`;
  const editable = state.phase === "open" && application !== null && (application.status === "draft" || application.status === "submitted");
  const draft = application?.status === "draft";
  const documentOf = (category: EnlacesDocumentCategory) => documents.find(document => document.category === category);

  async function call(body: unknown) {
    const response = await fetch("/api/enlaces", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", "X-Expected-Account-Id": accountId }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})) as Partial<EnlacesView> & { error?: string; message?: string };
    setExpired(response.status === 401);
    return { response, data };
  }
  function accept(data: Partial<EnlacesView>, resetFields = false) {
    if (!data.state) return;
    const next = data as EnlacesView;
    // Answers may arrive out of order: the version of the same application never goes back.
    const same = next.application?.id === versionOf.current;
    setView(current => same && (current.application?.updatedAt ?? 0) > (next.application?.updatedAt ?? 0) ? { ...next, application: current.application } : next);
    version.current = next.application ? Math.max(same ? version.current : 0, next.application.updatedAt) : 0; versionOf.current = next.application?.id ?? "";
    if (resetFields) { const values = fieldsOf(next.application); latest.current = values; setFields(values); dirty.current = false; }
  }

  /** One save at a time; a change made meanwhile is saved right after. */
  async function persist(action: "save" | "submit", quiet = false): Promise<boolean> {
    if (saving.current) { again.current = true; return false; }
    saving.current = true; setSaveState("saving"); dirty.current = false;
    try {
      for (let attempt = 0; ; attempt++) {
        const { response, data } = await call({ action, fields: latest.current, expectedUpdatedAt: version.current });
        if (response.ok) {
          accept(data); setSaveState("saved"); setUnsaved(false);
          if (!quiet) setError("");
          if (action === "submit") setMessage(data.message ?? "");
          return true;
        }
        // The application changed somewhere else: take its current version and try once more.
        if (response.status === 409 && attempt === 0 && await refresh()) continue;
        dirty.current = true; setSaveState("error");
        if (!quiet) setError(data.error ?? "No pudimos guardar. Revisa tu conexión.");
        return false;
      }
    } catch { dirty.current = true; setSaveState("error"); if (!quiet) setError("No pudimos guardar. Revisa tu conexión."); return false; }
    finally { saving.current = false; if (again.current) { again.current = false; void persist("save"); } }
  }

  function change<K extends keyof EnlacesFields>(key: K, value: EnlacesFields[K]) {
    const next = { ...latest.current, [key]: value };
    if (key === "track") { next.commission = ""; next.communityKind = ""; next.communityName = ""; }
    if (key === "communityKind") next.communityName = "";
    latest.current = next; setFields(next); dirty.current = true; setUnsaved(true); setMessage("");
    if (saveState !== "saving") setSaveState("idle");
    // A draft saves by itself. A sent application is saved with its button, because it must stay complete.
    if (draft) { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void persist("save"), 4000); }
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty.current || saving.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function settle() { if (timer.current) { clearTimeout(timer.current); timer.current = null; } while (saving.current) await sleep(80); }

  async function start() {
    setBusy(true); setError("");
    try { const { response, data } = await call({ action: "start", consent, noticeToken: notice.token }); if (response.ok) accept(data, true); else setError(data.error ?? "No pudimos empezar tu postulación."); }
    catch { setError("No pudimos empezar tu postulación. Revisa tu conexión."); }
    finally { setBusy(false); }
  }
  async function submit() {
    setBusy(true); setMessage(""); await settle();
    const wasDraft = draft, sent = await persist("submit");
    // What could not be sent yet is still kept as a draft.
    if (!sent && wasDraft) await persist("save", true);
    setBusy(false);
    if (sent) window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function simple(action: "withdraw" | "delete-documents" | "unpublish-name", question: string) {
    if (!window.confirm(question)) return;
    setBusy(true); setError(""); await settle();
    try { const { response, data } = await call({ action, expectedUpdatedAt: version.current }); if (response.ok) { accept(data, true); setMessage(data.message ?? ""); setConsent(false); } else setError(data.error ?? "No pudimos completar la acción."); }
    catch { setError("No pudimos completar la acción. Revisa tu conexión."); }
    finally { setBusy(false); }
  }
  /** Reads the application again. True when it can still be edited. */
  async function refresh() {
    try {
      const response = await fetch("/api/enlaces", { cache: "no-store", headers: { "X-Expected-Account-Id": accountId } });
      setExpired(response.status === 401);
      if (!response.ok) return false;
      const next = await response.json() as EnlacesView;
      accept(next);
      return next.state.phase === "open" && (next.application?.status === "draft" || next.application?.status === "submitted");
    } catch { return false; }
  }
  async function upload(category: EnlacesDocumentCategory, file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.size > maxBytes) { setError(`${file.name} pesa ${size(file.size)}. El límite es de 5 MB.`); return; }
    setUploading(category);
    try {
      const response = await fetch(`/api/enlaces/documentos?category=${category}`, { method: "POST", cache: "no-store", headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name), "X-Expected-Account-Id": accountId }, body: file });
      const data = await response.json().catch(() => ({})) as { error?: string };
      setExpired(response.status === 401);
      if (!response.ok) setError(data.error ?? "No pudimos subir el archivo."); else await refresh();
    } catch { setError("No pudimos subir el archivo. Revisa tu conexión."); }
    finally { setUploading(""); }
  }
  async function removeDocument(id: string) {
    setError("");
    const response = await fetch(`/api/enlaces/documentos?id=${encodeURIComponent(id)}`, { method: "DELETE", cache: "no-store", headers: { "X-Expected-Account-Id": accountId } });
    if (!response.ok) setError(((await response.json().catch(() => ({}))) as { error?: string }).error ?? "No pudimos borrar el archivo."); else await refresh();
  }

  const fileField = (props: { category: EnlacesDocumentCategory; label: string; hint: string; accept: string; removable?: boolean }) => <FileField key={props.category} {...props} current={documentOf(props.category)} loading={uploading === props.category} disabled={busy || Boolean(uploading)} canRemove={Boolean(props.removable) && draft} onUpload={upload} onRemove={removeDocument} />;

  const feedback = <>
    {expired && <p className="enl-alert" role="alert">Tu sesión terminó. <a href={signIn} target="_blank" rel="noopener">Entra de nuevo en otra pestaña</a> y vuelve aquí para seguir. Lo que escribiste sigue en esta pantalla.</p>}
    {error && <p className="enl-alert" role="alert">{error}</p>}
    {message && <p className="enl-ok" role="status">{message}</p>}
  </>;

  // No application yet.
  if (!application) {
    if (state.phase === "before") return <section className="enl-card">{feedback}<h2>Todavía no abre</h2><p>La convocatoria estará disponible el {enlacesDate(state.opensAt)}. Ese día podrás postularte aquí mismo.</p><Link className="text-link" href="/enlaces">Volver a Enlaces APJ 2027</Link></section>;
    if (state.phase !== "open") return <section className="enl-card">{feedback}<h2>Postulaciones cerradas</h2><p>La recepción cerró el {closing}. Esta cuenta no tiene una postulación en la convocatoria.</p><Link className="text-link" href="/enlaces">Volver a Enlaces APJ 2027</Link></section>;
    return <section className="enl-card">
      {feedback}
      <h2>Empieza tu postulación</h2>
      <p>Se llena en una sola pantalla y se guarda sola mientras escribes. Puedes dejarla y volver después. Necesitas tu carta de motivos, tu carta de recomendación y tu identificación oficial. Recibimos postulaciones hasta el {closing}.</p>
      <details className="enl-notice"><summary>Leer el aviso de privacidad de la convocatoria</summary>{notice.sections.map(section => <section key={section.title}><h3>{section.title}</h3><p>{section.body}</p></section>)}</details>
      {!notice.ready && <p className="enl-alert" role="alert">El aviso de privacidad todavía no está completo. Vuelve más tarde.</p>}
      <label className="enl-check"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>{enlacesConsent}</span></label>
      <button type="button" className="button button-primary" disabled={!consent || busy || !notice.ready} onClick={() => void start()}>{busy ? "Abriendo…" : "Empezar mi postulación"}</button>
    </section>;
  }

  const summary = <dl className="enl-summary">
    <div><dt>Folio</dt><dd>{application.referenceCode}</dd></div>
    <div><dt>Estado</dt><dd>{enlacesStatuses[application.status]}</dd></div>
    {application.track && <div><dt>Modalidad</dt><dd>{enlacesTracks[application.track]}</dd></div>}
    {application.track === "comision" && application.commission && <div><dt>Comisión</dt><dd>{commissions.find(item => item.id === application.commission)?.name ?? application.commission}</dd></div>}
    {application.track === "comunidad" && application.communityName && <div><dt>{application.communityKind === "colonia" ? "Colonia" : "Universidad"}</dt><dd>{application.communityName}</dd></div>}
  </dl>;

  // Sent and no longer editable, or the window closed.
  if (!editable) {
    const status = application.status;
    const next = status === "draft" ? `Tu borrador no se envió antes del cierre del ${closing} y ya no puede enviarse.`
      : status === "selected" ? `Fuiste seleccionado como Enlace APJ 2027${application.seat ? `, ${enlacesSeats[application.seat].toLowerCase()} de tu comisión` : ""}. Nos pondremos en contacto contigo para confirmar tu lugar en las siguientes 48 horas. La toma de protesta es el jueves 17 de diciembre.`
      : status === "substitute" ? "Quedaste en la lista de suplentes. Si se libera una plaza, nos pondremos en contacto contigo."
      : status === "not_selected" ? "En esta convocatoria no fuiste seleccionado. Gracias por postularte. Si quieres, puedes borrar tus documentos desde aquí."
      : status === "interview" ? "Pasaste a entrevista. Nos pondremos en contacto contigo para acordar la hora. Son de diez minutos, en línea, el 7, 8 y 9 de diciembre. Los resultados se publican el jueves 10 de diciembre."
      : "Recibimos tu postulación. Nos pondremos en contacto contigo para acordar tu entrevista, que será en línea el 7, 8 o 9 de diciembre. Los resultados se publican el jueves 10 de diciembre. Vuelve aquí con tu cuenta para ver tu estado.";
    const decided = ["selected", "substitute", "not_selected"].includes(status);
    return <section className="enl-card">
      {feedback}
      <h2>{status === "draft" ? "Borrador sin enviar" : "Tu postulación"}</h2>
      {summary}
      <p>{next}</p>
      <div className="enl-actions">
        {status === "not_selected" && <button type="button" className="button button-secondary" disabled={busy} onClick={() => void simple("delete-documents", "¿Borrar tus cartas y tu identificación de esta postulación? No se puede deshacer.")}>Borrar mis documentos</button>}
        {application.publishNameOk && status !== "draft" && <button type="button" className="text-link" disabled={busy} onClick={() => void simple("unpublish-name", "¿Quitar la autorización para publicar tu nombre en los resultados?")}>Quitar la autorización para publicar mi nombre</button>}
        {!decided && <button type="button" className="text-link enl-danger" disabled={busy} onClick={() => void simple("withdraw", "¿Retirar tu postulación? Tus cartas se borran y no se puede deshacer.")}>Retirar mi postulación</button>}
      </div>
    </section>;
  }

  const front = documentOf("ine_front"), hasBack = Boolean(documentOf("ine_back"));
  const counter = (value: string, max: number) => <small className="enl-count" data-over={value.length > max ? "true" : "false"}>{value.length} de {max}</small>;

  return <form className="enl-form" onSubmit={event => { event.preventDefault(); void submit(); }} noValidate>
    <section className="enl-card enl-status" aria-live="polite">
      {draft
        ? <><h2>Borrador</h2><p>Se guarda sola mientras escribes. Cuando esté completa, envíala antes del {closing}.</p></>
        : <><h2>Postulación enviada</h2>{summary}<p>Guarda tu folio. Puedes cambiar tus respuestas y tus documentos hasta el {closing}. Después del cierre nos pondremos en contacto contigo para acordar tu entrevista.</p></>}
      <p className="enl-save" data-state={saveState}>{saveState === "saving" ? "Guardando…" : saveState === "saved" ? "Guardado" : saveState === "error" ? "Sin guardar" : draft ? "" : unsaved ? "Tienes cambios sin guardar" : ""}</p>
    </section>
    {feedback}

    <fieldset className="enl-card">
      <legend>Modalidad</legend>
      <div className="enl-options">{(Object.keys(enlacesTracks) as Array<keyof typeof enlacesTracks>).map(key => <label key={key} className="enl-option" data-on={fields.track === key ? "true" : "false"}>
        <input type="radio" name="track" checked={fields.track === key} onChange={() => change("track", key)} />
        <span><strong>{enlacesTracks[key]}</strong><small>{key === "comision" ? "Titular o apoyo de una de las seis comisiones. Unas cuatro horas a la semana." : "La puerta de APJ en tu universidad o tu colonia. Unas dos horas a la semana."}</small></span>
      </label>)}</div>

      {fields.track === "comision" && <label>Comisión<select value={fields.commission} onChange={event => change("commission", event.target.value)}><option value="">Elige una comisión</option>{commissions.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}

      {fields.track === "comunidad" && <>
        <div className="enl-options enl-options-small">{(Object.keys(communityKinds) as Array<keyof typeof communityKinds>).map(key => <label key={key} className="enl-option" data-on={fields.communityKind === key ? "true" : "false"}>
          <input type="radio" name="communityKind" checked={fields.communityKind === key} onChange={() => { setOtherUniversity(false); change("communityKind", key); }} /><span><strong>{communityKinds[key]}</strong></span>
        </label>)}</div>
        {fields.communityKind === "universidad" && <>
          <label>Universidad<select value={otherUniversity ? "otra" : fields.communityName} onChange={event => { const other = event.target.value === "otra"; setOtherUniversity(other); change("communityName", other ? "" : event.target.value); }}><option value="">Elige tu universidad</option>{enlacesUniversities.map(name => <option key={name} value={name}>{name}</option>)}<option value="otra">Otra</option></select></label>
          {otherUniversity && <label>Nombre de tu universidad<input value={fields.communityName} maxLength={enlacesLimits.communityName} onChange={event => change("communityName", event.target.value)} autoComplete="organization" /></label>}
        </>}
        {fields.communityKind === "colonia" && <label>Colonia donde vives<input value={fields.communityName} maxLength={enlacesLimits.communityName} onChange={event => change("communityName", event.target.value)} autoComplete="address-level3" /></label>}
      </>}
    </fieldset>

    <fieldset className="enl-card">
      <legend>Sobre ti</legend>
      <label>Fecha de nacimiento<input type="date" value={fields.birthDate} min={shiftYears(view.ageReference, -30, 1)} max={shiftYears(view.ageReference, -18)} onChange={event => change("birthDate", event.target.value)} autoComplete="bday" /><small>Debes tener de 18 a 29 años cumplidos al cierre de la convocatoria.</small></label>
      <div className="enl-group" role="group" aria-label="Vínculo con Tlalnepantla">
        <span className="enl-label">Tu vínculo con Tlalnepantla</span>
        <div className="enl-chips">{(Object.keys(cityTies) as Array<keyof typeof cityTies>).map(key => <label key={key} className="enl-chip" data-on={fields.cityTie === key ? "true" : "false"}><input type="radio" name="cityTie" checked={fields.cityTie === key} onChange={() => change("cityTie", key)} />{cityTies[key].replace(" en Tlalnepantla", "")}</label>)}</div>
      </div>
      <label>{fields.cityTie === "estudio" ? "Escuela donde estudias" : fields.cityTie === "trabajo" ? "Lugar donde trabajas" : "Colonia donde vives"}<input value={fields.cityTieDetail} maxLength={enlacesLimits.tieDetail} onChange={event => change("cityTieDetail", event.target.value)} /></label>
    </fieldset>

    <fieldset className="enl-card">
      <legend>Carta de motivos</legend>
      <p>Una cuartilla con la comisión o comunidad que eliges, qué harías en tu primer mes y qué te gustaría que Tlalnepantla tuviera en un año que hoy no tiene.</p>
      <div className="enl-chips" role="group" aria-label="Cómo entregas tu carta de motivos">
        <label className="enl-chip" data-on={motivesMode === "text" ? "true" : "false"}><input type="radio" name="motivesMode" checked={motivesMode === "text"} onChange={() => setMotivesMode("text")} />Escribirla aquí</label>
        <label className="enl-chip" data-on={motivesMode === "file" ? "true" : "false"}><input type="radio" name="motivesMode" checked={motivesMode === "file"} onChange={() => setMotivesMode("file")} />Subirla en PDF</label>
      </div>
      {motivesMode === "text"
        ? <label>Tu carta<textarea rows={10} value={fields.motivesText} maxLength={enlacesLimits.motives} onChange={event => change("motivesText", event.target.value)} />{counter(fields.motivesText, enlacesLimits.motives)}</label>
        : fileField({ category: "motivation_letter", label: enlacesDocumentCategories.motivation_letter, hint: "PDF de hasta 5 MB", accept: "application/pdf", removable: true })}
    </fieldset>

    <fieldset className="enl-card">
      <legend>Documentos</legend>
      <p>Solo los ve el comité de selección.</p>
      {fileField({ category: "recommendation_letter", label: enlacesDocumentCategories.recommendation_letter, hint: "De una persona docente, empleadora o líder de tu comunidad. PDF, JPG o PNG de hasta 5 MB", accept: "application/pdf,image/jpeg,image/png", removable: true })}
      {front && front.createdAt < application.createdAt && <p className="enl-reuse">Ya tenemos tu identificación en tu cuenta. No necesitas subirla de nuevo, pero puedes reemplazarla.</p>}
      {fileField({ category: "ine_front", label: "Identificación oficial, frente", hint: "Foto o PDF de hasta 5 MB. Si tu PDF trae ambos lados, basta con este", accept: "application/pdf,image/jpeg,image/png" })}
      {(front?.mime !== "application/pdf" || hasBack) && fileField({ category: "ine_back", label: "Identificación oficial, reverso", hint: "Foto o PDF de hasta 5 MB", accept: "application/pdf,image/jpeg,image/png" })}
    </fieldset>

    <fieldset className="enl-card">
      <legend>Tu trayectoria y tu propuesta</legend>
      <label>Participación previa en tu escuela o colonia<textarea rows={4} value={fields.previousParticipation} maxLength={enlacesLimits.participation} onChange={event => change("previousParticipation", event.target.value)} />{counter(fields.previousParticipation, enlacesLimits.participation)}</label>
      <label>Propuesta para tu comisión o comunidad<textarea rows={6} value={fields.proposal} maxLength={enlacesLimits.proposal} onChange={event => change("proposal", event.target.value)} />{counter(fields.proposal, enlacesLimits.proposal)}</label>
    </fieldset>

    <fieldset className="enl-card">
      <legend>Publicación de tu nombre</legend>
      <label className="enl-check"><input type="checkbox" checked={fields.publishNameOk} onChange={event => change("publishNameOk", event.target.checked)} /><span>{enlacesPublishConsent} Aparecería como <strong>{view.accountName}</strong>. Es opcional.</span></label>
    </fieldset>

    {feedback}
    <div className="enl-submit">
      <button className="button button-primary" disabled={busy || Boolean(uploading)}>{busy ? "Enviando…" : draft ? "Enviar mi postulación" : "Guardar cambios"}</button>
      <button type="button" className="text-link enl-danger" disabled={busy} onClick={() => void simple("withdraw", "¿Retirar tu postulación? Tus cartas se borran y no se puede deshacer.")}>Retirar mi postulación</button>
    </div>
  </form>;
}
