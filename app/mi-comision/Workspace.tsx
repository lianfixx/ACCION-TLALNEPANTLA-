"use client";
import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {commissionGuides} from '@/lib/commission-guides';
import {commissions,commissionName} from '@/lib/commissions';
import {membershipStatuses} from '@/lib/membership-shared';
import {docCategories,workFields,workKinds,workStatuses,workspaceConsent,workspaceNotice,workspaceVersion,type WorkDocument,type WorkItem,type WorkKind} from '@/lib/workspace-shared';
import {activityLocalTime,activityTimeToEpoch} from '@/lib/activity-time';
import {usePrivateData} from '@/lib/use-private-data';
import VersionedForm from '@/app/admin/VersionedForm';
import StaffLogout from '@/app/admin/StaffLogout';
import PanAffiliationGuide from '@/app/PanAffiliationGuide';
import {affiliationDocumentHelp,isAffiliationCategory} from '@/lib/pan-affiliation';
import {workspaceTab} from '@/lib/workspace-navigation';

type Team={id:string;account_id:string;commission:string;role:string;active:number;updated_at:number;name:string;username:string};
type Affiliation={account_id:string;folio:string;status:string;note:string;verification_source:string;verified_at:number|null;updated_at:number;retention_until:number;verified_document_id:string|null;verified_document_name:string|null;document_count:number;name?:string;username?:string};
type Data={actor:{id:string;name:string;admin:boolean};roles:{commission:string;role:string}[];application:{id:string;commission:string;status:string;reference_code:string}|null;items:WorkItem[];total:number;page:number;team:Team[];teamTotal:number;affiliations:Affiliation[];affiliationTotal:number;consent:boolean;documentsEnabled:boolean;personalDocumentsReady:boolean;noticeToken:string;candidates?:{username:string;name:string;commission:string}[]};
const date=(n:number)=>new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeZone:'America/Mexico_City'}).format(n);
const moment=(n:number)=>new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(n);
const states:Record<string,string>={...membershipStatuses,received:'Recibido',checked:'Archivo revisado',changes:'Necesita una corrección',reported:'En revisión',confirmed:'Afiliación comprobada'};
async function json<T=Record<string,unknown>>(path:string,body?:unknown,method='POST',accountId=''){
 const r=await fetch(path,body===undefined?{cache:'no-store'}:{method,headers:{'Content-Type':'application/json','X-Expected-Account-Id':accountId},body:JSON.stringify(body)});
 const x=await r.json() as T & {error?:string};
 if(!r.ok)throw Object.assign(new Error(x.error||'No pudimos completar la solicitud.'),{status:r.status});
 return x;
}

export default function Workspace({accountId,adminView=false,initialArea='',initialTab=''}:{accountId:string;adminView?:boolean;initialArea?:string;initialTab?:string}){
 const feedback=useRef<HTMLParagraphElement>(null),actionLock=useRef(false);
 const[sessionExpired,setSessionExpired]=useState(false);
 const[area,setArea]=useState(initialArea),[page,setPage]=useState(1),[tab,setTab]=useState(initialTab||(adminView?'actividades':'solicitud'));
 const[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState(''),[creating,setCreating]=useState(false),[kind,setKind]=useState<WorkKind>('event'),[tick,setTick]=useState(0);
 const {data,error:loadError,retry:load}=usePrivateData<Data>(`/api/espacio?commission=${area}&page=${page}&manage=${adminView?1:0}&view=${tab==='archivo'?'archive':'active'}`,tick,accountId);
 useEffect(()=>{if(message&&message!=='Guardado.')feedback.current?.focus();},[message]);
 useEffect(()=>{
  const restore=()=>{const q=new URLSearchParams(window.location.search);setTab(workspaceTab(q.get('tab'))||(adminView?'actividades':'solicitud'));setArea(q.get('commission')||'');setPage(1);setSelected('');setCreating(false);};
  window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);
 },[adminView]);
 function changeView(nextTab:string,nextArea=area){
  setTab(nextTab);setArea(nextArea);setPage(1);setSelected('');setCreating(false);setMessage('');
  const url=new URL(window.location.href);url.searchParams.set('tab',nextTab);if(nextArea)url.searchParams.set('commission',nextArea);else url.searchParams.delete('commission');
  window.history.pushState(null,'',url.pathname+url.search+url.hash);
 }
 async function act(path:string,body:unknown,method='POST'){
  if(actionLock.current)return false;actionLock.current=true;setBusy(true);setMessage('');
  try{await json(path,body,method,accountId);setSessionExpired(false);setTick(v=>v+1);setMessage('Guardado.');return true;}
  catch(e){const status=(e as Error&{status?:number}).status;if(status===409)setTick(v=>v+1);if(status===401||status===412)setSessionExpired(true);setMessage((e as Error).message);return false;}
  finally{actionLock.current=false;setBusy(false);}
 }
 const admin=adminView&&(!data||data.actor.admin),areas=admin?commissions:commissions.filter(c=>data?.roles.some(r=>r.commission===c.id));
 const available=area?areas.filter(c=>c.id===area):areas;
 const profileReceived=Boolean(data?.application&&['submitted','in_review','accepted'].includes(data.application.status));
 const hasEnrollment=Boolean(data?.roles.length||profileReceived);
 const canReceive=Boolean(data?.documentsEnabled&&hasEnrollment);
 const commissionConfirmed=Boolean(data?.roles.length),affiliation=data?.affiliations[0];
 const affiliationComplete=Boolean(commissionConfirmed&&data?.personalDocumentsReady&&affiliation?.status==='confirmed'&&affiliation.verified_document_id);
 const readyForAffiliation=Boolean(commissionConfirmed&&data?.personalDocumentsReady);
 const canReceiveAffiliation=Boolean(data?.documentsEnabled&&readyForAffiliation);
 const tabs=admin?[['solicitud','Solicitudes'],['expediente','Documentos personales'],['afiliacion','Afiliación PAN'],['actividades','Actividades'],['equipo','Equipo'],['archivo','Archivo']]:[
  ['solicitud','Mi registro'],['expediente','Documentos personales'],
  ...(areas.length?[['actividades','Actividades'],['equipo','Mi equipo'],['archivo','Archivo']]:[]),
  ...(commissionConfirmed||data?.affiliations.length?[['afiliacion','Afiliación PAN']]:[]),
 ];
 return <main className="workspace" id="main-content">
  <header className="workspace-header"><div><Link href={admin?'/admin':'/'} className="text-link">{admin?'Volver al panel':'Acción Política Juvenil Tlalnepantla'}</Link><h1>{admin?'Comisiones':'Mi comisión'}</h1>{data&&<p>{data.actor.name}</p>}</div><div className="workspace-actions"><Link href="/comisiones">Guías de comisiones</Link>{data?.actor.admin&&!admin&&<Link href="/admin/comisiones">Administración</Link>}<Link href={admin?'/admin/cuenta':'/cuenta'}>Mi cuenta</Link><StaffLogout accountId={accountId}/></div></header>
  <div className="workspace-toolbar"><nav aria-label="Apartados de la comisión">{tabs.map(([id,label])=><button key={id} disabled={busy} aria-current={tab===id?'page':undefined} onClick={()=>changeView(id)}>{label}</button>)}</nav>{(admin||areas.length>1)&&<label>Comisión<select value={area} disabled={busy} onChange={e=>changeView(tab,e.target.value)}><option value="">{admin?'Todas las comisiones':'Todas mis comisiones'}</option>{areas.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}</div>
  <p ref={feedback} tabIndex={-1} className="workspace-feedback" role="status" aria-live="polite">{message||loadError}</p>
  {sessionExpired&&<p><Link href={`/ingresar?returnTo=${encodeURIComponent('/mi-comision?tab='+tab)}`} target="_blank" rel="noreferrer">Inicia sesión con la misma cuenta en otra pestaña</Link> y vuelve para guardar. Tus campos siguen aquí.</p>}
  {loadError&&<button className="text-link" onClick={load}>Actualizar información</button>}
  {!data?<div className="workspace-card"><p>{loadError?'No pudimos cargar tu espacio. Inténtalo de nuevo.':'Cargando tu espacio…'}</p><button className="text-link" onClick={()=>void load()}>Volver a intentar</button></div>:<fieldset key={data.actor.id} className="workspace-surface" disabled={Boolean(loadError)}>
   {tab==='solicitud'&&<section className="workspace-card workspace-application">
    <h2>{admin?'Solicitudes de incorporación':'Mi registro'}</h2>
    {admin?<><p>Revisa el perfil, los documentos y las propuestas. Los tres documentos personales deben quedar revisados. Después de aceptar la solicitud, habilita el acceso en Equipo para abrir el último paso de afiliación al PAN.</p><div className="workspace-actions"><Link className="button button-primary" href="/admin?section=incorporaciones">Revisar solicitudes</Link><button className="button button-secondary" onClick={()=>changeView('equipo')}>Abrir Equipo</button></div></>:<>
     <ol className="workspace-onboarding" aria-label="Avance de tu registro">
      <li data-complete="true"><strong>Cuenta</strong><span>Creada</span></li>
      <li data-complete={profileReceived}><strong>Perfil</strong><span>{profileReceived?'Datos recibidos':commissionConfirmed?'Registro previo':'Por completar'}</span></li>
      <li data-complete={commissionConfirmed}><strong>Comisión</strong><span>{commissionConfirmed?'Confirmada':'Por confirmar'}</span></li>
      <li data-complete={affiliationComplete}><strong>Afiliación PAN</strong><span>{affiliationComplete?'Comprobante revisado':commissionConfirmed?!data.personalDocumentsReady?'Documentos pendientes':affiliation?.status==='changes'?'Requiere corrección':affiliation?'En seguimiento':'Por completar':'Último paso'}</span></li>
     </ol>
     {data.application?<><div className="workspace-status">{states[data.application.status]||data.application.status}</div><h3>{commissionName(data.application.commission)}</h3><p>Folio {data.application.reference_code}</p><p>{data.application.status==='accepted'?(data.roles.length?'Tu solicitud fue aceptada y tu acceso al equipo está habilitado.':'Tu solicitud fue aceptada. Falta habilitar tu acceso al equipo.'):
      data.application.status==='submitted'?'Tu solicitud llegó al equipo. Consulta aquí las respuestas y cualquier dato que te pidan aclarar.':
      data.application.status==='in_review'?'El equipo está revisando tu solicitud. Abre el seguimiento para leer las respuestas o corregir tus datos.':
      'Abre el seguimiento para consultar el cierre o presentar una nueva solicitud.'}</p><Link className="button button-primary" href="/participacion#registro">Ver solicitud y respuestas</Link></>:
      data.roles.length?<><div className="workspace-status">Acceso al equipo habilitado</div><p>{data.roles.map(r=>commissionName(r.commission)).join(' · ')}</p></>:<><p>Elige una comisión y comparte tus datos y disponibilidad. Si quieres coordinar, añade tu experiencia y tres propuestas.</p><Link className="button button-primary" href="/participacion#registro">Completar mi solicitud</Link></>}
     {hasEnrollment&&(!data.personalDocumentsReady||commissionConfirmed)&&<div className="workspace-next-action"><h3>{readyForAffiliation?(affiliationComplete?'Ya completaste el último paso':'Completa el último paso'):'Revisa tus documentos personales'}</h3><p>{readyForAffiliation?(affiliationComplete?'Administración revisó tu comprobante. Puedes consultarlo y continuar con las actividades de tu comisión.':'Tu comisión está confirmada. Realiza tu afiliación en la app del PAN y sube el documento que la acredita. Si ya estás afiliado, entrega tu comprobante sin repetir el trámite.'):commissionConfirmed?'Tu comisión está confirmada. Para entregar o actualizar el comprobante PAN, la INE por ambos lados y el comprobante de domicilio deben aparecer como Archivo revisado. Consulta si falta entregar o corregir alguno.':'Sube la INE por ambos lados y el comprobante de domicilio. Administración debe revisar los tres documentos antes de confirmar tu comisión y abrir el paso de afiliación.'}</p><button className="button button-primary" onClick={()=>changeView(readyForAffiliation?(affiliationComplete?'actividades':'afiliacion'):'expediente')}>{readyForAffiliation?(affiliationComplete?'Abrir actividades':affiliation?'Continuar mi afiliación':'Completar mi afiliación'):'Abrir documentos personales'}</button>{readyForAffiliation&&affiliationComplete&&<button className="text-link" onClick={()=>changeView('afiliacion')}>Ver mi comprobante</button>}</div>}
     {!commissionConfirmed&&<p className="workspace-help">La afiliación al PAN aparecerá al final, cuando tu comisión esté confirmada. La toma de protesta se comunicará por separado.</p>}
    </>}
   </section>}
   {tab==='expediente'&&<section className="workspace-card workspace-personal-docs">
    <h2>Documentos personales</h2>
    <p>{admin?'Revisa la INE por ambos lados y el comprobante de domicilio. Los tres deben quedar como Archivo revisado antes de confirmar el acceso al equipo.':'Entrega aquí la INE por ambos lados y el comprobante de domicilio. Administración revisará los tres documentos para confirmar tu comisión.'}</p>
    {!admin&&!hasEnrollment&&<div className="workspace-next-action"><p>Primero envía tu solicitud para poder entregar los documentos.</p><Link className="button button-primary" href="/participacion#registro">Completar mi solicitud</Link></div>}
    {!admin&&!data.documentsEnabled&&<p>La recepción de documentos está cerrada en este momento. Puedes consultar lo que ya entregaste.</p>}
    {admin||data.consent?<Documents admin={admin} categoryOnly="identity" ownerId={data.actor.id} area={area} allowUpload={!admin&&canReceive} onUploaded={()=>setTick(v=>v+1)} act={act} tick={tick}/>:hasEnrollment&&data.documentsEnabled?<Consent key={data.noticeToken} data={data} act={act} busy={busy}/>:null}
    {!admin&&<div className="workspace-next-action"><p>{readyForAffiliation?(affiliationComplete?'Tus documentos y tu comprobante PAN están revisados. Puedes consultar el seguimiento de tu afiliación.':'Tus documentos están revisados y tu comisión confirmada. El siguiente paso es entregar tu comprobante de afiliación al PAN.'):data.personalDocumentsReady?'Tus documentos están revisados. Consulta en Mi registro la confirmación de tu comisión.':'Consulta aquí la respuesta a cada documento. Los tres deben aparecer como Archivo revisado antes de iniciar el último paso de afiliación al PAN.'}</p><button className="button button-secondary" onClick={()=>changeView(readyForAffiliation?'afiliacion':'solicitud')}>{readyForAffiliation?(affiliationComplete?'Ver mi afiliación':'Continuar con mi afiliación'):'Ver mi registro'}</button></div>}
   </section>}
   {(tab==='actividades'||tab==='archivo')&&<section className="workspace-card">
    {selected?<ItemDetail key={selected} id={selected} admin={admin} actorId={data.actor.id} consent={data.consent} busy={busy} act={act} tick={tick} onBack={()=>setSelected('')}/>:
     creating?<WorkForm key={kind} areas={available} kind={kind} busy={busy} onCancel={()=>setCreating(false)} onSave={async value=>{if(await act('/api/espacio',{action:'create',...value}))setCreating(false);}}/>:<>
      <div className="workspace-section-head"><div><h2>{tab==='archivo'?'Archivo de la comisión':'Actividades y seguimiento'}</h2><p>{tab==='archivo'?'Consulta lo que ya se realizó y las entregas para el siguiente equipo.':'Elige el formato que necesitas. Puedes guardar un borrador y completar los datos antes de enviarlo a revisión.'}</p></div>
       {available.length>0&&tab!=='archivo'&&(admin||data.consent)&&<div className="workspace-new"><label className="sr-only" htmlFor="work-kind">Tipo de registro</label><select id="work-kind" value={kind} onChange={e=>setKind(e.target.value as WorkKind)}>{Object.entries(workKinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><button className="button button-primary" onClick={()=>setCreating(true)}>Completar formato</button></div>}
      </div>
      {!data.consent&&!admin&&areas.length>0&&<p><button className="text-link" onClick={()=>changeView('expediente')}>Acepta el aviso en Documentos personales</button> para registrar actividades.</p>}
      {!areas.length&&!admin?<p>Tu acceso a la comisión debe estar habilitado para que puedas registrar actividades.</p>:<>
       <div className="workspace-list">{data.items.filter(i=>tab==='archivo'?['archived','completed'].includes(i.status):i.status!=='archived').map(i=><button className="workspace-row" key={i.id} onClick={()=>setSelected(i.id)}><span><small>{commissionName(i.commission)} · {workKinds[i.kind]}</small><strong>{i.title}</strong><small>{i.owner_name} · {date(i.updated_at)}</small></span><span className="workspace-status">{workStatuses[i.status]}</span></button>)}</div>
       {!data.items.length&&<p>{tab==='archivo'?'Todavía no hay actividades cerradas en el archivo.':'Todavía no hay actividades. Puedes empezar con un Formato de Evento o una consulta.'}</p>}
       <Pager page={page} total={data.total} size={30} setPage={setPage}/>
      </>}
      <a className="text-link" href="/documentos/formato-evento.pdf" download>Descargar Formato de Evento</a>
     </>}
   </section>}
   {tab==='equipo'&&<section className="workspace-card">
    <div className="workspace-section-head"><h2>{admin?'Equipo de cada comisión':'Mi equipo'}</h2><Link href="/comisiones">Consultar responsabilidades</Link></div>
    {(area?areas.filter(c=>c.id===area):areas).map(c=><section className="workspace-team" key={c.id}><h3>{c.name}</h3>
     <ul>{data.team.filter(m=>m.commission===c.id).map(m=><li key={m.id}><span><strong>{m.name}</strong><small>{m.username} · {m.role==='coordinator'?'Coordinación':'Integrante'}{!m.active?' · Acceso retirado':''}</small></span>{admin&&<div className="workspace-inline"><button disabled={busy} onClick={()=>void act('/api/espacio',{action:'team',username:m.username,commission:m.commission,role:m.role==='coordinator'?'member':'coordinator',active:Boolean(m.active),expectedUpdatedAt:m.updated_at})}>{m.role==='coordinator'?'Pasar a integrante':'Asignar coordinación'}</button><button disabled={busy} onClick={()=>void act('/api/espacio',{action:'team',username:m.username,commission:m.commission,role:m.role,active:!m.active,expectedUpdatedAt:m.updated_at})}>{m.active?'Retirar acceso':'Restablecer acceso'}</button></div>}</li>)}</ul>
     {(admin||data.roles.some(r=>r.commission===c.id&&r.role==='coordinator'))&&<form className="workspace-inline-form" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form);if(await act('/api/espacio',{action:'team',commission:c.id,username:f.get('username'),role:'member',active:true}))form.reset();}}><label>Usuario de la persona con solicitud aceptada<input name="username" list={`candidates-${c.id}`} required maxLength={40}/><datalist id={`candidates-${c.id}`}>{data.candidates?.filter(x=>x.commission===c.id).map(x=><option key={x.username} value={x.username}>{x.name}</option>)}</datalist></label><button className="button button-secondary" disabled={busy}>Habilitar acceso al equipo</button></form>}
    </section>)}
    {!areas.length&&!admin&&<p>Tu equipo aparecerá cuando administración habilite tu acceso.</p>}
    <Pager page={page} total={data.teamTotal} size={60} setPage={setPage}/>
    <p className="workspace-help">{admin?'Para habilitar o restablecer el acceso, la solicitud debe estar aceptada y los tres documentos personales vigentes deben quedar como Archivo revisado. Después la persona podrá entregar su comprobante PAN.':'Cada persona crea su cuenta y presenta su solicitud. Administración revisa sus documentos y confirma su incorporación. La afiliación al PAN se completa después, desde su propia cuenta.'}</p>
   </section>}
   {tab==='afiliacion'&&<div className={admin?'workspace-affiliation-admin':'workspace-columns'}>
    {!admin&&<section className="workspace-card"><p className="workspace-eyebrow">Último paso</p><h2>Tu afiliación al PAN</h2>{readyForAffiliation?<PanAffiliationGuide/>:<><p>{commissionConfirmed?'Tu comisión está confirmada. Antes de entregar o actualizar el comprobante PAN, los tres documentos personales deben estar revisados. Consulta si falta entregar o corregir alguno.':'Primero completa tu perfil y entrega los documentos personales. Este paso se abre cuando administración revisa los tres documentos y confirma tu comisión.'}</p><button className="button button-primary" onClick={()=>changeView(commissionConfirmed?'expediente':'solicitud')}>{commissionConfirmed?'Abrir documentos personales':'Volver a mi registro'}</button>{data.affiliations.length>0&&<p className="workspace-help">Puedes consultar el seguimiento y los documentos que ya entregaste.</p>}</>}</section>}
    <section className="workspace-card"><h2>{admin?'Revisión de documentos PAN':'Mi seguimiento'}</h2>
     {data.affiliations.map(f=><div className="workspace-affiliation" key={f.account_id}>
      {admin&&<h3>{f.name} <small>{f.username}</small></h3>}
      <span className="workspace-status">{states[f.status]||f.status}</span>
      <p>{f.folio?`Folio ${f.folio}`:f.document_count?'Documento recibido para revisión':'Sin documentos vigentes'}</p>
      {f.note?<p className="workspace-review-response">{f.note}</p>:f.status==='reported'&&<p>El folio o documento llegó a administración. Consulta este apartado para leer su respuesta.</p>}
      {f.verified_at&&<><p className="workspace-help">Administración registró la comprobación el {date(f.verified_at)} con {f.verification_source}.</p>{f.verified_document_id&&<a className="text-link" href={`/api/espacio/documentos/${f.verified_document_id}`}>Ver el comprobante revisado</a>}</>}
      <small>Disponible hasta {date(f.retention_until)}</small>
      {admin&&<><Documents admin ownerId={data.actor.id} accountFilter={f.account_id} categoryOnly="affiliation" act={act} tick={tick}/><AffiliationReview actorId={accountId} affiliation={f} act={act} busy={busy} tick={tick}/></>}
     </div>)}
     {!admin&&<>
      {!data.documentsEnabled&&<p>La recepción de documentos está cerrada en este momento.</p>}
      {readyForAffiliation&&<p className="workspace-required-proof">{affiliationComplete?'Último paso completado. Tu comprobante fue revisado.':'Para completar este paso debes subir el comprobante de afiliación y recibir la revisión de administración. Un folio o un acuse mantienen el trámite pendiente.'}</p>}
      {data.consent?<><Documents categoryOnly="affiliation" ownerId={data.actor.id} allowUpload={canReceiveAffiliation&&!affiliationComplete} onUploaded={()=>setTick(v=>v+1)} act={act} tick={tick}/>{canReceiveAffiliation&&!affiliationComplete&&<details className="workspace-notice"><summary>Mi trámite sigue en proceso</summary><p>Puedes guardar el folio o entregar el acuse mientras esperas la confirmación del PAN. Después deberás subir el comprobante de afiliación.</p><Documents categoryOnly="affiliation_receipt" ownerId={data.actor.id} allowUpload uploadOnly onUploaded={()=>setTick(v=>v+1)} act={act} tick={tick}/><VersionedForm className="workspace-form" record={{updatedAt:data.affiliations[0]?.updated_at??0,folio:data.affiliations[0]?.folio||''}} onSubmit={async(e,snapshot)=>act('/api/espacio',{action:'affiliation',folio:new FormData(e.currentTarget).get('folio'),expectedUpdatedAt:snapshot.updatedAt})}>{snapshot=><><label>Folio del trámite, si te lo proporcionaron<input name="folio" required maxLength={120} defaultValue={snapshot.folio}/></label><button className="button button-secondary" disabled={busy}>Guardar folio</button></>}</VersionedForm></details>}</>:
       readyForAffiliation&&data.documentsEnabled?<Consent key={data.noticeToken} data={data} act={act} busy={busy}/>:null}
      {data.consent&&canReceiveAffiliation&&affiliationComplete&&<details className="workspace-notice"><summary>Actualizar mi comprobante</summary><p>Un archivo nuevo se enviará a revisión y este paso quedará pendiente hasta que lo revisen.</p><Documents categoryOnly="affiliation" ownerId={data.actor.id} allowUpload uploadOnly onUploaded={()=>setTick(v=>v+1)} act={act} tick={tick}/></details>}
      {!commissionConfirmed&&!data.affiliations.length&&<p>Tu último paso aparecerá aquí cuando se confirme tu comisión.</p>}
     </>}
     {admin&&!data.affiliations.length&&<p>No hay trámites reportados en esta selección.</p>}
     {admin&&<Pager page={page} total={data.affiliationTotal} size={40} setPage={setPage}/>}</section>
   </div>}
  </fieldset>}
 </main>;
}
type Action=(path:string,body:unknown,method?:string)=>Promise<boolean>;
function AffiliationReview({actorId,affiliation,act,busy,tick}:{actorId:string;affiliation:Affiliation;act:Action;busy:boolean;tick:number}){
 const {data,error,retry}=usePrivateData<{documents:WorkDocument[]}>(`/api/espacio/documentos?manage=1&category=affiliation&accountId=${affiliation.account_id}`,tick,actorId);
 const proofs=(data?.documents??[]).filter(d=>d.category==='affiliation'&&['received','checked'].includes(d.status));
 return <div>
  {error&&<p role="alert">{error} <button type="button" onClick={retry}>Volver a cargar</button></p>}
  {!data&&!error&&<p role="status">Consultando comprobantes…</p>}
  <fieldset className="workspace-surface" disabled={!data||Boolean(error)}>
  <VersionedForm className="workspace-form" record={{...affiliation,updatedAt:affiliation.updated_at}} onSubmit={async(e,snapshot)=>{const v=new FormData(e.currentTarget);return act('/api/espacio',{action:'review-affiliation',accountId:snapshot.account_id,expectedUpdatedAt:snapshot.updatedAt,status:v.get('status'),source:v.get('source'),note:v.get('note'),documentId:v.get('documentId')});}}>{snapshot=><AffiliationReviewFields affiliation={snapshot} proofs={proofs} busy={busy}/>}</VersionedForm>
 </fieldset></div>;
}
function AffiliationReviewFields({affiliation,proofs,busy}:{affiliation:Affiliation;proofs:WorkDocument[];busy:boolean}){
 const[status,setStatus]=useState('changes');
 const confirming=status==='confirmed';
 return <>
  <label>Resultado de la revisión<select name="status" value={status} onChange={e=>setStatus(e.target.value)}><option value="changes">Pedir aclaración</option><option value="confirmed" disabled={!proofs.length}>Afiliación comprobada</option></select></label>
  <label>Comprobante que revisaste<select name="documentId" required={confirming} defaultValue={affiliation.verified_document_id||''}><option value="">Selecciona el comprobante para confirmar</option>{proofs.map(d=><option key={d.id} value={d.id}>{d.name} · {date(d.created_at)}</option>)}</select></label>
  <p className="workspace-help">Para confirmar, revisa que el comprobante del PAN corresponda a esta persona y acredite su afiliación. Un acuse, folio o constancia de asistencia no son suficientes.</p>
  {!proofs.length&&<p>No hay un comprobante disponible para confirmar. Puedes pedirlo en la respuesta.</p>}
  <label>Cómo comprobaste la afiliación<input name="source" required={confirming} maxLength={500} placeholder="Documento o referencia institucional consultada"/></label>
  <label>Respuesta<textarea name="note" required maxLength={2000}/></label><button className="button button-secondary" disabled={busy}>Guardar revisión</button>
 </>;
}
function Consent({data,act,busy}:{data:Data;act:Action;busy:boolean}){return <div><p>Los documentos personales solo pueden consultarlos tú y administración.</p><details className="workspace-notice"><summary>Leer el aviso del expediente</summary>{workspaceNotice.map(s=><section key={s.title}><h3>{s.title}</h3><p>{s.body}</p></section>)}<Link href="/privacidad/registro" target="_blank">Responsable, domicilio y procedimiento para ejercer tus derechos</Link></details><form className="workspace-form" onSubmit={e=>{e.preventDefault();void act('/api/espacio',{action:'consent',version:workspaceVersion,noticeToken:data.noticeToken,consent:true});}}><label className="workspace-check"><input type="checkbox" required/>{workspaceConsent}</label><button className="button button-secondary" disabled={busy||!data.documentsEnabled}>Aceptar y continuar</button></form></div>}
function Documents(props:Parameters<typeof DocumentsContent>[0]){return <DocumentsContent key={JSON.stringify([props.ownerId,props.area,props.itemId,props.categoryOnly,props.accountFilter,props.admin])} {...props}/>;}
function DocumentsContent({admin=false,ownerId,itemId,categoryOnly,accountFilter,area='',allowUpload=false,uploadOnly=false,onUploaded,act,tick}:{admin?:boolean;ownerId:string;itemId?:string;categoryOnly?:string;accountFilter?:string;area?:string;allowUpload?:boolean;uploadOnly?:boolean;onUploaded?:()=>void;act:Action;tick:number}){
 const[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[page,setPage]=useState(1),[refresh,setRefresh]=useState(0),[category,setCategory]=useState(itemId?'evidence':categoryOnly==='affiliation'||categoryOnly==='affiliation_receipt'?categoryOnly:'');
 const uploadLock=useRef(false);
 const identity=categoryOnly==='identity',affiliation=categoryOnly==='affiliation';
 const {data:loaded,error:loadError,retry}=usePrivateData<{documents:WorkDocument[];hasMore:boolean}>(`/api/espacio/documentos?commission=${area}&page=${page}&manage=${admin?1:0}${categoryOnly?'&category='+categoryOnly:''}${accountFilter?'&accountId='+accountFilter:''}${itemId?'&itemId='+itemId:''}`,`${tick}:${refresh}`,ownerId);
 const docs=loaded?.documents??[],more=loaded?.hasMore??false;
 const categoryMatches=(key:string)=>itemId?key==='evidence':identity?['ine_front','ine_back','address'].includes(key):affiliation?isAffiliationCategory(key):categoryOnly?key===categoryOnly:key!=='evidence';
 async function upload(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(uploadLock.current)return;
  const form=e.currentTarget,f=new FormData(form),file=f.get('file') as File,chosen=String(f.get('category')||'');
  if(!file?.size||!categoryMatches(chosen)||!Object.hasOwn(docCategories,chosen)||(affiliation&&chosen!=='affiliation')){setMsg('Elige el tipo de documento y selecciona el archivo.');return;}
  if(file.size>5*1024*1024){setMsg('El archivo debe pesar hasta 5 MB.');return;}
  uploadLock.current=true;setBusy(true);setMsg('');
  try{
   const r=await fetch(`/api/espacio/documentos?category=${chosen}${itemId?'&itemId='+itemId:''}`,{method:'POST',headers:{'Content-Type':file.type,'X-File-Name':encodeURIComponent(file.name),'X-Expected-Account-Id':ownerId},body:file});
   const x=await r.json() as {error?:string};if(!r.ok)throw new Error(x.error||'No pudimos guardar el documento.');
   form.reset();setRefresh(v=>v+1);onUploaded?.();setMsg(chosen==='affiliation'?'Comprobante recibido. Administración lo revisará y verás aquí la respuesta.':chosen==='affiliation_receipt'?'Acuse recibido. Cuando el PAN confirme tu afiliación, entrega el comprobante para completar el último paso.':'Documento recibido. Puedes consultar aquí la respuesta de administración.');
  }catch(e){setMsg((e as Error).message);}finally{uploadLock.current=false;setBusy(false);}
 }
 return <div className="workspace-documents">
  <fieldset className="workspace-surface" disabled={Boolean(loadError)}>
   {identity&&!admin&&loaded&&<ul className="workspace-document-checklist" aria-label="Documentos del expediente">{(['ine_front','ine_back','address'] as const).map(key=>{
    const latest=docs.find(d=>d.category===key);return <li key={key}><strong>{docCategories[key]}</strong><span>{latest?states[latest.status]||latest.status:'Por entregar'}</span></li>;
   })}</ul>}
   {!uploadOnly&&docs.filter(d=>categoryMatches(d.category)).map(d=><article className="workspace-document" key={d.id}>
    <div><strong>{docCategories[d.category]}</strong>{admin&&<span>{d.owner_name}</span>}<a href={`/api/espacio/documentos/${d.id}`}>{d.name}</a><small>{states[d.status]||d.status} · Disponible hasta {date(d.retention_until)}</small>{d.review_note&&<p className="workspace-review-response">{d.review_note}</p>}</div>
    {(admin||d.owner_id===ownerId)&&<button className="text-link" onClick={()=>void act(`/api/espacio/documentos/${d.id}`,{action:'remove',expectedUpdatedAt:d.updated_at},'PATCH')}>Retirar documento</button>}
    {admin&&<VersionedForm className="workspace-form" record={{...d,updatedAt:d.updated_at}} onSubmit={async(e,snapshot)=>{const f=new FormData(e.currentTarget);return act(`/api/espacio/documentos/${d.id}`,{action:'review',status:f.get('status'),note:f.get('note'),expectedUpdatedAt:snapshot.updatedAt},'PATCH');}}>{()=><><label>Resultado de la revisión<select name="status"><option value="checked">Archivo revisado</option><option value="changes">Pedir corrección</option></select></label><label>Respuesta para la persona<textarea name="note" required maxLength={1200}/></label><button className="button button-secondary">Guardar revisión del archivo</button></>}</VersionedForm>}
   </article>)}
   {!uploadOnly&&(!loaded?<p role="status">{loadError||'Cargando documentos…'}{loadError&&<button type="button" className="text-link" onClick={retry}>Volver a intentar</button>}</p>:!docs.length&&<p>{affiliation?'Todavía no has entregado tu comprobante.':'Aún no hay documentos recibidos.'}</p>)}
   {allowUpload&&<form className="workspace-form workspace-upload" onSubmit={upload}>
    {affiliation||categoryOnly==='affiliation_receipt'?<><h3>{affiliation?'Sube tu comprobante de afiliación':'Comparte el acuse del trámite'}</h3><input type="hidden" name="category" value={affiliation?'affiliation':'affiliation_receipt'}/></>:
     itemId?<input type="hidden" name="category" value="evidence"/>:
     <label>Qué documento vas a entregar<select name="category" required value={category} onChange={e=>setCategory(e.target.value)}><option value="">Selecciona el documento</option>{Object.entries(docCategories).filter(([key])=>categoryMatches(key)).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>}
    {isAffiliationCategory(category)&&<p className="workspace-help">{affiliationDocumentHelp[category as keyof typeof affiliationDocumentHelp]}</p>}
    {category==='address'&&<p className="workspace-help">El domicilio debe poder leerse. Puedes ocultar consumos, saldos y números de cuenta.</p>}
    <label>{affiliation?'Comprobante de afiliación PAN':categoryOnly==='affiliation_receipt'?'Acuse del trámite PAN':'Selecciona el archivo'}<input name="file" type="file" accept="application/pdf,image/jpeg,image/png" required/></label>
    <small>PDF, JPG o PNG de hasta 5 MB. Conserva el nombre y la información que permiten identificar el documento.</small>
    <button className="button button-primary" disabled={busy}>{busy?'Guardando archivo…':affiliation?'Enviar mi comprobante':categoryOnly==='affiliation_receipt'?'Guardar acuse':'Entregar documento'}</button>
   </form>}
  </fieldset>
  {loadError&&<p role="alert">{loadError} <button className="text-link" onClick={retry}>Actualizar documentos</button></p>}
  {msg&&<p className="workspace-upload-feedback" role="status">{msg}</p>}
  {!uploadOnly&&(page>1||more)&&<div className="workspace-pagination"><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page}</span><button disabled={!more} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div>}
 </div>;
}
function WorkForm({areas,kind,item,busy,onSave,onCancel}:{areas:readonly {id:string;name:string}[];kind:WorkKind;item?:WorkItem;busy:boolean;onSave:(v:Record<string,unknown>)=>Promise<void>;onCancel:()=>void}){
 const[base,setBase]=useState(item);
 const[commission,setCommission]=useState(base?.commission||areas[0]?.id||'');
 const details:Record<string,string>=base?JSON.parse(base.details_json):{};const local=(n:number|null)=>activityLocalTime(n??undefined);
 return <form key={base?.updated_at??"new"} className="workspace-form workspace-work-form" onSubmit={e=>{e.preventDefault();const form=e.currentTarget,f=new FormData(form),titleInput=form.elements.namedItem('title') as HTMLInputElement;if(String(f.get('title')||'').trim().length<4){titleInput.setCustomValidity('Ponle un nombre de al menos 4 caracteres para guardar este formato.');titleInput.reportValidity();return;}titleInput.setCustomValidity('');void onSave({kind,commission,expectedUpdatedAt:base?.updated_at,title:f.get('title'),venue:f.get('venue'),startsAt:activityTimeToEpoch(String(f.get('startsAt'))),endsAt:activityTimeToEpoch(String(f.get('endsAt'))),details:Object.fromEntries(workFields[kind].map(x=>[x.key,f.get(x.key)])),submit:(e.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='submit'});}}><div className="workspace-section-head"><h2>{workKinds[kind]}</h2><button type="button" className="text-link" onClick={onCancel}>Volver</button></div>{base&&item&&base.updated_at!==item.updated_at&&<div role="status"><p>La actividad cambió mientras la editabas. Tus campos siguen aquí.</p><button type="button" className="button button-secondary" onClick={()=>setBase(item)}>Descartar borrador y cargar versión actual</button></div>}<div className="workspace-form-pair"><label>Comisión<select name="commission" value={commission} onChange={e=>setCommission(e.target.value)} disabled={Boolean(base)}>{areas.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Nombre de la actividad<input name="title" required minLength={4} maxLength={160} defaultValue={base?.title||''} onInput={e=>e.currentTarget.setCustomValidity('')}/><small>Necesario también para guardar un borrador.</small></label></div>{kind==='event'&&<><label>Espacio solicitado<input name="venue" defaultValue={base?.venue||''} required maxLength={160} placeholder="Nombre del lugar y sala"/></label><div className="workspace-form-pair"><label>Inicio · hora de Ciudad de México<input name="startsAt" type="datetime-local" defaultValue={local(base?.starts_at??null)} required/></label><label>Fin · hora de Ciudad de México<input name="endsAt" type="datetime-local" defaultValue={local(base?.ends_at??null)} required/></label></div></>}{commissionGuides[commission]&&<p className="workspace-help">{kind==='report'?commissionGuides[commission].report:kind==='handover'?commissionGuides[commission].handover:commissionGuides[commission].approval} <a href={`/documentos/guia-${commission}.pdf`} target="_blank" rel="noreferrer">Guía de la comisión</a></p>}{workFields[kind].map(f=><label key={f.key}>{f.label}{f.type?<input name={f.key} type={f.type} defaultValue={details[f.key]||''} required={f.required}/>:<textarea name={f.key} defaultValue={details[f.key]||''} required={f.required} maxLength={3000} rows={3}/>} {f.hint&&<small>{f.hint}</small>}</label>)}<div className="workspace-actions"><button className="button button-primary" name="save" value="submit" disabled={busy}>Enviar a revisión</button><button className="button button-secondary" name="save" value="draft" formNoValidate disabled={busy}>Guardar borrador</button></div></form>;
}
function ItemDetail({id,admin,actorId,consent,busy,act,tick,onBack}:{id:string;admin:boolean;actorId:string;consent:boolean;busy:boolean;act:Action;tick:number;onBack:()=>void}){
 const[editing,setEditing]=useState(false);
 const{data:value,error,retry}=usePrivateData<{item:WorkItem}>('/api/espacio/items/'+id,tick,actorId);if(!value)return <p role="status">{error||'Cargando actividad…'}{error&&<button className="text-link" onClick={retry}>Volver a intentar</button>}</p>;const i=value.item,details:Record<string,string>=JSON.parse(i.details_json),own=i.owner_id===actorId;
 if(editing)return <>{error&&<p role="alert">{error} <button className="text-link" onClick={retry}>Actualizar actividad</button></p>}<fieldset className="workspace-surface" disabled={Boolean(error)}><WorkForm areas={commissions} item={i} kind={i.kind} busy={busy} onCancel={()=>setEditing(false)} onSave={async v=>{if(await act('/api/espacio/items/'+i.id,{...(v as object),action:'edit'},'PATCH'))setEditing(false);}}/></fieldset></>;
 const options=admin?({draft:['submitted'],submitted:['approved','changes','rejected'],changes:['submitted'],approved:['completed','changes','rejected'],completed:['archived','changes'],rejected:['changes']} as Record<string,string[]>)[i.status]||[]:own?({draft:['submitted'],changes:['submitted'],approved:['completed']} as Record<string,string[]>)[i.status]||[]:[];
 return <>{error&&<button className="text-link" onClick={retry}>Actualizar actividad</button>}<fieldset className="workspace-detail workspace-surface" disabled={Boolean(error)}><button className="text-link" onClick={onBack}>Volver a las actividades</button><div className="workspace-section-head"><div><p>{commissionName(i.commission)} · {workKinds[i.kind]}</p><h2>{i.title}</h2></div><span className="workspace-status">{workStatuses[i.status]}</span></div>{i.kind==='event'&&<div className="workspace-event-place"><strong>{i.venue||'Espacio por confirmar'}</strong><p>{i.starts_at===null||i.ends_at===null?'Fecha por confirmar':moment(i.starts_at)+' a '+moment(i.ends_at)}</p><span>{i.space_confirmed?'Espacio y horario confirmados':'Espacio pendiente de confirmación'}</span></div>}<dl className="workspace-details">{workFields[i.kind].map(f=><div key={f.key}><dt>{f.label}</dt><dd>{details[f.key]||'No indicado'}</dd></div>)}</dl><div className="workspace-actions"><a className="text-link" href={`/mi-comision/documento/${i.id}`} target="_blank" rel="noreferrer">Abrir documento para imprimir o guardar</a>{own&&['draft','changes'].includes(i.status)&&<button className="button button-secondary" onClick={()=>setEditing(true)}>Editar</button>}</div><p className="workspace-help">Disponible hasta {date(i.retention_until)}.</p>
 {options.length>0&&<VersionedForm className="workspace-review workspace-form" record={{...i,updatedAt:i.updated_at}} onSubmit={async(e,snapshot)=>{const f=new FormData(e.currentTarget);return act('/api/espacio/items/'+i.id,{action:'status',status:f.get('status'),note:f.get('note'),spaceConfirmed:f.has('spaceConfirmed'),expectedUpdatedAt:snapshot.updatedAt},'PATCH');}}>{()=> <><h3>{admin?'Revisar y responder':'Actualizar seguimiento'}</h3><label>Estado<select name="status">{options.map(s=><option key={s} value={s}>{workStatuses[s as keyof typeof workStatuses]}</option>)}</select></label><label>{admin?'Respuesta para la comisión':'Qué quedó realizado'}<textarea name="note" required maxLength={2000}/></label>{admin&&i.kind==='event'&&<label className="workspace-check"><input type="checkbox" name="spaceConfirmed"/>Comprobé la disponibilidad y cuento con la autorización del espacio y horario indicados.</label>}<button className="button button-primary" disabled={busy}>Guardar seguimiento</button></>}</VersionedForm>}
 {admin&&['draft','changes','submitted','approved'].includes(i.status)&&<details className="workspace-notice"><summary>Cambiar responsable</summary><VersionedForm className="workspace-form" record={{...i,updatedAt:i.updated_at}} onSubmit={async(e,snapshot)=>{const f=new FormData(e.currentTarget);return act('/api/espacio/items/'+i.id,{action:'assign',username:f.get('username'),note:f.get('note'),expectedUpdatedAt:snapshot.updatedAt},'PATCH');}}>{()=> <><p>Asigna el pendiente a otra persona activa de esta comisión. El relevo quedará registrado en la conversación.</p><label>Usuario de quien recibe<input name="username" required maxLength={40}/></label><label>Motivo del relevo<textarea name="note" required maxLength={2000}/></label><button className="button button-secondary" disabled={busy}>Asignar responsable</button></>}</VersionedForm></details>}
 <div className="workspace-columns"><section><h3>Documentos y evidencias</h3><Documents itemId={i.id} ownerId={actorId} admin={admin} allowUpload={consent&&!['archived','rejected'].includes(i.status)} act={act} tick={tick}/>{!consent&&<p><Link href="/mi-comision?tab=expediente">Abre Documentos personales y acepta el aviso</Link> para adjuntar archivos.</p>}</section><ActivityConversation actorId={actorId} id={i.id} status={i.status} act={act} busy={busy} tick={tick}/></div>{error&&<p role="alert">{error}</p>}</fieldset></>;
}

function ActivityConversation({actorId,id,status,act,busy,tick}:{actorId:string;id:string;status:WorkItem['status'];act:Action;busy:boolean;tick:number}){
 const[page,setPage]=useState(1),[draft,setDraft]=useState('');
 const{data,error,retry}=usePrivateData<{messages:{id:string;body:string;created_at:number;author_name:string}[];messagePagination:{page:number;pages:number;total:number}}>('/api/espacio/items/'+id+'?page='+page,tick,actorId);
 return <section><h3>Conversación sobre esta actividad</h3>
  {error&&<p role="alert">{error} <button type="button" className="text-link" onClick={retry}>Volver a cargar</button></p>}
  {!data&&!error&&<p role="status">Consultando mensajes…</p>}
  {data&&<><div className="workspace-messages">{data.messages.map(m=><article key={m.id}><strong>{m.author_name}</strong><small>{moment(m.created_at)}</small><p>{m.body}</p></article>)}</div>
   {data.messagePagination.pages>1&&<nav className="workspace-pagination" aria-label="Historial de la actividad"><button type="button" disabled={busy||data.messagePagination.page===1} onClick={()=>setPage(data.messagePagination.page-1)}>Más recientes</button><span>Página {data.messagePagination.page} de {data.messagePagination.pages}</span><button type="button" disabled={busy||data.messagePagination.page===data.messagePagination.pages} onClick={()=>setPage(data.messagePagination.page+1)}>Anteriores</button></nav>}
  </>}
  {status!=='archived'&&<form className="workspace-form" onSubmit={async e=>{e.preventDefault();const body=draft;if(await act('/api/espacio/items/'+id,{action:'message',body},'PATCH')){setDraft(current=>current===body?'':current);setPage(1);}}}><label>Mensaje<textarea name="body" required maxLength={3000} value={draft} onChange={e=>setDraft(e.target.value)} disabled={busy} placeholder="Escribe tu pregunta, respuesta o dato por confirmar."/></label><button className="button button-secondary" disabled={busy||!data||Boolean(error)}>Enviar</button></form>}
 </section>;
}

function Pager({page,total,size,setPage}:{page:number;total:number;size:number;setPage:(v:number)=>void}){if(total<=size&&page===1)return null;return <div className="workspace-pagination"><button disabled={page===1} onClick={()=>setPage(page-1)}>Anterior</button><span>Página {page} de {Math.max(1,Math.ceil(total/size))}</span><button disabled={page*size>=total} onClick={()=>setPage(page+1)}>Siguiente</button></div>}
