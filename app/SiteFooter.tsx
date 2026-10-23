import Link from "next/link";
import { effectiveSettings } from "@/lib/site-settings";
import PanMark from "./PanMark";
export default async function SiteFooter() {
  const settings = await effectiveSettings();
  const networks = [["Instagram", settings.SOCIAL_INSTAGRAM], ["Facebook", settings.SOCIAL_FACEBOOK], ["X", settings.SOCIAL_X], ["YouTube", settings.SOCIAL_YOUTUBE], ["WhatsApp", settings.SOCIAL_WHATSAPP]].filter((item): item is [string, string] => Boolean(item[1]));
  return (
    <footer className="aj-footer">
      <div className="aj-wrap">
        <div className="aj-footer-brand"><PanMark className="aj-header-logo" /><strong>Acción Política Juvenil<small>Tlalnepantla</small></strong></div>
        <nav aria-label="Navegación al pie">
          <Link href="/agenda">Agenda</Link>
          <Link href="/actualidad">Actualidad</Link>
          <Link href="/participacion">Participación</Link>
          <Link href="/privacidad">Privacidad</Link>
          <Link href="/terminos">Términos</Link>
          <Link href="/admin">Administración</Link>
          <a href="https://pan.org.mx" target="_blank" rel="noreferrer">Acción Nacional</a>
          <a href="https://accionjuvenil.com/normatividad" target="_blank" rel="noreferrer">Normatividad</a>
        </nav>
        {networks.length > 0 && <nav className="site-social-links" aria-label="Redes de Acción Política Juvenil Tlalnepantla">{networks.map(([name,url]) => <a href={url} key={name} target="_blank" rel="noreferrer">{name}</a>)}</nav>}
      </div>
      <p className="aj-builder-credit aj-wrap">Construida por <span>Sistemas Digitales</span></p>
    </footer>
  );
}
