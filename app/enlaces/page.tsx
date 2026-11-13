import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { enlacesConfiguration } from "@/lib/enlaces";
import { currentAuthorizedUser } from "@/lib/authz";
import { siteContent } from "@/lib/site-content";
import { HeadingText, Lines } from "@/app/ContentText";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Enlaces APJ",
  description: "Convocatoria Enlaces APJ: dos jóvenes por comisión, un año de trabajo con actividades, evidencias y un reporte final.",
  alternates: { canonical: "/enlaces" },
};

export default async function EnlacesPage() {
  const [config, content] = await Promise.all([enlacesConfiguration(), siteContent()]);
  const { header, requirements, seats, calendar, selection, duties, apply } = content.enlaces;
  const preview = !config.open;
  if (preview) {
    const user = await currentAuthorizedUser();
    if (user?.role !== "admin") notFound();
  }
  return <main className="enlaces" id="main-content">
    {preview && <p className="enlaces-preview" role="status"><strong>Vista previa, no publicada.</strong> Esta convocatoria se abre cuando el Comité Directivo Municipal apruebe sus bases y se active en Configuración.</p>}

    <section className="enlaces-hero aj-wrap">
      <div>
        <p className="aj-eyebrow">{header.eyebrow}</p>
        <h1><HeadingText title={header.title} emphasis={header.emphasis} /></h1>
        <p className="enlaces-lead"><Lines text={header.lead} /></p>
        <div className="aj-actions"><Link className="button button-primary" href="#postular">Postularme</Link><a className="aj-link" href="#bases">Leer las bases</a></div>
      </div>
      <figure className="enlaces-figure">
        <div className="enlaces-arch"><Image src="/images/mascot/cacomixtle-tlalnepantla.webp" alt="" width={1254} height={1254} priority unoptimized sizes="(max-width: 760px) 300px, 420px" /></div>
        <dl className="enlaces-figures"><div><dt>12</dt><dd>lugares</dd></div><div><dt>6</dt><dd>comisiones</dd></div><div><dt>1</dt><dd>año de trabajo</dd></div></dl>
      </figure>
    </section>

    <section className="enlaces-band" id="bases" aria-labelledby="enlaces-requisitos">
      <div className="aj-wrap enlaces-split">
        <div>
          <p className="aj-eyebrow">{requirements.eyebrow}</p>
          <h2 id="enlaces-requisitos"><HeadingText title={requirements.title} emphasis={requirements.emphasis} /></h2>
          <p><Lines text={requirements.intro} /></p>
        </div>
        <ul className="enlaces-lines">{requirements.items.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </div>
    </section>

    <section className="aj-wrap enlaces-section" aria-labelledby="enlaces-plazas">
      <p className="aj-eyebrow">{seats.eyebrow}</p>
      <h2 id="enlaces-plazas"><HeadingText title={seats.title} emphasis={seats.emphasis} /></h2>
      <div className="enlaces-cards">{content.commissions.map(commission => <article key={commission.id}><h3>{commission.name}</h3><p><Lines text={seats.roles[commission.id]} /></p></article>)}</div>
    </section>

    <section className="enlaces-dark" aria-labelledby="enlaces-calendario">
      <div className="aj-wrap enlaces-section">
        <p className="aj-eyebrow">{preview ? "Calendario propuesto" : "Calendario"}</p>
        <h2 id="enlaces-calendario"><HeadingText title={calendar.title} emphasis={calendar.emphasis} /></h2>
        <ol className="enlaces-timeline">{calendar.items.map(({ when, what }, index) => <li key={index} data-last={index === calendar.items.length - 1}><time>{when}</time><span>{what}</span></li>)}</ol>
      </div>
    </section>

    <section className="aj-wrap enlaces-section enlaces-split" aria-label="Selección y compromisos">
      <div>
        <p className="aj-eyebrow">{selection.eyebrow}</p>
        <ul className="enlaces-weights">{selection.criteria.map(({ label, percent }, index) => <li key={index}><span>{label}</span><strong>{percent} %</strong><meter min={0} max={100} value={percent} aria-hidden="true" /></li>)}</ul>
        <p className="enlaces-note"><Lines text={selection.note} /></p>
      </div>
      <div>
        <p className="aj-eyebrow">{duties.eyebrow}</p>
        <ul className="enlaces-duties">{duties.items.map((item, index) => <li key={index}>{item}</li>)}</ul>
        <p className="enlaces-note"><Lines text={duties.note} /></p>
      </div>
    </section>

    <section className="enlaces-apply" id="postular" aria-labelledby="enlaces-pasos">
      <div className="aj-wrap enlaces-section">
        <h2 id="enlaces-pasos"><HeadingText title={apply.title} emphasis={apply.emphasis} /></h2>
        <ol className="enlaces-steps">
          <li><strong>Crea tu cuenta</strong><span>Confirma tu correo con el enlace que te enviamos.</span></li>
          <li><strong>Envía tu solicitud</strong><span>Elige tu comisión, marca «Quiero ser Enlace APJ» y escribe qué harías en tu primer mes.</span></li>
          <li><strong>Sube tus documentos</strong><span>Antes del cierre, en Mi comisión: tus dos cartas y, en Documentos personales, tu INE por ambos lados y un comprobante de domicilio. En PDF, JPG o PNG.</span></li>
        </ol>
        <div className="aj-actions"><Link className="button button-primary" href="/crear-cuenta">Crear mi cuenta</Link><Link className="aj-link" href="/participacion#registro">Ya tengo cuenta</Link></div>
        <p className="enlaces-note"><Lines text={apply.note} /></p>
        {config.approval && <p className="enlaces-note">Bases aprobadas: {config.approval}</p>}
      </div>
    </section>
  </main>;
}
