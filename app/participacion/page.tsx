import { dataChannelConfiguration } from "@/lib/privacy-config";
import ContactForm from "./ContactForm";
import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { getStaffIdentity } from "@/lib/staff-auth";
import { membershipConfiguration } from "@/lib/membership";
import InternalRegistration from "./InternalRegistration";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Participa",
  description: "Consulta las comisiones, presenta una solicitud interna y revisa su seguimiento.",
  alternates: { canonical: "/participacion" },
};

export default async function ParticipationPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const [contact, registration, user, params] = await Promise.all([dataChannelConfiguration("contact"), membershipConfiguration(), getStaffIdentity(), searchParams]);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <main className="legal-shell participation-page participation-compact" id="main-content">
    <div className="registration-intro"><div><p className="section-kicker">Acción Política Juvenil Tlalnepantla</p><h1>Únete a<br /><em>una comisión.</em></h1></div><div className="registration-intro-copy"><p>Completa tu perfil y elige una comisión. En tu cuenta podrás entregar los documentos y consultar la respuesta del equipo.</p><p className="workspace-help">Registro personal para personas de 18 años cumplidos. La afiliación al PAN será el último paso, después de confirmar tu comisión.</p></div></div>
    {user&&<p><Link className="text-link" href="/cuenta">Mi cuenta y contraseña</Link></p>}
    <InternalRegistration key={user?.accountId??"anonymous"} accountId={user?.accountId??""} enabled={registration.enabled} notice={registration.notice} noticeToken={registration.noticeToken} email={user?.email??""} initialName={user?.fullName??""} initialCommission={typeof params.comision==='string'?params.comision:''}/>
    <div className="participation-secondary"><Link href="/comisiones">Consultar las comisiones</Link><Link href="/agenda">Agenda</Link><details><summary>Cuándo hago mi afiliación al PAN</summary><p>Después de completar tu perfil, recibir la revisión de los tres documentos personales y tener confirmada tu comisión. Entonces encontrarás en tu cuenta las instrucciones para usar la app del PAN y subir tu comprobante. Si ya estás afiliado, solo tendrás que entregarlo para revisión.</p><Link className="text-link" href="/mi-comision">Consultar mi registro</Link></details></div>
    <details className="participation-contact" id="contacto"><summary>Contacto y propuestas</summary><section className="contact-section" aria-labelledby="contact-title"><div><h2 id="contact-title">Otros asuntos.</h2>{contact.enabled&&<p>Elige el tipo de solicitud.</p>}</div><ContactForm enabled={contact.enabled} siteKey={contact.settings.TURNSTILE_SITE_KEY??""} nonce={nonce}/></section></details>
  </main>;
}
