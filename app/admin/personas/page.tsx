import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import AdminSessionBoundary from '../AdminSessionBoundary';
import AdminHeader from '../AdminHeader';
import PeopleTools from './PeopleTools';
import { currentAuthorizedUser } from '@/lib/authz';
import { adminWriteGuard } from '@/lib/admin-write-guard';
import { commissions, commissionName } from '@/lib/commissions';
import { membershipStatuses } from '@/lib/membership-shared';
import { listPeople, panelEmailConfigured, type PersonRow } from '@/lib/people';
import { affiliationLabels, parsePeopleFilters, peopleSearchParams } from '@/lib/people-shared';
import { getRuntimeEnv } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Personas', robots: { index: false, follow: false, noarchive: true } };

const date = (n: number) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(n);
const applicationTone = (status: string | null) => status === 'accepted' ? 'ok' : status === 'submitted' || status === 'in_review' ? 'wait' : 'off';
const affiliationTone = { none: 'off', reported: 'wait', changes: 'warn', confirmed: 'ok' } as const;

export default async function PeoplePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const actor = await currentAuthorizedUser();
  if (!actor) redirect('/admin/ingresar');
  if (actor.role !== 'admin') redirect('/admin');
  const filters = parsePeopleFilters(params);
  const requestedPage = typeof params.page === 'string' && /^\d{1,7}$/.test(params.page) ? Number(params.page) : 1;
  let result: { rows: PersonRow[]; total: number; page: number; pages: number } = { rows: [], total: 0, page: 1, pages: 1 }, tags: string[] = [], unavailable = false;
  try {
    result = await listPeople(filters, requestedPage);
    tags = (await getRuntimeEnv().DB!.prepare('SELECT DISTINCT tag FROM person_tags ORDER BY tag LIMIT 200').all<{ tag: string }>()).results.map(row => row.tag);
  } catch { unavailable = true; }
  const live = adminWriteGuard(actor, ['admin']);
  if (!await getRuntimeEnv().DB!.prepare('SELECT 1 WHERE ' + live.sql).bind(...live.values).first()) redirect('/admin/ingresar');
  const filtered = Object.values(filters).some(Boolean);
  const pageLink = (page: number) => `/admin/personas?${peopleSearchParams(filters, page)}`;

  return <main className="admin-shell" id="main-content">
    <AdminHeader current="personas" email={actor.email} role={actor.role} accountId={actor.accountId} />
    <AdminSessionBoundary key={actor.accountId} accountId={actor.accountId}>
      <div className="people-page admin-section">
        <div className="people-head">
          <p className="admin-label">Solo administración</p>
          <h1>Personas</h1>
          <p>{unavailable ? 'No pudimos cargar la lista.' : `${result.total} ${result.total === 1 ? 'persona' : 'personas'}${filtered ? ' con estos filtros' : ''}.`} Abre una ficha para ver y actuar.</p>
        </div>
        <form className="people-filters" action="/admin/personas" method="get" key={JSON.stringify(filters)}>
          <label className="people-search">Buscar<input type="search" name="q" maxLength={120} defaultValue={filters.q} placeholder="Nombre, usuario o correo" /></label>
          <label>Comisión<select name="commission" defaultValue={filters.commission}><option value="">Todas</option>{commissions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Solicitud<select name="status" defaultValue={filters.status}><option value="">Todas</option><option value="none">Sin solicitud</option>{Object.entries(membershipStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Documentos<select name="documents" defaultValue={filters.documents}><option value="">Todos</option><option value="complete">Tres revisados</option><option value="pending">Pendientes</option></select></label>
          <label>Afiliación PAN<select name="affiliation" defaultValue={filters.affiliation}><option value="">Todas</option>{Object.entries(affiliationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Cuenta<select name="suspended" defaultValue={filters.suspended}><option value="">Todas</option><option value="0">Activas</option><option value="1">Suspendidas</option></select></label>
          <label>Etiqueta<select name="tag" defaultValue={filters.tag}><option value="">Todas</option>{tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}</select></label>
          <div className="people-filter-actions"><button className="button button-primary" type="submit">Aplicar</button>{filtered && <Link className="text-link" href="/admin/personas">Quitar filtros</Link>}</div>
        </form>
        <PeopleTools filters={filters} total={result.total} emailConfigured={panelEmailConfigured()} />
        {unavailable ? <p className="admin-empty">Actualiza la página para intentarlo de nuevo.</p> : result.rows.length === 0 ? <p className="admin-empty">No hay personas que coincidan.</p> :
          <ul className="people-list">{result.rows.map(row => <li key={row.id}><Link className="people-row" href={`/admin/personas/${row.id}`}>
            <span className="people-row-name"><strong>{row.name}</strong><small>{row.username ? `@${row.username}` : 'Sin usuario'}{row.commission ? ` · ${commissionName(row.commission)}` : ''}</small></span>
            <span className="people-chips">
              {row.disabledAt && <span className="people-chip" data-tone="warn">Suspendida</span>}
              <span className="people-chip" data-tone={applicationTone(row.applicationStatus)}>{row.applicationStatus ? membershipStatuses[row.applicationStatus as keyof typeof membershipStatuses] ?? row.applicationStatus : 'Sin solicitud'}</span>
              <span className="people-chip" data-tone={row.documents === 3 ? 'ok' : row.documents ? 'wait' : 'off'}>{`Docs ${row.documents}/3`}</span>
              <span className="people-chip" data-tone={affiliationTone[row.affiliation] ?? 'off'}>{`PAN · ${affiliationLabels[row.affiliation] ?? row.affiliation}`}</span>
              {row.tags.map(tag => <span className="people-tag" key={tag}>{tag}</span>)}
            </span>
            <time dateTime={new Date(row.createdAt).toISOString()}>{date(row.createdAt)}</time>
          </Link></li>)}</ul>}
        {result.pages > 1 && <nav className="people-pages" aria-label="Páginas"><span>{`Página ${result.page} de ${result.pages}`}</span><div>{result.page > 1 && <Link href={pageLink(result.page - 1)}>Anterior</Link>}{result.page < result.pages && <Link href={pageLink(result.page + 1)}>Siguiente</Link>}</div></nav>}
      </div>
    </AdminSessionBoundary>
  </main>;
}
