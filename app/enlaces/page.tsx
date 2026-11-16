import type { Metadata } from "next";
import { currentAuthorizedUser } from "@/lib/authz";
import { commissions } from "@/lib/commissions";
import { enlacesPublishedResults, enlacesState, type PublishedResult } from "@/lib/enlaces";
import { convocatoriaBases, convocatoriaIntro, convocatoriaPlace, convocatoriaSignature, convocatoriaTitle, type ConvocatoriaBlock } from "@/lib/enlaces-convocatoria";
import { enlacesDate } from "@/lib/enlaces-shared";
import { siteDocumentHref } from "@/lib/site-documents";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const state = await enlacesState();
  const description = state.phase === "before"
    ? "Convocatoria Enlaces APJ 2027 de Acción Política Juvenil Tlalnepantla, disponible el lunes 23 de noviembre."
    : "Convocatoria Enlaces APJ 2027. Doce Enlaces de Comisión y Enlaces de Comunidad por universidad y colonia, con un encargo de un año en Tlalnepantla.";
  return {
    title: "Enlaces APJ 2027",
    description,
    alternates: { canonical: "/enlaces" },
    openGraph: { title: "Enlaces APJ 2027 · Convocatoria", description, url: "/enlaces" },
    robots: state.phase === "before" ? { index: false, follow: true } : undefined,
  };
}

function Block({ block }: { block: ConvocatoriaBlock }) {
  if (block.type === "p") return <p>{block.text}</p>;
  if (block.type === "label") return <h4>{block.text}</h4>;
  if (block.type === "list") return <ul className="enl-list">{block.items.map(item => <li key={item.text}>{item.lead && <strong>{item.lead} </strong>}{item.text}</li>)}</ul>;
  if (block.type === "oath") return <blockquote className="enl-oath">{block.lines.map(line => <p key={line}>{line}</p>)}</blockquote>;
  return <div className="enl-table-wrap"><table className={`enl-table${block.numeric !== undefined ? " enl-table-score" : ""}`}>
    <thead><tr>{block.head.map(cell => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
    <tbody>{block.rows.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index} data-label={block.head[index]}>{cell}</td>)}</tr>)}</tbody>
    {block.total && <tfoot><tr>{block.total.map((cell, index) => index === 0 ? <th key={index} scope="row">{cell}</th> : <td key={index}>{cell}</td>)}</tr></tfoot>}
  </table></div>;
}

function Results({ results }: { results: PublishedResult[] }) {
  const names = (list: PublishedResult[], status: string) => list.filter(item => item.status === status).map(item => item.name);
  const byCommission = commissions.map(commission => ({ title: commission.name, list: results.filter(item => item.track === "comision" && item.commission === commission.id) })).filter(group => group.list.length);
  const communities = [...new Set(results.filter(item => item.track === "comunidad").map(item => item.communityName))].sort((a, b) => a.localeCompare(b, "es"));
  const byCommunity = communities.map(name => ({ title: name, list: results.filter(item => item.track === "comunidad" && item.communityName === name) }));
  const Group = ({ title, list }: { title: string; list: PublishedResult[] }) => <article className="enl-result">
    <h4>{title}</h4>
    {names(list, "selected").length > 0 && <p><span>Enlaces</span>{names(list, "selected").join(", ")}</p>}
    {names(list, "substitute").length > 0 && <p><span>Suplentes</span>{names(list, "substitute").join(", ")}</p>}
  </article>;
  return <section className="enl-results" id="resultados" aria-labelledby="enl-results-title">
    <p className="enl-ordinal">Resultados</p>
    <h2 id="enl-results-title">Generación 2027</h2>
    {results.length === 0 ? <p>Los resultados ya se comunicaron a cada persona en su cuenta. Aquí aparecen los nombres de quienes autorizaron publicarlos.</p> : <>
      <p>Aparecen los nombres de quienes autorizaron publicarlos. Cada persona consulta su resultado en su cuenta, con su folio.</p>
      {byCommission.length > 0 && <><h3>Enlaces de Comisión</h3><div className="enl-result-grid">{byCommission.map(group => <Group key={group.title} {...group} />)}</div></>}
      {byCommunity.length > 0 && <><h3>Enlaces de Comunidad</h3><div className="enl-result-grid">{byCommunity.map(group => <Group key={group.title} {...group} />)}</div></>}
    </>}
  </section>;
}

export default async function EnlacesPage() {
  const state = await enlacesState();
  const admin = state.phase === "before" ? (await currentAuthorizedUser())?.role === "admin" : false;
  const opening = enlacesDate(state.opensAt), closing = enlacesDate(state.closesAt);

  if (state.phase === "before" && !admin) return <main className="enl enl-teaser" id="main-content">
    <header className="enl-head">
      <p className="enl-kicker">Acción Política Juvenil Tlalnepantla</p>
      <h1>{convocatoriaTitle}</h1>
      <p className="enl-sub">Convocatoria disponible el {opening}</p>
    </header>
  </main>;

  const results = state.phase === "results" ? await enlacesPublishedResults() : [];
  const actions = state.phase === "open" || state.phase === "before"
    ? <a className="button button-primary" href="/cuenta/enlaces">Postularme</a>
    : <span className="button enl-closed" aria-disabled="true">Postulaciones cerradas</span>;

  return <main className="enl" id="main-content">
    {state.phase === "before" && <p className="enl-preview" role="status"><strong>Vista previa de administración.</strong> El público solo ve el título y la fecha. La convocatoria se publica sola el {opening} a las 00:00.</p>}
    <header className="enl-head">
      <p className="enl-kicker">Acción Política Juvenil Tlalnepantla</p>
      <h1>{convocatoriaTitle}</h1>
      <p className="enl-sub">Convocatoria</p>
      <p className="enl-org">Acción Política Juvenil Tlalnepantla</p>
      <div className="enl-actions">
        {actions}
        <a className="text-link" href={siteDocumentHref("convocatoria-enlaces-apj-2027")}>Descargar la convocatoria en PDF</a>
      </div>
      <p className="enl-deadline">{state.phase === "results" ? "Los resultados están publicados más abajo." : state.phase === "closed" ? <>Las postulaciones cerraron el {closing}. Si te postulaste, <a href="/cuenta/enlaces">consulta tu estado con tu folio</a>.</> : `Recibimos postulaciones hasta el ${closing} a las 23:59 horas.`}</p>
    </header>

    {state.phase === "results" && <Results results={results} />}

    <article className="enl-doc">
      <p className="enl-intro">{convocatoriaIntro}</p>
      <p className="enl-bases">Bases</p>
      {convocatoriaBases.map(base => <section key={base.id} id={base.id} aria-labelledby={`enl-${base.id}`}>
        <p className="enl-ordinal">{base.ordinal}</p>
        <h2 id={`enl-${base.id}`}>{base.title}</h2>
        {base.blocks.map((block, index) => <Block key={index} block={block} />)}
      </section>)}
      <footer className="enl-sign">
        <p>{convocatoriaPlace}</p>
        <p><strong>{convocatoriaSignature.name}</strong><br />{convocatoriaSignature.organization}</p>
      </footer>
    </article>

    <div className="enl-actions enl-actions-end">
      {actions}
      {state.phase !== "open" && state.phase !== "before" ? <a className="text-link" href="/cuenta/enlaces">Consultar mi postulación</a> : <a className="text-link" href="/cuenta/enlaces">Ya empecé mi postulación</a>}
    </div>
  </main>;
}
