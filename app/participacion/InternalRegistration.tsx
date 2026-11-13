"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { isCommission } from "@/lib/commissions";
import { defaultCommissions, type CommissionContent } from "@/lib/site-content-defaults";
import { membershipConsent, membershipStatuses, type MembershipApplication, type MembershipEvent, type MembershipNotice } from "@/lib/membership-shared";
import { signInPath } from "@/lib/account-paths";
import ConsentRecord from "@/app/ConsentRecord";
import RegistrationMap from "./RegistrationMap";
import ApplicationProfileView from "@/app/ApplicationProfileView";
import {emptyProfile,parseMembershipProfile,readMembershipProfile,residenceStates,type MembershipProfile} from "@/lib/membership-profile";

const date=(n:number)=>new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Mexico_City'}).format(n);
type ApiResult={pagination:{page:number;pages:number;total:number};proof?:{snapshot:string;consentText:string};error?:string;message?:string;applications:MembershipApplication[];application:MembershipApplication;events:MembershipEvent[]};
type Props={accountId:string;enabled:boolean;enlacesOpen?:boolean;notice:MembershipNotice;noticeToken:string;email:string;initialName:string;initialCommission:string;commissions?:CommissionContent[]};
export default function InternalRegistration({accountId,enabled,enlacesOpen=false,notice,noticeToken,email,initialName,initialCommission,commissions=defaultCommissions}:Props){
  const [step,setStep]=useState(0),[name,setName]=useState(initialName),[commission,setCommission]=useState(isCommission(initialCommission)?initialCommission:''),[note,setNote]=useState(''),[consent,setConsent]=useState(false);
  const [profile,setProfile]=useState<MembershipProfile>(emptyProfile);
  const steps=['Tu solicitud','Revisar y enviar'];
  const lastStep=steps.length-1;
  const updateProfile=(key:keyof MembershipProfile,value:string)=>setProfile(p=>({...p,[key]:value}));
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
        if(name.trim().length<2)throw new Error('Escribe tu nombre.');
        if(!residenceStates.includes(profile.state as typeof residenceStates[number])||profile.municipality.trim().length<2)throw new Error('Indica el estado y el municipio donde vives.');
        if(!isCommission(commission))throw new Error('Elige una comisión.');
        if(profile.availability.trim().length<5)throw new Error('Cuéntanos cuánto tiempo puedes dedicar.');
        if(profile.enlaces&&(profile.enlacesPlan??'').trim().length<20)throw new Error('Escribe tu propuesta para el primer mes como Enlace (al menos 20 caracteres).');
        parseMembershipProfile({...profile,participation:'collaborate',projects:[]});
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
      const validatedProfile=parseMembershipProfile({...profile,participation:'collaborate',projects:[]});
      const response=await fetch(editing&&editBase?`/api/incorporaciones/${editBase.id}`:'/api/incorporaciones',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json','X-Expected-Account-Id':accountId},body:JSON.stringify(editing?{action:'edit',name,commission,note,profile:validatedProfile,expectedUpdatedAt:editBase?.updatedAt}:{name,commission,note,profile:validatedProfile,consent,adultSelfDeclared:consent,noticeToken})});
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
    {!email?<div className="registration-signin"><h2>Primero, tu cuenta.</h2><p>Con ella envías tu solicitud y ves las respuestas. Te toma dos minutos.</p><div className="record-actions"><Link className="button button-primary" href={commission?`/crear-cuenta?comision=${commission}`:'/crear-cuenta'}>Crear mi cuenta</Link><a className="button button-secondary" href={signInPath(`/participacion?comision=${commission}#registro`)}>Iniciar sesión</a></div></div>:email&&!loaded?<div className="registration-loading"><p>{error?'No pudimos comprobar si ya tienes una solicitud.':'Consultando tus solicitudes…'}</p>{error&&<button className="button button-secondary" onClick={()=>void load()}>Intentar de nuevo</button>}</div>:showRecord?<div className="membership-account"><Link className="button button-secondary" href="/mi-comision?tab=solicitud">Volver a mi cuenta</Link>
      <header><div><span className="section-kicker">Tu solicitud</span><h2>{membershipStatuses[selected.status]}</h2><p className="membership-reference">{selected.referenceCode}</p></div><button type="button" className="button button-secondary" disabled={busy||detailLoading} onClick={()=>void load()}>Actualizar estado</button></header>
      <dl className="membership-summary"><div><dt>Nombre</dt><dd>{selected.name}</dd></div><div><dt>Comisión</dt><dd>{commissions.find(c=>c.id===selected.commission)?.name}</dd></div><div><dt>Cuenta</dt><dd>{selected.ownerEmail}</dd></div><div><dt>Recibida</dt><dd>{date(selected.createdAt)}</dd></div></dl><ApplicationProfileView json={selected.profileJson}/>{selected.note&&<p className="membership-user-note">{selected.note}</p>}
      {selected.status==='accepted'&&<p className="membership-scope">Tu solicitud fue aceptada. Sigue en Mi comisión.</p>}
      <div className="record-actions"><Link className="button button-primary" href="/mi-comision">Ir a Mi comisión</Link><Link className="text-link" href="/mi-comision?tab=expediente">Subir mis documentos</Link></div><h3>Respuestas y seguimiento</h3>{detailLoading&&<p role="status">Actualizando tu solicitud…</p>}<ol className="membership-timeline">{events.map(item=><li key={item.id}><time dateTime={new Date(item.createdAt).toISOString()}>{date(item.createdAt)}</time><span>{item.actorType==='admin'?'Administración':'Tu cuenta'}</span><p>{item.body}</p></li>)}</ol>
      {historyPages.pages>1&&<nav className="membership-history-pages" aria-label="Páginas de seguimiento"><span>Página {historyPages.page} de {historyPages.pages}</span>{historyPages.page>1&&<button type="button" disabled={busy||detailLoading} onClick={()=>void loadDetail(selected,historyPages.page-1)}>Más recientes</button>}{historyPages.page<historyPages.pages&&<button type="button" disabled={busy||detailLoading} onClick={()=>void loadDetail(selected,historyPages.page+1)}>Anteriores</button>}</nav>}
      {proof&&<ConsentRecord snapshot={proof.snapshot}/>}
      <p className="membership-retention">Se conserva hasta el {date(selected.retentionUntil)}.</p>
      <div>{selected.noticeVersion!==notice.version&&<p className="membership-scope">El aviso de registro se actualizó. Para aportar datos nuevos puedes retirar esta solicitud y presentar otra, o solicitar una rectificación por el <Link href="/privacidad/registro">canal de privacidad</Link>.</p>}</div><div className="record-actions">{enabled&&selected.noticeVersion===notice.version&&['submitted','in_review'].includes(selected.status)&&<button className="button button-secondary" disabled={busy||detailLoading||!detailReady} onClick={()=>{setConfirmWithdraw(null);conflictGeneration.current++;setConflictLoading(false);setNeedsConflictReview(false);setEditConflict(null);setConflictError('');setEditBase({id:selected.id,updatedAt:selected.updatedAt});setName(selected.name);setCommission(isCommission(selected.commission)?selected.commission:'');setNote(selected.note);setProfile(readMembershipProfile(selected.profileJson)??emptyProfile());setEditing(true);setStep(0);setError('');}}>Corregir datos</button>}{['submitted','in_review','accepted'].includes(selected.status)&&<button className="button button-secondary" disabled={busy||detailLoading||!detailReady} onClick={()=>setConfirmWithdraw({id:selected.id,updatedAt:selected.updatedAt})}>Retirar solicitud</button>}{!hasActive&&<button className="button button-secondary" onClick={()=>{setConfirmWithdraw(null);setNewForm(true);setStep(0);setName(initialName);setCommission('');setNote('');setProfile(emptyProfile());setConsent(false);}}>Nueva solicitud</button>}</div>
      {confirmWithdraw&&<div className="withdraw-confirmation" role="group" aria-label="Confirmar retirada"><p>Se detendrá el seguimiento de esta solicitud. No afecta tu militancia en el PAN, si la tienes.</p><div className="record-actions"><button disabled={busy||detailLoading||!detailReady} className="button button-primary" onClick={()=>void withdraw()}>{busy?'Retirando…':'Confirmar retirada'}</button><button disabled={busy} className="button button-secondary" onClick={()=>setConfirmWithdraw(null)}>Conservar solicitud</button></div></div>}
      {records.length>1&&<details className="membership-previous"><summary>Solicitudes anteriores</summary>{records.map(record=><button key={record.id} type="button" disabled={busy||detailLoading} onClick={()=>{setError('');setConfirmWithdraw(null);void loadDetail(record);}}>{record.referenceCode} · {membershipStatuses[record.status]}</button>)}</details>}
    </div>:<div className="registration-workspace"><RegistrationMap commissions={commissions} commission={commission} step={step} steps={steps} onStep={busy?()=>{}:go}/><form className="registration-form" onSubmit={save}>
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
        {step===0&&<><label>Nombre completo<input autoComplete="name" name="name" value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={120} required /></label><div className="registration-residence"><label>Estado donde vives<select required autoComplete="address-level1" value={profile.state} onChange={e=>updateProfile('state',e.target.value)}><option value="">Elige</option>{residenceStates.map(state=><option key={state}>{state}</option>)}</select></label><label>Municipio o alcaldía<input required minLength={2} maxLength={100} autoComplete="address-level2" value={profile.municipality} onChange={e=>updateProfile('municipality',e.target.value)}/></label></div><fieldset className="commission-choice commission-choice-compact"><legend>Comisión</legend>{commissions.map(c=><label key={c.id} className={commission===c.id?'selected':''}><input type="radio" name="commission" required value={c.id} checked={commission===c.id} onChange={()=>setCommission(c.id)}/><span><strong>{c.name}</strong><small>{c.purpose}</small></span></label>)}</fieldset><label>Cuánto tiempo puedes dedicar<input required minLength={5} maxLength={200} value={profile.availability} onChange={e=>updateProfile('availability',e.target.value)} placeholder="Por ejemplo: 4 horas a la semana, sábados por la mañana"/></label><label>A qué te dedicas <span className="field-optional">Opcional</span><input value={profile.activity} onChange={e=>updateProfile('activity',e.target.value)} maxLength={200} placeholder="Qué estudias o en qué trabajas"/></label>{(enlacesOpen||profile.enlaces)&&<div className="enlaces-apply-box"><label className="registration-check"><input type="checkbox" checked={profile.enlaces===true} disabled={!enlacesOpen&&profile.enlaces===true} onChange={e=>setProfile(p=>{const next={...p};if(e.target.checked)next.enlaces=true;else{delete next.enlaces;delete next.enlacesPlan;}return next;})}/><span>Quiero ser Enlace APJ de esta comisión. <Link href="/enlaces" target="_blank">Ver la convocatoria</Link></span></label>{profile.enlaces&&<label>Qué harías en tu primer mes<textarea required minLength={20} maxLength={700} rows={4} value={profile.enlacesPlan??''} onChange={e=>setProfile(p=>({...p,enlacesPlan:e.target.value}))} placeholder="Una o dos acciones concretas para tu comisión"/><small>Después de enviar, subes tu carta de motivos y tu carta de recomendación en Mi comisión.</small></label>}</div>}<label>Algo más <span className="field-optional">Opcional</span><textarea name="note" value={note} onChange={e=>setNote(e.target.value)} maxLength={600} rows={2}/></label></>}
        {step===lastStep&&<><dl className="registration-review"><div><dt>Nombre</dt><dd>{name}</dd></div><div><dt>Comisión</dt><dd>{commissions.find(c=>c.id===commission)?.name}</dd></div>{email&&<div><dt>Correo</dt><dd>{email}</dd></div>}{note&&<div><dt>Nota</dt><dd>{note}</dd></div>}</dl><ApplicationProfileView profile={profile}/><button type="button" className="text-link" onClick={()=>go(0)}>Cambiar mis datos</button>{!editing&&<label className="registration-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} required/><span>{membershipConsent} <Link href="/privacidad/registro" target="_blank">Leer el aviso</Link></span></label>}</>}
      </fieldset>
      <div className="registration-actions">{step>0&&<button disabled={busy} type="button" className="button button-secondary" onClick={()=>go(step-1)}>Volver</button>}{step<lastStep?<button type="submit" className="button button-primary" disabled={busy}>Continuar </button>:!enabled?<button type="button" className="button button-primary" disabled>Recepción cerrada</button>:email?<button type="submit" className="button button-primary" disabled={busy||!enabled||needsConflictReview}>{busy?'Guardando…':editing?'Guardar corrección':enabled?'Enviar solicitud':'Recepción cerrada'}</button>:<a className="button button-primary" href={signInPath(`/participacion?comision=${commission}#registro`)}>Iniciar sesión para enviar</a>}</div>
      {(editing||newForm)&&selected&&<button type="button" disabled={busy} className="text-link registration-cancel" onClick={()=>{setEditing(false);setNewForm(false);conflictGeneration.current++;setConflictLoading(false);setNeedsConflictReview(false);setEditConflict(null);setConflictError('');setError('');}}>Volver a mi solicitud</button>}
    </form></div>}
  </section>;
}
