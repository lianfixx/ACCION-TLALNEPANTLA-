import Link from "next/link";
import { dataChannelConfiguration } from "@/lib/privacy-config";

const destinations = [
  { key: "agenda", title: "Agenda", copy: "Fechas, lugares y detalles de cada actividad.", action: "Consultar actividades", href: "/agenda" },
  { key: "ideas", title: "Propuestas", copy: "Un espacio para plantear una idea o una colaboración.", action: "Abrir solicitudes", href: "/participacion#contacto" },
  { key: "archivo", title: "Publicaciones", copy: "Noticias, experiencias y memoria de las actividades.", action: "Leer actualidad", href: "/actualidad" },
];

export default async function ActionPortal() {
  const contactEnabled = (await dataChannelConfiguration("contact")).enabled;
  return <div className="action-portal" data-motion="portal">
    <div className="portal-heading"><h2>En marcha.</h2><p>Agenda, propuestas y publicaciones.</p></div>
    <div className="portal-stage">
      <div className="portal-depth" aria-hidden="true"><span /><span /><span /></div>
      {destinations.map(item => <Link key={item.key} href={item.href} className={`portal-card portal-${item.key}`}>
        <span className="portal-card-top"><span className="portal-symbol" aria-hidden="true">{item.key === "agenda" ? <svg viewBox="0 0 32 32"><rect x="5" y="7" width="22" height="21" rx="4"/><path d="M5 13h22M11 4v6M21 4v6M11 19h3M18 19h3M11 23h3"/></svg> : item.key === "ideas" ? <svg viewBox="0 0 32 32"><path d="M16 4v24M4 16h24"/><circle cx="16" cy="16" r="11"/></svg> : <svg viewBox="0 0 32 32"><rect x="6" y="4" width="20" height="24" rx="3"/><path d="M11 10h10M11 15h10M11 20h6"/></svg>}</span><span className="portal-open" aria-hidden="true">+</span></span>
        <div><h3>{item.title}</h3><p>{item.key === "ideas" && !contactEnabled ? "El formulario de contacto general está temporalmente cerrado." : item.copy}</p></div><span className="portal-card-action">{item.key === "ideas" && !contactEnabled ? "Consultar contacto" : item.action}</span>
      </Link>)}
    </div>
  </div>;
}
