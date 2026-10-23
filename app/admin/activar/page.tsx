import Link from 'next/link';
import AccessForm from '../AccessForm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configura tu acceso', robots: { index: false, follow: false, noarchive: true } };
export default function ActivateStaff() {
  return <main className="staff-access-shell" id="main-content"><section className="staff-access-card"><h1>Configura tu acceso</h1><p>Elige una contraseña que solo tú conozcas.</p><AccessForm activate /><Link className="staff-home-link" href="/admin/ingresar">Volver al acceso</Link></section></main>;
}
