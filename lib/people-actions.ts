import { adminWriteGuard } from './admin-write-guard';
import { isConfiguredOwner } from './authz';
import { isCommission, commissionName } from './commissions';
import { membershipJson } from './membership';
import { normalizeTag } from './people-shared';
import { deletionImpact, panelNoticeSince, personAccount, type PersonAccount } from './people';
import { consumeRateLimit } from './rate-limit';
import { registrationServices, sendRegistrationConfirmation, RegistrationServiceError } from './registration-verification';
import { getRuntimeEnv } from './runtime-env';
import { cleanText } from './security';
import { cleanUsername, randomSecret, type StaffIdentity } from './staff-auth';

type Actor = StaffIdentity & { role: string };
type Input = Record<string, unknown>;
const reply = (data: unknown, status = 200) => membershipJson(data, { status });
const fail = (error: string, status = 400) => reply({ error }, status);
const marker = 'EXISTS (SELECT 1 FROM audit_logs WHERE id=?)';
const changed = 'La ficha cambió mientras trabajabas. Actualiza la página antes de continuar.';

/** The audit row is written first, under the live admin guard; every other statement depends on it. */
function auditFirst(actor: Actor, action: string, entityId: string, metadata: Record<string, unknown>, now: number, condition = '1=1', values: unknown[] = []) {
  const db = getRuntimeEnv().DB!, id = crypto.randomUUID(), guard = adminWriteGuard(actor, ['admin']);
  return { id, statement: db.prepare(`INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,?,'person',?,?,? WHERE ${guard.sql} AND ${condition}`).bind(id, actor.email, action, entityId, JSON.stringify(metadata), now, ...guard.values, ...values) };
}

/** Accounts with team permissions are managed only by the owner, as in Usuarios y contraseñas. */
function accountControl(actor: Actor, target: PersonAccount) {
  if (target.id === actor.accountId) return 'No puedes suspender ni borrar tu propia cuenta desde aquí.';
  if (target.role && !isConfiguredOwner(actor.email)) return 'Esta cuenta tiene permisos del panel. Solo la cuenta propietaria puede cambiarla.';
  return '';
}

export async function personAction(actor: Actor, id: string, input: Input) {
  const db = getRuntimeEnv().DB!;
  const target = await personAccount(id);
  if (!target) return fail('No encontramos esa persona.', 404);
  if (isConfiguredOwner(target.email)) return fail('La cuenta propietaria se administra desde su propio acceso.', 403);
  const now = Date.now(), action = String(input.action ?? '');
  const accountIs = (updatedAt: number, extra = '') => ({ sql: `EXISTS (SELECT 1 FROM staff_accounts WHERE id=? AND updated_at=?${extra})`, values: [id, updatedAt] });

  if (action === 'note.add') {
    if (typeof input.body !== 'string' || input.body.length > 2000) return fail('La nota admite hasta 2000 caracteres.');
    const body = cleanText(input.body, 2000);
    if (!body) return fail('Escribe la nota.');
    const noteId = crypto.randomUUID();
    const audit = auditFirst(actor, 'person.note.add', id, { noteId }, now, 'EXISTS (SELECT 1 FROM staff_accounts WHERE id=?)', [id]);
    const [result] = await db.batch([audit.statement, db.prepare(`INSERT INTO person_notes(id,account_id,body,author_email,created_at,updated_at) SELECT ?,?,?,?,?,? WHERE ${marker}`).bind(noteId, id, body, actor.email, now, now, audit.id)]);
    return result.meta.changes ? reply({ message: 'Nota guardada.' }) : fail('Tu acceso cambió. Vuelve a entrar.', 409);
  }
  if (action === 'note.delete') {
    const noteId = cleanText(input.noteId, 80);
    const audit = auditFirst(actor, 'person.note.delete', id, { noteId }, now, 'EXISTS (SELECT 1 FROM person_notes WHERE id=? AND account_id=?)', [noteId, id]);
    const [result] = await db.batch([audit.statement, db.prepare(`DELETE FROM person_notes WHERE id=? AND account_id=? AND ${marker}`).bind(noteId, id, audit.id)]);
    return result.meta.changes ? reply({ message: 'Nota borrada.' }) : fail('Esa nota ya no existe.', 409);
  }
  if (action === 'tag.add') {
    const tag = normalizeTag(input.tag);
    if (!tag) return fail('La etiqueta debe tener de 1 a 30 letras, números, espacios o guiones.');
    if (!await db.prepare('SELECT 1 FROM membership_applications WHERE owner_email=? AND created_at>=?').bind(target.email, panelNoticeSince).first()) return fail('Solo puedes etiquetar a quien envió su solicitud desde el 13 de noviembre de 2026, con el aviso que informa de las etiquetas.', 409);
    // The audit trail records that a tag changed, not its free text.
    const audit = auditFirst(actor, 'person.tag.add', id, {}, now, 'EXISTS (SELECT 1 FROM staff_accounts WHERE id=?) AND NOT EXISTS (SELECT 1 FROM person_tags WHERE account_id=? AND tag=?) AND (SELECT count(*) FROM person_tags WHERE account_id=?)<20', [id, id, tag, id]);
    const [result] = await db.batch([audit.statement, db.prepare(`INSERT INTO person_tags(id,account_id,tag,created_at,created_by) SELECT ?,?,?,?,? WHERE ${marker}`).bind(crypto.randomUUID(), id, tag, now, actor.email, audit.id)]);
    return result.meta.changes ? reply({ message: 'Etiqueta agregada.' }) : fail('Esa etiqueta ya está o la persona ya tiene 20 etiquetas.', 409);
  }
  if (action === 'tag.remove') {
    const tag = normalizeTag(input.tag);
    const audit = auditFirst(actor, 'person.tag.remove', id, {}, now, 'EXISTS (SELECT 1 FROM person_tags WHERE account_id=? AND tag=?)', [id, tag]);
    const [result] = await db.batch([audit.statement, db.prepare(`DELETE FROM person_tags WHERE account_id=? AND tag=? AND ${marker}`).bind(id, tag, audit.id)]);
    return result.meta.changes ? reply({ message: 'Etiqueta quitada.' }) : fail('Esa etiqueta ya no está.', 409);
  }

  const expected = Number(input.expectedUpdatedAt);
  if (!Number.isSafeInteger(expected)) return fail(changed, 409);

  if (action === 'suspend' || action === 'reactivate') {
    const blocked = accountControl(actor, target);
    if (blocked) return fail(blocked, 403);
    const suspend = action === 'suspend', at = Math.max(now, target.updatedAt + 1);
    const live = accountIs(expected, suspend ? ' AND disabled_at IS NULL' : ' AND disabled_at IS NOT NULL');
    const audit = auditFirst(actor, suspend ? 'person.suspend' : 'person.reactivate', id, {}, at, live.sql, live.values);
    const statements = [audit.statement,
      suspend
        ? db.prepare(`UPDATE staff_accounts SET disabled_at=?,credential_version=credential_version+1,updated_at=? WHERE id=? AND ${marker}`).bind(at, at, id, audit.id)
        : db.prepare(`UPDATE staff_accounts SET disabled_at=NULL,updated_at=? WHERE id=? AND ${marker}`).bind(at, id, audit.id)];
    if (suspend) statements.push(db.prepare(`DELETE FROM staff_sessions WHERE account_id=? AND ${marker}`).bind(id, audit.id));
    const [result] = await db.batch(statements);
    if (!result.meta.changes) return fail(changed, 409);
    return reply({ message: suspend ? 'Cuenta suspendida. Sus sesiones se cerraron y no podrá entrar.' : target.hasPassword ? 'Cuenta reactivada. Ya puede entrar con su usuario y contraseña.' : 'Cuenta reactivada. Aún no tiene contraseña; restablécela en Usuarios y contraseñas.' });
  }

  if (action === 'resend-confirmation') {
    if (target.disabledAt) return fail('La cuenta está suspendida. Reactívala antes de reenviar el correo.', 409);
    if (!target.emailVerificationRequired || target.emailVerifiedAt) return fail('Esta cuenta ya no necesita confirmar su correo.', 409);
    if (!registrationServices().emailReady) return fail('El envío de correos no está configurado. No se envió nada.', 503);
    if (!await consumeRateLimit('people-resend', id, 3, 60 * 60_000)) return fail('Ya se reenvió varias veces. Espera una hora.', 429);
    // The request is recorded under the live admin guard before anything leaves.
    const audit = auditFirst(actor, 'person.confirmation_resent', id, {}, now);
    const [recorded] = await db.batch([audit.statement]);
    if (!recorded.meta.changes) return fail('Tu acceso cambió. Vuelve a entrar.', 403);
    try { await sendRegistrationConfirmation(id, '/participacion#registro'); }
    catch (error) {
      if (!(error instanceof RegistrationServiceError)) throw error;
      await db.prepare("UPDATE audit_logs SET action='person.confirmation_failed' WHERE id=?").bind(audit.id).run();
      return fail('No pudimos enviar el correo. Inténtalo más tarde.', 502);
    }
    return reply({ message: 'Correo de confirmación enviado.' });
  }

  if (action === 'update') {
    if (target.role && !isConfiguredOwner(actor.email) && target.id !== actor.accountId) return fail('Esta cuenta tiene permisos del panel. Solo la cuenta propietaria puede cambiarla.', 403);
    const name = typeof input.name === 'string' ? cleanText(input.name, 120) : target.name;
    if (typeof input.name === 'string' && (input.name.length > 120 || name.length < 2)) return fail('El nombre debe tener de 2 a 120 caracteres.');
    let username = target.username;
    if (typeof input.username === 'string' && input.username.trim().toLowerCase() !== (target.username ?? '')) {
      username = cleanUsername(input.username);
      if (!username) return fail('El usuario debe tener de 3 a 40 letras, números, puntos, guiones o guiones bajos.');
    }
    if (username && username !== target.username && await db.prepare('SELECT 1 FROM staff_accounts WHERE username=? AND id<>?').bind(username, id).first()) return fail('Ese usuario no está disponible. Elige otro.', 409);
    const commission = typeof input.commission === 'string' && input.commission ? input.commission : '';
    if (commission && !isCommission(commission)) return fail('Elige una comisión válida.');
    const application = commission ? await db.prepare("SELECT id,commission,updated_at AS updatedAt FROM membership_applications WHERE owner_email=? AND status IN ('submitted','in_review','accepted') AND retention_until>? ORDER BY created_at DESC LIMIT 1").bind(target.email, now).first<{ id: string; commission: string; updatedAt: number }>() : null;
    if (commission && !application) return fail('No tiene una solicitud vigente. La comisión se cambia en la solicitud.', 409);
    const fields = [...(name !== target.name ? ['name'] : []), ...(username !== target.username ? ['username'] : []), ...(application && application.commission !== commission ? ['commission'] : [])];
    if (!fields.length) return fail('No hay cambios que guardar.');
    if (application && fields.includes('commission') && Number(input.expectedApplicationUpdatedAt) !== application.updatedAt) return fail(changed, 409);
    const at = Math.max(now, target.updatedAt + 1, (application?.updatedAt ?? 0) + 1), live = accountIs(expected);
    // Every version is checked before the audit row exists, so no later statement can be a no-op.
    const applicationLive = application && fields.includes('commission') ? { sql: ' AND EXISTS (SELECT 1 FROM membership_applications WHERE id=? AND updated_at=? AND retention_until>?)', values: [application.id, application.updatedAt, now] } : { sql: '', values: [] };
    const audit = auditFirst(actor, 'person.update', id, { fields }, at, live.sql + applicationLive.sql, [...live.values, ...applicationLive.values]);
    const statements = [audit.statement];
    if (fields.includes('name') || fields.includes('username')) statements.push(db.prepare(`UPDATE staff_accounts SET name=?,username=?,updated_at=? WHERE id=? AND ${marker}`).bind(name, username, at, id, audit.id));
    if (application && fields.includes('commission')) {
      statements.push(db.prepare(`UPDATE membership_applications SET commission=?,updated_at=? WHERE id=? AND updated_at=? AND ${marker}`).bind(commission, at, application.id, application.updatedAt, audit.id));
      statements.push(db.prepare("INSERT INTO membership_events(id,application_id,kind,body,actor_type,actor_email,created_at) SELECT ?,?,'updated',?,'admin',?,? WHERE changes()>0").bind(crypto.randomUUID(), application.id, `Administración cambió la comisión a ${commissionName(commission)}.`, actor.email, at));
    }
    try {
      const results = await db.batch(statements);
      if (!results[0].meta.changes) return fail(changed, 409);
    } catch { return fail('Ese usuario no está disponible o la ficha cambió. Actualiza la página.', 409); }
    return reply({ message: 'Datos guardados.' });
  }

  if (action === 'delete') return deletePerson(actor, target, input, expected);
  return fail('Esta acción no está disponible.', 404);
}

/**
 * ARCO cancellation. 1) suspend and close sessions so nothing new arrives; 2) delete the stored files;
 * 3) one guarded batch removes every row and replaces references in other records with a reference
 * that cannot be traced back. A storage failure stops before step 3 and is reported.
 */
async function deletePerson(actor: Actor, target: PersonAccount, input: Input, expected: number) {
  const env = getRuntimeEnv(), db = env.DB!, id = target.id, email = target.email;
  const blocked = accountControl(actor, target);
  if (blocked) return fail(blocked, 403);
  if (typeof input.confirm !== 'string' || input.confirm !== (target.username ?? target.email)) return fail(`Para borrar, escribe exactamente ${target.username ? 'el usuario' : 'el correo'} de la cuenta.`);
  const suspendedAt = Math.max(Date.now(), target.updatedAt + 1), guard = adminWriteGuard(actor, ['admin']);
  const [suspended] = await db.batch([
    db.prepare(`UPDATE staff_accounts SET disabled_at=COALESCE(disabled_at,?),credential_version=credential_version+1,updated_at=? WHERE id=? AND updated_at=? AND ${guard.sql}`).bind(suspendedAt, suspendedAt, id, expected, ...guard.values),
    db.prepare('DELETE FROM staff_sessions WHERE account_id=? AND EXISTS (SELECT 1 FROM staff_accounts WHERE id=? AND updated_at=?)').bind(id, id, suspendedAt),
  ]);
  if (!suspended.meta.changes) return fail(changed, 409);

  const owned = 'SELECT id FROM commission_items WHERE owner_id=?';
  const files = (await db.prepare(`SELECT id,object_key AS objectKey FROM commission_documents WHERE owner_id=? OR item_id IN (${owned}) ORDER BY id`).bind(id, id).all<{ id: string; objectKey: string }>()).results;
  if (files.length && !env.BUCKET) return fail('La cuenta quedó suspendida, pero no hay conexión con el archivo. No se borraron sus datos; vuelve a intentarlo.', 503);
  let failed = 0;
  for (const file of files) { try { await env.BUCKET!.delete(file.objectKey); } catch { failed++; } }
  if (failed) return fail(`La cuenta quedó suspendida, pero no pudimos borrar ${failed} de ${files.length} archivos. No se borraron sus datos; vuelve a intentarlo.`, 502);

  const impact = await deletionImpact(id, email), now = Date.now();
  const reference = 'persona-eliminada-' + randomSecret().slice(0, 16);
  const fileList = files.map(file => file.id).join(',');
  const audit = auditFirst(actor, 'person.delete', reference, { documents: impact.documents, items: impact.items, applications: impact.applications, messages: impact.messages }, now,
    `EXISTS (SELECT 1 FROM staff_accounts WHERE id=? AND updated_at=?) AND COALESCE((SELECT group_concat(id,',') FROM (SELECT id FROM commission_documents WHERE owner_id=? OR item_id IN (${owned}) ORDER BY id)),'')=?`,
    [id, suspendedAt, id, id, fileList]);
  const then = (query: string, ...values: unknown[]) => db.prepare(`${query} AND ${marker}`).bind(...values, audit.id);
  const statements = [audit.statement,
    // References kept in other records lose the link to this person.
    then('UPDATE audit_logs SET actor_email=? WHERE actor_email=? AND id<>?', reference, email, audit.id),
    then(`UPDATE audit_logs SET entity_id=? WHERE id<>? AND (entity_id=? OR entity_id IN (SELECT id FROM membership_applications WHERE owner_email=?) OR entity_id IN (SELECT id FROM commission_documents WHERE owner_id=? OR item_id IN (${owned})) OR entity_id IN (${owned}))`, reference, audit.id, id, email, id, id, id),
    // Handover notes in activities that stay with other people name both people in their text.
    then("UPDATE commission_messages SET body=replace(body,?,'una persona cuya cuenta se eliminó') WHERE body LIKE 'Relevo de %' AND instr(body,?)>0", target.name, target.name),
    then('UPDATE commission_members SET updated_by=? WHERE updated_by=?', reference, id),
    then('UPDATE commission_documents SET reviewed_by=? WHERE reviewed_by=?', reference, id),
    then('UPDATE commission_affiliations SET reviewed_by=? WHERE reviewed_by=?', reference, id),
    then('UPDATE membership_events SET actor_email=? WHERE actor_email=?', reference, email),
    then('UPDATE user_roles SET created_by=CASE WHEN created_by=? THEN ? ELSE created_by END,updated_by=CASE WHEN updated_by=? THEN ? ELSE updated_by END,revoked_by=CASE WHEN revoked_by=? THEN ? ELSE revoked_by END WHERE (created_by=? OR updated_by=? OR revoked_by=?)', email, reference, email, reference, email, reference, email, email, email),
    then('UPDATE request_entries SET actor_email=? WHERE actor_email=?', reference, email),
    then('UPDATE contact_requests SET assigned_to=CASE WHEN assigned_to=? THEN NULL ELSE assigned_to END,handled_by=CASE WHEN handled_by=? THEN ? ELSE handled_by END WHERE (assigned_to=? OR handled_by=?)', email, email, reference, email, email),
    then('UPDATE comments SET moderated_by=? WHERE moderated_by=?', reference, email),
    then('UPDATE posts SET author_email=? WHERE author_email=?', reference, email),
    then('UPDATE media SET uploaded_by=? WHERE uploaded_by=?', reference, email),
    then('UPDATE site_settings SET updated_by=? WHERE updated_by=?', reference, email),
    then('UPDATE site_content SET updated_by=? WHERE updated_by=?', reference, email),
    then('UPDATE site_documents SET uploaded_by=? WHERE uploaded_by=?', reference, email),
    then('UPDATE person_notes SET author_email=? WHERE author_email=?', reference, email),
    then('UPDATE person_tags SET created_by=? WHERE created_by=?', reference, email),
    then('UPDATE outbound_emails SET sent_by=? WHERE sent_by=?', reference, email),
    // The person's own records. Foreign keys without cascade are removed explicitly, children first.
    then(`DELETE FROM commission_messages WHERE (author_id=? OR item_id IN (${owned}))`, id, id),
    then(`DELETE FROM commission_documents WHERE (owner_id=? OR item_id IN (${owned}))`, id, id),
    then('DELETE FROM commission_items WHERE owner_id=?', id),
    then('DELETE FROM commission_affiliations WHERE account_id=?', id),
    then('DELETE FROM commission_members WHERE account_id=?', id),
    then('DELETE FROM workspace_consents WHERE account_id=?', id),
    then('DELETE FROM membership_events WHERE application_id IN (SELECT id FROM membership_applications WHERE owner_email=?)', email),
    then('DELETE FROM membership_applications WHERE owner_email=?', email),
    then('DELETE FROM comments WHERE author_email=?', email),
    then('DELETE FROM request_entries WHERE request_id IN (SELECT id FROM contact_requests WHERE email=?)', email),
    then('DELETE FROM contact_requests WHERE email=?', email),
    then('DELETE FROM user_roles WHERE email=?', email),
    then('DELETE FROM staff_sessions WHERE account_id=?', id),
    then('DELETE FROM staff_email_verifications WHERE account_id=?', id),
    then('DELETE FROM person_notes WHERE account_id=?', id),
    then('DELETE FROM person_tags WHERE account_id=?', id),
    then('DELETE FROM outbound_emails WHERE account_id=?', id),
    then('DELETE FROM staff_accounts WHERE id=?', id),
  ];
  const results = await db.batch(statements);
  if (!results[0].meta.changes) return fail('La cuenta quedó suspendida y sus archivos se borraron, pero sus datos cambiaron durante el proceso. Actualiza la página y vuelve a borrar.', 409);
  return reply({ message: 'Cuenta y datos borrados.', redirect: '/admin/personas' });
}
