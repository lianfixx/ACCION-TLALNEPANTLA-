"use client";
import { useRef, useState } from 'react';
import { useAdminFetch } from '../AdminSessionBoundary';
import { peopleEmailLimit, type PeopleFilters } from '@/lib/people-shared';

export default function PeopleTools({ filters, total, emailConfigured }: { filters: PeopleFilters; total: number; emailConfigured: boolean }) {
  const request = useAdminFetch(), lock = useRef(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function exportList() {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage('');
    try {
      const response = await request('/api/admin/personas/exportar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters }) });
      if (!response.ok) { setMessage(((await response.json().catch(() => ({}))) as { error?: string }).error ?? 'No pudimos preparar el archivo.'); return; }
      const blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = response.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'personas.csv';
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(`Archivo listo: ${response.headers.get('x-export-rows') ?? ''} personas. La descarga quedó registrada.`);
    } catch { setMessage('No pudimos preparar el archivo. Inténtalo de nuevo.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <div className="people-tools">
    <div className="people-tools-actions">
      <button type="button" className="button button-secondary" disabled={busy || total === 0} onClick={() => void exportList()}>{busy ? 'Preparando…' : 'Exportar a Excel'}</button>
      <p role="status" aria-live="polite">{message}</p>
    </div>
    <details className="people-compose-group"><summary>Escribir a esta lista</summary><EmailComposer filters={filters} configured={emailConfigured} /></details>
  </div>;
}

/** Preview first: the server answers how many confirmed addresses will receive the message. */
export function EmailComposer({ filters, accountId, configured, onSent }: { filters?: PeopleFilters; accountId?: string; configured: boolean; onSent?: () => void }) {
  const request = useAdminFetch(), lock = useRef(false);
  const [preview, setPreview] = useState<{ count: number | null; excluded: number } | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [subject, setSubject] = useState(''), [body, setBody] = useState(''), [confirmed, setConfirmed] = useState(false);
  const target = accountId ? { accountId } : { filters };
  async function call(payload: Record<string, unknown>) {
    const response = await request('/api/admin/personas/correo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...target, ...payload }) });
    return { response, data: await response.json().catch(() => ({})) as { error?: string; message?: string; count?: number | null; excluded?: number } };
  }
  async function review() {
    if (lock.current) return; lock.current = true; setBusy(true); setMessage(''); setConfirmed(false);
    try { const { response, data } = await call({ mode: 'preview' }); if (!response.ok) setMessage(data.error ?? 'No pudimos calcular los destinatarios.'); else setPreview({ count: data.count ?? null, excluded: data.excluded ?? 0 }); }
    catch { setMessage('No pudimos calcular los destinatarios.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function send() {
    if (lock.current || !preview?.count) return; lock.current = true; setBusy(true); setMessage('');
    try {
      const { response, data } = await call({ mode: 'send', subject, body, confirm: true, expectedCount: preview.count });
      setMessage(data.error ?? data.message ?? 'Correo enviado.');
      if (response.ok) { setSubject(''); setBody(''); setPreview(null); setConfirmed(false); onSent?.(); }
      else if (response.status === 409) setPreview(null);
    } catch { setMessage('No pudimos confirmar el envío. Revisa los correos enviados antes de intentarlo de nuevo.'); }
    finally { lock.current = false; setBusy(false); }
  }
  const tooMany = preview && (preview.count === null || preview.count > peopleEmailLimit);
  return <form className="people-compose" onSubmit={event => { event.preventDefault(); void (preview ? send() : review()); }}>
    {!configured && <p className="people-warning">El envío de correos no está configurado. Puedes preparar el mensaje, pero no se enviará.</p>}
    <label>Asunto<input value={subject} onChange={event => { setSubject(event.target.value); }} required minLength={3} maxLength={150} /></label>
    <label>Mensaje en texto simple<textarea value={body} onChange={event => setBody(event.target.value)} required maxLength={8000} rows={6} /></label>
    {preview && <div className="people-preview" role="status">
      {preview.count === null ? <p>La lista es demasiado grande. Usa más filtros.</p> : <p><strong>{preview.count}</strong> {preview.count === 1 ? 'destinatario' : 'destinatarios'} con correo confirmado.{preview.excluded ? ` ${preview.excluded} sin confirmar quedan fuera.` : ''}</p>}
      {tooMany ? <p>Máximo {peopleEmailLimit} por envío. Usa más filtros.</p> : preview.count ? <label className="people-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />Confirmo el envío a {preview.count} {preview.count === 1 ? 'persona' : 'personas'}.</label> : null}
    </div>}
    <div className="people-inline-actions">
      {preview ? <><button className="button button-primary" disabled={busy || !confirmed || Boolean(tooMany) || !preview.count || !configured}>{busy ? 'Enviando…' : 'Enviar'}</button><button type="button" className="text-link" disabled={busy} onClick={() => { setPreview(null); setConfirmed(false); }}>Cambiar mensaje</button></>
        : <button className="button button-secondary" disabled={busy}>{busy ? 'Calculando…' : 'Revisar destinatarios'}</button>}
    </div>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
