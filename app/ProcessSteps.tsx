import { defaultProcessSteps, type ProcessStep } from "@/lib/site-content-defaults";

/** The same five steps everywhere: public pages show them as a guide, Mi comisión as progress. Texts are editable in the panel; the keys are fixed. */
export default function ProcessSteps({ steps = defaultProcessSteps, done = [], current, compact = false, label = "Cómo funciona" }: { steps?: ProcessStep[]; done?: string[]; current?: string; compact?: boolean; label?: string }) {
  return <ol className={`process-steps${compact ? " process-steps-compact" : ""}`} aria-label={label}>
    {steps.map((step, index) => {
      const state = done.includes(step.key) ? "done" : current === step.key ? "current" : "pending";
      return <li key={step.key} data-state={state} aria-current={state === "current" ? "step" : undefined}>
        <span className="process-step-mark" aria-hidden="true">{state === "done" ? "✓" : index + 1}</span>
        <span><strong>{step.title}</strong>{!compact && <small>{step.hint}</small>}</span>
      </li>;
    })}
  </ol>;
}
