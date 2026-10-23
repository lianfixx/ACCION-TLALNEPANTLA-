"use client";

import { FormEvent, useState } from "react";

export default function CommentForm({ accountId, postId, enabled, signedIn, signInPath }: { accountId: string; postId: string; enabled: boolean; signedIn: boolean; signInPath: string }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = data.get("body");
    const publicName = data.get("publicName");
    const consent = data.get("consent") === "on";
    setMessage("Enviando…");
    setSending(true);
    try {
      const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json", "X-Expected-Account-Id": accountId }, body: JSON.stringify({ postId, body, publicName, consent }) });
      const result = await response.json() as { error?: string; message?: string };
      setMessage(result.error ?? result.message ?? "Listo.");
      if (response.ok) form.reset();
    } catch {
      setMessage("No fue posible enviar la opinión. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSending(false);
    }
  }
  if (!enabled) return <div className="comment-closed"><strong>Opiniones cerradas por ahora.</strong><p>Puedes leer y compartir esta publicación. Por ahora no recibe comentarios.</p></div>;
  if (!signedIn) return <div className="comment-closed"><strong>Inicia sesión para opinar.</strong><p>La autenticación ayuda a prevenir abuso; tu correo no se publica.</p><a className="button button-primary" href={signInPath}>Iniciar sesión</a></div>;
  return <form className="comment-form" onSubmit={submit} aria-busy={sending}><label>Nombre público opcional<input name="publicName" maxLength={80} placeholder="Participante" autoComplete="nickname" /></label><label>Tu opinión<textarea name="body" minLength={3} maxLength={1200} required rows={4} /></label><label className="consent-line"><input name="consent" type="checkbox" required /><span>He leído el <a href="/privacidad">aviso de privacidad</a> y acepto el tratamiento necesario para moderar esta opinión.</span></label><button className="button button-primary" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar a moderación"}</button><p role="status" aria-live="polite">{message}</p></form>;
}
