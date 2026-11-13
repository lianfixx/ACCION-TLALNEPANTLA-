import Link from "next/link";
import { commissions } from "@/lib/commissions";

/** One card per commission: what it does and the way in. Working guides live in each PDF. */
export default function CommissionList() {
  return <div className="commission-grid">
    {commissions.map(c => <article className="commission-card" id={c.id} key={c.id}>
      <h2>{c.name}</h2>
      <p className="commission-card-purpose">{c.purpose}</p>
      <ul>{c.tasks.map(task => <li key={task}>{task}</li>)}</ul>
      <div className="commission-card-actions">
        <Link className="button button-primary" href={`/participacion?comision=${c.id}#registro`}>Participar</Link>
        <a className="text-link" href={`/documentos/guia-${c.id}.pdf`} download>Guía en PDF</a>
      </div>
    </article>)}
  </div>;
}
