"use client";

import Link from "next/link";
import PanMark from "./PanMark";
import { useRef, useState } from "react";

const navigation = [
  { href: "/#identidad", label: "Referencias" },
  { href: "/#programas", label: "Comisiones" },
  { href: "/#recorrido", label: "En marcha" },
  { href: "/agenda", label: "Agenda" },
] as const;

export default function SiteHeader() {
  const menu = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    if (menu.current) menu.current.open = false;
    setMenuOpen(false);
  }

  return (
    <header className="site-banner">
      <div className="site-header">
        <Link className="wordmark platform-wordmark" href="/" aria-label="Acción Política Juvenil Tlalnepantla, ir al inicio" onClick={closeMenu}>
          <PanMark className="aj-header-logo" />
          <span className="platform-wordmark-copy">
            <strong>Acción Política Juvenil</strong>
            <small>Tlalnepantla</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal" className="desktop-nav">
          {navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
          <Link href="/participacion" className="nav-cta">Participa</Link>
          <Link href="/mi-comision" className="team-access">Mi comisión</Link>
        </nav>
        <details
          className="mobile-menu"
          ref={menu}
          onKeyDown={(event) => { if (event.key === "Escape") { closeMenu(); menu.current?.querySelector("summary")?.focus(); } }}
          onToggle={(event) => setMenuOpen(event.currentTarget.open)}
        >
          <summary
            aria-controls="mobile-primary-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Cerrar menú principal" : "Abrir menú principal"}
          >
            Menú<span className="sr-only">, {menuOpen ? "abierto" : "cerrado"}</span>
          </summary>
          <nav aria-label="Navegación móvil" id="mobile-primary-navigation">
            {navigation.map((item) => <Link href={item.href} key={item.href} onClick={closeMenu}>{item.label}</Link>)}
            <Link href="/participacion" onClick={closeMenu}>Participa</Link>
            <Link href="/mi-comision" onClick={closeMenu}>Mi comisión</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
