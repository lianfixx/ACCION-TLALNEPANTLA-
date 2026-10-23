'use client';

import { useEffect, useState, type FormEvent } from 'react';

export default function AccessForm({ activate = false }: { activate?: boolean }) {
  const [token, setToken] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [show, setShow] = useState(false);
  useEffect(() => {
    if (activate) {
      const code = new URLSearchParams(location.hash.slice(1)).get('codigo') ?? '';
      const frame = requestAnimationFrame(() => {
        setToken(code);
        history.replaceState(null, '', location.pathname);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [activate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget), password = String(data.get('password') ?? '');
    if (activate && password !== data.get('confirmation')) { setMessage('Las contraseñas no coinciden. Revísalas antes de continuar.'); return; }
    setBusy(true); setMessage('');
    try {
      const response = await fetch(`/api/admin/access/${activate ? 'activate' : 'login'}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: data.get('username'), password, token, returnTo: new URLSearchParams(location.search).get('returnTo') }) });
      const result = await response.json() as {error?:string;message?:string;redirect?:string;activationPath?:string};
      if (!response.ok) { setMessage(result.error ?? 'No pudimos abrir tu cuenta. Inténtalo de nuevo.'); return; }
      location.assign(result.redirect ?? "/admin");
    } catch { setMessage('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }
  return <form className="staff-form" onSubmit={submit}>
    <label>{activate ? "Elige tu usuario" : "Usuario"}<input name="username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={activate?3:undefined} maxLength={activate?40:254} pattern={activate?"[a-zA-Z0-9][a-zA-Z0-9._\\-]{2,39}":undefined}/></label>{activate&&<p className="staff-help">De 3 a 40 letras, números, puntos o guiones.</p>}
    <label>{activate ? 'Elige tu contraseña' : 'Contraseña'}<input name="password" type={show ? 'text' : 'password'} autoComplete={activate ? 'new-password' : 'current-password'} minLength={activate ? 15 : undefined} maxLength={128} required aria-describedby={activate ? 'password-help' : undefined} /></label>
    {activate && <><p className="staff-help" id="password-help">Usa entre 15 y 128 caracteres. Una frase de varias palabras es más fácil de recordar.</p><label>Repite tu contraseña<input name="confirmation" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={15} maxLength={128} required /></label></>}
    <label className="staff-check"><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)} />Mostrar contraseña</label>
    {activate && !token && <p className="staff-feedback" role="status">Abre el enlace completo que te compartió quien administra el panel.</p>}
    <button className="button button-primary" disabled={busy || (activate && !token)}>{busy ? 'Un momento…' : activate ? 'Guardar y entrar' : 'Entrar'}</button>
    <p className="staff-feedback" role="status" aria-live="polite">{message}</p>
  </form>;
}
