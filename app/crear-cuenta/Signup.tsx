'use client';
import { useRef, useState, type FormEvent } from 'react';
import RegistrationChallenge from './RegistrationChallenge';
import { useRouter } from 'next/navigation';

export default function Signup({ noticeToken, commission = '', siteKey, nonce }: { noticeToken: string; commission?: string; siteKey: string; nonce?: string }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [challenge, setChallenge] = useState(''), [resetKey, setResetKey] = useState(0);
  const submitting = useRef(false);
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const fields = new FormData(event.currentTarget);
    if (fields.get('password') !== fields.get('confirm')) { setError('Las contraseñas no coinciden.'); return; }
    if (!challenge) { setError('Completa la verificación antiabuso.'); return; }
    submitting.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/registro-cuenta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fields.get('name'), email: fields.get('email'), username: fields.get('username'), password: fields.get('password'), adult: fields.has('adult'), consent: fields.has('consent'), noticeToken, commission, 'cf-turnstile-response': challenge }) });
      const result = await response.json() as { error?: string; requestId?: string };
      if (!response.ok) { setError((result.error || 'No pudimos crear la cuenta. Inténtalo de nuevo.') + (result.requestId ? ` Referencia: ${result.requestId}` : '')); return; }
      router.push('/confirmar-correo');
    } catch { setError('No pudimos conectar. Revisa tu conexión. Si ya enviaste el formulario, puedes solicitar otro correo de confirmación.'); }
    finally { submitting.current = false; setBusy(false); setChallenge(''); setResetKey(key => key + 1); }
  }
  return <form className="staff-form" method="post" action="/api/registro-cuenta" onSubmit={submit} aria-busy={busy}>
    <noscript><p>Activa JavaScript para completar la verificación y crear tu cuenta.</p></noscript>
    <label>Nombre completo<input name="name" autoComplete="name" required minLength={4} maxLength={120} /></label>
    <label>Correo de contacto<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>Elige tu usuario<input name="username" autoComplete="username" autoCapitalize="none" pattern={'[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,39}'} minLength={3} maxLength={40} required aria-describedby="username-help" /></label>
    <small id="username-help">De 3 a 40 letras, números, puntos o guiones.</small>
    <label>Contraseña<input name="password" type="password" autoComplete="new-password" required minLength={15} maxLength={128} aria-describedby="pass-help" /></label>
    <small id="pass-help">Usa al menos 15 caracteres. Puede ser una frase que recuerdes.</small>
    <label>Repite la contraseña<input name="confirm" type="password" autoComplete="new-password" required minLength={15} maxLength={128} /></label>
    <label className="staff-check"><input type="checkbox" name="adult" required />Tengo 18 años o más y creo esta cuenta para mí.</label>
    <label className="staff-check"><input type="checkbox" name="consent" required /><span>He leído el <a href="/privacidad/registro" target="_blank" rel="noreferrer">aviso del registro</a> y autorizo el uso de estos datos para administrar mi cuenta y mi solicitud.</span></label>
    <p>Te enviaremos un enlace para confirmar este correo antes de entrar. Confirmarlo no acredita tu identidad ni la aceptación de tu solicitud.</p>
    <RegistrationChallenge siteKey={siteKey} nonce={nonce} onToken={setChallenge} resetKey={resetKey} />
    <button className="button button-primary" disabled={busy || !challenge}>{busy ? 'Creando tu cuenta…' : 'Crear mi cuenta'}</button>
    <p role="status" aria-live="polite">{error}</p>
    <a href="/confirmar-correo">Ya envié mis datos: solicitar otro correo de confirmación</a>
  </form>;
}
