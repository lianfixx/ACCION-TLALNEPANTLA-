'use client';
import Link from 'next/link';
import {useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import type {StaffAccountView} from '@/lib/staff-accounts';
import DraftForm from './DraftForm';
import VersionedForm from './VersionedForm';

const roleLabels:Record<string,string>={participant:'Participación',admin:'Administración',editor:'Edición',moderator:'Moderación'};
function RoleOptions(){return <><option value="participant">Solo su solicitud de incorporación</option><option value="editor">Agenda y publicaciones</option><option value="moderator">Moderación de opiniones</option><option value="admin">Incorporaciones y administración general</option></>;}
function PasswordFields(){return <><label>Contraseña<input type="password" name="password" autoComplete="new-password" minLength={15} maxLength={128} required/></label><label>Repite la contraseña<input type="password" name="confirmation" autoComplete="new-password" minLength={15} maxLength={128} required/></label><p className="staff-help">Entre 15 y 128 caracteres. Puedes usar una frase de varias palabras.</p></>;}
export default function AccountSettings({accountId,email,username,owner,accounts,collection}:{accountId:string;email:string;username?:string|null;owner:boolean;accounts:StaffAccountView[];collection?:{q:string;total:number;pages:number;page:number}}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[ownerPassword,setOwnerPassword]=useState('');
 async function change(action:string,body:Record<string,unknown>){
  if(busy)return false;
  if(body.password!==undefined&&body.password!==body.confirmation){setMessage('Las contraseñas no coinciden.');return false;}
  setBusy(true);setMessage('');
  try{const response=await fetch(`/api/admin/access/${action}`,{method:'POST',headers:{'Content-Type':'application/json','X-Expected-Account-Id':accountId},body:JSON.stringify(body)}),data=await response.json() as {error?:string;message?:string};setMessage(data.error??data.message??'Cambio guardado.');if(response.ok||response.status===409)router.refresh();return response.ok;}
  catch{setMessage('No pudimos guardar. Lo que escribiste sigue aquí.');return false;}
  finally{setBusy(false);}
 }
 async function ownPassword(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;if(await change('password',Object.fromEntries(new FormData(form))))form.reset();}
 async function create(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;if(await change('create',{...Object.fromEntries(new FormData(form)),currentPassword:ownerPassword}))form.reset();}
 async function edit(event:FormEvent<HTMLFormElement>,account:StaffAccountView,action:'reset'|'role'|'create'){
  event.preventDefault();const form=event.currentTarget;
  const result=await change(action,{...Object.fromEntries(new FormData(form)),email:account.email,name:account.name,expectedAccountUpdatedAt:account.accountUpdatedAt,expectedRoleUpdatedAt:account.roleUpdatedAt,currentPassword:ownerPassword});
  if(result)form.reset();return result;
 }
 async function revoke(account:StaffAccountView){if(!window.confirm(`¿Revocar el acceso de ${account.name}? Sus sesiones se cerrarán.`))return;await change('revoke',{email:account.email,expectedAccountUpdatedAt:account.accountUpdatedAt,expectedRoleUpdatedAt:account.roleUpdatedAt,currentPassword:ownerPassword});}
 return <div className="staff-settings">
  <section className="staff-settings-section"><h2>Tu contraseña</h2><p>Tu usuario es {username||email}.</p><DraftForm className="staff-form" onSubmit={ownPassword}><label>Contraseña actual<input type="password" name="currentPassword" autoComplete="current-password" required maxLength={128}/></label><PasswordFields/><button className="button button-primary" disabled={busy}>{busy?'Guardando…':'Guardar contraseña'}</button></DraftForm><Link href="/admin/recuperar" className="staff-home-link">Olvidé mi contraseña</Link></section>
  <div className="staff-feedback" role="status" aria-live="polite">{message}</div>
  {owner&&<section className="staff-settings-section"><h2>Usuarios y permisos</h2><p>Crea cada usuario y su contraseña. Elige si podrá administrar el sitio o únicamente presentar y consultar su solicitud.</p>
   <label className="staff-owner-confirmation">Tu contraseña para confirmar los cambios<input type="password" value={ownerPassword} onChange={e=>setOwnerPassword(e.target.value)} autoComplete="current-password" maxLength={128}/></label>
   <details className="staff-add"><summary>Crear una cuenta</summary><DraftForm className="staff-form" onSubmit={create}><label>Nombre completo<input name="name" required maxLength={120}/></label><label>Usuario<input name="username" autoComplete="off" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={40} pattern={'[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,39}'} required/></label><label>Correo de la persona<input name="email" type="email" autoComplete="off" required maxLength={254}/></label><PasswordFields/><label>Permisos<select name="role" defaultValue="participant"><RoleOptions/></select></label><button className="button button-primary" disabled={busy}>Crear cuenta</button></DraftForm></details>
   {collection&&<div className="admin-collection-controls"><form action="/admin/cuenta" method="get"><label>Buscar una cuenta<input type="search" name="q" defaultValue={collection.q} maxLength={120}/></label><button className="button button-secondary">Buscar</button></form><nav aria-label="Páginas de cuentas"><span>{collection.total} cuentas · página {collection.page} de {collection.pages}</span><div>{collection.page>1&&<Link href={`/admin/cuenta?${new URLSearchParams({q:collection.q,page:String(collection.page-1)})}`}>Anterior</Link>}{collection.page<collection.pages&&<Link href={`/admin/cuenta?${new URLSearchParams({q:collection.q,page:String(collection.page+1)})}`}>Siguiente</Link>}</div></nav></div>}
   <div className="staff-account-list">{accounts.filter(a=>a.email!==email).map(account=>{
    const inactive=Boolean(account.disabledAt)||!account.hasPassword;
    const role=account.role&&account.roleRevokedAt===null?account.role:'participant';
    const record={...account,updatedAt:JSON.stringify([account.accountUpdatedAt,account.roleUpdatedAt])};
    return <article key={account.email}><div><h3>{account.name}</h3><p>{account.username||account.email}</p><small>{inactive?'Sin acceso activo':'Cuenta activa'} · {roleLabels[role]}</small></div><div className="staff-account-actions">
     {inactive?<details><summary>Activar cuenta</summary><VersionedForm record={record} onSubmit={(e,a)=>edit(e,a,'create')}>{snapshot=><><label>Usuario<input name="username" defaultValue={snapshot.username??''} minLength={3} maxLength={40} pattern={'[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,39}'} required/></label><PasswordFields/><label>Permisos<select name="role" defaultValue={role}><RoleOptions/></select></label><button className="button button-secondary" disabled={busy}>Activar con esta contraseña</button></>}</VersionedForm></details>:<>
      <details><summary>Cambiar permisos</summary><VersionedForm record={record} onSubmit={(e,a)=>edit(e,a,'role')}>{()=> <><label>Permisos<select name="role" defaultValue={role}><RoleOptions/></select></label><button className="button button-secondary" disabled={busy}>Guardar permisos</button></>}</VersionedForm></details>
      <details><summary>Restablecer contraseña</summary><VersionedForm record={record} onSubmit={(e,a)=>edit(e,a,'reset')}>{()=> <><PasswordFields/><button className="button button-secondary" disabled={busy}>Restablecer contraseña</button></>}</VersionedForm></details>
      <button className="staff-revoke" disabled={busy} onClick={()=>revoke(account)}>Revocar acceso</button>
     </>}
    </div></article>;
   })}</div>
  </section>}
 </div>;
}
