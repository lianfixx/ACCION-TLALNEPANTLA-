import Link from "next/link";
import type { Metadata } from "next";
import { listActivities, type Activity } from "@/lib/activities";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Agenda", description: "Fechas, lugares y detalles de las actividades de Acción Política Juvenil Tlalnepantla.", alternates: { canonical: "/agenda" } };
const date = (ms: number, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-MX", { ...options, timeZone: "America/Mexico_City" }).format(ms);
function ActivityRow({ item }: { item: Activity }) {
  return <article className="agenda-item"><time dateTime={new Date(item.startsAt).toISOString()}><strong>{date(item.startsAt,{day:"2-digit"})}</strong><span>{date(item.startsAt,{month:"short",year:"numeric"})}</span></time><div><div className="agenda-item-heading"><h2>{item.title}</h2>{item.status === "cancelled" && <span className="status">Cancelada</span>}</div><p className="agenda-location">{item.location} · {date(item.startsAt,{hour:"2-digit",minute:"2-digit"})} h</p><p>{item.description}</p><div className="agenda-actions">{item.registrationUrl && item.status === "published" && <a className="button button-primary" href={item.registrationUrl} target="_blank" rel="noreferrer">Consultar registro</a>}<a className="aj-link" href={`/api/activities/${item.id}/calendar`}>Guardar en mi calendario</a></div></div></article>;
}
async function loadAgenda() {
  let items: Activity[] = [], unavailable = false;
  try { items = await listActivities(); } catch { unavailable = true; }
  const now = Date.now(), upcoming = items.filter(i=>i.endsAt >= now), past = items.filter(i=>i.endsAt < now);
  return { upcoming, past, unavailable };
}
export default async function AgendaPage() {
  const { upcoming, past, unavailable } = await loadAgenda();
  return <main className="agenda-page aj-wrap" id="main-content"><header><p className="section-kicker">Acción Política Juvenil Tlalnepantla</p><h1>Agenda.</h1><p>Los horarios corresponden a Ciudad de México.</p></header>{unavailable ? <div className="agenda-empty" role="status"><h2>No pudimos cargar las actividades.</h2><p>Vuelve a intentarlo en unos minutos.</p></div> : upcoming.length ? <section aria-label="Próximas actividades">{upcoming.map(item=><ActivityRow key={item.id} item={item}/>)}</section> : <div className="agenda-empty"><h2>Aún no hay próximas fechas publicadas.</h2><p>Las actividades aparecerán aquí cuando se confirmen.</p><Link className="aj-link" href="/actualidad">Consultar publicaciones</Link></div>}{past.length > 0 && <details className="agenda-past"><summary>Actividades anteriores</summary>{past.map(item=><ActivityRow key={item.id} item={item}/>)}</details>}</main>;
}
