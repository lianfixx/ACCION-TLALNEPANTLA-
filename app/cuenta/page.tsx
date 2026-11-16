import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getStaffIdentity} from '@/lib/staff-auth';
import AccountSettings from '../admin/AccountSettings';
import StaffLogout from '../admin/StaffLogout';
import {ownEnlacesApplication} from '@/lib/enlaces';
export const dynamic='force-dynamic';
export const metadata={title:'Mi cuenta',robots:{index:false,follow:false,noarchive:true}};
export default async function Account(){const user=await getStaffIdentity();if(!user)redirect('/ingresar');const enlaces=await ownEnlacesApplication(user.accountId).catch(()=>null);return <main className="admin-shell" id="main-content"><header className="admin-header"><Link href="/mi-comision" className="wordmark"><strong>Mi cuenta</strong><span>Volver a mi comisión</span></Link><StaffLogout accountId={user.accountId}/></header>{enlaces&&<p className="enl-account-link"><a className="text-link" href="/cuenta/enlaces">Mi postulación a Enlaces APJ 2027</a><span>Folio {enlaces.referenceCode}</span></p>}<AccountSettings accountId={user.accountId} email={user.email} username={user.username} owner={false} accounts={[]}/></main>;}
