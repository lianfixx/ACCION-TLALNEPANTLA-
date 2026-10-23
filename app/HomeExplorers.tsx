"use client";

import { useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { timeline } from "./HomeData";
import { commissions } from "@/lib/commissions";
import Link from "next/link";

function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number, count: number, choose: (index: number) => void) {
  const list = event.currentTarget.closest('[role="tablist"]');
  const vertical = list?.getAttribute("aria-orientation") === "vertical";
  const keys: Record<string, number> = {
    [vertical ? "ArrowDown" : "ArrowRight"]: (index + 1) % count,
    [vertical ? "ArrowUp" : "ArrowLeft"]: (index - 1 + count) % count,
    Home: 0,
    End: count - 1,
  };
  if (!(event.key in keys)) return;
  event.preventDefault();
  const next = keys[event.key];
  choose(next);
  const buttons = list?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  buttons?.[next]?.focus({preventScroll: true});
  buttons?.[next]?.scrollIntoView({block: "nearest", inline: "nearest", behavior: "instant"});
}

const historyShort = [
  ["Los primeros grupos", "Jesús Hernández Díaz encabeza uno de los primeros grupos juveniles del PAN."],
  ["Nace Acción Juvenil", "El 14 de marzo comienza la organización. Felipe Calderón encabeza su primera etapa."],
  ["Cambio de dirigencia", "Saúl Ruiz Arriaga es elegido secretario nacional. José Espina lo sustituye ocho meses después."],
  ["Una nueva generación", "Cristián Castaño asume la Secretaría Nacional para el periodo 1992–1995."],
  ["Una mujer al frente", "Déborah Martínez es la primera mujer electa para dirigir la Secretaría Nacional."],
  ["El siguiente relevo", "Daniela Aguilar es electa para el periodo 2025–2028."],
  ["La historia sigue aquí", "En Tlalnepantla hay espacios de formación, comunidad y trabajo en equipo."],
];

export function HistoryExplorer() {
  const [selected, setSelected] = useState(1);
  return <div className="aj-time-machine">
    <div className="aj-year-tabs" role="tablist" aria-label="Años de la historia de Acción Juvenil">{timeline.map((item,index)=><button key={item.year} id={`year-${index}`} type="button" role="tab" aria-controls={`history-${index}`} aria-selected={selected===index} tabIndex={selected===index?0:-1} onClick={()=>setSelected(index)} onKeyDown={e=>moveTab(e,index,timeline.length,setSelected)}>{item.year}<span aria-hidden="true" /></button>)}</div>
    {timeline.map((item,index)=><div id={`history-${index}`} role="tabpanel" aria-labelledby={`year-${index}`} tabIndex={0} key={item.year} hidden={selected!==index} className="aj-history-panel"><span className="aj-big-year" aria-hidden="true">{item.year}</span><div className="aj-history-story"><h3>{historyShort[index][0]}</h3><p>{historyShort[index][1]}</p>{item.href ? <a href={item.href} target="_blank" rel="noreferrer">Consultar fuente</a> : item.source ? <small className="aj-history-source">{item.source}</small> : null}</div><span className="aj-history-index" aria-hidden="true">{String(index+1).padStart(2,"0")} / {String(timeline.length).padStart(2,"0")}</span></div>)}
  </div>;
}

const subscribeNarrow = (notify: () => void) => {
  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const isNarrow = () => window.matchMedia("(max-width: 760px)").matches;

export function ProgramExplorer() {
  const [selected, setSelected] = useState(0);
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  return <div className="aj-program-explorer commission-explorer">
    <div className="aj-program-tabs" role="tablist" aria-orientation={narrow ? "horizontal" : "vertical"} aria-label="Comisiones de trabajo">{commissions.map((commission,index)=><button key={commission.id} id={`program-${index}`} type="button" role="tab" aria-controls={`experience-${index}`} aria-selected={selected===index} tabIndex={selected===index?0:-1} onClick={()=>setSelected(index)} onKeyDown={e=>moveTab(e,index,commissions.length,setSelected)}>{commission.name}<b aria-hidden="true">+</b></button>)}</div>
    <div className="commission-stage">{commissions.map((commission,index)=><div role="tabpanel" id={`experience-${index}`} aria-labelledby={`program-${index}`} tabIndex={0} hidden={selected!==index} key={commission.id} className="commission-panel"><h3>{commission.name}</h3><p className="commission-purpose">{commission.purpose}</p><ul>{commission.tasks.map(task=><li key={task}>{task}</li>)}</ul><div className="commission-delivery"><span>Trabajo a cargo</span><p>{commission.result}</p></div><div className="commission-links"><Link className="aj-link" href={`/comisiones#${commission.id}`}>Ver funciones y forma de trabajo </Link><Link className="commission-register" href={`/participacion?comision=${commission.id}#registro`}>Registro interno</Link></div></div>)}</div>
  </div>;
}
