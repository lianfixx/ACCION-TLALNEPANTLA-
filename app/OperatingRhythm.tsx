"use client";

import { MotionConfig, motion, useReducedMotion, useScroll } from "motion/react";
import { useRef } from "react";

const weeks = [
  ["01", "Escuchamos", "Una inquietud concreta, sin decidir por la comunidad antes de llegar."],
  ["02", "Nos preparamos", "Un equipo breve, una persona invitada y las herramientas necesarias."],
  ["03", "Salimos a territorio", "Foro, taller o acción dentro de la escuela o la comunidad."],
  ["04", "Damos seguimiento", "Qué avanzó, qué falta y quién se hace responsable del siguiente paso."],
];

export default function OperatingRhythm() {
  const boardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: boardRef,
    offset: ["start 82%", "end 50%"],
  });

  return (
    <MotionConfig reducedMotion="user">
      <section ref={boardRef} className="operating-rhythm" aria-labelledby="operating-rhythm-title">
        <div className="operating-rhythm-copy">
          <p className="section-kicker">Así trabajamos</p>
          <h3 id="operating-rhythm-title">Una actividad no termina cuando se apagan las luces.</h3>
          <p>Cada tres o cuatro semanas abrimos una conversación, formamos un equipo pequeño y entregamos algo concreto. La siguiente actividad comienza con lo que aprendimos de la anterior.</p>
        </div>
        <div className="rhythm-board">
          <div className="rhythm-line" aria-hidden="true">
            <motion.span style={{ scaleX: prefersReducedMotion ? 1 : scrollYProgress }} />
          </div>
          <ol>
            {weeks.map(([number, title, text], index) => (
              <motion.li
                key={number}
                initial={prefersReducedMotion ? false : { opacity: 0.35, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ duration: 0.44, delay: index * 0.055, ease: [0.22, 1, 0.36, 1] }}
              >
                <span>{number}</span>
                <h4>{title}</h4>
                <p>{text}</p>
              </motion.li>
            ))}
          </ol>
          <div className="rhythm-close">
            <span>Lo que queda</span>
            <strong>Una habilidad practicada, una idea más clara o una mejora que alguien puede continuar.</strong>
          </div>
        </div>
      </section>
    </MotionConfig>
  );
}
