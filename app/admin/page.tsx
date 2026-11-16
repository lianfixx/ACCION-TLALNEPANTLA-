import AdminSessionBoundary from "./AdminSessionBoundary";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffIdentity } from "@/lib/staff-auth";
import { adminConfigurationPresent, canHandleRequests, canManageRoles, canModerate, canPublish, canViewAudit, currentAuthorizedUser } from "@/lib/authz";
import { dataChannelConfiguration } from "@/lib/privacy-config";
import type { Metadata } from "next";
import AdminConsole from "./AdminConsole";
import { adminCollection, adminMetrics, parseAdminQuery, type AdminQuery } from "@/lib/admin-queries";
import type { PanelData } from "@/lib/admin-types";
import { readSettingsRecord } from "@/lib/site-settings";
import { membershipConfiguration, membershipReadiness } from "@/lib/membership";
import AdminHeader from './AdminHeader';
import { requestAssignees } from "@/lib/request-assignments";
import { adminWriteGuard } from "@/lib/admin-write-guard";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { siteDocumentHref } from "@/lib/site-documents";

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
    // Independent reads go out together: the page waits for the slowest one, not for their sum.
    const [collection, metrics, comments, contact, membership, readiness, settings, assignees] = await Promise.all([
      adminCollection(query, allowed),
      adminMetrics(permissions),
      dataChannelConfiguration("comments"),
      dataChannelConfiguration("contact"),
      membershipConfiguration(),
      permissions.requests ? membershipReadiness() : Promise.resolve([]),
      permissions.roles && query.section === "configuracion" ? readSettingsRecord() : Promise.resolve(null),
      permissions.requests && query.section === "solicitudes" ? requestAssignees() : Promise.resolve([]),
    ]);
    base.collection = { total: collection.total, page: collection.page, pages: collection.pages, filters: collection.filters };
    base.query = { ...query, page: collection.page };
    base.metrics = metrics;
    base.configuration = { commentsEnabled: comments.enabled, contactEnabled: contact.enabled, membershipEnabled: membership.enabled };
    base.readiness = readiness;
    base.settings = settings;
    base.assignees = assignees;
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
  if (!authorized) {
    // Signed in but without a panel role: explain it instead of sending the person back to the sign-in form.
    if (!await getStaffIdentity()) redirect('/admin/ingresar');
    return <main className="admin-shell" id="main-content"><section className="admin-lock">
      <strong>{adminConfigurationPresent() ? "Esta cuenta no tiene acceso al panel." : "Falta configurar la cuenta propietaria."}</strong>
      <p>El panel es para las cuentas que autoriza la persona que administra el sitio. Tu solicitud y tus documentos están en Mi comisión.</p>
      <p><Link className="text-link" href="/mi-comision">Ir a Mi comisión</Link></p>
    </section></main>;
  }
  const live = adminWriteGuard(authorized,[authorized.role]);
  const [data, stillLive] = await Promise.all([adminData(authorized,query), getRuntimeEnv().DB!.prepare('SELECT 1 WHERE '+live.sql).bind(...live.values).first()]);
  if(!stillLive)redirect('/admin/ingresar');
  return (
    <main className="admin-shell" id="main-content">
      <AdminHeader current="panel" email={authorized.email} role={authorized.role} accountId={authorized.accountId} />
      <div className="admin-intro">
        <p className="section-kicker">Acceso protegido</p>
        <h1>Panel del equipo</h1>
        {authorized.role==='admin'&&<a className="admin-document-link" href={siteDocumentHref("bases-y-anexos")} download>Bases y anexos de las comisiones</a>}
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
