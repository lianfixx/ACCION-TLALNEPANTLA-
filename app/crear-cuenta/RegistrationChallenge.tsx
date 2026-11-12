'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type ChallengeClient = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id?: string) => void;
};
export default function RegistrationChallenge({ siteKey, nonce, onToken, resetKey }: { siteKey: string; nonce?: string; onToken: (token: string) => void; resetKey: number }) {
  const element = useRef<HTMLDivElement>(null), widget = useRef<string | null>(null);
  const [loaded, setLoaded] = useState(false), [message, setMessage] = useState('');
  useEffect(() => {
    const client = window.turnstile as ChallengeClient | undefined;
    if (!loaded || !client || !element.current) return;
    const id = client.render(element.current, {
      sitekey: siteKey, action: 'signup', language: 'es', theme: 'light',
      callback: (token: string) => { onToken(token); setMessage(''); },
      'expired-callback': () => { onToken(''); setMessage('La verificación venció. Complétala de nuevo.'); },
      'error-callback': () => { onToken(''); setMessage('No pudimos completar la verificación. Reintenta o recarga la página.'); },
      'timeout-callback': () => { onToken(''); setMessage('La verificación tardó demasiado. Inténtalo de nuevo.'); },
    });
    widget.current = id;
    return () => { client.remove(id); widget.current = null; };
  }, [loaded, siteKey, onToken, resetKey]);
  return <div>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" nonce={nonce} onReady={() => setLoaded(true)} onError={() => { onToken(''); setMessage('No se pudo cargar la verificación. Comprueba tu conexión y recarga la página.'); }} />
    <div ref={element} aria-label="Verificación antiabuso" />
    {message && <><p role="status">{message}</p><button type="button" className="text-link" onClick={() => { onToken(''); if (widget.current !== null) window.turnstile?.reset(widget.current); else location.reload(); }}>Reintentar verificación</button></>}
  </div>;
}
