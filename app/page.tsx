import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import MotionDirector from "./MotionDirector";
import { HistoryExplorer, ProgramExplorer } from "./HomeExplorers";
import ActionPortal from "./ActionPortal";
import ExperienceMatrix from "./ExperienceMatrix";
import ConversationPreview from "./ConversationPreview";
import HeroMascot from "./HeroMascot";
import { commissions } from "@/lib/commissions";
import { leaders, references, cases, standards, conversations } from "./HomeData";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <main id="main-content" className="aj-home">
      <MotionDirector />
      <section className="aj-hero aj-hero-integrated aj-wrap" id="inicio">
        <HeroMascot />
        <div className="aj-hero-copy">
          <div className="aj-hero-intro"><p className="aj-eyebrow">Tlalnepantla, Estado de México</p></div>
          <h1>Tu talento puede<br /><em>mover Tlalnepantla.</em></h1>
          <div className="aj-actions"><Link className="button button-primary" href="/participacion">Quiero participar</Link><a className="aj-link" href="#programas">Consultar comisiones</a></div>
        </div>
      </section>

      <section className="aj-welcome aj-wrap" id="comunidad" data-motion="reveal">
        <h2>Ven como eres. Crece con los demás.</h2>
        <p>Estudies en un bachillerato técnico o en una universidad pública o privada, tengas un trabajo u oficio o apenas estés encontrando tu camino, aquí puedes aportar.</p>
      </section>

      <section className="aj-history aj-section" id="identidad">
        <div className="aj-wrap">
          <div className="aj-heading" data-motion="reveal"><h2>Personas y<br /><em>antecedentes.</em></h2><p>Archivo de Acción Juvenil.</p></div>
          <HistoryExplorer />
          <div className="aj-leaders"><h3>De aquí salieron caminos muy distintos</h3><div className="aj-leader-grid">{leaders.map(leader => <details className="aj-person" key={leader.name}><summary><Image unoptimized src={leader.image} alt={leader.name} width={360} height={360} loading="lazy" sizes="88px" /><span>{leader.name}<small>Ver trayectoria</small></span><b aria-hidden="true">+</b></summary><div className="aj-person-detail"><p><span>El comienzo</span>{leader.youth}</p><p><span>Después</span>{leader.later}</p><a href={leader.href} target="_blank" rel="noreferrer">Fuente de la trayectoria</a><a href={leader.photoHref} target="_blank" rel="noreferrer">Crédito de fotografía</a></div></details>)}</div></div>
        </div>
      </section>

      <section className="aj-experiences aj-section aj-wrap" id="programas">
        <div className="aj-heading" data-motion="reveal"><div><p className="aj-eyebrow">Comisiones</p><h2>El trabajo,<br /><em>bien definido.</em></h2></div><p>Seis áreas de trabajo.<br />Consulta sus funciones y responsabilidades.</p></div>
        <ProgramExplorer />
        <div className="aj-combination" data-motion="reveal"><div><p className="aj-eyebrow">La combinación que importa</p><h3>Algo que aprendes.<br />Alguien que conoces.<br /><em>Una idea que avanza.</em></h3></div><ExperienceMatrix /></div>
      </section>

      <section className="aj-journey aj-section" id="recorrido"><div className="aj-wrap">
        <ActionPortal />
        <div className="aj-more">
          <details id="estandar"><summary>Cómo trabajamos en equipo<span aria-hidden="true">+</span></summary><div className="aj-practical-list">{standards.map(([title,text])=><article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></details>
          <details id="equipo"><summary>Quién hace qué<span aria-hidden="true">+</span></summary><div className="aj-team-credit"><strong>Yohualli Emiliano García Milla</strong><span>Impulsa esta etapa del proyecto.</span><p>La convocatoria para coordinar las comisiones se publicará en Actualidad. Aquí aparecerán los nombres de quienes sean designados.</p></div><div className="aj-practical-list aj-team-list">{commissions.map(item=><article key={item.id}><h3>{item.name}</h3><p>{item.purpose}</p><Link href={`/comisiones#${item.id}`}>Ver las tareas de {item.name}</Link></article>)}</div></details>
          <details id="experiencias"><summary>Experiencias de Acción Juvenil en México<span aria-hidden="true">+</span></summary><div className="aj-reference-grid">{references.map(item=><a key={item.title} href={item.href} target="_blank" rel="noreferrer"><Image unoptimized src={item.image} alt={item.title} width={item.width} height={item.height} loading="lazy" sizes="(max-width: 760px) 90vw, 30vw" /><small>{item.eyebrow}</small><h3>{item.title}</h3><p>{item.text}</p><span>Leer en {item.source}</span></a>)}</div><div className="aj-case-list">{cases.map(item=><article key={item.title}><h3>{item.title}</h3><p>{item.text}</p><a href={item.href} target="_blank" rel="noreferrer">{item.linkLabel}</a></article>)}</div></details>
          <details><summary>Antes de participar<span aria-hidden="true">+</span></summary><ConversationPreview pairs={conversations} /></details>
        </div>

      </div></section>
    </main>
  );
}
