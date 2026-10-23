"use client";
import {useAdminFetch} from "./AdminSessionBoundary";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ApplicationProfileView from "@/app/ApplicationProfileView";
import ConsentRecord from "@/app/ConsentRecord";
import VersionedForm from "./VersionedForm";
import { commissionName } from "@/lib/commissions";
import { canChangeMembershipStatus, membershipStatuses, type MembershipApplication, type MembershipEvent, type MembershipStatus } from "@/lib/membership-shared";
type ApiResult={pagination:{page:number;pages:number;total:number};error?:string;message?:string;events:MembershipEvent[];application:MembershipApplication & {consentText:string;noticeSnapshot:string}};
const date=(n:number)=>new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(n);

function MembershipRecord({item,unavailable}:{item:MembershipApplication;unavailable:boolean}){
  const accountFetch=useAdminFetch();
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[history,setHistory]=useState<MembershipEvent[]|null>(null),[consent,setConsent]=useState(''),[notice,setNotice]=useState('');
  const [historyPages,setHistoryPages]=useState({page:1,pages:1,total:0});
  const historyTicket=useRef(0);
  const lock=useRef(false),router=useRouter();
  async function loadHistory(page=1){
    const ticket=++historyTicket.current;
    try{const response=await accountFetch(`/api/admin/incorporaciones/${item.id}?page=${page}`,{cache:'no-store'}),data=await response.json() as ApiResult;if(ticket!==historyTicket.current)return;if(!response.ok)throw new Error(data.error);setHistoryPages(data.pagination);setHistory(data.events);setConsent(data.application.consentText);setNotice(data.application.noticeSnapshot);}catch(error){setMessage(error instanceof Error?error.message:'No pudimos cargar el historial.');}
  }
  const ended=['withdrawn','closed'].includes(item.status);
  return <details className="admin-record membership-admin-record"><summary><span><strong>{item.name}</strong><small>{item.referenceCode} · {commissionName(item.commission)}</small></span><span className="status">{membershipStatuses[item.status]}</span></summary>
    <div className="membership-admin-body"><dl className="request-details"><div><dt>Cuenta</dt><dd>{item.ownerEmail}</dd></div><div><dt>Comisión</dt><dd>{commissionName(item.commission)}</dd></div><div><dt>Recepción</dt><dd>{date(item.createdAt)}</dd></div><div><dt>Conservación hasta</dt><dd>{date(item.retentionUntil)}</dd></div></dl><ApplicationProfileView json={item.profileJson}/>{item.note&&<p className="request-message">{item.note}</p>}
      {!ended&&<VersionedForm record={item} onSubmit={async(event,snapshot)=>{
        if(lock.current||unavailable)return false;lock.current=true;setBusy(true);setMessage('');
        const values=Object.fromEntries(new FormData(event.currentTarget));
        try{const response=await accountFetch(`/api/admin/incorporaciones/${snapshot.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)}),result=await response.json() as ApiResult;setMessage(result.error??result.message??"Seguimiento guardado.");if(response.ok||response.status===409)router.refresh();if(response.ok&&history)await loadHistory();return response.ok;}catch{setMessage('No pudimos guardar. Tu borrador sigue aquí.');return false;}finally{lock.current=false;setBusy(false);}
      }}>{snapshot=><fieldset disabled={busy||unavailable}><legend>Seguimiento interno</legend><label>Estado<select name="status" defaultValue={snapshot.status}>{(Object.keys(membershipStatuses) as MembershipStatus[]).filter(status=>status===snapshot.status||canChangeMembershipStatus(snapshot.status,status)).map(status=><option key={status} value={status}>{membershipStatuses[status]}</option>)}</select></label><label>Respuesta para la persona solicitante<textarea name="response" maxLength={1500} rows={3}/></label><p className="field-hint">La persona podrá leerla en su expediente. No se envía por correo ni WhatsApp. Si cierras la solicitud, explica aquí el motivo.</p><label>Nota interna<textarea name="note" maxLength={1500} rows={3}/></label><button className="button button-primary" disabled={busy||unavailable}>{busy?'Guardando…':'Guardar seguimiento'}</button></fieldset>}</VersionedForm>}
      {item.status==='accepted'&&<div className="admin-note"><p>La solicitud está aceptada. En Equipo puedes consultar si su acceso ya está habilitado y confirmarlo si sigue pendiente.</p><a className="button button-secondary" href={`/admin/comisiones?tab=equipo&commission=${item.commission}`}>Consultar equipo de {commissionName(item.commission)}</a></div>}<p className="membership-scope">Registrar una incorporación no concede militancia en el PAN, nombramientos ni permisos administrativos.</p><p role="status" aria-live="polite">{message}</p>
      <button type="button" className="button button-secondary" onClick={()=>void loadHistory()}>{history?'Actualizar historial':'Ver historial y consentimiento'}</button>
      {history&&<><ol className="membership-timeline">{history.map(event=><li key={event.id}><time>{date(event.createdAt)}</time><span>{event.kind==='note'?'Nota interna':event.kind==='response'?'Respuesta visible':event.actorType==='admin'?'Administración':'Solicitante'}</span><p>{event.body}</p><small>{event.actorEmail}</small></li>)}</ol>{historyPages.pages>1&&<nav className="membership-history-pages" aria-label="Páginas del historial"><span>Página {historyPages.page} de {historyPages.pages}</span>{historyPages.page>1&&<button type="button" onClick={()=>void loadHistory(historyPages.page-1)}>Más recientes</button>}{historyPages.page<historyPages.pages&&<button type="button" onClick={()=>void loadHistory(historyPages.page+1)}>Anteriores</button>}</nav>}<details className="membership-consent-proof"><summary>Constancia de consentimiento · {item.noticeVersion}</summary><p>{consent}</p><p>Cuenta autenticada · {item.ownerEmail}. Fecha · {date(item.consentAt)}. Mayoría de edad declarada, sin verificación documental.</p><ConsentRecord snapshot={notice}/></details></>}
    </div></details>;
}
export default function MembershipManager({items,enabled,unavailable,readiness,canConfigure}:{items:MembershipApplication[];enabled:boolean;unavailable:boolean;readiness:Array<{label:string;ready:boolean}>;canConfigure:boolean}){
  return <section className="admin-section" id="admin-panel-incorporaciones"><div className="admin-section-heading"><span className="admin-label">Registro interno · {enabled?'Recepción abierta':'Recepción cerrada'}</span><h2>Incorporaciones.</h2><p>Revisa la solicitud, deja seguimiento y registra la decisión. Consulta también la disponibilidad y las tres propuestas de quienes registraron interés en coordinar. La designación y la toma de protesta se resuelven por separado.</p></div>{!enabled&&<div className="admin-note"><p>{canConfigure ? "Completa los requisitos pendientes para abrir el registro." : "La apertura del registro la administra la cuenta propietaria."}</p><ul className="membership-pending">{readiness.filter(item=>!item.ready).map(item=><li key={item.label}>{item.label}</li>)}</ul>{canConfigure&&<a className="aj-link" href="/admin?section=configuracion#registro">Revisar apertura del registro</a>}</div>}<div className="admin-list">{items.length?items.map(item=><MembershipRecord item={item} key={item.id} unavailable={unavailable}/>):<p className="admin-empty">No hay solicitudes que coincidan con esta búsqueda.</p>}</div></section>;
}
