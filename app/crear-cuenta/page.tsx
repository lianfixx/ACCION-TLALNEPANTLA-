import Link from 'next/link';
import {membershipConfiguration} from '@/lib/membership';
import {signInPath} from '@/lib/account-paths';
import {isCommission} from '@/lib/commissions';
import Signup from './Signup';
export const dynamic='force-dynamic';
export const metadata={title:'Crear mi cuenta',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const q=await searchParams;const cfg=await membershipConfiguration();return <main className="staff-access-shell" id="main-content"><section className="staff-access-card"><Link href="/" className="text-link">Acción Política Juvenil Tlalnepantla</Link><h1>Crea tu cuenta</h1><p>Con ella podrás enviar tu solicitud y consultar el seguimiento.</p>{cfg.enabled?<Signup noticeToken={cfg.noticeToken} commission={isCommission(q.comision)?q.comision:''}/>:<p>El registro no está abierto en este momento.</p>}<Link href={signInPath(isCommission(q.comision)?`/participacion?comision=${q.comision}#registro`:'/participacion#registro')}>Ya tengo una cuenta</Link></section></main>}
