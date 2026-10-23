import Link from "next/link";
import { membershipConfiguration } from "@/lib/membership";
import type { Metadata } from "next";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Privacidad del registro interno",robots:{index:false,follow:true}};
export default async function RegistrationPrivacyPage(){
  const config=await membershipConfiguration(),n=config.notice;
  return <main className="legal-shell legal-document" id="main-content"><p className="section-kicker">{n.version?`Versión ${n.version}`:'Preparación del aviso'}</p><h1>Privacidad del<br/>registro interno.</h1><p>Este aviso corresponde exclusivamente a las solicitudes de incorporación interna a Acción Política Juvenil Tlalnepantla y a su seguimiento en esta plataforma.</p><nav className="legal-links"><Link href="/participacion#registro">Volver al registro</Link><Link href="/privacidad">Privacidad del sitio</Link></nav>
    {!config.enabled&&<div className="legal-warning"><strong>La recepción de solicitudes está cerrada.</strong><p>{config.complete?'El aviso está completo. La recepción sigue cerrada.':'El responsable aún debe completar y confirmar este aviso. Hasta entonces, la recepción seguirá cerrada.'}</p></div>}
    {config.sections.map(section=><section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map((paragraph,i)=><p className="legal-preserve-lines" key={i}>{paragraph}</p>)}</section>)}
    {n.email&&<p><a href={`mailto:${n.email}`}>Contactar al responsable de privacidad</a></p>}
    </main>;
}
