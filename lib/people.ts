import { getRuntimeEnv } from './runtime-env';
import { reviewedIdentityCount } from './onboarding-documents';
import { membershipColumns, membershipHistory } from './membership';
import { commissionName } from './commissions';
import { membershipStatuses, type MembershipApplication, type MembershipEvent } from './membership-shared';
import { affiliationLabels, type PeopleFilters } from './people-shared';
import { cleanEmail } from './security';

export type PersonRow = { id: string; name: string; username: string | null; email: string; createdAt: number; disabledAt: number | null; emailConfirmed: number; hasPassword: number; panelNotice: number; applicationId: string | null; applicationStatus: string | null; commission: string | null; documents: number; affiliation: keyof typeof affiliationLabels; tags: string[] };
type RawRow = Omit<PersonRow, 'tags'> & { tagsJson: string };

export const peoplePageSize = 25;

/** Owner accounts are administered from their own access and never appear in the CRM. */
export function ownerEmails() {
  const env = getRuntimeEnv();
  return [env.ADMIN_EMAILS, env.OWNER_ACCOUNT_EMAIL].filter(Boolean).join(',').split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
}

/**
 * The registration notice that announces panel e-mails, tags and exports was published on 13-nov-2026.
 * People whose only application is older accepted a notice that said the opposite, so they stay out.
 */
export const panelNoticeSince = Date.UTC(2026, 10, 13, 20, 45);

/** One query, reused by the list, the export and the e-mail recipients. Placeholders follow text order. */
function peopleQuery(filters: PeopleFilters, accountId?: string) {
  const now = Date.now(), owners = ownerEmails(), documents = reviewedIdentityCount('b.id', now);
  const values: unknown[] = [panelNoticeSince, now, ...owners];
  const base = `SELECT a.id,a.name,a.username,a.email,a.created_at AS createdAt,a.disabled_at AS disabledAt,
    CASE WHEN a.email_verified_at IS NOT NULL THEN 1 ELSE 0 END AS emailConfirmed,
    CASE WHEN a.password_hash IS NOT NULL THEN 1 ELSE 0 END AS hasPassword,
    EXISTS (SELECT 1 FROM membership_applications mp WHERE mp.owner_email=a.email AND mp.created_at>=?) AS panelNotice,
    (SELECT ma.id FROM membership_applications ma WHERE ma.owner_email=a.email AND ma.retention_until>? ORDER BY ma.created_at DESC,ma.id DESC LIMIT 1) AS applicationId
    FROM staff_accounts a${owners.length ? ` WHERE a.email NOT IN (${owners.map(() => '?').join(',')})` : ''}`;
  values.push(...documents.values, now, now);
  const people = `SELECT b.*,ma.status AS applicationStatus,
    COALESCE(ma.commission,(SELECT cm.commission FROM commission_members cm WHERE cm.account_id=b.id AND cm.active=1 ORDER BY cm.updated_at DESC LIMIT 1)) AS commission,
    ${documents.sql} AS documents,
    CASE WHEN f.account_id IS NULL OR f.retention_until<=? THEN 'none'
      WHEN f.status='confirmed' AND NOT EXISTS (SELECT 1 FROM commission_documents vd WHERE vd.id=f.verified_document_id AND vd.owner_id=f.account_id AND vd.category='affiliation' AND vd.status IN ('received','checked') AND vd.retention_until>?) THEN 'changes'
      ELSE f.status END AS affiliation,
    (SELECT json_group_array(tag) FROM (SELECT t.tag FROM person_tags t WHERE t.account_id=b.id ORDER BY t.tag)) AS tagsJson
    FROM b LEFT JOIN membership_applications ma ON ma.id=b.applicationId LEFT JOIN commission_affiliations f ON f.account_id=b.id`;
  const clauses: string[] = [];
  if (accountId) { clauses.push('p.id=?'); values.push(accountId); }
  if (filters.q) { const term = `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`; clauses.push("(p.name LIKE ? ESCAPE '\\' OR p.username LIKE ? ESCAPE '\\' OR p.email LIKE ? ESCAPE '\\')"); values.push(term, term, term); }
  if (filters.commission) { clauses.push('p.commission=?'); values.push(filters.commission); }
  if (filters.status === 'none') clauses.push('p.applicationStatus IS NULL');
  else if (filters.status) { clauses.push('p.applicationStatus=?'); values.push(filters.status); }
  if (filters.documents === 'complete') clauses.push('p.documents=3');
  if (filters.documents === 'pending') clauses.push('p.documents<3');
  if (filters.affiliation) { clauses.push('p.affiliation=?'); values.push(filters.affiliation); }
  if (filters.suspended === '1') clauses.push('p.disabledAt IS NOT NULL');
  if (filters.suspended === '0') clauses.push('p.disabledAt IS NULL');
  if (filters.tag) { clauses.push('EXISTS (SELECT 1 FROM person_tags pt WHERE pt.account_id=p.id AND pt.tag=?)'); values.push(filters.tag); }
  return { sql: `WITH b AS (${base}), p AS (${people}) SELECT * FROM p${clauses.length ? ' WHERE ' + clauses.join(' AND ') : ''}`, values };
}

const readRow = ({ tagsJson, ...row }: RawRow): PersonRow => {
  let tags: string[] = [];
  try { const parsed = JSON.parse(tagsJson ?? '[]'); if (Array.isArray(parsed)) tags = parsed.filter(item => typeof item === 'string'); } catch { /* No tags. */ }
  return { ...row, documents: Number(row.documents) || 0, tags };
};

export async function listPeople(filters: PeopleFilters, requestedPage: number) {
  const db = getRuntimeEnv().DB!, query = peopleQuery(filters);
  const total = Number((await db.prepare(`SELECT count(*) AS n FROM (${query.sql})`).bind(...query.values).first<{ n: number }>())?.n ?? 0);
  const pages = Math.max(1, Math.ceil(total / peoplePageSize)), page = Math.min(Math.max(1, requestedPage), pages);
  const rows = (await db.prepare(`${query.sql} ORDER BY p.createdAt DESC,p.id DESC LIMIT ? OFFSET ?`).bind(...query.values, peoplePageSize, (page - 1) * peoplePageSize).all<RawRow>()).results.map(readRow);
  return { rows, total, page, pages };
}

/** Up to `limit` rows; the caller decides what to do when there are more. */
export async function allPeople(filters: PeopleFilters, limit: number, accountId?: string) {
  const query = peopleQuery(filters, accountId);
  return (await getRuntimeEnv().DB!.prepare(`${query.sql} ORDER BY p.createdAt DESC,p.id DESC LIMIT ?`).bind(...query.values, limit).all<RawRow>()).results.map(readRow);
}

/** Excel opens UTF-8 with a BOM. Cells that a spreadsheet would run as a formula are prefixed with an apostrophe. */
export function csvCell(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

const day = (value: number | null) => value ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(value) : '';
export function peopleCsv(rows: PersonRow[]) {
  const header = ['Nombre', 'Usuario', 'Correo', 'Comisión', 'Solicitud', 'Documentos revisados (de 3)', 'Afiliación PAN', 'Etiquetas', 'Alta', 'Suspendida desde'];
  const lines = rows.map(row => [row.name, row.username ?? '', row.email, row.commission ? commissionName(row.commission) : '', row.applicationStatus ? membershipStatuses[row.applicationStatus as keyof typeof membershipStatuses] ?? row.applicationStatus : 'Sin solicitud', row.documents, affiliationLabels[row.affiliation] ?? row.affiliation, row.tags.join('; '), day(row.createdAt), day(row.disabledAt)]);
  return '﻿' + [header, ...lines].map(line => line.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

/** Filters recorded in the audit trail. The free-text search is recorded only as present or absent. */
export function auditedFilters(filters: PeopleFilters) {
  const { q, ...rest } = filters;
  return { ...Object.fromEntries(Object.entries(rest).filter(([, value]) => value)), search: Boolean(q) };
}

/** Resend for panel messages needs only the key and a valid sender. */
export function panelEmailConfigured() {
  const env = getRuntimeEnv();
  return Boolean(env.RESEND_API_KEY?.trim() && cleanEmail(env.REGISTRATION_EMAIL_FROM));
}

export type PersonAccount = { id: string; email: string; name: string; username: string | null; createdAt: number; updatedAt: number; disabledAt: number | null; emailVerificationRequired: number; emailVerifiedAt: number | null; selfRegistered: number; hasPassword: number; role: string | null };
export type PersonAffiliation = { account_id: string; folio: string; status: string; note: string; verification_source: string; verified_at: number | null; updated_at: number; retention_until: number; verified_document_id: string | null; verified_document_name: string | null; document_count: number; name: string; username: string };

export async function personAccount(id: string) {
  return getRuntimeEnv().DB!.prepare(`SELECT a.id,a.email,a.name,a.username,a.created_at AS createdAt,a.updated_at AS updatedAt,a.disabled_at AS disabledAt,
    a.email_verification_required AS emailVerificationRequired,a.email_verified_at AS emailVerifiedAt,a.self_registered AS selfRegistered,
    (a.password_hash IS NOT NULL) AS hasPassword,(SELECT r.role FROM user_roles r WHERE r.email=a.email AND r.revoked_at IS NULL) AS role
    FROM staff_accounts a WHERE a.id=?`).bind(id).first<PersonAccount>();
}

/** Everything the record shows, read in a few bounded queries. */
export async function personRecord(id: string) {
  const db = getRuntimeEnv().DB!, now = Date.now();
  const account = await personAccount(id);
  if (!account) return null;
  const application = await db.prepare(`SELECT ${membershipColumns} FROM membership_applications WHERE owner_email=? AND retention_until>? ORDER BY created_at DESC,id DESC LIMIT 1`).bind(account.email, now).first<MembershipApplication>();
  const history: { events: MembershipEvent[]; pagination: { total: number; pages: number; page: number } } = application ? await membershipHistory(application.id, true, 1) : { events: [], pagination: { total: 0, pages: 1, page: 1 } };
  const count = reviewedIdentityCount('?', now);
  const documents = Number((await db.prepare('SELECT ' + count.sql + ' AS n').bind(id, ...count.values).first<{ n: number }>())?.n ?? 0);
  const latest = (await db.prepare("SELECT category,status FROM commission_documents WHERE owner_id=? AND item_id IS NULL AND category IN ('ine_front','ine_back','address') AND status IN ('received','checked','changes') AND retention_until>? ORDER BY created_at DESC,id DESC").bind(id, now).all<{ category: string; status: string }>()).results;
  const identity = (['ine_front', 'ine_back', 'address'] as const).map(category => ({ category, status: latest.find(row => row.category === category)?.status ?? 'missing' }));
  const members = (await db.prepare('SELECT id,commission,role,active,updated_at AS updatedAt FROM commission_members WHERE account_id=? ORDER BY commission').bind(id).all<{ id: string; commission: string; role: string; active: number; updatedAt: number }>()).results;
  const affiliationRow = await db.prepare(`SELECT f.*,a.name,a.username,vd.name AS verified_document_name,vd.id AS current_document_id,
    (SELECT count(*) FROM commission_documents d WHERE d.owner_id=f.account_id AND d.category IN ('affiliation','affiliation_receipt') AND d.status IN ('received','checked','changes') AND d.retention_until>?) AS document_count
    FROM commission_affiliations f JOIN staff_accounts a ON a.id=f.account_id
    LEFT JOIN commission_documents vd ON vd.id=f.verified_document_id AND vd.owner_id=f.account_id AND vd.category='affiliation' AND vd.status IN ('received','checked') AND vd.retention_until>?
    WHERE f.account_id=? AND f.retention_until>?`).bind(now, now, id, now).first<PersonAffiliation & { current_document_id: string | null }>();
  // Same rule as the commission workspace: a confirmation without its current document is no longer valid.
  const affiliation = affiliationRow && affiliationRow.status === 'confirmed' && !affiliationRow.current_document_id
    ? { ...affiliationRow, status: 'changes', note: 'El comprobante ya no está disponible. Adjunta uno vigente para una nueva revisión.', verified_at: null, verified_document_id: null, verification_source: '' }
    : affiliationRow;
  const notes = (await db.prepare('SELECT id,body,author_email AS authorEmail,created_at AS createdAt FROM person_notes WHERE account_id=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(id).all<{ id: string; body: string; authorEmail: string; createdAt: number }>()).results;
  const tags = (await db.prepare('SELECT tag FROM person_tags WHERE account_id=? ORDER BY tag').bind(id).all<{ tag: string }>()).results.map(row => row.tag);
  const emails = (await db.prepare('SELECT id,batch_id AS batchId,subject,status,sent_by AS sentBy,created_at AS createdAt FROM outbound_emails WHERE account_id=? ORDER BY created_at DESC,id DESC LIMIT 50').bind(id).all<{ id: string; batchId: string; subject: string; status: string; sentBy: string; createdAt: number }>()).results;
  const audit = (await db.prepare(`SELECT id,actor_email AS actorEmail,action,entity_type AS entityType,created_at AS createdAt FROM audit_logs
    WHERE entity_id=? OR entity_id IN (SELECT d.id FROM commission_documents d WHERE d.owner_id=?) OR entity_id IN (SELECT ma.id FROM membership_applications ma WHERE ma.owner_email=?) OR actor_email=?
    ORDER BY created_at DESC,id DESC LIMIT 60`).bind(id, id, account.email, account.email).all<{ id: string; actorEmail: string; action: string; entityType: string; createdAt: number }>()).results;
  const impact = await deletionImpact(id, account.email);
  return { account, application, history: history.events, documents, identity, members, affiliation, notes, tags, emails, audit, impact };
}

export async function deletionImpact(id: string, email: string) {
  const db = getRuntimeEnv().DB!;
  const row = await db.prepare(`SELECT
    (SELECT count(*) FROM commission_documents WHERE owner_id=? OR item_id IN (SELECT id FROM commission_items WHERE owner_id=?)) AS documents,
    (SELECT count(*) FROM commission_items WHERE owner_id=?) AS items,
    (SELECT count(*) FROM membership_applications WHERE owner_email=?) AS applications,
    (SELECT count(*) FROM commission_messages WHERE author_id=? OR item_id IN (SELECT id FROM commission_items WHERE owner_id=?)) AS messages`).bind(id, id, id, email, id, id).first<{ documents: number; items: number; applications: number; messages: number }>();
  return { documents: Number(row?.documents ?? 0), items: Number(row?.items ?? 0), applications: Number(row?.applications ?? 0), messages: Number(row?.messages ?? 0) };
}
