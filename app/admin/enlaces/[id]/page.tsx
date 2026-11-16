import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import AdminHeader from "../../AdminHeader";
import AdminSessionBoundary from "../../AdminSessionBoundary";
import EnlacesReview from "./EnlacesReview";
import { adminWriteGuard } from "@/lib/admin-write-guard";
import { currentAuthorizedUser } from "@/lib/authz";
import { enlacesAgeReference, enlacesState } from "@/lib/enlaces";
import { enlacesRecord } from "@/lib/enlaces-admin";
import { getRuntimeEnv } from "@/lib/runtime-env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Postulación · Enlaces APJ 2027", robots: { index: false, follow: false, noarchive: true } };

export default async function EnlacesRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentAuthorizedUser();
  if (!actor) redirect("/admin/ingresar");
  if (actor.role !== "admin") redirect("/admin");
  const live = adminWriteGuard(actor, ["admin"]);
  if (!await getRuntimeEnv().DB!.prepare("SELECT 1 WHERE " + live.sql).bind(...live.values).first()) redirect("/admin/ingresar");
  const { id } = await params;
  const record = /^[0-9a-f-]{36}$/.test(id) ? await enlacesRecord(id) : null;
  if (!record) notFound();
  const state = await enlacesState();
  return <main className="admin-shell" id="main-content">
    <AdminHeader current="enlaces" email={actor.email} role={actor.role} accountId={actor.accountId} />
    <AdminSessionBoundary key={actor.accountId} accountId={actor.accountId}>
      <EnlacesReview key={record.application.updatedAt} record={record} ageReference={enlacesAgeReference()} phase={state.phase} />
      <p className="people-page enl-admin-back"><Link className="text-link" href="/admin/enlaces">Volver a la lista</Link></p>
    </AdminSessionBoundary>
  </main>;
}
