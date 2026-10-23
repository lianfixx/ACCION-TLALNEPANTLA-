"use client";

import { FormEvent, useState } from "react";
import Script from "next/script";
import Link from "next/link";

type ContactKind = "suggestion" | "collaboration" | "citizen_report" | "complaint" | "idea";
type DetailField = { name: string; label: string; maxLength: number; multiline?: boolean };
type ContactDefinition = { title: string; prompt: string; expectation: string; fields: DetailField[]; institution?: boolean };

const labels: Record<ContactKind, ContactDefinition> = {
  suggestion: { title: "Sugerencia", prompt: "¿Qué propones mejorar y por qué?", expectation: "Se revisará como orientación interna; enviarla no garantiza que la propuesta se adopte.", fields: [{ name: "area", label: "¿Qué parte te gustaría mejorar?", maxLength: 120 }, { name: "proposal", label: "¿Cómo lo harías? (opcional)", maxLength: 900, multiline: true }] },
  collaboration: { title: "Colaboración", prompt: "Cuéntanos en qué te gustaría participar.", expectation: "Enviar tus datos no confirma un lugar, encargo, cargo ni relación institucional.", institution: true, fields: [{ name: "skills", label: "¿Qué sabes hacer o qué quieres aprender?", maxLength: 700, multiline: true }, { name: "activity", label: "¿En qué tipo de actividad te gustaría sumar?", maxLength: 700, multiline: true }, { name: "availability", label: "Disponibilidad general (opcional)", maxLength: 240 }] },
  citizen_report: { title: "Reporte ciudadano", prompt: "Describe con claridad qué ocurrió.", expectation: "Este canal no es autoridad y la referencia de recepción no es un folio oficial. Para una emergencia llama al 911.", fields: [{ name: "location", label: "Lugar o referencia", maxLength: 300 }, { name: "approximateTime", label: "Fecha o momento aproximado", maxLength: 160 }, { name: "authority", label: "¿Qué autoridad podría atenderlo? (opcional)", maxLength: 240 }] },
  complaint: { title: "Queja", prompt: "Describe el hecho sin incluir datos sensibles ni información de terceras personas.", expectation: "No sustituye una denuncia, una queja formal ni un mecanismo de protección. No incluyas información cuya reserva sea indispensable.", fields: [{ name: "approximateTime", label: "¿Cuándo ocurrió?", maxLength: 160 }, { name: "expectedResolution", label: "¿Qué solución esperas?", maxLength: 700, multiline: true }] },
  idea: { title: "Idea", prompt: "¿Qué problema quieres resolver y por qué importa?", expectation: "La recepción no implica aprobación, financiamiento, ejecución ni respuesta individual.", institution: true, fields: [{ name: "beneficiaries", label: "¿A quién beneficiaría?", maxLength: 500, multiline: true }, { name: "firstStep", label: "¿Cuál podría ser el primer paso?", maxLength: 700, multiline: true }, { name: "supportNeeded", label: "¿Qué apoyo necesitarías? (opcional)", maxLength: 700, multiline: true }] },
};

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

export default function ContactForm({ enabled, siteKey, nonce }: { enabled: boolean; siteKey: string; nonce?: string }) {
  const [kind, setKind] = useState<ContactKind>("idea");
  const [hasContact, setHasContact] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{ code: string; title: string; expectsReply: boolean } | null>(null);

  if (!enabled) return <div className="contact-closed"><strong>Las solicitudes en línea aún no están disponibles.</strong><p>Por ahora, consulta las actividades y sus convocatorias en Actualidad.</p><Link className="text-link" href="/actualidad">Consultar actualidad</Link></div>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    setMessage("Enviando…");
    try {
      const data = Object.fromEntries(new FormData(form));
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, consent: data.consent === "on" }) });
      const result = await response.json() as { error?: string; message?: string; record?: { referenceCode?: string | null } };
      setMessage(result.error ?? result.message ?? "Solicitud recibida.");
      if (response.ok) {
        setReceipt({ code: result.record?.referenceCode ?? "RECIBIDO", title: labels[kind].title, expectsReply: Boolean(data.email) });
        form.reset();
        setKind("idea");
        setHasContact(false);
        try {
          window.turnstile?.reset();
        } catch {
          // The request is already recorded; a widget reset must not replace its acknowledgement.
        }
      }
    } catch {
      setMessage("No fue posible enviar la solicitud. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setSending(false);
    }
  }

  if (receipt) return <div className="contact-receipt" role="status"><span>Recibimos tu {receipt.title.toLowerCase()}</span><strong>{receipt.code}</strong><h3>Gracias por dar el primer paso.</h3><p>Esta referencia confirma que el mensaje llegó. El equipo podrá revisarlo y canalizarlo; no implica aprobación ni un plazo garantizado.</p>{receipt.expectsReply ? <p>Como pediste respuesta, utilizaremos únicamente el correo que compartiste para este seguimiento.</p> : <p>No compartiste datos de contacto, así que la recepción se conserva sin una vía de respuesta individual.</p>}<div><button className="button button-secondary" type="button" onClick={() => { setReceipt(null); setMessage(""); }}>Enviar otro mensaje</button><Link className="text-link" href="/privacidad">Consultar privacidad</Link></div></div>;

  return <form className="contact-form" onSubmit={submit} aria-busy={sending}>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" nonce={nonce} />
    <label htmlFor="contact-kind">Tipo de solicitud<select id="contact-kind" name="kind" value={kind} onChange={(event) => setKind(event.target.value as ContactKind)}>{Object.entries(labels).map(([value, item]) => <option value={value} key={value}>{item.title}</option>)}</select></label>
    <label htmlFor="contact-message">{labels[kind].prompt}<textarea id="contact-message" name="message" minLength={20} maxLength={5000} rows={7} required aria-describedby="contact-expectation contact-caution" autoCapitalize="sentences" spellCheck /></label>
    <div className="contact-detail-grid">{labels[kind].fields.map((field) => <label key={field.name} htmlFor={`contact-${field.name}`}>{field.label}{field.multiline ? <textarea id={`contact-${field.name}`} name={field.name} maxLength={field.maxLength} rows={3} /> : <input id={`contact-${field.name}`} name={field.name} maxLength={field.maxLength} />}</label>)}{labels[kind].institution ? <label htmlFor="contact-institution">Escuela, institución o comunidad (opcional)<input id="contact-institution" name="institution" maxLength={160} autoComplete="organization" /></label> : null}</div>
    <div className="contact-expectation" id="contact-expectation" role="note"><strong>Qué puedes esperar</strong><p>{labels[kind].expectation}</p><p>Verás un acuse al enviar. Si solicitas respuesta, no hay un plazo comprometido de atención o canalización.</p></div>
    <label className="contact-choice" htmlFor="contact-reply"><input id="contact-reply" type="checkbox" checked={hasContact} onChange={(event) => setHasContact(event.target.checked)} aria-controls="contact-fields" aria-expanded={hasContact} /> Quiero recibir respuesta por correo.</label>
    {hasContact ? <div className="contact-fields" id="contact-fields"><label htmlFor="contact-name">Nombre o alias opcional<input id="contact-name" name="name" maxLength={100} autoComplete="nickname" /></label><label htmlFor="contact-email">Correo para responder<input id="contact-email" name="email" type="email" maxLength={254} autoComplete="email" required /></label><label className="consent-line" htmlFor="contact-consent"><input id="contact-consent" name="consent" type="checkbox" required /><span>He leído el <a href="/privacidad">aviso de privacidad</a> y acepto el tratamiento necesario para responder.</span></label></div> : null}
    <label className="honeypot" aria-hidden="true">Sitio web<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <div className="cf-turnstile" data-sitekey={siteKey} data-action="contact" data-cdata="public-contact-form" data-theme="light" data-language="es" />
    <p className="contact-caution" id="contact-caution">No envíes documentos, contraseñas, datos médicos, información de terceros ni fotografías de identificaciones. Para una emergencia llama al 911.</p>
    <button className="button button-primary" type="submit" disabled={sending}>{sending ? "Enviando…" : "Enviar solicitud"}</button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
