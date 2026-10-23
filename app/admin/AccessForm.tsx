'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useFragmentCode } from '@/lib/use-fragment-code';

export default function AccessForm({ activate = false }: { activate?: boolean }) {
  const { code: token, clear } = useFragmentCode('activation');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [show, setShow] = useState(false);
  const submitting = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting.current) return;
    const data = new FormData(event.currentTarget), password = String(data.get('password') ?? '');
    if (activate && password !== data.get('confirmation')) { setMessage('Las contraseñas no coinciden. Revísalas antes de continuar.'); return; }
    if (activate && !token) { setMessage('Vuelve a abrir tu enlace privado de activación.'); return; }
    submitting.current = true; setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/access/${activate ? 'activate' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: data.get('username'), password, token, returnTo: new URLSearchParams(location.search).get('returnTo') }) });
      const result = await response.json() as {error?:string;message?:string;redirect?:string;requestId?:string};
      if (!response.ok) { if (activate && response.status === 410) clear(); setMessage((result.error ?? 'No pudimos abrir tu cuenta. Inténtalo de nuevo.') + (result.requestId ? ` Referencia: ${result.requestId}` : '')); return; }
      if (activate) clear();
      location.assign(result.redirect ?? "/admin");
    } catch { setMessage('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <form className="staff-form" method="post" action={`/api/admin/access/${activate ? 'activate' : 'login'}`} onSubmit={submit} aria-busy={busy}>
    <noscript><p>Activa JavaScript para usar este formulario. Tus datos no se enviarán en la dirección de la página.</p></noscript>
    <label>{activate ? "Elige tu usuario" : "Usuario"}<input name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={activate?3:undefined} maxLength={activate?40:254} pattern={activate?"[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,39}":undefined}/></label>{activate&&<p className="staff-help">De 3 a 40 letras, números, puntos o guiones.</p>}
    <label>{activate ? 'Elige tu contraseña' : 'Contraseña'}<input name="password" type={show ? 'text' : 'password'} autoComplete={activate ? 'new-password' : 'current-password'} minLength={activate ? 15 : undefined} maxLength={128} required aria-describedby={activate ? 'password-help' : undefined} /></label>
    {activate && <><p className="staff-help" id="password-help">Usa entre 15 y 128 caracteres. Una frase de varias palabras es más fácil de recordar.</p><label>Repite tu contraseña<input name="confirmation" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={15} maxLength={128} required /></label></>}
    <label className="staff-check"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)} />Mostrar contraseña</label>
    {activate && !token && <p className="staff-feedback" role="status">Abre el enlace completo que te compartió quien administra el panel.</p>}
    <button className="button button-primary" disabled={busy || (activate && !token)}>{busy ? 'Un momento…' : activate ? 'Guardar y entrar' : 'Entrar'}</button>
    <p className="staff-feedback" role="status" aria-live="polite">{message}</p>
    {!activate && <a href="/confirmar-correo">Confirmar mi correo o solicitar otro enlace</a>}
  </form>;
}
