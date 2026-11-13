import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { currentAuthorizedUser } from "@/lib/authz";
import { adminWriteGuard } from "@/lib/admin-write-guard";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { readContentRecords } from "@/lib/site-content";
import type { SiteDocumentRow } from "@/lib/site-documents";
import AdminSessionBoundary from "../AdminSessionBoundary";
import AdminHeader from '../AdminHeader';
import ContentManager, { type Tab } from "./ContentManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contenido del sitio", robots: { index: false, follow: false, noarchive: true } };

const tabKeys: Tab[] = ["comisiones", "enlaces", "portada", "documentos"];

export default async function ContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await currentAuthorizedUser();
  if (!actor) redirect("/admin/ingresar");
  if (actor.role !== "admin") redirect("/admin");
  const { DB, BUCKET } = getRuntimeEnv();
  const live = adminWriteGuard(actor, ["admin"]);
  if (!DB || !await DB.prepare("SELECT 1 WHERE " + live.sql).bind(...live.values).first()) redirect("/admin/ingresar");
  const requested = (await searchParams).tab;
  const tab = tabKeys.find(key => key === requested) ?? "comisiones";
  const records = await readContentRecords();
  let documents: SiteDocumentRow[] = [];
  let storageReady = Boolean(BUCKET);
  try { documents = (await DB.prepare("SELECT slug, object_key, file_name, size_bytes, sha256, uploaded_at, uploaded_by FROM site_documents").all<SiteDocumentRow>()).results ?? []; }
  catch { storageReady = false; }
  return <main className="admin-shell" id="main-content">
    <AdminHeader current="contenido" email={actor.email} role={actor.role} accountId={actor.accountId} />
    <div className="admin-intro">
      <p className="section-kicker">Solo administración</p>
      <h1>Contenido del sitio</h1>
    </div>
    <AdminSessionBoundary key={actor.accountId} accountId={actor.accountId}>
      <ContentManager records={records} documents={documents} initialTab={tab} storageReady={storageReady} />
    </AdminSessionBoundary>
  </main>;
}
