"use client";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAdminFetch } from "../AdminSessionBoundary";
import { contentBlocks, type BlockDef, type FieldSpec, type GroupSpec, type ListSpec, type NumberSpec, type RecordSpec, type TextSpec } from "@/lib/site-content-defaults";
import { siteDocumentHref, siteDocumentList, staticDocumentHref, SITE_DOCUMENT_MAX_BYTES, type SiteDocumentRow, type SiteDocumentSlug } from "@/lib/site-documents";

export type ContentRecord = { key: string; value: Record<string, unknown>; updatedAt: number; updatedBy: string; custom: boolean };
export type Tab = "comisiones" | "enlaces" | "portada" | "documentos";
type Path = Array<string | number>;
const tabs: Array<[Tab, string]> = [["comisiones", "Comisiones"], ["enlaces", "Enlaces APJ"], ["portada", "Portada y textos"], ["documentos", "Documentos PDF"]];
const stepNames: Record<string, string> = { cuenta: "Paso 1", solicitud: "Paso 2", documentos: "Paso 3", comision: "Paso 4", afiliacion: "Paso 5" };

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const when = (time: number) => new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }).format(time);
const size = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

function getAt(value: unknown, path: Path): unknown {
  return path.reduce<unknown>((current, part) => (current as Record<string | number, unknown> | undefined)?.[part], value);
}
function setAt<T>(value: T, path: Path, next: unknown): T {
  if (!path.length) return next as T;
  const [head, ...rest] = path;
  const copy = (Array.isArray(value) ? [...value] : { ...(value as object) }) as Record<string | number, unknown>;
  copy[head] = setAt(copy[head], rest, next);
  return copy as T;
}
function emptyItem(spec: TextSpec | RecordSpec): unknown {
  return spec.type === "text" ? "" : Object.fromEntries(Object.entries(spec.fields).map(([key, field]) => [key, field.type === "number" ? 0 : ""]));
}

export default function ContentManager({ records, documents, initialTab, storageReady }: { records: Record<string, ContentRecord>; documents: SiteDocumentRow[]; initialTab: Tab; storageReady: boolean }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const names = Object.fromEntries(contentBlocks.filter(block => block.key.startsWith("commission.")).map(block => [block.key.slice("commission.".length), String(records[block.key]?.value.name ?? block.title)]));
  function choose(next: Tab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url.pathname + url.search);
  }
  return <div className="admin-workspace content-admin">
    <nav className="admin-sidebar" aria-label="Secciones del contenido">
      <span className="admin-label">Editar</span>
      {tabs.map(([key, label]) => <button key={key} type="button" className={tab === key ? "active" : ""} aria-current={tab === key ? "page" : undefined} onClick={() => choose(key)}>{label}</button>)}
    </nav>
    <section className="admin-section">
      {tab === "documentos"
        ? <DocumentsPanel documents={documents} storageReady={storageReady} />
        : <>
          <div className="admin-section-heading content-admin-heading">
            <h2>{tabs.find(([key]) => key === tab)?.[1]}</h2>
            <p>{tab === "comisiones" ? "Nombre, propósito, tareas y resultado de cada comisión, y el orden en que aparecen. Las seis comisiones y sus claves no cambian." : tab === "enlaces" ? "Textos de la convocatoria. Abrirla o cerrarla sigue en Configuración del panel." : "Títulos y párrafos de la portada, de /comisiones y de Participa, y los cinco pasos del proceso."} Cada bloque se guarda por separado.</p>
          </div>
          {contentBlocks.filter(block => block.tab === tab).map(block => <BlockForm key={block.key} block={block} record={records[block.key]} names={names} />)}
        </>}
    </section>
  </div>;
}

function BlockForm({ block, record, names }: { block: BlockDef; record: ContentRecord; names: Record<string, string> }) {
  const accountFetch = useAdminFetch();
  const router = useRouter();
  const [state, setState] = useState({ base: record, draft: clone(record.value), dirty: false });
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  if (!state.dirty && state.base.updatedAt !== record.updatedAt) setState({ base: record, draft: clone(record.value), dirty: false });
  const changedElsewhere = state.dirty && state.base.updatedAt !== record.updatedAt;
  const title = block.key.startsWith("commission.") ? names[block.key.slice("commission.".length)] ?? block.title : block.title;
  const update = (path: Path, value: unknown) => setState(current => ({ ...current, draft: setAt(current.draft, path, value), dirty: true }));

  async function send(action: "save" | "reset") {
    if (busy) return;
    if (action === "reset" && !window.confirm("¿Volver al texto original? Se borra lo guardado en este bloque.")) return;
    setBusy(true); setMessage("");
    try {
      const response = await accountFetch("/api/admin/contenido", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, key: block.key, value: action === "save" ? state.draft : undefined, expectedUpdatedAt: state.base.updatedAt }) });
      const result = await response.json() as { error?: string; message?: string; record?: ContentRecord };
      setMessage(result.error ?? result.message ?? "Guardado.");
      if (response.ok && result.record) setState({ base: result.record, draft: clone(result.record.value), dirty: false });
      if (response.ok || response.status === 409) router.refresh();
    } catch { setMessage("No pudimos guardar. Lo que escribiste sigue aquí."); }
    finally { setBusy(false); }
  }

  const status = state.base.custom ? `Editado${state.base.updatedAt ? ` el ${when(state.base.updatedAt)}` : ""}${state.base.updatedBy ? ` por ${state.base.updatedBy}` : ""}.` : "Muestra el texto original.";
  return <details className="content-block">
    <summary className="content-block-summary"><span><strong>{title}</strong><small>{status}</small></span>{state.dirty && <span className="content-block-dirty">Sin guardar</span>}</summary>
    <form className="content-block-form" data-dirty={state.dirty ? "true" : undefined} onSubmit={event => { event.preventDefault(); void send("save"); }}>
      <p className="content-block-page">Cambia en {block.pageLabel}. <a className="text-link" href={block.page} target="_blank" rel="noreferrer">Ver la página</a></p>
      {changedElsewhere && <div className="admin-note" role="status"><p>Este bloque cambió en otra sesión mientras lo editabas. Tu borrador sigue aquí; guardarlo no sobrescribirá la otra versión.</p><button type="button" className="button button-secondary" disabled={busy} onClick={() => setState({ base: record, draft: clone(record.value), dirty: false })}>Descartar mi borrador y cargar la versión guardada</button></div>}
      <fieldset className="content-block-fields" disabled={busy}>
        {Object.entries(block.fields).map(([name, spec]) => <Field key={name} spec={spec} value={state.draft[name]} path={[name]} update={update} names={names} />)}
      </fieldset>
      <div className="record-actions content-block-actions">
        <button className="button button-primary" disabled={busy || !state.dirty}>{busy ? "Guardando…" : "Guardar"}</button>
        <button type="button" className="button button-secondary" disabled={busy || !state.base.custom} onClick={() => void send("reset")}>Volver al texto original</button>
      </div>
      <p role="status" aria-live="polite" className="content-block-message">{message}</p>
    </form>
  </details>;
}

type FieldProps = { spec: FieldSpec | RecordSpec; value: unknown; path: Path; update: (path: Path, value: unknown) => void; names: Record<string, string>; label?: string };

function Field({ spec, value, path, update, names, label }: FieldProps): ReactNode {
  switch (spec.type) {
    case "text": return <TextField spec={spec} value={String(value ?? "")} label={label ?? spec.label} onChange={next => update(path, next)} />;
    case "number": return <NumberField spec={spec} value={Number(value)} label={label ?? spec.label} onChange={next => update(path, next)} />;
    case "record": return <div className="content-record">{Object.entries(spec.fields).map(([key, field]) => <Field key={key} spec={field} value={getAt(value, [key])} path={[...path, key]} update={update} names={names} />)}</div>;
    case "list": return <ListField spec={spec} value={Array.isArray(value) ? value : []} path={path} update={update} names={names} />;
    case "group": return <GroupField spec={spec} value={(value ?? {}) as Record<string, unknown>} path={path} update={update} names={names} />;
    case "order": {
      const order = Array.isArray(value) ? value as string[] : [];
      return <fieldset className="content-list"><legend>{spec.label}</legend>{spec.help && <p className="content-help">{spec.help}</p>}
        <ol className="content-order">{order.map((id, index) => <li key={id}><span>{names[id] ?? id}</span><MoveButtons index={index} count={order.length} label={names[id] ?? id} onMove={to => update(path, move(order, index, to))} /></li>)}</ol>
      </fieldset>;
    }
  }
}

function TextField({ spec, value, label, onChange }: { spec: TextSpec; value: string; label: string; onChange: (value: string) => void }) {
  const required = (spec.min ?? 1) > 0;
  return <label className="content-field">{label}{!required && <span className="field-optional">Opcional</span>}
    {spec.rows ? <textarea rows={spec.rows} maxLength={spec.max} required={required} value={value} onChange={event => onChange(event.target.value)} /> : <input maxLength={spec.max} required={required} minLength={spec.min} value={value} onChange={event => onChange(event.target.value)} />}
    <small>{spec.help ? `${spec.help} ` : ""}{value.length}/{spec.max}</small>
  </label>;
}

function NumberField({ spec, value, label, onChange }: { spec: NumberSpec; value: number; label: string; onChange: (value: number) => void }) {
  return <label className="content-field content-number">{label}{spec.suffix ? ` (${spec.suffix})` : ""}
    <input type="number" inputMode="numeric" min={spec.min} max={spec.max} step={1} required value={Number.isFinite(value) && value !== 0 ? value : ""} onChange={event => onChange(event.target.value === "" ? 0 : Number(event.target.value))} />
  </label>;
}

const move = <T,>(list: T[], from: number, to: number) => { const next = [...list]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; };

function MoveButtons({ index, count, label, onMove, onRemove, canRemove }: { index: number; count: number; label: string; onMove: (to: number) => void; onRemove?: () => void; canRemove?: boolean }) {
  return <span className="content-item-controls">
    <button type="button" className="text-link" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Subir ${label}`}>Subir</button>
    <button type="button" className="text-link" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Bajar ${label}`}>Bajar</button>
    {onRemove && <button type="button" className="text-link" disabled={!canRemove} onClick={onRemove} aria-label={`Quitar ${label}`}>Quitar</button>}
  </span>;
}

function ListField({ spec, value, path, update, names }: { spec: ListSpec; value: unknown[]; path: Path; update: FieldProps["update"]; names: Record<string, string> }) {
  const total = spec.item.type === "record" && Object.values(spec.item.fields).some(field => field.type === "number")
    ? value.reduce<number>((sum, item) => sum + Object.entries((spec.item as RecordSpec).fields).filter(([, field]) => field.type === "number").reduce((inner, [key]) => inner + (Number(getAt(item, [key])) || 0), 0), 0)
    : null;
  return <fieldset className="content-list"><legend>{spec.label}</legend>{spec.help && <p className="content-help">{spec.help}{total !== null && <> Suma actual: <strong>{total}</strong>.</>}</p>}
    <ol>{value.map((item, index) => {
      const itemLabel = `${spec.item.type === "text" ? spec.item.label : spec.label} ${index + 1}`;
      return <li key={index} className="content-list-item">
        <Field spec={spec.item} value={item} path={[...path, index]} update={update} names={names} label={itemLabel} />
        <MoveButtons index={index} count={value.length} label={itemLabel} onMove={to => update(path, move(value, index, to))} onRemove={() => update(path, value.filter((_, position) => position !== index))} canRemove={value.length > spec.minItems} />
      </li>;
    })}</ol>
    <button type="button" className="button button-secondary content-add" disabled={value.length >= spec.maxItems} onClick={() => update(path, [...value, emptyItem(spec.item)])}>{spec.addLabel}</button>
    <small className="content-help">De {spec.minItems} a {spec.maxItems} elementos.</small>
  </fieldset>;
}

function GroupField({ spec, value, path, update, names }: { spec: GroupSpec; value: Record<string, unknown>; path: Path; update: FieldProps["update"]; names: Record<string, string> }) {
  return <fieldset className="content-list"><legend>{spec.label}</legend>{spec.help && <p className="content-help">{spec.help}</p>}
    {spec.keys.map(key => {
      const heading = spec.keyLabel === "commission" ? names[key] ?? key : `${stepNames[key] ?? key}`;
      return spec.field.type === "text"
        ? <Field key={key} spec={spec.field} value={value[key]} path={[...path, key]} update={update} names={names} label={heading} />
        : <div key={key} className="content-group-item"><strong>{heading}</strong><Field spec={spec.field} value={value[key]} path={[...path, key]} update={update} names={names} /></div>;
    })}
  </fieldset>;
}

function DocumentsPanel({ documents, storageReady }: { documents: SiteDocumentRow[]; storageReady: boolean }) {
  return <>
    <div className="admin-section-heading content-admin-heading">
      <h2>Documentos PDF</h2>
      <p>Sube una versión nueva de cada PDF (hasta 15 MB). Los enlaces del sitio la entregan de inmediato. «Volver al original» borra la versión subida y el sitio vuelve a entregar el PDF original.</p>
    </div>
    {!storageReady && <div className="admin-alert" role="status"><strong>Almacenamiento no disponible</strong><p>Sin base de datos o sin almacenamiento de archivos el sitio entrega los PDF originales y no se pueden subir versiones nuevas.</p></div>}
    {siteDocumentList.map(item => <DocumentRow key={item.slug} slug={item.slug} label={item.label} record={documents.find(document => document.slug === item.slug) ?? null} disabled={!storageReady} />)}
  </>;
}

function DocumentRow({ slug, label, record, disabled }: { slug: SiteDocumentSlug; label: string; record: SiteDocumentRow | null; disabled: boolean }) {
  const accountFetch = useAdminFetch();
  const router = useRouter();
  const [current, setCurrent] = useState({ prop: record, value: record });
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [inputKey, setInputKey] = useState(0);
  if (current.prop?.uploaded_at !== record?.uploaded_at) setCurrent({ prop: record, value: record });
  const doc = current.value;

  async function upload() {
    if (!file || busy) return;
    if (file.size > SITE_DOCUMENT_MAX_BYTES) { setMessage("El archivo pesa más de 15 MB."); return; }
    if (file.type && file.type !== "application/pdf") { setMessage("Elige un archivo PDF."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await accountFetch(`/api/admin/documentos/${slug}?expectedUploadedAt=${doc?.uploaded_at ?? 0}`, { method: "POST", headers: { "Content-Type": "application/pdf", "X-File-Name": encodeURIComponent(file.name) }, body: file });
      const result = await response.json() as { error?: string; message?: string; document?: SiteDocumentRow };
      setMessage(result.error ?? result.message ?? "Listo.");
      if (response.ok && result.document) { setCurrent(value => ({ ...value, value: result.document! })); setFile(null); setInputKey(value => value + 1); }
      if (response.ok || response.status === 409) router.refresh();
    } catch { setMessage("No pudimos subir el archivo. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }

  async function reset() {
    if (!doc || busy || !window.confirm(`¿Volver al original de «${label}»? Se borra la versión subida.`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await accountFetch(`/api/admin/documentos/${slug}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedUploadedAt: doc.uploaded_at }) });
      const result = await response.json() as { error?: string; message?: string };
      setMessage(result.error ?? result.message ?? "Listo.");
      if (response.ok) setCurrent(value => ({ ...value, value: null }));
      if (response.ok || response.status === 409) router.refresh();
    } catch { setMessage("No pudimos restaurar el original. Inténtalo de nuevo."); }
    finally { setBusy(false); }
  }

  return <details className="content-block content-document">
    <summary className="content-block-summary"><span><strong>{label}</strong><small>{doc ? `Versión subida: ${doc.file_name}, ${size(doc.size_bytes)}, el ${when(doc.uploaded_at)} por ${doc.uploaded_by}.` : "Se entrega el PDF original."}</small></span>{file && <span className="content-block-dirty">Sin subir</span>}</summary>
    <form className="content-block-form" data-dirty={file ? "true" : undefined} onSubmit={event => { event.preventDefault(); void upload(); }}>
      <p className="content-document-links"><a className="text-link" href={siteDocumentHref(slug)} target="_blank" rel="noreferrer">Abrir el que se publica</a>{doc && <a className="text-link" href={staticDocumentHref(slug)} target="_blank" rel="noreferrer">Abrir el original</a>}</p>
      <fieldset className="content-block-fields" disabled={busy || disabled}>
        <label className="content-field">Versión nueva en PDF<input key={inputKey} type="file" accept="application/pdf,.pdf" onChange={event => setFile(event.target.files?.[0] ?? null)} /><small>Hasta 15 MB.</small></label>
      </fieldset>
      <div className="record-actions content-block-actions">
        <button className="button button-primary" disabled={busy || disabled || !file}>{busy ? "Subiendo…" : "Subir versión nueva"}</button>
        <button type="button" className="button button-secondary" disabled={busy || disabled || !doc} onClick={() => void reset()}>Volver al original</button>
      </div>
      <p role="status" aria-live="polite" className="content-block-message">{message}</p>
    </form>
  </details>;
}
