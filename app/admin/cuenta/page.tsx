import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentAuthorizedUser, canManageRoles } from '@/lib/authz';
import AccountSettings from '../AccountSettings';
import { listStaffAccounts, type StaffAccountView } from '@/lib/staff-accounts';
import StaffLogout from '../StaffLogout';
export const dynamic = 'force-dynamic';
export const metadata = { title:'Usuarios y contraseñas', robots:{ index:false,follow:false,noarchive:true } };
export default async function StaffAccountPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams,q=typeof params.q==='string'?params.q.trim().slice(0,120):'';
  const requestedPage=typeof params.page==='string'&&/^\d{1,7}$/.test(params.page)?Number(params.page):1;
  let total=0,pages=1,page=1;
  const actor=await currentAuthorizedUser();if(!actor)redirect('/admin/ingresar');
  const owner=canManageRoles(actor.email);let accounts:StaffAccountView[]=[],unavailable=false;
  try { if(owner){const result=await listStaffAccounts(q,requestedPage);accounts=result.accounts;total=result.total;pages=result.pages;page=result.page;} }catch{unavailable=true;}
  return <main className="admin-shell" id="main-content"><header className="admin-header"><Link href="/admin?section=incorporaciones" className="wordmark"><strong>Panel del equipo</strong><span>Volver a incorporaciones</span></Link><StaffLogout accountId={actor.accountId}/></header><div className="admin-intro"><h1>Usuarios y contraseñas</h1></div>{unavailable?<section className="admin-lock"><p>No pudimos cargar las cuentas. Intenta actualizar la página.</p></section>:<AccountSettings accountId={actor.accountId} email={actor.email} username={actor.username} owner={owner} accounts={accounts} collection={{q,total,pages,page}}/>}</main>;
}
