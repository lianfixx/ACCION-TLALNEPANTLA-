import Link from 'next/link';
import AccessForm from '../AccessForm';
import PanMark from '@/app/PanMark';
import {isCommission} from '@/lib/commissions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Acceso al equipo', robots: { index: false, follow: false, noarchive: true } };
export default async function StaffLogin({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  let commission='';
  if(typeof params.returnTo==='string'&&params.returnTo.startsWith('/participacion?')){
    const value=new URL(params.returnTo,'https://example.invalid').searchParams.get('comision');
    if(isCommission(value))commission=value;
  }
  return <main className="staff-access-shell" id="main-content"><section className="staff-access-card">
    <Link href="/" className="staff-brand" aria-label="Volver al inicio"><PanMark className="aj-header-logo" /><span>Acción Política Juvenil<small>Tlalnepantla</small></span></Link>
    <h1>Entra a tu cuenta</h1><p>Escribe tu usuario y contraseña.</p>
    <p className="staff-domain-check">Antes de escribir tu contraseña, comprueba la dirección en tu navegador. El equipo nunca te pedirá tu contraseña por mensaje.</p>
    <AccessForm /><Link className="text-link" href={commission?`/crear-cuenta?comision=${commission}`:'/crear-cuenta'}>Crear mi cuenta</Link>
    <details className="staff-recovery"><summary>Recuperar mi acceso</summary><p>Si olvidaste tu contraseña, solicita una nueva a quien administra las cuentas. El usuario no cambia.</p></details>
    <Link href="/" className="staff-home-link">Volver a la página</Link>
  </section></main>;
}
