export const processSteps = [
  { key: "cuenta", title: "Crea tu cuenta", hint: "Usuario, contraseña y correo confirmado." },
  { key: "solicitud", title: "Envía tu solicitud", hint: "Tus datos, tu comisión y tu disponibilidad." },
  { key: "documentos", title: "Sube tus documentos", hint: "INE por ambos lados y comprobante de domicilio." },
  { key: "comision", title: "Te confirmamos", hint: "Administración revisa y te habilita en tu comisión." },
  { key: "afiliacion", title: "Afiliación al PAN", hint: "Último paso, desde la app del PAN." },
] as const;

/** The same five steps everywhere: public pages show them as a guide, Mi comisión as progress. */
export default function ProcessSteps({ done = [], current, compact = false, label = "Cómo funciona" }: { done?: string[]; current?: string; compact?: boolean; label?: string }) {
  return <ol className={`process-steps${compact ? " process-steps-compact" : ""}`} aria-label={label}>
    {processSteps.map((step, index) => {
      const state = done.includes(step.key) ? "done" : current === step.key ? "current" : "pending";
      return <li key={step.key} data-state={state} aria-current={state === "current" ? "step" : undefined}>
        <span className="process-step-mark" aria-hidden="true">{state === "done" ? "✓" : index + 1}</span>
        <span><strong>{step.title}</strong>{!compact && <small>{step.hint}</small>}</span>
      </li>;
    })}
  </ol>;
}
