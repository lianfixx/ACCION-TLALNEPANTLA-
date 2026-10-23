'use client';
import { useEffect, useState } from 'react';

const valid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const lifetime = 30 * 60_000;

/** Tab-scoped recovery after reload. Never use a query string or localStorage. */
export function useFragmentCode(purpose: 'activation' | 'email') {
  const [code, setCode] = useState('');
  const key = `apj:${purpose}:code`;
  useEffect(() => {
    let frame = 0;
    const readCode = () => {
      let value = '';
      const fragment = new URLSearchParams(location.hash.slice(1));
      if (fragment.has('codigo')) {
        const candidate = fragment.get('codigo');
        try {
          sessionStorage.removeItem(key);
          if (valid(candidate)) {
            sessionStorage.setItem(key, JSON.stringify({ code: candidate, expiresAt: Date.now() + lifetime }));
            value = candidate;
          }
          history.replaceState(history.state, '', location.pathname + location.search);
        } catch {
          // If storage is unavailable keep the fragment so reloading is recoverable.
          if (valid(candidate)) value = candidate;
        }
      } else {
        try {
          const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null');
          if (valid(saved?.code) && Number.isFinite(saved?.expiresAt) && saved.expiresAt > Date.now() && saved.expiresAt <= Date.now() + lifetime) value = saved.code;
          else sessionStorage.removeItem(key);
        } catch { /* Storage may be disabled; the original link still works. */ }
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setCode(value));
    };
    readCode();
    window.addEventListener('hashchange', readCode);
    window.addEventListener('popstate', readCode);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', readCode);
      window.removeEventListener('popstate', readCode);
    };
  }, [key]);
  function clear() {
    try { sessionStorage.removeItem(key); } catch { /* Optional browser storage. */ }
    history.replaceState(history.state, '', location.pathname + location.search);
    setCode('');
  }
  return { code, clear };
}
