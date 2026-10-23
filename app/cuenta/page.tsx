import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getStaffIdentity} from '@/lib/staff-auth';
import AccountSettings from '../admin/AccountSettings';
import StaffLogout from '../admin/StaffLogout';
export const dynamic='force-dynamic';
export const metadata={title:'Mi cuenta',robots:{index:false,follow:false,noarchive:true}};
export default async function Account(){const user=await getStaffIdentity();if(!user)redirect('/ingresar');return <main className="admin-shell" id="main-content"><header className="admin-header"><Link href="/mi-comision" className="wordmark"><strong>Mi cuenta</strong><span>Volver a mi comisión</span></Link><StaffLogout accountId={user.accountId}/></header><AccountSettings accountId={user.accountId} email={user.email} username={user.username} owner={false} accounts={[]}/></main>;}
