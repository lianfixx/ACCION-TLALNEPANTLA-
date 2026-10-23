'use client';
import { useState } from 'react';
import { confirmAdminExit, allowNextAdminUnload } from './AdminNavigationGuard';
export default function StaffLogout({accountId}:{accountId?:string}) {
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  async function logout() {
    if(busy||!confirmAdminExit())return;
    setBusy(true); setMessage('');
    try { const response=await fetch('/api/admin/access/logout',{method:'POST',headers:{'Content-Type':'application/json',...(accountId?{'X-Expected-Account-Id':accountId}:{})},body:'{}'}); const result=await response.json() as {error?:string;message?:string;redirect?:string;activationPath?:string}; if (!response.ok) {setBusy(false);setMessage(result.error??'No pudimos cerrar la sesión. Inténtalo de nuevo.');return;} allowNextAdminUnload(); location.assign(result.redirect ?? "/admin"); }
    catch {setBusy(false);setMessage('No pudimos cerrar la sesión. Inténtalo de nuevo.');}
  }
  return <span className="staff-logout"><button type="button" onClick={logout} disabled={busy}>{busy?'Cerrando…':'Cerrar sesión'}</button>{message&&<small role="status">{message}</small>}</span>;
}
