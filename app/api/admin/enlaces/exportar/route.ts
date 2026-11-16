import { adminWriteGuard } from "@/lib/admin-write-guard";
import { enlacesAgeReference } from "@/lib/enlaces";
import { allEnlaces, enlacesCsv, parseEnlacesFilters } from "@/lib/enlaces-admin";
import { openPeopleRequest, peopleError } from "@/lib/people-route";
import { getRuntimeEnv } from "@/lib/runtime-env";

const maxRows = 5000;

/** The concentrate without documents. The audit row is written before the file leaves. */
export async function POST(request: Request) {
  const opened = await openPeopleRequest(request, 4000, "enlaces-export", 20);
  if ("response" in opened) return opened.response;
  try {
    const filters = parseEnlacesFilters(opened.body.filters && typeof opened.body.filters === "object" ? opened.body.filters as Record<string, unknown> : {});
    const rows = await allEnlaces(filters, maxRows + 1);
    if (rows.length > maxRows) return peopleError(`La lista tiene más de ${maxRows} postulaciones. Usa un filtro para exportarla por partes.`, 413);
    const db = getRuntimeEnv().DB!, guard = adminWriteGuard(opened.actor, ["admin"]), now = Date.now();
    const [audit] = await db.batch([db.prepare(`INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'enlaces.export','enlaces','lista',?,? WHERE ${guard.sql}`)
      .bind(crypto.randomUUID(), opened.actor.email, JSON.stringify({ filters: Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), rows: rows.length }), now, ...guard.values)]);
    if (!audit.meta.changes) return peopleError("Tu acceso cambió. Vuelve a entrar.", 403);
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(now);
    return new Response(enlacesCsv(rows, enlacesAgeReference()), { headers: {
      "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="enlaces-apj-2027-${date}.csv"`,
      "Cache-Control": "private, no-store", "Vary": "Cookie", "X-Content-Type-Options": "nosniff", "X-Export-Rows": String(rows.length),
    } });
  } catch { return peopleError("No pudimos preparar el archivo. Inténtalo de nuevo.", 503); }
}
