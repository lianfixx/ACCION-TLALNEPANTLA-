import Link from "next/link";
import type { Metadata } from "next";
import CommissionList from "./CommissionList";

export const metadata: Metadata = {
  title: "Comisiones",
  description: "Elige una comisión de Acción Política Juvenil Tlalnepantla y conoce sus tareas, cómo participar y cómo dar seguimiento a tu solicitud.",
  alternates: { canonical: "/comisiones" },
};

export default function CommissionsPage() {
  return <main className="commission-guide content-shell" id="main-content">
    <header className="commission-guide-hero">
      <Link href="/#programas" className="text-link">Volver a la página</Link>
      <p className="section-kicker">Acción Política Juvenil Tlalnepantla</p>
      <h1>Encuentra<br /><em>tu comisión.</em></h1>
      <p>Abre el área que te interesa. Ahí encontrarás qué hace el equipo, qué puedes aportar y su guía de trabajo.</p>
      <div className="record-actions"><Link className="button button-primary" href="/participacion#registro">Quiero participar</Link><Link className="text-link" href="/mi-comision">Ya tengo una cuenta</Link></div>
    </header>
    <CommissionList />
    <section className="commission-participation commission-start" aria-labelledby="start-title">
      <div><h2 id="start-title">Cómo empezar</h2><p>Primero completa tu registro en APJ. Cuando tu comisión esté confirmada, podrás realizar el último paso de afiliación al PAN.</p></div>
      <div className="commission-faq">
        <div className="commission-start-route"><h3>Crea tu cuenta y elige cómo participar</h3><p>Usarás tu propio usuario y contraseña. Para colaborar, comparte tus datos básicos y disponibilidad. Si te interesa coordinar, añade tu experiencia y tres propuestas para esa comisión.</p></div>
        <div className="commission-start-route"><h3>Envía la solicitud y consulta la respuesta</h3><p>Recibirás un folio. En tu cuenta podrás ver el estado, leer las respuestas y corregir datos mientras se revisa la solicitud.</p></div>
        <div className="commission-start-route"><h3>Completa tus documentos</h3><p>Después del envío, entrega la INE por ambos lados y el comprobante de domicilio en Documentos personales. Administración debe revisar los tres antes de confirmar tu comisión. Solo tú y la administración autorizada podrán consultarlos.</p></div>
        <details><summary>Si quiero coordinar, qué sigue</summary><p>Las tres propuestas ayudan a conocer cómo trabajarías con el equipo. La convocatoria y el proceso de selección se comunicarán por separado. La toma de protesta de quienes sean designados será en el Comité Directivo Municipal, con fecha por confirmar.</p></details>
        <details><summary>Qué podré hacer con mi comisión</summary><p>Cuando se confirme tu incorporación y se habilite tu acceso, podrás trabajar con el equipo, presentar un Formato de Evento, solicitar espacios o autorizaciones y adjuntar evidencias. En ese mismo lugar enviarás los reportes mensuales y la entrega al siguiente equipo.</p><p>La participación permite aprender al organizar actividades, desarrollar proyectos y conocer a otras personas del equipo. La comisión también puede difundir sus eventos e invitar a jóvenes de CUDEC y de otras universidades.</p></details>
        <div className="commission-start-route"><h3>Termina con tu afiliación al PAN</h3><p>Cuando tu comisión esté confirmada, se abrirá el último paso en tu cuenta. Realiza el trámite en la app del PAN y sube el comprobante de afiliación para revisión. Si ya estás afiliado, entrega tu comprobante. Un folio o acuse permiten dar seguimiento, pero no completan este paso.</p></div>
        <p className="workspace-help">Registro personal para personas de 18 años cumplidos. Enviar una solicitud no asigna una coordinación ni acredita afiliación al PAN.</p>
        <Link className="button button-primary" href="/participacion#registro">Comenzar mi solicitud</Link>
      </div>
    </section>
  </main>;
}
