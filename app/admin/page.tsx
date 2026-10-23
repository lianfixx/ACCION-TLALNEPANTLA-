import AdminSessionBoundary from "./AdminSessionBoundary";
import { redirect } from "next/navigation";
import { adminConfigurationPresent, canHandleRequests, canManageRoles, canModerate, canPublish, canViewAudit, currentAuthorizedUser } from "@/lib/authz";
import { dataChannelConfiguration } from "@/lib/privacy-config";
import Link from "next/link";
import type { Metadata } from "next";
import AdminConsole from "./AdminConsole";
import { adminCollection, adminMetrics, parseAdminQuery, type AdminQuery } from "@/lib/admin-queries";
import type { PanelData } from "@/lib/admin-types";
import { readSettingsRecord } from "@/lib/site-settings";
import { membershipConfiguration, membershipReadiness } from "@/lib/membership";
import StaffLogout from './StaffLogout';
import { requestAssignees } from "@/lib/request-assignments";
import { adminWriteGuard } from "@/lib/admin-write-guard";
import { getRuntimeEnv } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administración",
  robots: { index: false, follow: false, noarchive: true },
};

async function adminData(actor: NonNullable<Awaited<ReturnType<typeof currentAuthorizedUser>>>, query: AdminQuery): Promise<PanelData> {
  const permissions = { content: canPublish(actor.role), moderation: canModerate(actor.role), requests: canHandleRequests(actor.role), audit: canViewAudit(actor.role), roles: canManageRoles(actor.email) };
  const base: PanelData = { permissions, query, generatedAt: Date.now(), collection: { total: 0, page: 1, pages: 1, filters: [] }, metrics: { activities: 0, publishedPosts: 0, otherPosts: 0, pendingComments: 0, openRequests: 0, openMemberships: 0, media: 0, privateMedia: 0 }, settings: null, assignees: [], configuration: { commentsEnabled: false, contactEnabled: false, membershipEnabled: false }, activities: [], readiness: [], posts: [], media: [], comments: [], requests: [], memberships: [], roles: [], audit: [], setupPending: false };
  try {
    const allowed = query.section === "agenda" || query.section === "publicaciones" || query.section === "medios" ? permissions.content : query.section === "opiniones" ? permissions.moderation : (query.section === "solicitudes" || query.section === "incorporaciones") ? permissions.requests : query.section === "roles" ? actor.role === "admin" : query.section === "auditoria" ? permissions.audit : false;
    const collection = await adminCollection(query, allowed);
    base.collection = { total: collection.total, page: collection.page, pages: collection.pages, filters: collection.filters };
    base.query = { ...query, page: collection.page };
    base.metrics = await adminMetrics(permissions);
    base.configuration = { commentsEnabled: (await dataChannelConfiguration("comments")).enabled, contactEnabled: (await dataChannelConfiguration("contact")).enabled, membershipEnabled: (await membershipConfiguration()).enabled };
    base.readiness = permissions.requests ? await membershipReadiness() : [];
    base.settings = permissions.roles && query.section === "configuracion" ? await readSettingsRecord() : null;
    base.assignees = permissions.requests && query.section === "solicitudes" ? await requestAssignees() : [];
    if (query.section === "agenda") base.activities = collection.rows as PanelData["activities"];
    if (query.section === "publicaciones") base.posts = collection.rows as PanelData["posts"];
    if (query.section === "medios") base.media = collection.rows as PanelData["media"];
    if (query.section === "opiniones") base.comments = collection.rows as PanelData["comments"];
    if (query.section === "solicitudes") base.requests = collection.rows as PanelData["requests"];
    if (query.section === "incorporaciones") base.memberships = collection.rows as PanelData["memberships"];
    if (query.section === "roles") base.roles = collection.rows as PanelData["roles"];
    if (query.section === "auditoria") base.audit = collection.rows as PanelData["audit"];
    return base;
  } catch { return { ...base, setupPending: true }; }
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const query = parseAdminQuery(await searchParams);
  const authorized = await currentAuthorizedUser();
  if (!authorized) redirect('/admin/ingresar');
  const data = authorized ? await adminData(authorized,query) : null;
  const live = adminWriteGuard(authorized,[authorized.role]);
  if(!await getRuntimeEnv().DB!.prepare('SELECT 1 WHERE '+live.sql).bind(...live.values).first())redirect('/admin/ingresar');
  return (
    <main className="admin-shell" id="main-content">
      <header className="admin-header">
        <Link href="/" className="wordmark"><strong>Administración</strong><span>Tlalnepantla</span></Link>
        <div><span>{authorized.email}</span><Link href="/admin/cuenta">Usuarios y contraseñas</Link>{authorized.role==='admin'&&<Link href="/admin/comisiones">Comisiones y expedientes</Link>}<StaffLogout accountId={authorized.accountId} /></div>
      </header>
      <div className="admin-intro">
        <p className="section-kicker">Acceso protegido</p>
        <h1>Panel del equipo</h1>
        {authorized.role==='admin'&&<a className="admin-document-link" href="/documentos/bases-y-anexos-para-aprobacion.pdf" download>Bases y formatos para aprobación</a>}
      </div>
      {authorized && data ? <AdminSessionBoundary key={authorized.accountId} accountId={authorized.accountId}><AdminConsole role={authorized.role} data={data} usesPassword={'authMethod' in authorized && authorized.authMethod === 'password'} /></AdminSessionBoundary> : (
        <section className="admin-lock">
          <strong>{adminConfigurationPresent() ? "Esta cuenta aún no tiene acceso al panel." : "Falta configurar la cuenta propietaria."}</strong>
          <p>Para entrar al panel necesitas una cuenta autorizada por la persona que administra el sitio.</p>
        </section>
      )}
    </main>
  );
}
