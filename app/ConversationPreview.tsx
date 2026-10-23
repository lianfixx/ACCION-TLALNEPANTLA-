"use client";

import { useEffect, useRef, useState } from "react";

/** Scripted FAQ: the text remains available without JavaScript and never implies a live chat. */
export default function ConversationPreview({ pairs }: { pairs: readonly (readonly [string, string])[] }) {
  const root = useRef<HTMLDivElement>(null);
  const end = pairs.length * 3;
  const [step, setStep] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(false);
  const current = Math.min(Math.floor((step ?? end) / 3), pairs.length - 1);
  const complete = step === null || step >= end;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(preference.matches);
      setStep(previous => preference.matches ? end : previous ?? 0);
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, [end]);

  useEffect(() => {
    const element = root.current;
    const details = element?.closest("details");
    const pair = element?.querySelectorAll(".conversation-pair")[current];
    if (!element || !pair) return;
    let inView = false;
    const update = () => setActive(inView && !document.hidden && (!details || details.open));
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      update();
    }, { threshold: .12 });
    observer.observe(pair);
    details?.addEventListener("toggle", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      details?.removeEventListener("toggle", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [current]);

  useEffect(() => {
    if (step === null || complete || reduced || paused || !active) return;
    // Whole messages enter together. No character-by-character updates or forced scrolling.
    const delay = [500, Math.min(1300, 650 + pairs[current][1].length * 2), 1000][step % 3];
    const timer = window.setTimeout(() => setStep(value => value === null ? end : value + 1), delay);
    return () => window.clearTimeout(timer);
  }, [active, complete, current, end, pairs, paused, reduced, step]);

  return <div className="participation-conversation conversation-preview" ref={root} data-paused={paused || !active}>
    <div className="conversation-toolbar">
      <span>Conversación de ejemplo</span>
      {step !== null && !reduced && <div className="conversation-controls">
        {!complete && <button type="button" onClick={() => setPaused(value => !value)}>{paused ? "Continuar" : "Pausar"}</button>}
        <button type="button" onClick={() => { setStep(complete ? 0 : end); setPaused(false); }}>{complete ? "Repetir" : "Ver todo"}</button>
      </div>}
    </div>
    <div className="conversation-messages" aria-label="Preguntas y respuestas">
      {pairs.map(([question, answer], index) => {
        const phase = step === null ? 3 : Math.max(0, Math.min(3, step - index * 3 + 1));
        return <article className="conversation-pair" key={question} data-phase={phase}>
          <h3 className="conversation-question">{question}</h3>
          <div className="conversation-answer">
            <p>{answer}</p>
            {phase === 2 && <span className="conversation-typing" aria-hidden="true"><i /><i /><i /></span>}
          </div>
        </article>;
      })}
    </div>
  </div>;
}
