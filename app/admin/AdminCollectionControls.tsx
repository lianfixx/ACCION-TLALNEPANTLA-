import Link from "next/link";
import type { AdminQuery } from "@/lib/admin-queries";
import type { PanelData } from "@/lib/admin-types";

export default function AdminCollectionControls({ query, collection }: { query: AdminQuery; collection: PanelData["collection"] }) {
  if (query.section === "resumen" || query.section === "configuracion") return null;
  const path = (page: number) => `/admin?${new URLSearchParams({ section: query.section, q: query.q, state: query.state, page: String(page) })}`;

  return <div className="admin-collection-controls">
    <form action="/admin" method="get" key={`${query.section}-${query.q}-${query.state}`}>
      <input type="hidden" name="section" value={query.section} />
      <label>Buscar<input type="search" name="q" maxLength={120} defaultValue={query.q} placeholder="Título, nombre o referencia" /></label>
      <label>Filtrar<select name="state" defaultValue={query.state}><option value="">Todos</option>{collection.filters.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <button className="button button-secondary" type="submit">Buscar</button>
    </form>
    <nav aria-label="Páginas del listado"><span>{collection.total} registros · página {collection.page} de {collection.pages}</span><div>{collection.page > 1 && <Link href={path(collection.page-1)}>Anterior</Link>}{collection.page < collection.pages && <Link href={path(collection.page+1)}>Siguiente</Link>}</div></nav>
  </div>;
}
