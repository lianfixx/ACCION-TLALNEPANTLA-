import Link from "next/link";
import type { Metadata } from "next";
import CommissionList from "./CommissionList";
import ProcessSteps from "@/app/ProcessSteps";
import { enlacesConfiguration } from "@/lib/enlaces";
import { siteContent } from "@/lib/site-content";
import { HeadingText, Lines } from "@/app/ContentText";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Comisiones",
  description: "Las seis comisiones de Acción Política Juvenil Tlalnepantla: qué hace cada una y cómo sumarte.",
  alternates: { canonical: "/comisiones" },
};

export default async function CommissionsPage() {
  const [enlaces, content] = await Promise.all([enlacesConfiguration(), siteContent()]);
  const header = content.comisiones;
  return <main className="commission-guide content-shell commission-page" id="main-content">
    <header className="commission-page-hero">
      <p className="section-kicker">{header.eyebrow}</p>
      <h1><HeadingText title={header.title} emphasis={header.emphasis} /></h1>
      <p><Lines text={header.lead} /></p>
    </header>
    <CommissionList commissions={content.commissions} />
    <section className="commission-page-steps" aria-labelledby="steps-title">
      <h2 id="steps-title">{header.stepsTitle}</h2>
      <ProcessSteps steps={content.steps} />
      <div className="record-actions">
        <Link className="button button-primary" href="/participacion#registro">Empezar</Link>
        <Link className="text-link" href="/mi-comision">Ya tengo cuenta</Link>
      </div>
      {enlaces.open && <p className="commission-page-enlaces">¿Quieres coordinar? <Link href="/enlaces">Postúlate como Enlace APJ</Link>: dos lugares por comisión.</p>}
    </section>
  </main>;
}
