import Link from "next/link";
import type { CommissionContent } from "@/lib/site-content-defaults";
import { commissionGuideHref } from "@/lib/site-documents";

/** One card per commission: what it does and the way in. Working guides live in each PDF. */
export default function CommissionList({ commissions }: { commissions: CommissionContent[] }) {
  return <div className="commission-grid">
    {commissions.map(c => <article className="commission-card" id={c.id} key={c.id}>
      <h2>{c.name}</h2>
      <p className="commission-card-purpose">{c.purpose}</p>
      <ul>{c.tasks.map((task, index) => <li key={index}>{task}</li>)}</ul>
      <div className="commission-card-actions">
        <Link className="button button-primary" href={`/participacion?comision=${c.id}#registro`}>Participar</Link>
        <a className="text-link" href={commissionGuideHref(c.id)} download>Guía en PDF</a>
      </div>
    </article>)}
  </div>;
}
