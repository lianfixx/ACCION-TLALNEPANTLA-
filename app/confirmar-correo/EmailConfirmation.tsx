'use client';
import { useRef, useState, type FormEvent } from 'react';
import { useFragmentCode } from '@/lib/use-fragment-code';
import RegistrationChallenge from '../crear-cuenta/RegistrationChallenge';

export default function EmailConfirmation({ siteKey, nonce }: { siteKey: string; nonce?: string }) {
  const { code, clear } = useFragmentCode('email');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [destination, setDestination] = useState('');
  const [challenge, setChallenge] = useState(''), [resetKey, setResetKey] = useState(0);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || (!code && !challenge)) return;
    const data = new FormData(event.currentTarget);
    submitting.current = true; setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/confirmar-correo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(code ? { action: 'confirm', token: code } : { action: 'resend', email: data.get('email'), 'cf-turnstile-response': challenge }) });
      const result = await response.json() as { error?: string; message?: string; redirect?: string; requestId?: string };
      setMessage((result.error || result.message || 'Inténtalo de nuevo.') + (result.requestId ? ` Referencia: ${result.requestId}` : ''));
      if (code && response.ok) { clear(); setDestination(result.redirect || '/ingresar'); }
      else if (code && response.status === 410) clear();
    } catch { setMessage('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'); }
    finally { submitting.current = false; setBusy(false); setChallenge(''); setResetKey(key => key + 1); }
  }
  return <div>
    <noscript><p>Activa JavaScript para confirmar tu correo o solicitar un enlace nuevo.</p></noscript>
    {!destination && <form className="staff-form" action="/api/confirmar-correo" method="post" onSubmit={submit} aria-busy={busy}>
      {code ? <button className="button button-primary" disabled={busy}>{busy ? 'Confirmando…' : 'Confirmar mi correo'}</button> : siteKey ? <>
        <label>Correo de tu cuenta<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
        <RegistrationChallenge siteKey={siteKey} nonce={nonce} onToken={setChallenge} resetKey={resetKey} />
        <button className="button button-primary" disabled={busy || !challenge}>{busy ? 'Enviando…' : 'Enviar otro enlace'}</button>
      </> : <p>El reenvío de correos aún no está disponible. Si tienes un enlace vigente, vuelve a abrirlo.</p>}
    </form>}
    <p role="status" aria-live="polite">{message}</p>
    {destination && <a className="button button-primary" href={destination}>Entrar con mi usuario y contraseña</a>}
  </div>;
}
