"use client";
import { useEffect, useRef } from "react";
import { commissions } from "@/lib/commissions";

export default function RegistrationMap({ commission, step, steps, onStep }: { commission:string; step:number; steps:string[]; onStep:(step:number)=>void }) {
  const host=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null),selection=useRef(commission),scene=useRef<{select:(index:number)=>void;dispose:()=>void}|null>(null);
  useEffect(()=>{selection.current=commission;scene.current?.select(commissions.findIndex(c=>c.id===commission));},[commission]);
  useEffect(()=>{
    const element=host.current,container=stage.current;if(!element||!container)return;
    const preferences=['(prefers-reduced-motion: reduce)','(prefers-reduced-data: reduce)','(prefers-reduced-transparency: reduce)','(prefers-contrast: more)'].map(query=>matchMedia(query));
    const limited=()=>preferences.some(p=>p.matches);
    let cancelled=false,loading=false;
    async function mount(){if(cancelled||loading||limited())return;loading=true;
      try{const {mountCommissionScene}=await import('@/lib/commission-scene');if(cancelled)return;const mounted=await mountCommissionScene(element!,container!,commissions.findIndex(c=>c.id===selection.current));if(cancelled||limited())mounted.dispose();else {scene.current=mounted;mounted.select(commissions.findIndex(c=>c.id===selection.current));}}catch{/* The SVG map remains available without WebGL. */}finally{loading=false;}}
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!scene.current)void mount();},{rootMargin:'120px'});observer.observe(container);
    const changed=()=>{scene.current?.dispose();scene.current=null;if(!limited())void mount();};preferences.forEach(p=>p.addEventListener('change',changed));
    return()=>{cancelled=true;observer.disconnect();scene.current?.dispose();scene.current=null;preferences.forEach(p=>p.removeEventListener('change',changed));};
  },[]);
  const chosen=commissions.find(c=>c.id===commission);
  return <aside className="registration-map">
    <div className="registration-map-stage" ref={stage} aria-hidden="true"><div ref={host} className="registration-webgl"/><svg className="registration-map-fallback" viewBox="0 0 400 340"><defs><linearGradient id="map-glass" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#d9e8fc"/></linearGradient></defs><path d="M200 55 321 120 321 240 200 305 79 240 79 120Z" fill="url(#map-glass)" stroke="#bccfe5"/><path d="M200 55V180m121-60L200 180m121 60-121-60m0 125V180M79 240l121-60M79 120l121 60" stroke="#a9c5e7"/>{commissions.map((c,i)=>{const a=(i*60-90)*Math.PI/180;return <circle key={c.id} cx={200+121*Math.cos(a)} cy={180+115*Math.sin(a)} r={c.id===commission?17:10} fill={c.id===commission?'#004a98':'#fff'} stroke="#004a98"/>;})}<circle cx="200" cy="180" r="36" fill="white" stroke="#bccfe5"/></svg><span className="registration-map-mark">APJ</span></div>
    <div className="registration-map-caption"><span>{chosen ? "Comisión seleccionada" : "Registro interno"}</span><strong>{chosen?.name ?? "Elige tu comisión"}</strong></div>
    <ol className="registration-steps" aria-label="Pasos de la solicitud">{steps.map((label,i)=><li key={label}><button type="button" onClick={()=>onStep(i)} aria-current={step===i?'step':undefined}><span aria-hidden="true">{i<step?'✓':i+1}</span>{label}</button></li>)}</ol>

  </aside>;
}
