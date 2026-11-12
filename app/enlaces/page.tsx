import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { enlacesConfiguration } from "@/lib/enlaces";
import { currentAuthorizedUser } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Enlaces APJ",
  description: "Convocatoria Enlaces APJ: dos jóvenes por comisión, un año de trabajo con actividades, evidencias y un reporte final.",
  alternates: { canonical: "/enlaces" },
};

const requirements = [
  "Tener de 18 a 29 años.",
  "Vivir, estudiar o trabajar en Tlalnepantla de Baz.",
  "Crear tu cuenta y enviar tu solicitud a la comisión que elijas.",
  "Carta de motivos de una cuartilla: por qué esa comisión y qué harías en tu primer mes.",
  "Carta de recomendación de un docente, empleador o líder comunitario.",
  "Disponibilidad aproximada de cuatro horas por semana.",
];
const seats: Array<[string, string]> = [
  ["Gobierno", "Visita al Ayuntamiento, Escuela Parlamentaria y Parlamento Juvenil."],
  ["Administración", "Registros, listas, permisos y seguimiento de cada evento."],
  ["Comunicación", "Carteles, redes, fotografía con permiso y Voces 360."],
  ["Cultura", "Posada Juvenil y Navidad en el hospital."],
  ["Tecnología e IA", "Sitio, formularios, registros y códigos QR probados."],
  ["Mujeres al frente", "Paridad en la convocatoria y espacios seguros en cada evento."],
];
const calendar: Array<[string, string]> = [
  ["16 de noviembre", "Se publica la convocatoria"],
  ["30 de noviembre", "Cierran postulaciones a las 23:59"],
  ["1 al 4 de diciembre", "Entrevistas de 10 minutos, en línea"],
  ["7 de diciembre", "Resultados"],
  ["10 de diciembre", "Toma de protesta, si el Comité la aprueba"],
];
const weights: Array<[string, number]> = [
  ["Carta de motivos", 30],
  ["Propuesta para la comisión", 25],
  ["Participación previa en tu escuela o comunidad", 25],
  ["Carta de recomendación", 20],
];
const duties = [
  "Plan de trabajo de tu comisión en el primer mes.",
  "Reporte mensual en Mi comisión.",
  "Participar en al menos tres eventos de La ruta.",
  "Organizar un evento propio por semestre con el Formato APJ-F01.",
  "Difundir convocatorias y guardar evidencias.",
  "Reporte final y cuestionario de salida.",
];

export default async function EnlacesPage() {
  const config = await enlacesConfiguration();
  const preview = !config.open;
  if (preview) {
    const user = await currentAuthorizedUser();
    if (user?.role !== "admin") notFound();
  }
  return <main className="enlaces" id="main-content">
    {preview && <p className="enlaces-preview" role="status"><strong>Vista previa, no publicada.</strong> Esta convocatoria se abre cuando el Comité Directivo Municipal apruebe sus bases y se active en Configuración.</p>}

    <section className="enlaces-hero aj-wrap">
      <div>
        <p className="aj-eyebrow">Convocatoria 2026–2027</p>
        <h1>Enlaces APJ. <em>Doce lugares para mover Tlalnepantla.</em></h1>
        <p className="enlaces-lead">Dos jóvenes por comisión, un año de trabajo con actividades, evidencias y un reporte final. Son el equipo que sostiene La ruta.</p>
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
          <p className="aj-eyebrow">Quién puede postularse</p>
          <h2 id="enlaces-requisitos">Lo que necesitas <em>antes de empezar.</em></h2>
          <p>No se pide afiliación al PAN. La afiliación es un paso distinto y voluntario que el sitio deja al final del registro.</p>
        </div>
        <ul className="enlaces-lines">{requirements.map(item => <li key={item}>{item}</li>)}</ul>
      </div>
    </section>

    <section className="aj-wrap enlaces-section" aria-labelledby="enlaces-plazas">
      <p className="aj-eyebrow">Plazas</p>
      <h2 id="enlaces-plazas">Una titular y un apoyo <em>por comisión.</em></h2>
      <div className="enlaces-cards">{seats.map(([name, role]) => <article key={name}><h3>{name}</h3><p>{role}</p></article>)}</div>
    </section>

    <section className="enlaces-dark" aria-labelledby="enlaces-calendario">
      <div className="aj-wrap enlaces-section">
        <p className="aj-eyebrow">{preview ? "Calendario propuesto" : "Calendario"}</p>
        <h2 id="enlaces-calendario">Del registro <em>a la toma de protesta.</em></h2>
        <ol className="enlaces-timeline">{calendar.map(([when, what], index) => <li key={when} data-last={index === calendar.length - 1}><time>{when}</time><span>{what}</span></li>)}</ol>
      </div>
    </section>

    <section className="aj-wrap enlaces-section enlaces-split" aria-label="Selección y compromisos">
      <div>
        <p className="aj-eyebrow">Cómo se selecciona</p>
        <ul className="enlaces-weights">{weights.map(([label, value]) => <li key={label}><span>{label}</span><strong>{value} %</strong><meter min={0} max={100} value={value} aria-hidden="true" /></li>)}</ul>
        <p className="enlaces-note">Evalúan tres personas: la coordinación general y dos integrantes que designe el Comité. Se busca equilibrio entre mujeres y hombres y entre escuelas, con una lista de suplentes.</p>
      </div>
      <div>
        <p className="aj-eyebrow">Durante el año</p>
        <ul className="enlaces-duties">{duties.map(item => <li key={item}>{item}</li>)}</ul>
        <p className="enlaces-note">Dos reportes mensuales seguidos sin entregar, sin aviso, liberan la plaza para la persona suplente.</p>
      </div>
    </section>

    <section className="enlaces-apply" id="postular" aria-labelledby="enlaces-pasos">
      <div className="aj-wrap enlaces-section">
        <h2 id="enlaces-pasos">Postúlate <em>en tres pasos.</em></h2>
        <ol className="enlaces-steps">
          <li><strong>Crea tu cuenta</strong><span>Confirma tu correo con el enlace que te enviamos.</span></li>
          <li><strong>Envía tu solicitud</strong><span>Elige tu comisión y marca que te postulas a Enlaces APJ.</span></li>
          <li><strong>Sube tus dos cartas</strong><span>En Mi comisión, en PDF, JPG o PNG, antes del cierre.</span></li>
        </ol>
        <div className="aj-actions"><Link className="button button-primary" href="/crear-cuenta">Crear mi cuenta</Link><Link className="aj-link" href="/participacion#registro">Ya tengo cuenta</Link></div>
        <p className="enlaces-note">Recibir tu solicitud no significa que fue aceptada. Te avisamos el resultado en tu cuenta. Postularte no te afilia a ningún partido.</p>
        {config.approval && <p className="enlaces-note">Bases aprobadas: {config.approval}</p>}
      </div>
    </section>
  </main>;
}
