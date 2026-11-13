import { adminWriteGuard } from '@/lib/admin-write-guard';
import { membershipJson } from '@/lib/membership';
import { allPeople, auditedFilters, panelEmailConfigured } from '@/lib/people';
import { openPeopleRequest, peopleError } from '@/lib/people-route';
import { emptyPeopleFilters, parsePeopleFilters, peopleEmailLimit } from '@/lib/people-shared';
import { consumeRateLimit } from '@/lib/rate-limit';
import { getRuntimeEnv } from '@/lib/runtime-env';
import { cleanEmail, cleanText } from '@/lib/security';

/**
 * Plain-text message to one person or to the filtered group (up to 100 confirmed addresses).
 * Rows are written as pending first and only marked sent after Resend accepts the batch.
 */
export async function POST(request: Request) {
  const opened = await openPeopleRequest(request, 24_000, 'people-email', 60);
  if ('response' in opened) return opened.response;
  const { actor, body } = opened;
  try {
    const accountId = typeof body.accountId === 'string' ? cleanText(body.accountId, 80) : '';
    const filters = accountId ? emptyPeopleFilters : parsePeopleFilters(body.filters && typeof body.filters === 'object' ? body.filters as Record<string, unknown> : {});
    const rows = await allPeople(filters, 2001, accountId || undefined);
    if (accountId && !rows.length) return peopleError('No encontramos esa persona.', 404);
    // Only active accounts with a confirmed address that accepted the notice announcing these messages.
    const recipients = rows.filter(row => row.emailConfirmed && row.hasPassword && !row.disabledAt && row.panelNotice && cleanEmail(row.email));
    const excluded = rows.length - recipients.length, configured = panelEmailConfigured();
    // The confirmed preview names an exact group: the same people, not only the same number.
    const group = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(recipients.map(row => row.id).sort().join(','))))).map(byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
    if (body.mode === 'preview') return membershipJson({ count: rows.length > 2000 ? null : recipients.length, excluded, limit: peopleEmailLimit, configured, group });
    if (body.mode !== 'send') return peopleError('Esta acción no está disponible.', 404);

    const subject = cleanText(body.subject, 150).replace(/\s+/g, ' ').trim(), text = typeof body.body === 'string' && body.body.length <= 8000 ? cleanText(body.body, 8000) : '';
    if (subject.length < 3) return peopleError('Escribe un asunto de 3 a 150 caracteres.');
    if (!text) return peopleError('Escribe el mensaje, de hasta 8000 caracteres.');
    if (!configured) return peopleError('El envío de correos no está configurado: falta la clave de Resend o el remitente. No se envió nada.', 503);
    if (!recipients.length) return peopleError('No hay destinatarios: hacen falta cuentas activas, con correo confirmado y con una solicitud enviada desde el 13 de noviembre de 2026.');
    if (rows.length > 2000 || recipients.length > peopleEmailLimit) return peopleError(`Puedes enviar hasta ${peopleEmailLimit} correos a la vez. Usa más filtros.`);
    if (body.confirm !== true || Number(body.expectedCount) !== recipients.length || body.expectedGroup !== group) return peopleError(`El grupo cambió desde la vista previa: ahora son ${recipients.length} destinatarios. Revísalo antes de enviar.`, 409);
    if (!await consumeRateLimit('people-email-send', actor.accountId, 10, 60 * 60_000)) return peopleError('Se alcanzó el límite de envíos por hora. Espera antes de enviar otro.', 429);

    const env = getRuntimeEnv(), db = env.DB!, guard = adminWriteGuard(actor, ['admin']), now = Date.now(), batchId = crypto.randomUUID(), auditId = crypto.randomUUID();
    const queued = recipients.map(row => ({ id: crypto.randomUUID(), row }));
    const [audit] = await db.batch([
      db.prepare(`INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'people.email',?,?,?,? WHERE ${guard.sql}`)
        .bind(auditId, actor.email, accountId ? 'person' : 'people', accountId || batchId, JSON.stringify({ batchId, recipients: recipients.length, ...(accountId ? {} : { filters: auditedFilters(filters) }) }), now, ...guard.values),
      ...queued.map(item => db.prepare("INSERT INTO outbound_emails(id,batch_id,account_id,subject,status,sent_by,created_at) SELECT ?,?,?,?,'pending',?,? WHERE EXISTS (SELECT 1 FROM audit_logs WHERE id=?) AND EXISTS (SELECT 1 FROM staff_accounts WHERE id=?)").bind(item.id, batchId, item.row.id, subject, actor.email, now, auditId, item.row.id)),
    ]);
    if (!audit.meta.changes) return peopleError('Tu acceso cambió. Vuelve a entrar.', 403);

    let providerIds: Array<string | null> = [], answered = false;
    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST', signal: AbortSignal.timeout(15_000),
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `apj-panel-${batchId}` },
        body: JSON.stringify(queued.map(item => ({ from: cleanEmail(env.REGISTRATION_EMAIL_FROM), to: [item.row.email], subject, text }))),
      });
      answered = true;
      if (!response.ok) throw new Error('delivery');
      const result = await response.json().catch(() => ({})) as { data?: Array<{ id?: unknown }> };
      providerIds = queued.map((_, index) => typeof result.data?.[index]?.id === 'string' ? String(result.data[index].id).slice(0, 200) : null);
    } catch {
      // Without an answer (timeout, lost connection) Resend may have sent the batch: say so instead of «not sent».
      await db.prepare(`UPDATE outbound_emails SET status=? WHERE batch_id=? AND status='pending'`).bind(answered ? 'failed' : 'unknown', batchId).run().catch(() => undefined);
      return answered
        ? peopleError('Resend no aceptó el envío. Quedó registrado como fallido; no se envió ningún correo.', 502)
        : peopleError('Resend no respondió a tiempo. Puede que los correos sí hayan salido: revisa los registros de Resend antes de volver a enviar.', 504);
    }
    try {
      await db.batch(queued.map((item, index) => db.prepare("UPDATE outbound_emails SET status='sent',provider_id=? WHERE id=? AND status='pending'").bind(providerIds[index], item.id)));
    } catch { return membershipJson({ message: `${recipients.length === 1 ? 'Correo enviado' : `${recipients.length} correos enviados`}, pero no pudimos marcarlos como enviados en la ficha.`, sent: recipients.length, excluded }); }
    return membershipJson({ message: recipients.length === 1 ? 'Correo enviado.' : `${recipients.length} correos enviados.`, sent: recipients.length, excluded });
  } catch { return peopleError('No pudimos completar el envío. Revisa la ficha antes de intentarlo de nuevo.', 503); }
}
