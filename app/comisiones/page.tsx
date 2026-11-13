import Link from "next/link";
import type { Metadata } from "next";
import CommissionList from "./CommissionList";
import ProcessSteps from "@/app/ProcessSteps";
import { enlacesConfiguration } from "@/lib/enlaces";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Comisiones",
  description: "Las seis comisiones de Acción Política Juvenil Tlalnepantla: qué hace cada una y cómo sumarte.",
  alternates: { canonical: "/comisiones" },
};

export default async function CommissionsPage() {
  const enlaces = await enlacesConfiguration();
  return <main className="commission-guide content-shell commission-page" id="main-content">
    <header className="commission-page-hero">
      <p className="section-kicker">Acción Política Juvenil Tlalnepantla</p>
      <h1>Elige tu <em>comisión.</em></h1>
      <p>Seis equipos con tareas concretas. Elige uno y súmate.</p>
    </header>
    <CommissionList />
    <section className="commission-page-steps" aria-labelledby="steps-title">
      <h2 id="steps-title">Cómo te sumas</h2>
      <ProcessSteps />
      <div className="record-actions">
        <Link className="button button-primary" href="/participacion#registro">Empezar</Link>
        <Link className="text-link" href="/mi-comision">Ya tengo cuenta</Link>
      </div>
      {enlaces.open && <p className="commission-page-enlaces">¿Quieres coordinar? <Link href="/enlaces">Postúlate como Enlace APJ</Link>: dos lugares por comisión.</p>}
    </section>
  </main>;
}
