import { adminWriteGuard } from '@/lib/admin-write-guard';
import { allPeople, auditedFilters, peopleCsv } from '@/lib/people';
import { openPeopleRequest, peopleError } from '@/lib/people-route';
import { parsePeopleFilters } from '@/lib/people-shared';
import { getRuntimeEnv } from '@/lib/runtime-env';

const maxRows = 5000;

/** POST keeps the export out of links and caches; the audit row is written before the file leaves. */
export async function POST(request: Request) {
  const opened = await openPeopleRequest(request, 4000, 'people-export', 20);
  if ('response' in opened) return opened.response;
  try {
    const filters = parsePeopleFilters(opened.body.filters && typeof opened.body.filters === 'object' ? opened.body.filters as Record<string, unknown> : {});
    // People who never accepted the notice that announces these lists stay out of the file.
    const all = await allPeople(filters, maxRows + 1), rows = all.filter(row => row.panelNotice);
    if (all.length > maxRows) return peopleError(`La lista tiene más de ${maxRows} personas. Usa un filtro para exportarla por partes.`, 413);
    const db = getRuntimeEnv().DB!, guard = adminWriteGuard(opened.actor, ['admin']), now = Date.now();
    const [audit] = await db.batch([db.prepare(`INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'people.export','people','list',?,? WHERE ${guard.sql}`)
      .bind(crypto.randomUUID(), opened.actor.email, JSON.stringify({ filters: auditedFilters(filters), rows: rows.length }), now, ...guard.values)]);
    if (!audit.meta.changes) return peopleError('Tu acceso cambió. Vuelve a entrar.', 403);
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(now);
    return new Response(peopleCsv(rows), { headers: {
      'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="personas-${date}.csv"`,
      'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff', 'X-Export-Rows': String(rows.length), 'X-Export-Excluded': String(all.length - rows.length),
    } });
  } catch { return peopleError('No pudimos preparar el archivo. Inténtalo de nuevo.', 503); }
}
