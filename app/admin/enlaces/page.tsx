import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminHeader from "../AdminHeader";
import AdminSessionBoundary from "../AdminSessionBoundary";
import EnlacesTools from "./EnlacesTools";
import { adminWriteGuard } from "@/lib/admin-write-guard";
import { currentAuthorizedUser } from "@/lib/authz";
import { commissions, commissionName } from "@/lib/commissions";
import { enlacesState } from "@/lib/enlaces";
import { enlacesCommunities, enlacesCounts, enlacesSearchParams, listEnlaces, listedStatuses, parseEnlacesFilters, type EnlacesListRow } from "@/lib/enlaces-admin";
import { enlacesDate, enlacesSeats, enlacesStatuses, enlacesTracks, type EnlacesStatus } from "@/lib/enlaces-shared";
import { getRuntimeEnv } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Enlaces APJ 2027 · Postulaciones", robots: { index: false, follow: false, noarchive: true } };

const tone = (status: EnlacesStatus) => status === "selected" ? "ok" : status === "substitute" || status === "interview" ? "wait" : status === "not_selected" || status === "withdrawn" ? "off" : "wait";
const phaseLabels = { before: "Aún no abre", open: "Abierta", closed: "Cerrada, sin resultados publicados", results: "Resultados publicados" } as const;

export default async function EnlacesAdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const actor = await currentAuthorizedUser();
  if (!actor) redirect("/admin/ingresar");
  if (actor.role !== "admin") redirect("/admin");
  const live = adminWriteGuard(actor, ["admin"]);
  const filters = parseEnlacesFilters(params);
  const requestedPage = typeof params.page === "string" && /^\d{1,6}$/.test(params.page) ? Number(params.page) : 1;
  let result: { rows: EnlacesListRow[]; total: number; page: number; pages: number } = { rows: [], total: 0, page: 1, pages: 1 }, counts: Partial<Record<EnlacesStatus, number>> = {}, communities: string[] = [], unavailable = false;
  // Everything the page needs, together with the session check, in parallel.
  const [stillLive, state, loaded] = await Promise.all([
    getRuntimeEnv().DB!.prepare("SELECT 1 WHERE " + live.sql).bind(...live.values).first(),
    enlacesState(),
    Promise.all([listEnlaces(filters, requestedPage), enlacesCounts(), enlacesCommunities()]).catch(() => null),
  ]);
  if (!stillLive) redirect("/admin/ingresar");
  if (loaded) [result, counts, communities] = loaded; else unavailable = true;
  const filtered = Object.values(filters).some(Boolean);
  const received = listedStatuses.filter(status => status !== "withdrawn").reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  const undecided = (counts.submitted ?? 0) + (counts.in_review ?? 0) + (counts.interview ?? 0);
  const place = (row: EnlacesListRow) => row.track === "comision" ? commissionName(row.commission) : row.communityName;

  return <main className="admin-shell" id="main-content">
    <AdminHeader current="enlaces" email={actor.email} role={actor.role} accountId={actor.accountId} />
    <AdminSessionBoundary key={actor.accountId} accountId={actor.accountId}>
      <div className="people-page admin-section">
        <div className="people-head">
          <p className="admin-label">Solo administración</p>
          <h1>Enlaces APJ 2027</h1>
          <p>{phaseLabels[state.phase]}. Abre el {enlacesDate(state.opensAt)} a las 00:00 y cierra el {enlacesDate(state.closesAt)} a las 23:59. <Link className="text-link" href="/enlaces" target="_blank">Ver la página pública</Link></p>
        </div>
        <dl className="people-facts enl-admin-counts">
          <div><dt>Recibidas</dt><dd>{received}</dd></div>
          <div><dt>Por decidir</dt><dd>{undecided}</dd></div>
          <div><dt>Seleccionadas</dt><dd>{counts.selected ?? 0}</dd></div>
          <div><dt>Suplentes</dt><dd>{counts.substitute ?? 0}</dd></div>
          <div><dt>Borradores sin enviar</dt><dd>{counts.draft ?? 0}</dd></div>
          <div><dt>Retiradas</dt><dd>{counts.withdrawn ?? 0}</dd></div>
        </dl>
        <form className="people-filters" action="/admin/enlaces" method="get" key={JSON.stringify(filters)}>
          <label>Modalidad<select name="track" defaultValue={filters.track}><option value="">Todas</option>{Object.entries(enlacesTracks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Comisión<select name="commission" defaultValue={filters.commission}><option value="">Todas</option>{commissions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label>Comunidad<select name="community" defaultValue={filters.community}><option value="">Todas</option>{communities.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
          <label>Estado<select name="status" defaultValue={filters.status}><option value="">Todos</option>{listedStatuses.map(status => <option key={status} value={status}>{enlacesStatuses[status]}</option>)}</select></label>
          <div className="people-filter-actions"><button className="button button-primary" type="submit">Aplicar</button>{filtered && <Link className="text-link" href="/admin/enlaces">Quitar filtros</Link>}</div>
        </form>
        <EnlacesTools filters={filters} total={result.total} phase={state.phase} undecided={undecided} selected={(counts.selected ?? 0) + (counts.substitute ?? 0)} />
        {unavailable ? <p className="admin-empty">No pudimos cargar la lista. Actualiza la página.</p> : result.rows.length === 0 ? <p className="admin-empty">{filtered ? "No hay postulaciones con estos filtros." : "Todavía no hay postulaciones enviadas."}</p> :
          <ul className="people-list">{result.rows.map(row => <li key={row.id}><Link className="people-row" href={`/admin/enlaces/${row.id}`}>
            <span className="people-row-name"><strong>{row.name}</strong><small>{row.referenceCode} · {row.track ? enlacesTracks[row.track] : "Sin modalidad"}{place(row) ? ` · ${place(row)}` : ""}</small></span>
            <span className="people-chips">
              <span className="people-chip" data-tone={tone(row.status)}>{enlacesStatuses[row.status]}{row.seat ? ` · ${enlacesSeats[row.seat]}` : ""}</span>
              <span className="people-chip" data-tone={row.total === null ? "off" : "ok"}>{row.total === null ? "Sin puntaje" : `${row.total} de 100`}</span>
              {!row.publishNameOk && <span className="people-chip" data-tone="off">No publicar nombre</span>}
            </span>
            {row.submittedAt ? <time dateTime={new Date(row.submittedAt).toISOString()}>{enlacesDate(row.submittedAt)}</time> : <span />}
          </Link></li>)}</ul>}
        {result.pages > 1 && <nav className="people-pages" aria-label="Páginas"><span>{`Página ${result.page} de ${result.pages}`}</span><div>{result.page > 1 && <Link href={`/admin/enlaces?${enlacesSearchParams(filters, result.page - 1)}`}>Anterior</Link>}{result.page < result.pages && <Link href={`/admin/enlaces?${enlacesSearchParams(filters, result.page + 1)}`}>Siguiente</Link>}</div></nav>}
      </div>
    </AdminSessionBoundary>
  </main>;
}
