import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { signInPath } from "@/lib/account-paths";
import { commissions } from "@/lib/commissions";
import { enlacesView } from "@/lib/enlaces-view";
import { siteContent } from "@/lib/site-content";
import { getStaffIdentity } from "@/lib/staff-auth";
import EnlacesForm from "./EnlacesForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mi postulación · Enlaces APJ 2027", description: "Postúlate a Enlaces APJ 2027 y consulta el estado de tu postulación con tu folio.", robots: { index: false, follow: false, noarchive: true } };

export default async function Page() {
  const user = await getStaffIdentity();
  if (!user) redirect(signInPath("/cuenta/enlaces"));
  const [view, content] = await Promise.all([enlacesView(user.accountId, user.fullName || user.displayName), siteContent().catch(() => null)]);
  const names = (content?.commissions ?? commissions).map(item => ({ id: item.id, name: item.name }));
  return <main className="enl enl-account" id="main-content">
    <header className="enl-head enl-head-compact">
      <p className="enl-kicker">Acción Política Juvenil Tlalnepantla</p>
      <h1>Enlaces APJ 2027</h1>
      <p className="enl-sub">Mi postulación</p>
      <p className="enl-org"><Link className="text-link" href="/enlaces">Leer la convocatoria</Link></p>
    </header>
    <EnlacesForm key={user.accountId} accountId={user.accountId} initial={view} commissions={names} />
  </main>;
}
