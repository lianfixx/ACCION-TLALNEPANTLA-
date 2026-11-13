import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Página no encontrada", robots: { index: false, follow: true } };

export default function NotFound() {
  return <main className="content-shell commission-page" id="main-content">
    <header className="commission-page-hero">
      <p className="section-kicker">Error 404</p>
      <h1>No encontramos esta página.</h1>
      <p>Revisa la dirección o vuelve al inicio.</p>
    </header>
    <div className="record-actions">
      <Link className="button button-primary" href="/">Ir al inicio</Link>
      <Link className="text-link" href="/participacion">Cómo participar</Link>
    </div>
  </main>;
}
