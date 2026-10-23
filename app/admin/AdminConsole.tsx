"use client";
import {useAdminFetch} from "./AdminSessionBoundary";

import Image from "next/image";
import PostBody from "@/app/PostBody";
import ActivityManager from "./ActivityManager";
import VersionedForm from "./VersionedForm";
import DraftForm from "./DraftForm";
import { confirmAdminExit } from "./AdminNavigationGuard";
import type { PanelData } from "@/lib/admin-types";
import AdminCollectionControls from "./AdminCollectionControls";
import SettingsManager from "./SettingsManager";
import MembershipManager from "./MembershipManager";
import RequestJournal from "./RequestJournal";
import MediaPicker from "./MediaPicker";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";


type Tab = "agenda" | "configuracion" | "resumen" | "publicaciones" | "medios" | "opiniones" | "solicitudes" | "incorporaciones" | "roles" | "auditoria";
type Preview = { title: string; excerpt: string; body: string; status: string };

const kindLabels = { suggestion: "Sugerencia", collaboration: "Colaboración", citizen_report: "Reporte ciudadano", complaint: "Queja", idea: "Idea" } as const;
const statusLabels = { draft: "Borrador", published: "Publicado", archived: "Archivado", pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada", new: "Nueva", in_review: "En revisión", closed: "Cerrada" } as const;
const detailLabels: Record<string, string> = { area: "Área", proposal: "Propuesta", skills: "Habilidades o aprendizaje", activity: "Actividad", availability: "Disponibilidad", location: "Lugar", approximateTime: "Momento aproximado", authority: "Autoridad posible", expectedResolution: "Solución esperada", beneficiaries: "Personas beneficiadas", firstStep: "Primer paso", supportNeeded: "Apoyo necesario" };

function date(value: number | null) {
  return value ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(new Date(value)) : "—";
}

function requestDetails(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0);
  } catch {
    return [];
  }
}

async function jsonResponse(response: Response) {
  try { return await response.json() as { error?: string; message?: string }; }
  catch { return { error: "El servidor devolvió una respuesta inesperada." }; }
}

function PreviewDialog({ preview, onClose }: { preview: Preview; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const current = dialog.current;
    if (!current) return;
    current.showModal();
    return () => current.close();
  }, []);

  return <dialog ref={dialog} className="admin-preview-dialog" aria-labelledby="admin-preview-title" onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="admin-preview"><div className="admin-preview-header"><span className="status">{preview.status === "published" ? "Vista previa · se publicará" : "Vista previa · borrador"}</span><button type="button" className="button button-secondary" onClick={onClose}>Cerrar</button></div><h2 id="admin-preview-title">{preview.title}</h2><p className="admin-preview-excerpt">{preview.excerpt}</p><PostBody body={preview.body} className="admin-preview-body" /></section></dialog>;
}

function PostImageHint() {
  return <small>Las líneas <code>[[flyer-cafecito-juvenil]]</code> y <code>[[aviso-transporte-box-lunch]]</code> muestran los carteles del encuentro. Deja una línea en blanco antes y después de cada una. Si quieres quitar una imagen, borra su línea y revisa la vista previa.</small>;
}

export default function AdminConsole({ role, data }: { role: string; data: PanelData; usesPassword?: boolean }) {
  const accountFetch=useAdminFetch();
  const router = useRouter();
  const active: Tab = data.query.section;
  function setActive(section: Tab) { if (section === active || !confirmAdminExit()) return; router.push(`/admin?section=${section}`); }
  const [message, setMessage] = useState("");
  const [messageKey, setMessageKey] = useState("");
  const [busy, setBusy] = useState("");
  const operationInFlight = useRef(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const tabs = useMemo(() => [
    { id: "resumen" as const, label: "Resumen", show: true },
    { id: "agenda" as const, label: "Agenda", show: data.permissions.content },
    { id: "configuracion" as const, label: "Configuración", show: data.permissions.requests },
    { id: "publicaciones" as const, label: "Publicaciones", show: data.permissions.content },
    { id: "medios" as const, label: "Biblioteca visual", show: data.permissions.content },
    { id: "opiniones" as const, label: "Opiniones", show: data.permissions.moderation },
    { id: "incorporaciones" as const, label: "Incorporaciones", show: data.permissions.requests },
    { id: "solicitudes" as const, label: "Solicitudes", show: data.permissions.requests },
    { id: "roles" as const, label: "Personas y roles", show: role === "admin" },
    { id: "auditoria" as const, label: "Auditoría", show: data.permissions.audit },
  ].filter((item) => item.show), [data.permissions, role]);

  async function mutate(key: string, url: string, init: RequestInit, success: string) {
    if (operationInFlight.current || data.setupPending) return false;
    operationInFlight.current = true;
    setBusy(key);
    setMessage("");
    setMessageKey(key);
    try {
      const response = await accountFetch(url, init);
      const result = await jsonResponse(response);
      setMessage(result.error ?? result.message ?? success);
      if (response.ok || response.status === 409) router.refresh();
      return response.ok;
    } catch {
      setMessage("No fue posible completar la operación. Revisa la conexión e intenta de nuevo.");
      return false;
    } finally {
      operationInFlight.current = false;
      setBusy("");
    }
  }

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const ok = await mutate("post-new", "/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) }, "Publicación guardada.");
    if (ok) form.reset();
  }

  async function updatePost(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    return await mutate(`post-${id}`, `/api/posts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }, "Publicación actualizada.");
  }

  async function uploadMedia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const ok = await mutate("media-new", "/api/media", { method: "POST", body: new FormData(form) }, "Imagen cargada de forma privada.");
    if (ok) form.reset();
  }

  async function updateMedia(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    return await mutate(`media-${id}`, `/api/media/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }, "Imagen actualizada.");
  }

  async function moderate(item: PanelData["comments"][number], status: "approved" | "rejected") {
    await mutate(`comment-${item.id}`, `/api/comments/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, expectedUpdatedAt: item.moderatedAt ?? item.createdAt }) }, status === "approved" ? "Opinión aprobada." : "Opinión rechazada.");
  }

  async function updateRequest(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    return await mutate(`request-${id}`, `/api/admin/requests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }, "Solicitud actualizada.");
  }

  function previewPost(form: HTMLFormElement | null) {
    if (!form) return;
    const fields = Object.fromEntries(new FormData(form));
    setPreview({
      title: String(fields.title ?? "Sin título"),
      excerpt: String(fields.excerpt ?? ""),
      body: String(fields.body ?? ""),
      status: String(fields.status ?? "draft"),
    });
  }

  async function purgeExpiredData() {
    const confirmation = window.prompt("Escribe PURGAR_VENCIDOS para eliminar opiniones, solicitudes y límites cuya conservación ya venció.");
    if (confirmation !== "PURGAR_VENCIDOS") {
      setMessageKey("retention-purge");
      setMessage("Purga cancelada; no se eliminó información.");
      return;
    }
    await mutate("retention-purge", "/api/admin/maintenance/retention", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation }),
    }, "Datos vencidos eliminados y acción registrada.");
  }

  function operationStatus(key: string) {
    return messageKey === key && message ? <p className="admin-operation-message" role="status" aria-live="polite">{message}</p> : null;
  }

  const { pendingComments, openRequests, publishedPosts } = data.metrics;

  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar" aria-label="Secciones del panel">
        <span className="admin-label">Rol · {role}</span>
        {tabs.map((tab) => <button type="button" key={tab.id} className={active === tab.id ? "active" : ""} aria-pressed={active === tab.id} aria-controls={`admin-panel-${tab.id}`} onClick={() => setActive(tab.id)}>{tab.label}</button>)}
      </aside>

      <div className="admin-panel">
        {data.setupPending ? <div className="admin-alert"><strong>No pudimos cargar los datos del panel.</strong><p>Intenta actualizar la página. Por ahora, no es posible consultar ni guardar cambios.</p></div> : null}
        <p className="admin-global-message" role="status" aria-live="polite">{message}</p>
        <AdminCollectionControls query={data.query} collection={data.collection} />

        {active === "incorporaciones" && data.permissions.requests && <MembershipManager items={data.memberships} enabled={data.configuration.membershipEnabled} unavailable={data.setupPending} readiness={data.readiness} canConfigure={data.permissions.roles} />}
        {active === "agenda" && data.permissions.content && <ActivityManager items={data.activities} />}
        {active === "configuracion" && data.permissions.requests && <section className="admin-section" id="admin-panel-configuracion"><div className="admin-section-heading"><h2>Configuración del sitio</h2><p>Aviso de privacidad, redes propias y estado de los canales.</p></div>{data.settings && data.permissions.roles && <SettingsManager record={data.settings} />}<ul className="admin-readiness">{data.readiness.map(item=><li key={item.label}><span>{item.label}</span><strong>{item.ready ? "Configurado" : "Pendiente"}</strong></li>)}</ul><p>La agenda y las publicaciones se administran de forma independiente. La lista muestra los requisitos para abrir incorporaciones. Contacto y opiniones conservan su configuración independiente.</p></section>}
        {active === "resumen" ? <section className="admin-section" id="admin-panel-resumen">
          <div className="admin-section-heading"><span className="admin-label">Estado operativo</span><h2>Resumen del sitio</h2><p>Administra actividades, publicaciones y solicitudes desde aquí.</p></div>
          <div className="admin-metrics">
            {data.permissions.content && <article><strong>{data.metrics.activities}</strong><span>próximas actividades</span><button type="button" className="aj-link" onClick={()=>setActive("agenda")}>Administrar agenda</button></article>}
            {data.permissions.content ? <article><strong>{publishedPosts}</strong><span>publicaciones visibles</span><small>{data.metrics.otherPosts} borradores o archivadas</small></article> : null}
            {data.permissions.moderation ? <article><strong>{pendingComments}</strong><span>opiniones pendientes</span><small>{data.configuration.commentsEnabled ? "Canal habilitado" : "Canal público cerrado"}</small></article> : null}
            {data.permissions.requests ? <article><strong>{openRequests}</strong><span>solicitudes abiertas</span><small>{data.configuration.contactEnabled ? "Canal habilitado" : "Canal público cerrado"}</small></article> : null}
            {data.permissions.requests && <article><strong>{data.metrics.openMemberships}</strong><span>incorporaciones por revisar</span><small>{data.configuration.membershipEnabled ? "Recepción abierta" : "Recepción cerrada"}</small><button type="button" className="aj-link" onClick={()=>setActive("incorporaciones")}>Revisar incorporaciones</button></article>}
            {data.permissions.content ? <article><strong>{data.metrics.media}</strong><span>archivos registrados</span><small>{data.metrics.privateMedia} privados</small></article> : null}
          </div>
          <div className="admin-note"><strong>Protección activa</strong><p>Comentarios y contacto solo se abren cuando existen responsable, domicilio, medio ARCO, versión del aviso, conservación y secreto de límite configurados.</p></div>
          {data.permissions.roles ? <div className="admin-maintenance"><div><strong>Conservación de datos</strong><p>Elimina los registros cuyo plazo venció, incluidas incorporaciones y su historial. La ejecución periódica debe quedar configurada por el responsable; esta acción permite realizarla desde aquí.</p></div><button type="button" className="button button-secondary" onClick={purgeExpiredData} disabled={Boolean(busy) || data.setupPending}>{busy === "retention-purge" ? "Eliminando…" : "Eliminar datos cuyo plazo venció"}</button>{operationStatus("retention-purge")}</div> : null}
        </section> : null}

        {active === "publicaciones" && data.permissions.content ? <section className="admin-section" id="admin-panel-publicaciones">
          <div className="admin-section-heading"><span className="admin-label">Publicaciones</span><h2>Crear, revisar y actualizar.</h2><p>La fecha de publicación se conserva al corregir una nota ya visible. Los cambios simultáneos se detienen antes de sobrescribir.</p></div>
          <details className="admin-create" open={data.posts.length === 0}><summary>Nueva publicación</summary><DraftForm onSubmit={createPost}>
            <label>Título<input name="title" minLength={5} maxLength={140} required /></label>
            <label>Identificador URL<input name="slug" maxLength={90} placeholder="Se genera desde el título" /></label>
            <label>Resumen<textarea name="excerpt" minLength={20} maxLength={320} required rows={3} /></label>
            <label>Contenido<textarea name="body" minLength={40} maxLength={12000} required rows={10} /><PostImageHint /></label>
            <MediaPicker />
            <label>Estado<select name="status" defaultValue="draft"><option value="draft">Borrador</option><option value="published">Publicar</option></select></label>
            <div className="record-actions"><button className="button button-secondary" type="button" onClick={(event) => previewPost(event.currentTarget.form)}>Previsualizar texto</button><button className="button button-primary" type="submit" disabled={Boolean(busy) || data.setupPending}>{busy === "post-new" ? "Guardando…" : "Guardar publicación"}</button></div>{operationStatus("post-new")}
          </DraftForm></details>
          <div className="admin-list">
            {data.posts.length === 0 ? <p className="admin-empty">No hay publicaciones todavía.</p> : data.posts.map((post) => <details key={post.id} className="admin-record"><summary><span><strong>{post.title}</strong><small>{statusLabels[post.status]} · actualizado {date(post.updatedAt)}</small></span><span className={`status status-${post.status}`}>{statusLabels[post.status]}</span></summary>
              <VersionedForm record={post} onSubmit={(event, snapshot) => updatePost(event, snapshot.id)}>{post => <>
                <label>Título<input name="title" defaultValue={post.title} minLength={5} maxLength={140} required /></label>
                <label>Identificador URL<input name="slug" defaultValue={post.slug} maxLength={90} required /></label>
                <label>Resumen<textarea name="excerpt" defaultValue={post.excerpt} minLength={20} maxLength={320} required rows={3} /></label>
                <label>Contenido<textarea name="body" defaultValue={post.body} minLength={40} maxLength={12000} required rows={10} /><PostImageHint /></label>
                <MediaPicker defaultValue={post.coverMediaId ?? ""} />
                <label>Estado<select name="status" defaultValue={post.status}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>
                <div className="record-actions"><button className="button button-secondary" type="button" onClick={(event) => previewPost(event.currentTarget.form)}>Previsualizar texto</button><button className="button button-primary" type="submit" disabled={Boolean(busy) || data.setupPending}>{busy === `post-${post.id}` ? "Guardando…" : "Guardar cambios"}</button></div>{operationStatus(`post-${post.id}`)}
              </>}</VersionedForm>
            </details>)}
          </div>
        </section> : null}

        {active === "medios" && data.permissions.content ? <section className="admin-section" id="admin-panel-medios">
          <div className="admin-section-heading"><span className="admin-label">Biblioteca visual</span><h2>Imágenes con control editorial.</h2><p>JPG, PNG o WebP de hasta 8 MB. Toda carga inicia privada; una portada visible no puede privatizarse hasta dejar de usarse.</p></div>
          <details className="admin-create" open={data.media.length === 0}><summary>Cargar imagen</summary><DraftForm onSubmit={uploadMedia}>
            <label>Archivo<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label>
            <label>Descripción accesible<input name="altText" minLength={8} maxLength={240} required /></label>
            <button className="button button-primary" type="submit" disabled={Boolean(busy) || data.setupPending}>{busy === "media-new" ? "Subiendo…" : "Cargar de forma privada"}</button>{operationStatus("media-new")}
          </DraftForm></details>
          <div className="media-library">
            {data.media.length === 0 ? <p className="admin-empty">No hay imágenes todavía.</p> : data.media.map((item) => <article key={item.id} className="media-record">
              <Image src={`/api/admin/media/${item.id}/content`} alt={item.altText} width={480} height={320} unoptimized />
              <div><span className={`status status-${item.visibility}`}>{item.visibility === "public" ? "Pública" : "Privada"}</span><strong>{item.fileName}</strong><small>{Math.round(item.sizeBytes / 1024)} KB · {date(item.createdAt)}{item.usedByPublishedPosts ? ` · usada en ${item.usedByPublishedPosts} publicación(es)` : ""}</small></div>
              <VersionedForm record={item} onSubmit={(event, snapshot) => updateMedia(event, snapshot.id)}>{item => <>
                <label>Descripción accesible<input name="altText" defaultValue={item.altText} minLength={8} maxLength={240} required /></label>
                <label>Visibilidad<select name="visibility" defaultValue={item.visibility}><option value="private">Privada</option><option value="public">Pública</option></select></label>
                <button className="button button-secondary" type="submit" disabled={Boolean(busy) || data.setupPending}>{busy === `media-${item.id}` ? "Guardando…" : "Actualizar"}</button>{operationStatus(`media-${item.id}`)}
              </>}</VersionedForm>
            </article>)}
          </div>
        </section> : null}

        {active === "opiniones" && data.permissions.moderation ? <section className="admin-section" id="admin-panel-opiniones">
          <div className="admin-section-heading"><span className="admin-label">Moderación</span><h2>Opiniones antes de publicar.</h2><p>El correo de autenticación no se muestra aquí. La revisión utiliza únicamente alias público, texto, publicación y fechas.</p></div>
          <div className="moderation-list">
            {data.comments.length === 0 ? <p className="admin-empty">No hay opiniones registradas.</p> : data.comments.map((item) => <article key={item.id} className="moderation-record"><div><span className={`status status-${item.status}`}>{statusLabels[item.status]}</span><small>{item.postTitle} · {date(item.createdAt)}</small></div><blockquote>{item.body}</blockquote><p>Nombre público · <strong>{item.authorName}</strong> · conservación hasta {date(item.retentionUntil)}</p><div className="record-actions"><button type="button" className="button button-primary" onClick={() => moderate(item, "approved")} disabled={Boolean(busy) || data.setupPending}>Aprobar</button><button type="button" className="button button-secondary" onClick={() => moderate(item, "rejected")} disabled={Boolean(busy) || data.setupPending}>Rechazar</button></div>{operationStatus(`comment-${item.id}`)}</article>)}
          </div>
        </section> : null}

        {active === "solicitudes" && data.permissions.requests ? <section className="admin-section" id="admin-panel-solicitudes">
          <div className="admin-section-heading"><span className="admin-label">Bandeja protegida</span><h2>Solicitudes con seguimiento.</h2><p>Esta sección puede contener datos personales. No copies su contenido fuera de la finalidad declarada y atiende la fecha de conservación.</p></div>
          <div className="request-list">
            {data.requests.length === 0 ? <p className="admin-empty">No hay solicitudes registradas.</p> : data.requests.map((item) => <article key={item.id} className="request-record"><header><span className={`status status-${item.status}`}>{statusLabels[item.status]}</span><strong>{kindLabels[item.kind]}</strong><small>{item.referenceCode ?? item.id} · {date(item.createdAt)}</small></header><p className="request-message">{item.message}</p>{requestDetails(item.detailsJson).length ? <dl className="request-details">{requestDetails(item.detailsJson).map(([key, value]) => <div key={key}><dt>{detailLabels[key] ?? key}</dt><dd>{value}</dd></div>)}</dl> : null}<dl><div><dt>Nombre</dt><dd>{item.name ?? "Anónimo"}</dd></div><div><dt>Correo</dt><dd>{item.email ?? "—"}</dd></div><div><dt>Institución</dt><dd>{item.institution ?? "—"}</dd></div><div><dt>Conservación</dt><dd>{date(item.retentionUntil)}</dd></div></dl><VersionedForm record={item} onSubmit={(event, snapshot) => updateRequest(event, snapshot.id)}>{item => <><label>Estado<select name="status" defaultValue={item.status}><option value="new">Nueva</option><option value="in_review">En revisión</option><option value="closed">Cerrada</option></select></label><label>Responsable interno<select name="assignedTo" defaultValue={item.assignedTo ?? ""}><option value="">Sin asignar</option>{item.assignedTo && !data.assignees.includes(item.assignedTo) && <option value={item.assignedTo} disabled>{item.assignedTo} · sin acceso vigente</option>}{data.assignees.map(email => <option key={email} value={email}>{email}</option>)}</select></label><button className="button button-primary" type="submit" disabled={Boolean(busy) || data.setupPending}>{busy === `request-${item.id}` ? "Guardando…" : "Guardar seguimiento"}</button>{operationStatus(`request-${item.id}`)}</>}</VersionedForm><RequestJournal requestId={item.id} /></article>)}
          </div>
        </section> : null}

        {active === "roles" && role === "admin" ? <section className="admin-section" id="admin-panel-roles">
          <div className="admin-section-heading"><a className="aj-link" href="/admin/cuenta">Usuarios y contraseñas</a><h2>Personas y responsabilidades.</h2><p>Editor gestiona publicaciones y medios; moderador revisa opiniones; admin atiende solicitudes y consulta auditoría. Solo la persona propietaria puede asignar o revocar.</p></div>
          <p>Gestiona todas las cuentas y sus permisos desde <a className="staff-home-link" href="/admin/cuenta">Usuarios y contraseñas</a>.</p>
          <div className="role-list">{data.roles.length === 0 ? <p className="admin-empty">No hay roles delegados.</p> : data.roles.map((item) => <article key={item.email}><div><strong>{item.email}</strong><small>{item.role} · {item.revokedAt ? `revocado ${date(item.revokedAt)}` : `activo · actualizado ${date(item.updatedAt ?? item.createdAt)}`}</small>{operationStatus(`role-${item.email}`)}</div></article>)}</div>
        </section> : null}

        {active === "auditoria" && data.permissions.audit ? <section className="admin-section" id="admin-panel-auditoria">
          <div className="admin-section-heading"><span className="admin-label">Trazabilidad</span><h2>Quién hizo qué y cuándo.</h2><p>El registro conserva acciones y transiciones mínimas; no replica cuerpos de publicaciones, opiniones o solicitudes.</p></div>
          <div className="audit-list">{data.audit.length === 0 ? <p className="admin-empty">No hay acciones registradas.</p> : data.audit.map((item) => <article key={item.id}><time>{date(item.createdAt)}</time><div><strong>{item.action}</strong><span>{item.entityType} · {item.entityId}</span><small>{item.actorEmail}</small></div><code>{item.metadataJson ?? "{}"}</code></article>)}</div>
        </section> : null}
      </div>
      {preview ? <PreviewDialog preview={preview} onClose={() => setPreview(null)} /> : null}
    </div>
  );
}
