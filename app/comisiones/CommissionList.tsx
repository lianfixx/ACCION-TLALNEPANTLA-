"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { commissionGuides } from "@/lib/commission-guides";
import { commissions } from "@/lib/commissions";

export default function CommissionList() {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const openLinkedCommission = () => {
      const id = window.location.hash.slice(1);
      if (!commissions.some(c => c.id === id)) return;
      list.current?.querySelectorAll<HTMLDetailsElement>("details[data-commission]").forEach(card => { card.open = card.id === id; });
      document.getElementById(id)?.scrollIntoView({ block: "start" });
    };
    openLinkedCommission();
    window.addEventListener("hashchange", openLinkedCommission);
    return () => window.removeEventListener("hashchange", openLinkedCommission);
  }, []);

  return <div className="commission-guide-list" ref={list}>
    {commissions.map(c => <details className="commission-guide-card commission-disclosure" id={c.id} key={c.id} data-commission onToggle={event => {
      if (!event.currentTarget.open) return;
      list.current?.querySelectorAll<HTMLDetailsElement>("details[data-commission]").forEach(card => { if (card.id !== c.id) card.open = false; });
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${c.id}`);
    }}>
      <summary><span className="commission-disclosure-title"><strong>{c.name}</strong><span>{c.purpose}</span></span><span className="commission-disclosure-action" aria-hidden="true"><span className="commission-open-label">Ver tareas</span><span className="commission-close-label">Cerrar</span></span></summary>
      <div className="commission-guide-expanded">
        <div><h2>Las tareas del equipo</h2><ul>{c.tasks.map(task => <li key={task}>{task}</li>)}</ul><div className="commission-guide-delivery"><h3>Qué entrega esta comisión</h3><p>{c.result}</p></div></div>
        <div><h2>Para empezar</h2><p>{commissionGuides[c.id].start}</p><h3>Con quién te coordinas</h3><p>{commissionGuides[c.id].support}</p></div>
        <section className="commission-followup" aria-labelledby={`followup-${c.id}`}>
          <h2 id={`followup-${c.id}`}>Cómo llevar el seguimiento</h2>
          <div className="commission-followup-grid">
            <article><h3>Qué debes confirmar</h3><p>{commissionGuides[c.id].approval}</p></article>
            <article><h3>Qué incluir en el reporte mensual</h3><p>{commissionGuides[c.id].report}</p></article>
            <article><h3>Qué dejar al siguiente equipo</h3><p>{commissionGuides[c.id].handover}</p></article>
          </div>
        </section>
        <div className="commission-guide-actions">
          <a className="text-link" href={`/documentos/guia-${c.id}.pdf`} download>Descargar guía de {c.name} en PDF</a>
          <Link className="button button-primary" href={`/participacion?comision=${c.id}#registro`}>Participar en {c.name}</Link>
        </div>
      </div>
    </details>)}
  </div>;
}
