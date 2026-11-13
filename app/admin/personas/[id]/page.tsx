import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import AdminSessionBoundary from '../../AdminSessionBoundary';
import AdminHeader from '../../AdminHeader';
import PersonRecord from './PersonRecord';
import { currentAuthorizedUser, isConfiguredOwner } from '@/lib/authz';
import { adminWriteGuard } from '@/lib/admin-write-guard';
import { panelEmailConfigured, personRecord } from '@/lib/people';
import { registrationServices } from '@/lib/registration-verification';
import { getRuntimeEnv } from '@/lib/runtime-env';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ficha de persona', robots: { index: false, follow: false, noarchive: true } };

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentAuthorizedUser();
  if (!actor) redirect('/admin/ingresar');
  if (actor.role !== 'admin') redirect('/admin');
  const { id } = await params;
  const record = /^[A-Za-z0-9-]{1,80}$/.test(id) ? await personRecord(id) : null;
  if (!record) notFound();
  // Recheck the live session and role after the private reads, as the other panels do.
  const live = adminWriteGuard(actor, ['admin']);
  if (!await getRuntimeEnv().DB!.prepare('SELECT 1 WHERE ' + live.sql).bind(...live.values).first()) redirect('/admin/ingresar');
  const owner = isConfiguredOwner(record.account.email);
  const control = record.account.id === actor.accountId ? 'Es tu propia cuenta: no puedes suspenderla ni borrarla desde aquí.'
    : record.account.role && !isConfiguredOwner(actor.email) ? 'Esta cuenta tiene permisos del panel. Solo la cuenta propietaria puede suspenderla, cambiarla o borrarla.' : '';
  const tags = (await getRuntimeEnv().DB!.prepare('SELECT DISTINCT tag FROM person_tags ORDER BY tag LIMIT 200').all<{ tag: string }>()).results.map(row => row.tag);
  return <main className="admin-shell" id="main-content">
    <AdminHeader current="personas" email={actor.email} role={actor.role} accountId={actor.accountId} />
    <AdminSessionBoundary key={actor.accountId} accountId={actor.accountId}>
      {owner ? <section className="admin-lock"><strong>Cuenta propietaria</strong><p>Esta cuenta se administra desde su propio acceso. No aparece en la lista de personas.</p></section>
        : <PersonRecord key={record.account.id} record={record} actorId={actor.accountId} control={control} editable={!record.account.role || isConfiguredOwner(actor.email) || record.account.id === actor.accountId} emailConfigured={panelEmailConfigured()} confirmationConfigured={registrationServices().emailReady} knownTags={tags} />}
    </AdminSessionBoundary>
  </main>;
}
