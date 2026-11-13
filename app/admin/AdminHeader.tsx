import Link from "next/link";
import StaffLogout from "./StaffLogout";

const sections = [
  { key: "panel", href: "/admin", label: "Panel" },
  { key: "personas", href: "/admin/personas", label: "Personas", admin: true },
  { key: "comisiones", href: "/admin/comisiones", label: "Comisiones y expedientes", admin: true },
  { key: "contenido", href: "/admin/contenido", label: "Contenido del sitio", admin: true },
  { key: "cuenta", href: "/admin/cuenta", label: "Usuarios y contraseñas" },
] as const;
export type AdminSection = typeof sections[number]["key"];

/** One header for every page of the panel, so each section is one click away. */
export default function AdminHeader({ current, email, role, accountId }: { current: AdminSection; email: string; role: string; accountId: string }) {
  return <header className="admin-header">
    <Link href="/admin" className="wordmark"><strong>Administración</strong><span>Tlalnepantla</span></Link>
    <div>
      <nav className="admin-header-nav" aria-label="Secciones del panel">
        {sections.filter(item => !("admin" in item) || role === "admin").map(item => <Link key={item.key} href={item.href} aria-current={item.key === current ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <span>{email}</span>
      <StaffLogout accountId={accountId} />
    </div>
  </header>;
}
