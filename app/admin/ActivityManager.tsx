"use client";
import {useAdminFetch} from "./AdminSessionBoundary";
import DraftForm from './DraftForm';
import { useState, type FormEvent } from "react";
import VersionedForm from "./VersionedForm";
import { useRouter } from "next/navigation";
import type { Activity } from "@/lib/activities";

import { activityLocalTime as localTime, activityTimeToEpoch } from "@/lib/activity-time";

function Fields({ item }: { item?: Activity }) {
  return <><label>Nombre de la actividad<input name="title" required minLength={3} maxLength={140} defaultValue={item?.title}/></label><label>Detalles<textarea name="description" rows={3} required minLength={10} maxLength={1800} defaultValue={item?.description}/></label><label>Lugar o modalidad<input name="location" required minLength={3} maxLength={220} defaultValue={item?.location}/></label><div className="admin-form-pair"><label>Inicio · Ciudad de México<input type="datetime-local" name="startsLocal" required defaultValue={localTime(item?.startsAt)}/></label><label>Cierre · Ciudad de México<input type="datetime-local" name="endsLocal" required defaultValue={localTime(item?.endsAt)}/></label></div><label>Enlace de registro · opcional<input name="registrationUrl" type="url" placeholder="https://" maxLength={1000} defaultValue={item?.registrationUrl ?? ""}/><small>Usa el enlace de la convocatoria o del registro que ya administras.</small></label><label>Estado<select name="status" defaultValue={item?.status ?? "draft"}><option value="draft">Borrador</option><option value="published">Publicada</option><option value="cancelled">Cancelada</option></select></label></>;
}
export default function ActivityManager({ items }: { items: Activity[] }) {
  const accountFetch=useAdminFetch();
  const router = useRouter(), [busy,setBusy] = useState(""), [message,setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>, item?: Activity) {
    event.preventDefault(); const form = event.currentTarget, fields = Object.fromEntries(new FormData(form));
    const startsAt = item && fields.startsLocal === localTime(item.startsAt) ? item.startsAt : activityTimeToEpoch(String(fields.startsLocal)), endsAt = item && fields.endsLocal === localTime(item.endsAt) ? item.endsAt : activityTimeToEpoch(String(fields.endsLocal));
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) { setMessage("La actividad debe terminar después de la hora de inicio."); return false; }
    setBusy(item?.id ?? "new"); setMessage("");
    try {
      const response = await accountFetch(item ? `/api/activities/${item.id}` : "/api/activities", { method: item ? "PATCH" : "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({...fields, startsAt, endsAt, expectedUpdatedAt: item?.updatedAt}) });
      const result = await response.json() as { error?: string; message?: string }; setMessage(result.error ?? result.message ?? "Cambios guardados.");
      if (response.ok && !item) form.reset();
      if (response.ok || response.status === 409) router.refresh();
      return response.ok;
    } catch { setMessage("No se pudo guardar. Tus campos siguen aquí; revisa la conexión e inténtalo de nuevo."); return false; }
    finally { setBusy(""); }
  }
  return <section className="admin-section" id="admin-panel-agenda"><div className="admin-section-heading"><h2>Agenda</h2><p>Crea una actividad, revisa sus datos y publícala cuando esté confirmada.</p><a className="aj-link" href="/agenda" target="_blank" rel="noreferrer">Ver agenda pública</a></div><p role="status" aria-live="polite">{message}</p><details className="admin-record"><summary>Nueva actividad</summary><DraftForm onSubmit={e=>save(e)}><Fields/><button className="button button-primary" disabled={Boolean(busy)}>{busy === "new" ? "Guardando…" : "Guardar actividad"}</button></DraftForm></details><div className="admin-list">{items.length ? items.map(item=><details className="admin-record" key={item.id}><summary><span><strong>{item.title}</strong><small>{localTime(item.startsAt).replace("T", " · ")} · {item.status === "published" ? "Publicada" : item.status === "cancelled" ? "Cancelada" : "Borrador"}</small></span></summary><VersionedForm record={item} onSubmit={save}>{snapshot => <><Fields item={snapshot}/><button className="button button-primary" disabled={Boolean(busy)}>{busy === item.id ? "Guardando…" : "Guardar cambios"}</button></>}</VersionedForm></details>) : <p className="admin-empty">Todavía no hay actividades. Puedes guardar la primera como borrador.</p>}</div></section>;
}
