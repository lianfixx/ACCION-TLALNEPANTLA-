"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { commissions, isCommission } from "@/lib/commissions";
import { membershipConsent, membershipStatuses, type MembershipApplication, type MembershipEvent, type MembershipNotice } from "@/lib/membership-shared";
import { signInPath } from "@/lib/account-paths";
import ConsentRecord from "@/app/ConsentRecord";
import RegistrationMap from "./RegistrationMap";
import ApplicationProfileView from "@/app/ApplicationProfileView";
import {emptyProfile,emptyProject,parseMembershipProfile,readMembershipProfile,residenceStates,projectQuestions,type MembershipProfile,type InitialProject} from "@/lib/membership-profile";

const date=(n:number)=>new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(n);
type ApiResult={pagination:{page:number;pages:number;total:number};proof?:{snapshot:string;consentText:string};error?:string;message?:string;applications:MembershipApplication[];application:MembershipApplication;events:MembershipEvent[]};
type Props={accountId:string;enabled:boolean;notice:MembershipNotice;noticeToken:string;email:string;initialName:string;initialCommission:string};
export default function InternalRegistration({accountId,enabled,notice,noticeToken,email,initialName,initialCommission}:Props){
  const [step,setStep]=useState(0),[name,setName]=useState(initialName),[commission,setCommission]=useState(isCommission(initialCommission)?initialCommission:''),[note,setNote]=useState(''),[adult,setAdult]=useState(false),[consent,setConsent]=useState(false);
  const [profile,setProfile]=useState<MembershipProfile>(emptyProfile);
  const coordinating=profile.participation==='coordinate';
  const steps=coordinating?['Tus datos','Tu comisión','Propuesta 1','Propuesta 2','Propuesta 3','Revisar y enviar']:['Tus datos','Tu comisión','Revisar y enviar'];
  const lastStep=steps.length-1;
  const updateProfile=(key:keyof MembershipProfile,value:string)=>setProfile(p=>({...p,[key]:value}));
  const updateProject=(index:number,key:keyof InitialProject,value:string)=>setProfile(p=>({...p,projects:p.projects.map((project,i)=>i===index?{...project,[key]:value}:project)}));
  const [historyPages,setHistoryPages]=useState({page:1,pages:1,total:0});
  const [sessionExpired,setSessionExpired]=useState(false);
  const [proof,setProof]=useState<{snapshot:string;consentText:string}|null>(null);
  const [records,setRecords]=useState<MembershipApplication[]>([]),[selected,setSelected]=useState<MembershipApplication|null>(null),[events,setEvents]=useState<MembershipEvent[]>([]),[loaded,setLoaded]=useState(!email),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[editing,setEditing]=useState(false),[newForm,setNewForm]=useState(false),[confirmWithdraw,setConfirmWithdraw]=useState<{id:string;updatedAt:number}|null>(null);
  const [detailLoading,setDetailLoading]=useState(false),[detailReady,setDetailReady]=useState(false);
  const [editBase,setEditBase]=useState<{id:string;updatedAt:number}|null>(null);
  const [needsConflictReview,setNeedsConflictReview]=useState(false),[editConflict,setEditConflict]=useState<ApiResult|null>(null),[conflictLoading,setConflictLoading]=useState(false),[conflictError,setConflictError]=useState('');
  const lock=useRef(false),title=useRef<HTMLHeadingElement>(null),mounted=useRef(true),requestGeneration=useRef(0),conflictGeneration=useRef(0);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const checkSession=useCallback((response:Response)=>{if(response.status===401||response.status===412){setSessionExpired(true);setRecords([]);setSelected(null);setEvents([]);setProof(null);setDetailReady(false);setEditConflict(null);}},[]);
  const loadDetail=useCallback(async(record:MembershipApplication,page=1)=>{
    const ticket=++requestGeneration.current;
    setConfirmWithdraw(null);setSelected(record);setEvents([]);setProof(null);setDetailLoading(true);setDetailReady(false);
    try{const response=await fetch(`/api/incorporaciones/${record.id}?page=${page}`,{headers:{'X-Expected-Account-Id':accountId},cache:'no-store'}),result=await response.json() as ApiResult;if(!mounted.current||ticket!==requestGeneration.current)return;if(!response.ok){checkSession(response);throw new Error(result.error);}setSelected(result.application);setEvents(result.events);setHistoryPages(result.pagination);setProof(result.proof??null);setDetailReady(true);}catch(err){if(mounted.current&&ticket===requestGeneration.current)setError(err instanceof Error?err.message:'No pudimos cargar el seguimiento.');}finally{if(mounted.current&&ticket===requestGeneration.current)setDetailLoading(false);}
  },[accountId,checkSession]);
  const load=useCallback(async()=>{
    if(!email)return;
    setConfirmWithdraw(null);setDetailLoading(true);setDetailReady(false);
    try{const response=await fetch('/api/incorporaciones',{headers:{'X-Expected-Account-Id':accountId},cache:'no-store'}),result=await response.json() as ApiResult;if(!mounted.current)return;if(!response.ok){checkSession(response);throw new Error(result.error);}setError('');setRecords(result.applications);const first=result.applications[0];if(first)await loadDetail(first);else setSelected(null);setLoaded(true);}catch(err){if(mounted.current){setLoaded(false);setError(err instanceof Error?err.message:'No pudimos consultar tus solicitudes.');}}finally{if(mounted.current)setDetailLoading(false);}
  },[email,loadDetail,accountId,checkSession]);
  useEffect(()=>{
    if(!email)return;
    const controller=new AbortController();
    fetch('/api/incorporaciones',{headers:{'X-Expected-Account-Id':accountId},cache:'no-store',signal:controller.signal}).then(async response=>{
      const result=await response.json() as ApiResult;
      if(controller.signal.aborted)return;
      if(!response.ok){checkSession(response);throw new Error(result.error);}
      setRecords(result.applications);
      if(result.applications[0])await loadDetail(result.applications[0]);
      if(!controller.signal.aborted)setLoaded(true);
    }).catch(err=>{if(!controller.signal.aborted){setLoaded(false);setError(err instanceof Error?err.message:'No pudimos consultar tus solicitudes.');}});
    return()=>controller.abort();
  },[email,loadDetail,accountId,checkSession]);
  const errorSummary=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(error)errorSummary.current?.focus();},[error]);
  const hasActive=records.some(r=>['submitted','in_review','accepted'].includes(r.status));
  const showRecord=selected&&!editing&&!newForm;
  const canContinueCorrection=Boolean(editConflict&&editBase&&editConflict.application.updatedAt!==editBase.updatedAt&&['submitted','in_review'].includes(editConflict.application.status)&&editConflict.application.noticeVersion===notice.version&&enabled);
  function go(next:number){
    setError('');
    if(next>step){
      try{
        if(name.trim().length<2)throw new Error('Escribe tu nombre para continuar.');
        if(!editing&&!adult){setStep(0);throw new Error('Este registro es personal y para personas de 18 años cumplidos. Confirma la declaración de edad para continuar.');}
        if(!residenceStates.includes(profile.state as typeof residenceStates[number])||profile.municipality.trim().length<2)throw new Error('Indica el estado y municipio donde vives.');
        if(next>1){
          if(!isCommission(commission))throw new Error('Selecciona una comisión para continuar.');
          if(profile.availability.trim().length<5)throw new Error('Cuéntanos qué tiempo podrías dedicar.');
          if(coordinating&&profile.experience.trim().length<10)throw new Error('Cuéntanos la experiencia con la que empezarías a coordinar.');
        }
        if(coordinating&&next>2){
          for(let i=0;i<Math.min(next-2,3);i++)for(const q of projectQuestions){
            const value=profile.projects[i]?.[q.key]?.trim()??'';
            if(value.length<q.min||value.length>q.max){setStep(i+2);throw new Error(`Revisa ${q.label.toLocaleLowerCase('es-MX')} en la propuesta ${i+1}. Escribe entre ${q.min} y ${q.max} caracteres.`);}
          }
        }
        if(next===lastStep){
          if(coordinating){
            const names=profile.projects.map(p=>p.title.trim().toLocaleLowerCase('es-MX'));
            const duplicate=names.findIndex((value,index)=>names.indexOf(value)!==index);
            if(duplicate>=0){setStep(duplicate+2);throw new Error(`La propuesta ${duplicate+1} tiene el mismo nombre que la propuesta ${names.indexOf(names[duplicate])+1}. Cambia el nombre para distinguirlas.`);}
          }
          parseMembershipProfile(profile);
        }
      }catch(err){setError(err instanceof Error?err.message:'Revisa los datos antes de continuar.');return;}
    }
    setStep(next);requestAnimationFrame(()=>title.current?.focus());
  }
  async function loadEditConflict(id:string){
    const ticket=++conflictGeneration.current;
    setConflictLoading(true);setConflictError('');
    try{
      const response=await fetch(`/api/incorporaciones/${id}`,{headers:{'X-Expected-Account-Id':accountId},cache:'no-store'}),result=await response.json() as ApiResult;
      if(!response.ok){checkSession(response);throw new Error(result.error||'No pudimos consultar la versión actual.');}
      if(mounted.current&&ticket===conflictGeneration.current)setEditConflict(result);
    }catch(err){if(mounted.current&&ticket===conflictGeneration.current)setConflictError(err instanceof Error?err.message:'No pudimos consultar la versión actual.');}
    finally{if(mounted.current&&ticket===conflictGeneration.current)setConflictLoading(false);}
  }
  function applyCurrentReview(keepChanges:boolean){
    if(!editConflict)return;
    const current=editConflict.application;conflictGeneration.current++;setConflictLoading(false);
    setSelected(current);setRecords(previous=>previous.map(r=>r.id===current.id?current:r));setEvents(editConflict.events);setHistoryPages(editConflict.pagination);setProof(editConflict.proof??null);
    setNeedsConflictReview(false);setEditConflict(null);setConflictError('');setError('');
    if(keepChanges){setEditBase({id:current.id,updatedAt:current.updatedAt});setMessage('Tus cambios siguen en el formulario. Revísalos antes de volver a enviarlos.');}
    else{setEditing(false);setEditBase(null);setMessage('Estás consultando la versión guardada de tu solicitud.');}
  }
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(step<lastStep){go(step+1);return;}if(lock.current)return;
    if(needsConflictReview){setError('Revisa la versión actual antes de volver a enviar tus cambios.');return;}
    lock.current=true;setBusy(true);setError('');setMessage('');
    try{
      if(editing&&!editBase)throw new Error("Vuelve a abrir la solicitud antes de corregirla.");
      const validatedProfile=parseMembershipProfile(profile);
      const response=await fetch(editing&&editBase?`/api/incorporaciones/${editBase.id}`:'/api/incorporaciones',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json','X-Expected-Account-Id':accountId},body:JSON.stringify(editing?{action:'edit',name,commission,note,profile:validatedProfile,expectedUpdatedAt:editBase?.updatedAt}:{name,commission,note,profile:validatedProfile,consent,adultSelfDeclared:adult,noticeToken})});
      const result=await response.json() as ApiResult;if((response.status===401||response.status===412))setSessionExpired(true);
      if(response.status===409&&editing&&editBase){setNeedsConflictReview(true);setEditConflict(null);await loadEditConflict(editBase.id);}
      if(!response.ok)throw new Error(result.error??'No pudimos guardar la solicitud.');setSessionExpired(false);setMessage(result.message??"Solicitud guardada.");setEditing(false);setEditBase(null);setNeedsConflictReview(false);setEditConflict(null);setNewForm(false);setConsent(false);setStep(0);setNote('');setProfile(emptyProfile());await load();
    }catch(err){setError(err instanceof Error?err.message:'No pudimos confirmar el envío. Tus campos siguen aquí.');}finally{lock.current=false;setBusy(false);}
  }
  async function withdraw(){
    if(!selected||!confirmWithdraw||confirmWithdraw.id!==selected.id||!detailReady||detailLoading||lock.current)return;lock.current=true;setBusy(true);setError('');
    try{const response=await fetch(`/api/incorporaciones/${confirmWithdraw.id}`,{method:'PATCH',headers:{'Content-Type':'application/json','X-Expected-Account-Id':accountId},body:JSON.stringify({action:'withdraw',expectedUpdatedAt:confirmWithdraw.updatedAt})}),result=await response.json() as ApiResult;if(!response.ok){checkSession(response);throw new Error(result.error);}setMessage('Solicitud retirada. El expediente conserva su plazo de eliminación; puedes ejercer tus derechos por el canal de privacidad.');setConfirmWithdraw(null);await load();}catch(err){setError(err instanceof Error?err.message:'No pudimos retirar la solicitud.');}finally{lock.current=false;setBusy(false);}
  }
  return <section id="registro" className="internal-registration" aria-label="Registro interno">
    {!enabled&&<div className="registration-availability"><span className="availability-dot"/><div><strong>La recepción está cerrada.</strong><p>Puedes consultar la guía de comisiones. Cuando la administración reabra el registro podrás enviar una solicitud.</p></div></div>}
    <div className="registration-feedback">{sessionExpired&&<p><a href={signInPath('/mi-comision')} target="_blank" rel="noreferrer">Inicia sesión con la misma cuenta en otra pestaña</a> y vuelve aquí para enviar. Tus respuestas siguen en este formulario.</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert" tabIndex={-1} ref={errorSummary}>{error}</p>}</div>
    {!email?<div className="registration-signin"><h2>Inicia sesión para completar tu solicitud.</h2><p>Crea tu cuenta o entra con tu usuario para enviar la solicitud y consultar las respuestas.</p><p>Para colaborar necesitarás tus datos y disponibilidad. Para coordinar, prepara también tu experiencia y tres propuestas. La INE y el domicilio se entregan después, en Documentos personales.</p><div className="record-actions"><Link className="button button-primary" href={commission?`/crear-cuenta?comision=${commission}`:'/crear-cuenta'}>Crear mi cuenta</Link><a className="button button-secondary" href={signInPath(`/participacion?comision=${commission}#registro`)}>Iniciar sesión</a><Link className="button button-secondary" href="/comisiones">Conocer las comisiones</Link></div><Link className="text-link" href="/privacidad/registro">Aviso del registro </Link></div>:email&&!loaded?<div className="registration-loading"><p>{error?'No pudimos comprobar si ya tienes una solicitud.':'Consultando tus solicitudes…'}</p>{error&&<button className="button button-secondary" onClick={()=>void load()}>Intentar de nuevo</button>}</div>:showRecord?<div className="membership-account"><Link className="button button-secondary" href="/mi-comision?tab=solicitud">Volver a mi cuenta</Link>
      <header><div><span className="section-kicker">Tu solicitud</span><h2>{membershipStatuses[selected.status]}</h2><p className="membership-reference">{selected.referenceCode}</p></div><button type="button" className="button button-secondary" disabled={busy||detailLoading} onClick={()=>void load()}>Actualizar estado</button></header>
      <dl className="membership-summary"><div><dt>Nombre</dt><dd>{selected.name}</dd></div><div><dt>Comisión</dt><dd>{commissions.find(c=>c.id===selected.commission)?.name}</dd></div><div><dt>Cuenta</dt><dd>{selected.ownerEmail}</dd></div><div><dt>Recibida</dt><dd>{date(selected.createdAt)}</dd></div></dl><ApplicationProfileView json={selected.profileJson}/>{selected.note&&<p className="membership-user-note">{selected.note}</p>}
      {selected.status==='accepted'&&<p className="membership-scope">Tu solicitud fue aceptada. En Mi comisión puedes consultar el acceso al equipo y el siguiente paso. Para iniciar la afiliación al PAN, los tres documentos personales deben estar revisados y tu comisión confirmada. La toma de protesta se comunicará por separado.</p>}
      <div className="record-actions"><Link className="text-link" href="/mi-comision?tab=expediente">Entregar INE y comprobante de domicilio</Link><Link className="text-link" href="/mi-comision">Ver el avance de mi registro</Link></div><h3>Respuestas y seguimiento</h3>{detailLoading&&<p role="status">Actualizando tu solicitud…</p>}<ol className="membership-timeline">{events.map(item=><li key={item.id}><time dateTime={new Date(item.createdAt).toISOString()}>{date(item.createdAt)}</time><span>{item.actorType==='admin'?'Administración':'Tu cuenta'}</span><p>{item.body}</p></li>)}</ol>
      {historyPages.pages>1&&<nav className="membership-history-pages" aria-label="Páginas de seguimiento"><span>Página {historyPages.page} de {historyPages.pages}</span>{historyPages.page>1&&<button type="button" disabled={busy||detailLoading} onClick={()=>void loadDetail(selected,historyPages.page-1)}>Más recientes</button>}{historyPages.page<historyPages.pages&&<button type="button" disabled={busy||detailLoading} onClick={()=>void loadDetail(selected,historyPages.page+1)}>Anteriores</button>}</nav>}
      {proof&&<ConsentRecord snapshot={proof.snapshot}/>}
      <p className="membership-retention">Conservación del expediente hasta el {date(selected.retentionUntil)}. Aviso aceptado · {selected.noticeVersion}.</p>
      <div>{selected.noticeVersion!==notice.version&&<p className="membership-scope">El aviso de registro se actualizó. Para aportar datos nuevos puedes retirar esta solicitud y presentar otra, o solicitar una rectificación por el <Link href="/privacidad/registro">canal de privacidad</Link>.</p>}</div><div className="record-actions">{enabled&&selected.noticeVersion===notice.version&&['submitted','in_review'].includes(selected.status)&&<button className="button button-secondary" disabled={busy||detailLoading||!detailReady} onClick={()=>{setConfirmWithdraw(null);conflictGeneration.current++;setConflictLoading(false);setNeedsConflictReview(false);setEditConflict(null);setConflictError('');setEditBase({id:selected.id,updatedAt:selected.updatedAt});setName(selected.name);setCommission(isCommission(selected.commission)?selected.commission:'');setNote(selected.note);setProfile(readMembershipProfile(selected.profileJson)??emptyProfile());setEditing(true);setStep(0);setError('');}}>Corregir datos</button>}{['submitted','in_review','accepted'].includes(selected.status)&&<button className="button button-secondary" disabled={busy||detailLoading||!detailReady} onClick={()=>setConfirmWithdraw({id:selected.id,updatedAt:selected.updatedAt})}>Retirar solicitud</button>}{!hasActive&&<button className="button button-secondary" onClick={()=>{setConfirmWithdraw(null);setNewForm(true);setStep(0);setName(initialName);setCommission('');setNote('');setProfile(emptyProfile());setAdult(false);setConsent(false);}}>Nueva solicitud</button>}</div>
      {confirmWithdraw&&<div className="withdraw-confirmation" role="group" aria-label="Confirmar retirada"><p>Se detendrá el seguimiento de esta solicitud interna. Esto no es una renuncia a la militancia en el PAN.</p><div className="record-actions"><button disabled={busy||detailLoading||!detailReady} className="button button-primary" onClick={()=>void withdraw()}>{busy?'Retirando…':'Confirmar retirada'}</button><button disabled={busy} className="button button-secondary" onClick={()=>setConfirmWithdraw(null)}>Conservar solicitud</button></div></div>}
      {records.length>1&&<details className="membership-previous"><summary>Solicitudes anteriores</summary>{records.map(record=><button key={record.id} type="button" disabled={busy||detailLoading} onClick={()=>{setError('');setConfirmWithdraw(null);void loadDetail(record);}}>{record.referenceCode} · {membershipStatuses[record.status]}</button>)}</details>}
    </div>:<div className="registration-workspace"><RegistrationMap commission={commission} step={step} steps={steps} onStep={busy?()=>{}:go}/><form className="registration-form" onSubmit={save}>
      <div className="registration-form-heading"><span className="section-kicker">{editing?'Corregir solicitud':'Solicitud de incorporación'}</span><span>{step+1} de {steps.length}</span></div>
      <h2 ref={title} tabIndex={-1}>{steps[step]}</h2>
      {needsConflictReview&&<section className="admin-note" aria-label="Revisar cambios de la solicitud">
        <h3>La solicitud se actualizó mientras la corregías</h3><p>Tus respuestas siguen aquí. Revisa lo que ya está guardado antes de continuar.</p>
        {conflictLoading&&<p role="status">Consultando la versión actual…</p>}
        {conflictError&&<p role="alert">{conflictError} <button type="button" disabled={busy||conflictLoading} className="text-link" onClick={()=>editBase&&void loadEditConflict(editBase.id)}>Volver a consultar</button></p>}
        {editConflict&&<>
          <details open><summary>Versión guardada el {date(editConflict.application.updatedAt)}</summary>
            <dl className="membership-summary"><div><dt>Estado</dt><dd>{membershipStatuses[editConflict.application.status]}</dd></div><div><dt>Nombre</dt><dd>{editConflict.application.name}</dd></div><div><dt>Comisión</dt><dd>{commissions.find(c=>c.id===editConflict.application.commission)?.name}</dd></div></dl>
            <ApplicationProfileView json={editConflict.application.profileJson}/>{editConflict.application.note&&<p>{editConflict.application.note}</p>}
            {editConflict.events.filter(item=>item.actorType==='admin').map(item=><p key={item.id}>{date(item.createdAt)} · {item.body}</p>)}
          </details>
          {!canContinueCorrection&&<p>Consulta el estado y el aviso de esta solicitud antes de hacer otra corrección.</p>}
          <div className="record-actions">{canContinueCorrection&&<button type="button" className="button button-primary" disabled={busy||conflictLoading} onClick={()=>applyCurrentReview(true)}>Conservar mis cambios y continuar</button>}<button type="button" className="button button-secondary" disabled={busy||conflictLoading} onClick={()=>applyCurrentReview(false)}>Volver al seguimiento</button></div>
        </>}
      </section>}
      <fieldset disabled={busy} className="registration-fields" key={step}><legend className="sr-only">{steps[step]}</legend>
        {step===0&&<><p>Estos datos permiten identificar tu solicitud y dar seguimiento en tu cuenta.</p>{!editing&&<label className="registration-check"><input type="checkbox" checked={adult} onChange={e=>setAdult(e.target.checked)} required/><span>Declaro tener 18 años cumplidos y presento la solicitud por mí mismo.</span></label>}<label>Nombre completo<input autoComplete="name" name="name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={120} required /></label>{email?<label>Correo de la cuenta<input value={email} readOnly type="email"/></label>:<div className="registration-account-note">Para enviar y consultar tu expediente, crea tu cuenta o entra con tu usuario. <a href={signInPath(`/participacion?comision=${commission}#registro`)}>Iniciar sesión antes de completar los datos</a>. La cuenta no verifica tu identidad civil.</div>}<div className="registration-residence"><label>Estado donde vives<select required autoComplete="address-level1" value={profile.state} onChange={e=>updateProfile('state',e.target.value)}><option value="">Selecciona tu estado</option>{residenceStates.map(state=><option key={state}>{state}</option>)}</select></label><label>Municipio o alcaldía<input required minLength={2} maxLength={100} autoComplete="address-level2" value={profile.municipality} onChange={e=>updateProfile('municipality',e.target.value)}/></label></div><label>A qué te dedicas <span className="field-optional">Opcional</span><input value={profile.activity} onChange={e=>updateProfile('activity',e.target.value)} maxLength={200} placeholder="Puedes contarnos qué estudias o en qué trabajas"/></label><p className="field-hint">En este paso solo pedimos el estado y municipio. La INE y el comprobante de domicilio se entregan después de enviar la solicitud, en Documentos personales.</p><Link className="text-link" href="/privacidad/registro" target="_blank">Cómo se usarán estos datos </Link></>}
        {step===1&&<><p>Elige cómo participar y la comisión que te interesa. <Link href="/comisiones" target="_blank">Puedes consultar sus funciones aquí.</Link></p><fieldset className="participation-choice"><legend>Cómo te gustaría participar</legend>{([['collaborate','Colaborar en una comisión','Trabajar en tareas y proyectos del equipo.'],['coordinate','Me interesa coordinar','Presentar mi experiencia y tres propuestas para el equipo.']] as const).map(([value,label,hint])=><label key={value}><input type="radio" name="participation" value={value} checked={profile.participation===value} onChange={()=>setProfile(p=>({...p,participation:value,projects:value==='coordinate'?(p.projects.length===3?p.projects:[emptyProject(),emptyProject(),emptyProject()]):p.projects}))}/><span><strong>{label}</strong><small>{hint}</small></span></label>)}</fieldset><div className="commission-choice">{commissions.map(c=><label key={c.id} className={commission===c.id?'selected':''}><input type="radio" name="commission" required value={c.id} checked={commission===c.id} onChange={()=>setCommission(c.id)}/><span><strong>{c.name}</strong><small>{c.purpose}</small></span></label>)}</div><label>Qué tiempo podrías dedicar<textarea required minLength={5} maxLength={200} rows={2} value={profile.availability} onChange={e=>updateProfile('availability',e.target.value)} placeholder="Días, horarios o un aproximado de horas por semana"/></label><label>Qué sabes hacer o qué has organizado {!coordinating&&<span className="field-optional">Opcional</span>}<textarea required={coordinating} minLength={coordinating?10:undefined} maxLength={800} rows={3} value={profile.experience} onChange={e=>updateProfile('experience',e.target.value)} placeholder="Puede ser experiencia de estudio, trabajo o actividades en equipo"/></label>{coordinating&&<p className="field-hint">Conoceremos tu propuesta de trabajo. La convocatoria y la selección se anunciarán por separado; enviar el formulario no asigna una coordinación.</p>}<label>Algo que quieras añadir <span className="field-optional">Opcional</span><textarea name="note" value={note} onChange={e=>setNote(e.target.value)} maxLength={600} rows={3} aria-describedby="registration-note-hint"/></label><small id="registration-note-hint">Hasta 600 caracteres. No incluyas documentos, datos de otras personas ni información sensible adicional.</small></>}
        {coordinating&&step>=2&&step<lastStep&&<><p>Comparte tres ideas distintas para esta comisión. No necesitas tenerlas resueltas; señala qué falta confirmar.</p><div className="project-form-list">{profile.projects.map((project,index)=>index===step-2?<fieldset className="project-form" key={index}><legend>Propuesta {index+1}</legend>{projectQuestions.map(q=><label key={q.key}>{q.label}{q.key==='title'||q.key==='timeframe'?<input required minLength={q.min} maxLength={q.max} value={project[q.key]} onChange={e=>updateProject(index,q.key,e.target.value)} aria-describedby={`project-${index}-${q.key}`}/>:<textarea required minLength={q.min} maxLength={q.max} rows={3} value={project[q.key]} onChange={e=>updateProject(index,q.key,e.target.value)} aria-describedby={`project-${index}-${q.key}`}/>}<small id={`project-${index}-${q.key}`}>{q.hint}</small></label>)}</fieldset>:null)}</div><p className="field-hint">Las propuestas se revisan antes de autorizar actividades, presupuesto o uso de espacios.</p></>}
        {step===lastStep&&<><dl className="registration-review"><div><dt>Nombre</dt><dd>{name}</dd></div><div><dt>Comisión</dt><dd>{commissions.find(c=>c.id===commission)?.name}</dd></div>{email&&<div><dt>Correo</dt><dd>{email}</dd></div>}{note&&<div><dt>Nota</dt><dd>{note}</dd></div>}</dl><ApplicationProfileView profile={profile}/><div className="record-actions"><button type="button" className="text-link" onClick={()=>go(0)}>Cambiar datos</button><button type="button" className="text-link" onClick={()=>go(1)}>Cambiar participación</button>{coordinating&&<button type="button" className="text-link" onClick={()=>go(2)}>Revisar propuestas</button>}</div><p className="membership-scope">Revisa tus datos antes de enviar. Después entregarás los documentos personales y esperarás la confirmación de tu comisión. La afiliación al PAN será el último paso.</p>{!editing&&<><label className="registration-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>{membershipConsent}</span></label></>}<Link className="text-link" href="/privacidad/registro" target="_blank">Leer el aviso del registro</Link>{notice.controller&&<p className="field-hint">Responsable · {notice.controller}. Conservación · {notice.retentionDays} días.</p>}</>}
      </fieldset>
      <p className="field-hint">Puedes regresar a los pasos anteriores sin perder tus respuestas. Si cierras o recargas la página antes de enviar, tendrás que completarlas de nuevo.</p><div className="registration-actions">{step>0&&<button disabled={busy} type="button" className="button button-secondary" onClick={()=>go(step-1)}>Volver</button>}{step<lastStep?<button type="submit" className="button button-primary" disabled={busy}>Continuar </button>:!enabled?<button type="button" className="button button-primary" disabled>Recepción cerrada</button>:email?<button type="submit" className="button button-primary" disabled={busy||!enabled||needsConflictReview}>{busy?'Guardando…':editing?'Guardar corrección':enabled?'Enviar solicitud':'Recepción cerrada'}</button>:<a className="button button-primary" href={signInPath(`/participacion?comision=${commission}#registro`)}>Iniciar sesión para enviar</a>}</div>
      {!email&&step===lastStep&&<p className="field-hint">Por privacidad, el borrador no se guarda en el dispositivo. Al iniciar sesión volverás a completar tus datos.</p>}{(editing||newForm)&&selected&&<button type="button" disabled={busy} className="text-link registration-cancel" onClick={()=>{setEditing(false);setNewForm(false);conflictGeneration.current++;setConflictLoading(false);setNeedsConflictReview(false);setEditConflict(null);setConflictError('');setError('');}}>Volver a mi solicitud</button>}
    </form></div>}
  </section>;
}
