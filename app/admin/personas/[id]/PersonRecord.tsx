"use client";
import Link from 'next/link';
import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminFetch } from '../../AdminSessionBoundary';
import VersionedForm from '../../VersionedForm';
import ApplicationProfileView from '@/app/ApplicationProfileView';
import { AffiliationReview, Documents } from '@/app/mi-comision/Workspace';
import { EmailComposer } from '../PeopleTools';
import { commissions, commissionName } from '@/lib/commissions';
import { readMembershipProfile } from '@/lib/membership-profile';
import { canChangeMembershipStatus, membershipStatuses, type MembershipStatus } from '@/lib/membership-shared';
import { affiliationLabels, personActionLabels } from '@/lib/people-shared';
import { docCategories } from '@/lib/workspace-shared';
import type { personRecord } from '@/lib/people';

type PersonData = NonNullable<Awaited<ReturnType<typeof personRecord>>>;
const day = (n: number) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(n);
const moment = (n: number) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(n);
const tone = (status: string | null | undefined) => status === 'accepted' || status === 'confirmed' || status === 'sent' ? 'ok' : status === 'submitted' || status === 'in_review' || status === 'reported' || status === 'pending' ? 'wait' : status === 'changes' || status === 'failed' ? 'warn' : 'off';
const documentStates: { [key: string]: string } = { missing: 'Falta', received: 'Por revisar', checked: 'Revisado', changes: 'Pide corrección' };
const emailStates: { [key: string]: string } = { sent: 'Enviado', failed: 'Falló', pending: 'Pendiente', unknown: 'Sin respuesta de Resend' };

function Panel({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return <section className="people-panel" id={id} aria-labelledby={`${id}-title`}><div className="people-panel-head"><h2 id={`${id}-title`}>{title}</h2>{aside}</div>{children}</section>;
}
const Chip = ({ t, children }: { t: string; children: ReactNode }) => <span className="people-chip" data-tone={t}>{children}</span>;

export default function PersonRecord({ record, actorId, control, editable, emailConfigured, confirmationConfigured, knownTags }: { record: PersonData; actorId: string; control: string; editable: boolean; emailConfigured: boolean; confirmationConfigured: boolean; knownTags: string[] }) {
  const request = useAdminFetch(), router = useRouter(), lock = useRef(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [tick, setTick] = useState(0);
  const [confirmSuspend, setConfirmSuspend] = useState(false), [deleteText, setDeleteText] = useState(''), [note, setNote] = useState(''), [tag, setTag] = useState('');
  const { account, application, members, affiliation, impact } = record;
  const profile = readMembershipProfile(application?.profileJson);
  const enlacesSelectedAt = (() => { try { const value = JSON.parse(application?.profileJson ?? '{}').enlacesSelectedAt; return typeof value === 'number' ? value : null; } catch { return null; } })();
  const personPath = `/api/admin/personas/${account.id}`;
  const confirmWord = account.username ?? account.email;
  const activeApplication = application && ['submitted', 'in_review', 'accepted'].includes(application.status) ? application : null;

  async function act(path: string, body: unknown, method = 'POST') {
    if (lock.current) return false; lock.current = true; setBusy(true); setMessage('');
    try {
      const response = await request(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({})) as { error?: string; message?: string; redirect?: string };
      setMessage(data.error ?? data.message ?? 'Guardado.');
      if (response.ok && data.redirect) { router.push(data.redirect); return true; }
      if (response.ok || response.status === 409) { router.refresh(); setTick(value => value + 1); }
      return response.ok;
    } catch { setMessage('No pudimos completar la acción. Revisa tu conexión.'); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  const person = (action: string, extra: { [key: string]: unknown } = {}) => act(personPath, { action, ...extra });

  return <div className="people-page people-record admin-section">
    <div className="people-hero">
      <div>
        <p className="admin-label">Ficha de persona</p>
        <h1>{account.name}</h1>
        <p className="people-identity">{account.username ? `@${account.username}` : 'Sin usuario'} · <span>{account.email}</span></p>
      </div>
      <div className="people-chips">
        {account.disabledAt ? <Chip t="warn">Suspendida</Chip> : <Chip t="ok">Activa</Chip>}
        {account.emailVerificationRequired ? account.emailVerifiedAt ? <Chip t="ok">Correo confirmado</Chip> : <Chip t="wait">Correo sin confirmar</Chip> : null}
        {account.role && <Chip t="off">Permiso: {account.role}</Chip>}
        {record.tags.map(item => <span className="people-tag" key={item}>{item}</span>)}
      </div>
      <nav className="people-jump" aria-label="Apartados de la ficha">{[['solicitud', 'Solicitud'], ['documentos', 'Documentos'], ['comision', 'Comisión'], ['afiliacion', 'Afiliación'], ['notas', 'Notas'], ['correos', 'Correos'], ['historial', 'Historial'], ['cuenta', 'Cuenta']].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
    </div>
    <p className="people-feedback" role="status" aria-live="polite">{message}</p>

    <div className="people-grid">
      <div className="people-main">
        <Panel id="solicitud" title="Solicitud" aside={application && <Chip t={tone(application.status)}>{membershipStatuses[application.status] ?? application.status}</Chip>}>
          {!application ? <p className="people-empty">Sin solicitud vigente.</p> : <>
            <dl className="people-facts"><div><dt>Comisión</dt><dd>{commissionName(application.commission)}</dd></div><div><dt>Folio</dt><dd>{application.referenceCode}</dd></div><div><dt>Recibida</dt><dd>{day(application.createdAt)}</dd></div><div><dt>Se conserva hasta</dt><dd>{day(application.retentionUntil)}</dd></div></dl>
            <details className="people-more"><summary>Perfil{profile?.enlaces ? ' · Enlaces APJ' : ''}</summary><ApplicationProfileView json={application.profileJson} />{application.note && <p className="request-message">{application.note}</p>}</details>
            {profile?.enlaces && (enlacesSelectedAt
              ? <p className="people-note">Seleccionado como Enlace APJ el {day(enlacesSelectedAt)}. Su solicitud, documentos y cartas se conservan hasta el {day(application.retentionUntil)}.</p>
              : activeApplication && <div className="people-inline-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => { if (window.confirm('¿Marcar a esta persona como Enlace APJ seleccionado? Su solicitud, documentos y cartas se conservarán 13 meses y se le avisará en su seguimiento.')) void person('enlaces.select', { expectedUpdatedAt: account.updatedAt, expectedApplicationUpdatedAt: application.updatedAt }); }}>Seleccionado como Enlace APJ</button></div>)}
            {!['closed', 'withdrawn'].includes(application.status) && <details className="people-more"><summary>Cambiar estado o responder</summary>
              <VersionedForm className="people-form" record={application} onSubmit={async (event, snapshot) => {
                const values = Object.fromEntries(new FormData(event.currentTarget));
                return act(`/api/admin/incorporaciones/${snapshot.id}`, values, 'PATCH');
              }}>{snapshot => <>
                <label>Estado<select name="status" defaultValue={snapshot.status}>{(Object.keys(membershipStatuses) as MembershipStatus[]).filter(status => status === snapshot.status || canChangeMembershipStatus(snapshot.status, status)).map(status => <option key={status} value={status}>{membershipStatuses[status]}</option>)}</select></label>
                <label>Respuesta visible para la persona<textarea name="response" maxLength={1500} rows={3} /></label>
                <label>Nota interna de la solicitud<textarea name="note" maxLength={1500} rows={2} /></label>
                <button className="button button-primary" disabled={busy}>Guardar seguimiento</button>
              </>}</VersionedForm></details>}
            {record.history.length > 0 && <details className="people-more"><summary>Historial de la solicitud ({record.history.length})</summary><ol className="membership-timeline">{record.history.map(event => <li key={event.id}><time>{moment(event.createdAt)}</time><span>{event.kind === 'note' ? 'Nota interna' : event.kind === 'response' ? 'Respuesta visible' : event.actorType === 'admin' ? 'Administración' : 'Solicitante'}</span><p>{event.body}</p></li>)}</ol></details>}
          </>}
        </Panel>

        <Panel id="documentos" title="Documentos personales" aside={<Chip t={record.documents === 3 ? 'ok' : record.documents ? 'wait' : 'off'}>{`${record.documents} de 3 revisados`}</Chip>}>
          <ul className="people-checklist">{record.identity.map(item => <li key={item.category}><span>{docCategories[item.category]}</span><Chip t={item.status === 'checked' ? 'ok' : item.status === 'missing' ? 'off' : item.status === 'changes' ? 'warn' : 'wait'}>{documentStates[item.status] ?? item.status}</Chip></li>)}</ul>
          <details className="people-more"><summary>Revisar o retirar archivos</summary><div className="workspace people-embedded"><Documents admin categoryOnly="identity" ownerId={actorId} accountFilter={account.id} act={act} tick={tick} /></div></details>
          {profile?.enlaces && <details className="people-more"><summary>Cartas de Enlaces APJ</summary><div className="workspace people-embedded"><Documents admin categoryOnly="enlaces" ownerId={actorId} accountFilter={account.id} act={act} tick={tick} /></div></details>}
        </Panel>

        <Panel id="comision" title="Comisión">
          {members.length === 0 ? <p className="people-empty">Sin acceso a ninguna comisión.</p> : <ul className="people-rows">{members.map(member => <li key={member.id}>
            <span><strong>{commissionName(member.commission)}</strong><small>{member.role === 'coordinator' ? 'Coordinación' : 'Integrante'}</small></span>
            <Chip t={member.active ? 'ok' : 'off'}>{member.active ? 'Con acceso' : 'Acceso retirado'}</Chip>
            <button type="button" className="text-link" disabled={busy} onClick={() => void act('/api/espacio', { action: 'team', email: account.email, commission: member.commission, role: member.role, active: !member.active, expectedUpdatedAt: member.updatedAt })}>{member.active ? 'Retirar acceso' : 'Restablecer acceso'}</button>
          </li>)}</ul>}
          {application?.status === 'accepted' && !members.some(member => member.commission === application.commission && member.active) && <div className="people-callout">
            <p>{record.documents === 3 ? `Solicitud aceptada y documentos revisados. Ya puedes habilitarla en ${commissionName(application.commission)}.` : 'Solicitud aceptada. Para habilitarla, primero revisa los tres documentos personales.'}</p>
            <button type="button" className="button button-primary" disabled={busy || record.documents < 3} onClick={() => void act('/api/espacio', { action: 'team', email: account.email, commission: application.commission, role: 'member', active: true })}>Habilitar en {commissionName(application.commission)}</button>
          </div>}
        </Panel>

        <Panel id="afiliacion" title="Afiliación PAN" aside={<Chip t={tone(affiliation?.status)}>{affiliation ? affiliationLabels[affiliation.status as keyof typeof affiliationLabels] ?? affiliation.status : affiliationLabels.none}</Chip>}>
          {!affiliation ? <p className="people-empty">Sin trámite reportado. Este paso se abre cuando la persona tiene su comisión habilitada.</p> : <>
            <dl className="people-facts"><div><dt>Folio</dt><dd>{affiliation.folio || 'Sin folio'}</dd></div><div><dt>Documentos</dt><dd>{affiliation.document_count}</dd></div>{affiliation.verified_at && <div><dt>Comprobada</dt><dd>{day(affiliation.verified_at)}</dd></div>}<div><dt>Se conserva hasta</dt><dd>{day(affiliation.retention_until)}</dd></div></dl>
            {affiliation.note && <p className="workspace-review-response">{affiliation.note}</p>}
            <details className="people-more"><summary>Revisar comprobantes</summary><div className="workspace people-embedded"><Documents admin categoryOnly="affiliation" ownerId={actorId} accountFilter={account.id} act={act} tick={tick} /><AffiliationReview actorId={actorId} affiliation={affiliation} act={act} busy={busy} tick={tick} /></div></details>
          </>}
        </Panel>

        <Panel id="historial" title="Historial">
          {record.audit.length === 0 ? <p className="people-empty">Sin movimientos registrados.</p> : <ol className="people-log">{record.audit.map(row => <li key={row.id}><time>{moment(row.createdAt)}</time><span>{personActionLabels[row.action] ?? row.action}</span><small>{row.actorEmail === account.email ? 'La persona' : row.actorEmail}</small></li>)}</ol>}
        </Panel>
      </div>

      <aside className="people-side">
        <Panel id="etiquetas" title="Etiquetas">
          <ul className="people-tag-list">{record.tags.map(item => <li key={item}><span>{item}</span><button type="button" aria-label={`Quitar ${item}`} disabled={busy} onClick={() => void person('tag.remove', { tag: item })}>×</button></li>)}</ul>
          <form className="people-inline-form" onSubmit={async event => { event.preventDefault(); if (await person('tag.add', { tag })) setTag(''); }}>
            <label className="sr-only" htmlFor="person-tag">Nueva etiqueta</label>
            <input id="person-tag" value={tag} onChange={event => setTag(event.target.value)} list="known-tags" maxLength={30} required placeholder="Nueva etiqueta" />
            <datalist id="known-tags">{knownTags.filter(item => !record.tags.includes(item)).map(item => <option key={item} value={item} />)}</datalist>
            <button className="button button-secondary" disabled={busy}>Agregar</button>
          </form>
        </Panel>

        <Panel id="notas" title="Notas internas">
          <form className="people-form" onSubmit={async event => { event.preventDefault(); if (await person('note.add', { body: note })) setNote(''); }}>
            <label className="sr-only" htmlFor="person-note">Nueva nota</label>
            <textarea id="person-note" value={note} onChange={event => setNote(event.target.value)} maxLength={2000} rows={3} required placeholder="Solo la ve administración." />
            <button className="button button-secondary" disabled={busy}>Guardar nota</button>
          </form>
          <ul className="people-notes">{record.notes.map(item => <li key={item.id}><p>{item.body}</p><small>{moment(item.createdAt)} · {item.authorEmail}</small><button type="button" className="text-link" disabled={busy} onClick={() => { if (window.confirm('¿Borrar esta nota?')) void person('note.delete', { noteId: item.id }); }}>Borrar</button></li>)}</ul>
        </Panel>

        <Panel id="correos" title="Correos">
          <details className="people-more"><summary>Escribir a esta persona</summary><EmailComposer accountId={account.id} configured={emailConfigured} onSent={() => router.refresh()} /></details>
          {record.emails.length === 0 ? <p className="people-empty">Sin correos enviados desde el panel.</p> : <ul className="people-rows">{record.emails.map(item => <li key={item.id}><span><strong>{item.subject}</strong><small>{moment(item.createdAt)} · {item.sentBy}</small></span><Chip t={tone(item.status)}>{emailStates[item.status] ?? item.status}</Chip></li>)}</ul>}
        </Panel>

        <Panel id="cuenta" title="Cuenta">
          <dl className="people-facts"><div><dt>Alta</dt><dd>{day(account.createdAt)}</dd></div><div><dt>Correo</dt><dd>{account.emailVerificationRequired ? account.emailVerifiedAt ? `Confirmado el ${day(account.emailVerifiedAt)}` : 'Sin confirmar' : 'No requiere confirmación'}</dd></div>{account.disabledAt && <div><dt>Suspendida</dt><dd>{day(account.disabledAt)}</dd></div>}{!account.hasPassword && <div><dt>Contraseña</dt><dd>Sin contraseña</dd></div>}</dl>
          {Boolean(account.emailVerificationRequired && !account.emailVerifiedAt && !account.disabledAt) && <div className="people-inline-actions"><button type="button" className="button button-secondary" disabled={busy || !confirmationConfigured} onClick={() => void person('resend-confirmation', { expectedUpdatedAt: account.updatedAt })}>Reenviar correo de confirmación</button>{!confirmationConfigured && <small>El envío de correos no está configurado.</small>}</div>}
          <details className="people-more"><summary>Cambiar datos</summary>
            <form key={account.updatedAt} className="people-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void person('update', { name: form.get('name'), username: form.get('username') ?? undefined, commission: form.get('commission') ?? '', expectedUpdatedAt: account.updatedAt, expectedApplicationUpdatedAt: activeApplication?.updatedAt }); }}>
              <label>Nombre<input name="name" defaultValue={account.name} minLength={2} maxLength={120} required /></label>
              <label>Usuario<input name="username" defaultValue={account.username ?? ''} maxLength={40} pattern="[a-z0-9][a-z0-9._\-]{2,39}" required={Boolean(account.username)} /></label>
              {activeApplication && <label>Comisión de la solicitud<select name="commission" defaultValue={activeApplication.commission}>{commissions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select><small>Queda en el historial de la solicitud. El acceso al equipo se habilita aparte.</small></label>}
              <button className="button button-secondary" disabled={busy || !editable}>Guardar datos</button>
            </form>
          </details>
          {control ? <p className="people-warning">{control}</p> : <>
            {account.disabledAt
              ? <button type="button" className="button button-secondary" disabled={busy} onClick={() => void person('reactivate', { expectedUpdatedAt: account.updatedAt })}>Reactivar cuenta</button>
              : confirmSuspend
                ? <div className="people-callout"><p>Se cerrarán sus sesiones y no podrá entrar hasta que la reactives.</p><div className="people-inline-actions"><button type="button" className="button button-primary" disabled={busy} onClick={async () => { if (await person('suspend', { expectedUpdatedAt: account.updatedAt })) setConfirmSuspend(false); }}>Sí, suspender</button><button type="button" className="text-link" onClick={() => setConfirmSuspend(false)}>Cancelar</button></div></div>
                : <button type="button" className="button button-secondary" disabled={busy} onClick={() => setConfirmSuspend(true)}>Suspender cuenta</button>}
            <details className="people-danger"><summary>Borrar cuenta y datos</summary>
              <p>Es definitivo. Úsalo para atender una solicitud de cancelación (ARCO). Se borran:</p>
              <ul><li>La cuenta, sus sesiones, notas, etiquetas y correos registrados.</li><li>{impact.applications} {impact.applications === 1 ? 'solicitud' : 'solicitudes'} con su historial.</li><li>{impact.documents} {impact.documents === 1 ? 'archivo' : 'archivos'}, incluidos INE, comprobantes y cartas.</li><li>{impact.items} {impact.items === 1 ? 'actividad registrada' : 'actividades registradas'} por la persona y {impact.messages} {impact.messages === 1 ? 'mensaje' : 'mensajes'}.</li><li>Su acceso a comisiones, afiliación, consentimientos, opiniones y mensajes de contacto.</li></ul>
              <p>El registro de auditoría conserva solo una referencia que no permite identificarla.</p>
              <label><span>Escribe <strong>{confirmWord}</strong> para confirmar</span><input value={deleteText} onChange={event => setDeleteText(event.target.value)} autoComplete="off" spellCheck={false} /></label>
              <button type="button" className="button people-danger-button" disabled={busy || deleteText !== confirmWord} onClick={() => { if (window.confirm(`¿Borrar definitivamente la cuenta de ${account.name}?`)) void person('delete', { confirm: deleteText, expectedUpdatedAt: account.updatedAt }); }}>Borrar definitivamente</button>
            </details>
          </>}
        </Panel>
        <p className="people-back"><Link className="text-link" href="/admin/personas">Volver a la lista</Link></p>
      </aside>
    </div>
  </div>;
}
