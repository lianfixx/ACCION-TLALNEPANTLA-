import Link from 'next/link';
import { headers } from 'next/headers';
import { registrationServices } from '@/lib/registration-verification';
import EmailConfirmation from './EmailConfirmation';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Confirma tu correo', robots: { index: false, follow: false, noarchive: true } };
export default async function Page() {
  const config = registrationServices();
  return <main className="staff-access-shell" id="main-content"><section className="staff-access-card">
    <h1>Confirma tu correo</h1><p>Revisa tu bandeja de entrada y correo no deseado. El enlace dura 24 horas. Al abrirlo, pulsa Confirmar mi correo.</p>
    <EmailConfirmation siteKey={config.ready ? config.siteKey : ''} nonce={(await headers()).get('x-nonce') ?? undefined} />
    <Link href="/ingresar">Ya confirmé mi correo: entrar</Link>
  </section></main>;
}
