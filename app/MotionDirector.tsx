"use client";

import { animate, inView, scroll } from "motion";
import { useEffect } from "react";
import { observeMotionPreferences } from "../lib/motion-preferences";

export default function MotionDirector() {
  useEffect(() => {
    return observeMotionPreferences(({ reduced, compact, pointer }) => {
      const stops: Array<() => void> = [];
      const dispose = () => stops.splice(0).forEach(stop => stop());
      if (reduced) return dispose;

      const linkTransform = (element: HTMLElement, transform: string[], target: HTMLElement, offset: NonNullable<Parameters<typeof scroll>[1]>["offset"], times?: number[]) => {
        const original = element.style.transform;
        const animation = animate(element, { transform }, { ease: "linear", times });
        const stop = scroll(animation, { target, offset });
        stops.push(() => { stop(); animation.cancel(); element.style.transform = original; });
      };
      stops.push(inView("[data-motion='reveal']", element => {
        const control = animate(element, { opacity: [0.65, 1], transform: [`translate3d(0,${compact ? 10 : 32}px,0)`, "translate3d(0,0,0)"] }, { duration: compact ? .4 : .75, ease: [.16,1,.3,1] });
        stops.push(() => { control.cancel(); (element as HTMLElement).style.opacity = ""; (element as HTMLElement).style.transform = ""; });
      }, { margin: "0px 0px -8%" }));
      const hero = document.querySelector<HTMLElement>("[data-motion='hero']");
      if (hero && !compact) {
        linkTransform(hero, ["rotateX(0deg) rotateY(-7deg) scale(1)", "rotateX(9deg) rotateY(5deg) scale(.93)"], hero, ["start start", "end start"]);
      }
      const portal = document.querySelector<HTMLElement>("[data-motion='portal']");
      if (portal) {
        if (!compact) portal.querySelectorAll<HTMLElement>(".portal-card").forEach((card, index) => {
          const side = index - 1;
          linkTransform(card, [
            `translate3d(${-side * (compact ? 5 : 38)}px,${50 + Math.abs(side) * 28}px,${-Math.abs(side) * 100}px) rotateX(18deg) rotateY(${side * (compact ? -5 : -22)}deg) rotateZ(${side * (compact ? 1 : 9)}deg)`,
            `translate3d(0,${index === 1 ? -14 : 10}px,${index === 1 ? (compact ? 24 : 48) : 0}px) rotateX(0deg) rotateY(${side * (compact ? -2 : -5)}deg) rotateZ(${side * (compact ? 0 : 2)}deg)`,
            `translate3d(${side * (compact ? 5 : 12)}px,-12px,0) rotateX(-5deg) rotateY(0deg) rotateZ(0deg)`,
          ], portal, ["start end", "end start"], [0,.55,1]);
        });
        const stage = portal.querySelector<HTMLElement>(".portal-stage");
        if (stage && pointer && !compact) {
          let frame = 0;
          let x = 0;
          let y = 0;
          const clamp = (value: number) => Math.max(-.5, Math.min(.5, value));
          const render = () => {
            frame = 0;
            // Measure the stationary parent, avoiding feedback from the tilted stage.
            const box = portal.getBoundingClientRect();
            if (!box.width || !box.height) return;
            stage.style.setProperty("--pointer-x", `${clamp((x - box.left) / box.width - .5) * 7}deg`);
            stage.style.setProperty("--pointer-y", `${-clamp((y - box.top) / box.height - .5) * 5}deg`);
          };
          const move = (event: PointerEvent) => {
            if (event.pointerType !== "mouse" || document.activeElement?.matches(":focus-visible")) return;
            x = event.clientX; y = event.clientY;
            if (!frame) frame = requestAnimationFrame(render);
          };
          const reset = () => {
            cancelAnimationFrame(frame); frame = 0;
            stage.style.removeProperty("--pointer-x"); stage.style.removeProperty("--pointer-y");
          };
          stage.addEventListener("pointermove", move, { passive: true });
          stage.addEventListener("pointerleave", reset);
          stage.addEventListener("focusin", reset);
          stops.push(() => {
            stage.removeEventListener("pointermove", move);
            stage.removeEventListener("pointerleave", reset);
            stage.removeEventListener("focusin", reset);
            reset();
          });
        }
      }
      return dispose;
    });
  }, []);
  return null;
}
