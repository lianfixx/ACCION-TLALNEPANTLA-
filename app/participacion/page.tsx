import { dataChannelConfiguration } from "@/lib/privacy-config";
import ContactForm from "./ContactForm";
import { headers } from "next/headers";
import Link from "next/link";
import ProcessSteps from "@/app/ProcessSteps";
import type { Metadata } from "next";
import { getStaffIdentity } from "@/lib/staff-auth";
import { membershipConfiguration } from "@/lib/membership";
import { enlacesConfiguration } from "@/lib/enlaces";
import InternalRegistration from "./InternalRegistration";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Participa",
  description: "Consulta las comisiones, presenta una solicitud interna y revisa su seguimiento.",
  alternates: { canonical: "/participacion" },
};

export default async function ParticipationPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const [contact, registration, user, params, enlaces] = await Promise.all([dataChannelConfiguration("contact"), membershipConfiguration(), getStaffIdentity(), searchParams, enlacesConfiguration()]);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <main className="legal-shell participation-page participation-compact" id="main-content">
    <div className="registration-intro"><div><p className="section-kicker">Acción Política Juvenil Tlalnepantla</p><h1>Únete a<br /><em>una comisión.</em></h1></div><div className="registration-intro-copy"><p>Para personas de 18 años en adelante. Así funciona:</p><ProcessSteps compact /></div></div>
    {user&&<p><Link className="text-link" href="/cuenta">Mi cuenta y contraseña</Link></p>}
    <InternalRegistration key={user?.accountId??"anonymous"} accountId={user?.accountId??""} enabled={registration.enabled} enlacesOpen={enlaces.open} notice={registration.notice} noticeToken={registration.noticeToken} email={user?.email??""} initialName={user?.fullName??""} initialCommission={typeof params.comision==='string'?params.comision:''}/>
    <div className="participation-secondary"><Link href="/comisiones">Consultar las comisiones</Link><Link href="/agenda">Agenda</Link><Link href="/mi-comision">Mi comisión</Link></div>
    <details className="participation-contact" id="contacto"><summary>Contacto y propuestas</summary><section className="contact-section" aria-labelledby="contact-title"><div><h2 id="contact-title">Otros asuntos.</h2>{contact.enabled&&<p>Elige el tipo de solicitud.</p>}</div><ContactForm enabled={contact.enabled} siteKey={contact.settings.TURNSTILE_SITE_KEY??""} nonce={nonce}/></section></details>
  </main>;
}
