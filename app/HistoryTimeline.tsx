"use client";

import { MotionConfig, motion, useReducedMotion, useScroll } from "motion/react";
import { useRef } from "react";

export type HistoryItem = {
  year: string;
  title: string;
  text: string;
  href?: string;
  source?: string;
};

export default function HistoryTimeline({ items }: { items: HistoryItem[] }) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 76%", "end 48%"],
  });

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={timelineRef}
        className="history-vertical history-vertical-motion"
        aria-label="Historia de Acción Juvenil"
      >
        <motion.div
          className="history-progress"
          aria-hidden="true"
          style={{ scaleY: prefersReducedMotion ? 1 : scrollYProgress }}
        />
        {items.map((item) => (
          <motion.article
            key={`${item.year}-${item.title}`}
            initial={prefersReducedMotion ? false : { opacity: 0.42, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.34 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            <time>{item.year}</time>
            <div className="history-dot" aria-hidden="true" />
            <div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              {item.href && item.source ? (
                <a href={item.href} target="_blank" rel="noreferrer">
                  {item.source}
                </a>
              ) : null}
            </div>
          </motion.article>
        ))}
      </div>
    </MotionConfig>
  );
}
