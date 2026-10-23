import { activityCalendar, publicActivity } from "@/lib/activities";
import { noStoreJson } from "@/lib/security";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params, item = await publicActivity(id);
    if (!item) return noStoreJson({ error: "Actividad no encontrada." }, { status: 404 });
    return new Response(activityCalendar(item), { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="actividad.ics"', "Cache-Control": "no-store" } });
  } catch { return noStoreJson({ error: "No se pudo descargar la actividad." }, { status: 503 }); }
}
