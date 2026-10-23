"use client";
import {useAdminFetch} from "./AdminSessionBoundary";
import { useEffect, useRef, useState } from "react";

type Entry = { id: string; kind: string; body: string; actorEmail: string; createdAt: number };
type History = { id: string; action: string; actorEmail: string; createdAt: number };
type Pagination = { page: number; pages: number; entryTotal: number; historyTotal: number };
type Journal = { entries: Entry[]; history: History[]; pagination: Pagination; error?: string };
const date = (value: number) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(value);
const actionNames: Record<string, string> = { 'request.update': 'Estado o responsable actualizado', 'request.entry': 'Entrada guardada', 'request.create': 'Solicitud recibida' };
const actionName = (action: string) => actionNames[action] ?? action;

export default function RequestJournal({ requestId }: { requestId: string }) {
  const accountFetch=useAdminFetch();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [dirty, setDirty] = useState(false), [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const sequence = useRef(0), inFlight = useRef(false);
  useEffect(() => () => { sequence.current++; }, [requestId]);
  async function load(page = 1) {
    const ticket = ++sequence.current; setLoading(true); setLoadError('');
    try {
      const response = await accountFetch(`/api/admin/requests/${requestId}/entries?page=${page}`, { cache: 'no-store' });
      const data = await response.json() as Journal;
      if (!response.ok) {
        if ([401, 403, 404].includes(response.status) && ticket === sequence.current) setJournal(null);
        throw new Error(data.error ?? 'No se pudo cargar el expediente.');
      }
      if (ticket === sequence.current) setJournal(data);
    } catch (error) {
      if (ticket === sequence.current) setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el expediente.');
    } finally { if (ticket === sequence.current) setLoading(false); }
  }
  const reload = (page = 1) => load(page);
  return <details className="request-journal" onToggle={event => { if (event.currentTarget.open && !journal && !loading) void reload(); }}>
    <summary>Expediente y respuesta</summary>
    <form data-dirty={dirty ? 'true' : undefined} onChange={() => setDirty(true)} onSubmit={async event => {
      event.preventDefault(); if (inFlight.current) return; inFlight.current = true;
      const form = event.currentTarget, payload = Object.fromEntries(new FormData(form)); setBusy(true); setMessage('');
      try {
        const response = await accountFetch(`/api/admin/requests/${requestId}/entries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json() as { error?: string; message?: string };
        if (!response.ok) throw new Error(result.error ?? 'No se pudo guardar.');
        form.reset(); setDirty(false); setMessage(result.message ?? 'Entrada guardada.'); await load();
      } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.'); }
      finally { inFlight.current = false; setBusy(false); }
    }}>
      <fieldset disabled={busy}><legend>Añadir al expediente</legend>
        <label>Tipo<select name="kind"><option value="note">Nota interna</option><option value="response_draft">Borrador de respuesta · sin enviar</option></select></label>
        <label>Texto<textarea name="body" rows={4} minLength={3} maxLength={4000} required /></label>
        <button className="button button-secondary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar en expediente'}</button>
      </fieldset>
    </form>
    <p role="status">{message}</p>
    {loadError && <p role="alert">{loadError} Puedes volver a cargar el historial sin enviar otra nota.</p>}
    <button className="button button-secondary" type="button" disabled={loading || busy} onClick={() => void reload()}>{loading ? 'Cargando…' : journal ? 'Actualizar expediente' : 'Cargar expediente'}</button>
    {journal && <>
      <div className="request-entry-list">
        {journal.entries.length === 0 && <p>No hay notas ni borradores en esta página.</p>}
        {journal.entries.map(entry => <article key={entry.id}><strong>{entry.kind === 'response_draft' ? 'Borrador de respuesta · sin enviar' : 'Nota interna'}</strong><p>{entry.body}</p><small>{entry.actorEmail} · {date(entry.createdAt)}</small></article>)}
      </div>
      {journal.history.length > 0 && <details><summary>Historial de cambios</summary>{journal.history.map(item => <p key={item.id}><strong>{actionName(item.action)}</strong> · {item.actorEmail} · {date(item.createdAt)}</p>)}</details>}
      <nav className="journal-pagination" aria-label="Páginas del expediente"><p>{journal.pagination.entryTotal} entradas · {journal.pagination.historyTotal} cambios · página {journal.pagination.page} de {journal.pagination.pages}</p>
        <div>{journal.pagination.page > 1 && <button type="button" className="post-read-link" disabled={loading || busy} onClick={() => void reload(journal.pagination.page - 1)}>Anterior</button>}{journal.pagination.page < journal.pagination.pages && <button type="button" className="post-read-link" disabled={loading || busy} onClick={() => void reload(journal.pagination.page + 1)}>Siguiente</button>}</div>
      </nav>
    </>}
  </details>;
}
