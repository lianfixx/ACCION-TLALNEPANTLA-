import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import MotionDirector from "./MotionDirector";
import { HistoryExplorer, ProgramExplorer } from "./HomeExplorers";
import ActionPortal from "./ActionPortal";
import ExperienceMatrix from "./ExperienceMatrix";
import ConversationPreview from "./ConversationPreview";
import HeroMascot from "./HeroMascot";
import { leaders, references, cases, standards, conversations } from "./HomeData";
import { HeadingText, Lines } from "./ContentText";
import { siteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const content = await siteContent(), home = content.home;
  return (
    <main id="main-content" className="aj-home">
      <MotionDirector />
      <section className="aj-hero aj-hero-integrated aj-wrap" id="inicio">
        <HeroMascot />
        <div className="aj-hero-copy">
          <div className="aj-hero-intro"><p className="aj-eyebrow">{home.hero.eyebrow}</p></div>
          <h1><HeadingText title={home.hero.title} emphasis={home.hero.emphasis} stacked /></h1>
          <div className="aj-actions"><Link className="button button-primary" href="/participacion">Quiero participar</Link><a className="aj-link" href="#programas">Consultar comisiones</a></div>
        </div>
      </section>

      <section className="aj-welcome aj-wrap" id="comunidad" data-motion="reveal">
        <h2>{home.welcome.title}</h2>
        <p><Lines text={home.welcome.text} /></p>
      </section>

      <section className="aj-history aj-section" id="identidad">
        <div className="aj-wrap">
          <div className="aj-heading" data-motion="reveal"><h2><HeadingText title={home.history.title} emphasis={home.history.emphasis} stacked /></h2><p><Lines text={home.history.text} /></p></div>
          <HistoryExplorer />
          <div className="aj-leaders"><h3>De aquí salieron caminos muy distintos</h3><div className="aj-leader-grid">{leaders.map(leader => <details className="aj-person" key={leader.name}><summary><Image unoptimized src={leader.image} alt={leader.name} width={360} height={360} loading="lazy" sizes="88px" /><span>{leader.name}<small>Ver trayectoria</small></span><b aria-hidden="true">+</b></summary><div className="aj-person-detail"><p><span>El comienzo</span>{leader.youth}</p><p><span>Después</span>{leader.later}</p><a href={leader.href} target="_blank" rel="noreferrer">Fuente de la trayectoria</a><a href={leader.photoHref} target="_blank" rel="noreferrer">Crédito de fotografía</a></div></details>)}</div></div>
        </div>
      </section>

      <section className="aj-experiences aj-section aj-wrap" id="programas">
        <div className="aj-heading" data-motion="reveal"><div><p className="aj-eyebrow">{home.commissions.eyebrow}</p><h2><HeadingText title={home.commissions.title} emphasis={home.commissions.emphasis} stacked /></h2></div><p><Lines text={home.commissions.text} /></p></div>
        <ProgramExplorer commissions={content.commissions} />
        <div className="aj-combination" data-motion="reveal"><div><p className="aj-eyebrow">{home.combination.eyebrow}</p><h3><HeadingText title={home.combination.title} emphasis={home.combination.emphasis} stacked /></h3></div><ExperienceMatrix /></div>
      </section>

      <section className="aj-journey aj-section" id="recorrido"><div className="aj-wrap">
        <ActionPortal />
        <div className="aj-more">
          <details id="estandar"><summary>Cómo trabajamos en equipo<span aria-hidden="true">+</span></summary><div className="aj-practical-list">{standards.map(([title,text])=><article key={title}><h3>{title}</h3><p>{text}</p></article>)}</div></details>
          <details id="equipo"><summary>Quién hace qué<span aria-hidden="true">+</span></summary><div className="aj-team-credit"><strong>{home.team.name}</strong><span>{home.team.role}</span><p><Lines text={home.team.note} /></p></div></details>
          <details id="experiencias"><summary>Experiencias de Acción Juvenil en México<span aria-hidden="true">+</span></summary><div className="aj-reference-grid">{references.map(item=><a key={item.title} href={item.href} target="_blank" rel="noreferrer"><Image unoptimized src={item.image} alt={item.title} width={item.width} height={item.height} loading="lazy" sizes="(max-width: 760px) 90vw, 30vw" /><small>{item.eyebrow}</small><h3>{item.title}</h3><p>{item.text}</p><span>Leer en {item.source}</span></a>)}</div><div className="aj-case-list">{cases.map(item=><article key={item.title}><h3>{item.title}</h3><p>{item.text}</p><a href={item.href} target="_blank" rel="noreferrer">{item.linkLabel}</a></article>)}</div></details>
          <details><summary>Antes de participar<span aria-hidden="true">+</span></summary><ConversationPreview pairs={conversations} /></details>
        </div>

      </div></section>
    </main>
  );
}
