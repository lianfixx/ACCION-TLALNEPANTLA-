"use client";
import { useEffect, useRef } from "react";

/** The complete diagram is HTML. WebGL is a lazy, optional visual layer. */
export default function GlassScene() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current, diagram = element?.parentElement;
    if (!element || !diagram) return;
    const preferences = [matchMedia('(prefers-reduced-motion: reduce)'), matchMedia('(prefers-reduced-transparency: reduce)'), matchMedia('(prefers-contrast: more)')];
    let near = false, generation = 0, loading = false, disposed = false, unavailable = false;
    let release: (()=>void) | undefined;
    async function update() {
      if (disposed) return;
      if (preferences.some(p=>p.matches)) { generation++; loading=false; release?.(); release=undefined; return; }
      if (!near || release || loading || unavailable) return;
      loading=true;const ticket=++generation;
      try {
        const { mountGlassScene } = await import('../lib/glass-scene');
        if(disposed||ticket!==generation)return;
        const cleanup=await mountGlassScene(element!,diagram!,()=>!disposed&&ticket===generation);
        if(disposed||ticket!==generation)cleanup();else release=cleanup;
      } catch { unavailable=true;delete diagram!.dataset.webgl; }
      finally { if(ticket===generation)loading=false; }
    }
    const observer=new IntersectionObserver(entries=>{near=entries[0]?.isIntersecting??false;void update();},{rootMargin:'250px'});
    observer.observe(diagram);
    const changed=()=>{void update();};preferences.forEach(p=>p.addEventListener('change',changed));
    return()=>{disposed=true;generation++;observer.disconnect();preferences.forEach(p=>p.removeEventListener('change',changed));release?.();delete diagram.dataset.webgl;};
  },[]);
  return <div ref={host} className="glass-scene" aria-hidden="true" />;
}
