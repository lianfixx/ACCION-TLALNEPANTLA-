import { getRuntimeEnv } from "@/lib/runtime-env";
import { cleanText } from "@/lib/security";

export type Activity = { id: string; title: string; description: string; location: string; startsAt: number; endsAt: number; registrationUrl: string | null; status: "draft" | "published" | "cancelled"; createdAt: number; updatedAt: number };
export function activityDb() {
  const db = getRuntimeEnv().DB;
  if (!db) throw new Error("Activity storage unavailable");
  return db;
}
const fields = `id, title, description, location, starts_at AS startsAt, ends_at AS endsAt, registration_url AS registrationUrl, status, created_at AS createdAt, updated_at AS updatedAt`;
export async function listActivities(internal = false) {
  const now = Date.now();
  const query = internal
    ? `SELECT ${fields} FROM activities ORDER BY starts_at DESC LIMIT 100`
    : `SELECT ${fields} FROM activities WHERE status IN ('published','cancelled') ORDER BY CASE WHEN ends_at >= ? THEN 0 ELSE 1 END, CASE WHEN ends_at >= ? THEN starts_at END ASC, CASE WHEN ends_at < ? THEN starts_at END DESC LIMIT 100`;
  const statement = activityDb().prepare(query);
  const result = await (internal ? statement : statement.bind(now, now, now)).all<Activity>();
  return result.results;
}
export async function publicActivity(id: string) {
  return activityDb().prepare(`SELECT ${fields} FROM activities WHERE id = ? AND status IN ('published','cancelled')`).bind(id).first<Activity>();
}
export function parseActivity(payload: Record<string, unknown>) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { error: "Datos de actividad inválidos." } as const;
  const title = cleanText(payload.title, 140), description = cleanText(payload.description, 1800), location = cleanText(payload.location, 220);
  const startsAt = Number(payload.startsAt), endsAt = Number(payload.endsAt);
  const status = payload.status;
  if (title.length < 3 || description.length < 10 || location.length < 3) return { error: "Completa el nombre, los detalles y el lugar." } as const;
  if (![startsAt, endsAt].every(Number.isSafeInteger) || startsAt < 946684800000 || endsAt > 4102444800000 || endsAt <= startsAt) return { error: "Revisa la fecha y la hora de inicio y cierre." } as const;
  if (status !== "draft" && status !== "published" && status !== "cancelled") return { error: "Estado inválido." } as const;
  const rawUrl = typeof payload.registrationUrl === "string" ? payload.registrationUrl.trim() : "";
  let registrationUrl: string | null = null;
  if (rawUrl) {
    try { const url = new URL(rawUrl); if (url.protocol !== "https:" || url.username || url.password || rawUrl.length > 1000) throw new Error(); registrationUrl = url.href; }
    catch { return { error: "El enlace de registro debe ser una dirección HTTPS válida." } as const; }
  }
  return { value: { title, description, location, startsAt, endsAt, status, registrationUrl } } as const;
}

function calendarText(value: string) { return value.replace(/\\/g,"\\\\").replace(/\r\n|\r|\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,"); }
function stamp(value: number) { return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }
function fold(line: string) {
  const encoder = new TextEncoder(); let current = "", output = "", size = 0;
  for (const char of line) { const n = encoder.encode(char).length; if (size + n > 75) { output += current + "\r\n"; current = " "; size = 1; } current += char; size += n; }
  return output + current;
}
export function activityCalendar(item: Activity) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Accion Politica Juvenil Tlalnepantla//Agenda//ES", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", `UID:${item.id}@accion-politica-juvenil`, `DTSTAMP:${stamp(item.updatedAt)}`, `DTSTART:${stamp(item.startsAt)}`, `DTEND:${stamp(item.endsAt)}`, `SUMMARY:${calendarText(item.title)}`, `DESCRIPTION:${calendarText(item.description)}`, `LOCATION:${calendarText(item.location)}`, `STATUS:${item.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`, "END:VEVENT", "END:VCALENDAR"].map(fold).join("\r\n") + "\r\n";
}
