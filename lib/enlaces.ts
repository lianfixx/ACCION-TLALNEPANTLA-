import { membershipConfiguration } from "./membership";
import { getRuntimeEnv } from "./runtime-env";
import { enlacesConsent, enlacesCycle, enlacesNoticeVersion, enlacesPublishConsent, type EnlacesApplication, type EnlacesPhase } from "./enlaces-shared";

/**
 * Enlaces APJ 2027 opens and closes by date, without anyone touching the site.
 * Official window: Monday 23 November 2026, 00:00, to Sunday 6 December 2026, 23:59, America/Mexico_City.
 * The two server variables exist only to rehearse the phases; production leaves them unset.
 */
const officialOpensAt = Date.parse("2026-11-23T06:00:00Z");
const officialClosesAt = Date.parse("2026-12-07T05:59:59Z");
const day = 86_400_000;
/** Applications and their documents are kept 90 days after the closing date. */
export const enlacesRetentionAfterClose = 90 * day;
/** Selected people and substitutes: until one month after the term ends on 17 December 2027. */
export const enlacesSelectedRetention = Date.parse("2028-01-17T06:00:00Z");
const resultsKey = "enlaces2027.resultados";

function instant(value: string | undefined, fallback: number) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function enlacesWindow() {
  const env = getRuntimeEnv();
  const opensAt = instant(env.ENLACES_2027_OPENS_AT, officialOpensAt);
  const closesAt = Math.max(instant(env.ENLACES_2027_CLOSES_AT, officialClosesAt), opensAt);
  // The closing minute belongs to the window: 23:59:59 is still on time.
  return { opensAt, closesAt, closedFrom: closesAt + 1000 };
}

/** Closing date in Mexico City as YYYY-MM-DD: the day on which the 18 to 29 years are counted. */
export function enlacesAgeReference() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(enlacesWindow().closesAt);
}

export async function enlacesResultsPublishedAt() {
  const db = getRuntimeEnv().DB;
  if (!db) return null;
  try {
    const row = await db.prepare("SELECT value_json FROM site_content WHERE key=?").bind(resultsKey).first<{ value_json: string }>();
    const value = row ? Number(JSON.parse(row.value_json).publishedAt) : NaN;
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch { return null; }
}
export const enlacesResultsKey = resultsKey;

export type EnlacesState = { phase: EnlacesPhase; opensAt: number; closesAt: number; resultsPublishedAt: number | null };
export async function enlacesState(now = Date.now()): Promise<EnlacesState> {
  const { opensAt, closesAt, closedFrom } = enlacesWindow();
  if (now < opensAt) return { phase: "before", opensAt, closesAt, resultsPublishedAt: null };
  if (now < closedFrom) return { phase: "open", opensAt, closesAt, resultsPublishedAt: null };
  const resultsPublishedAt = await enlacesResultsPublishedAt();
  return { phase: resultsPublishedAt ? "results" : "closed", opensAt, closesAt, resultsPublishedAt };
}
/** The menu and the home page show the entry only while it is open or with results published. */
export const enlacesListed = (state: EnlacesState) => state.phase === "open" || state.phase === "results";

const longDate = (value: number) => new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long", year: "numeric" }).format(value);

/** The notice accepted with each application. It is stored verbatim; later changes do not rewrite it. */
export async function enlacesNotice() {
  const { notice } = await membershipConfiguration(), { closesAt } = enlacesWindow();
  const ready = Boolean(notice.controller && notice.address && notice.email);
  const sections = [
    { title: "Responsable", body: ready ? `${notice.controller}, con domicilio en ${notice.address.replace(/[.,;]+\s*$/, "")}, es responsable del uso de tus datos en esta convocatoria. El contacto para privacidad es ${notice.email}.` : "Los datos del responsable están pendientes de publicación." },
    { title: "Qué datos y para qué", body: "Se usan los datos de tu cuenta, la modalidad y la comisión o comunidad que eliges, tu fecha de nacimiento, tu vínculo con Tlalnepantla, tu carta de motivos, tu carta de recomendación, tu identificación oficial, tu participación previa y tu propuesta. Sirven para revisar tu postulación, entrevistarte, decidir la selección y, si resultas seleccionado o suplente, operar el programa durante el año. Postularte puede revelar una vinculación política y por eso estos datos se tratan como sensibles." },
    { title: "Quién los ve", body: "Tus cartas y tu identificación las ve únicamente el comité de selección. En el sitio solo la administración autorizada puede abrirlas. No se entregan a otras organizaciones ni se usan para publicidad." },
    { title: "Publicación", body: "Tu nombre completo se publica en los resultados solo si lo autorizas y resultas seleccionado o suplente. Puedes postularte sin dar esa autorización." },
    { title: "Conservación", body: `Tu postulación y tus documentos se conservan hasta el ${longDate(closesAt + enlacesRetentionAfterClose)}. Si resultas seleccionado o suplente se conservan hasta el ${longDate(enlacesSelectedRetention)}, un mes después de que termina el encargo. Puedes retirar tu postulación desde tu cuenta y, si no resultas seleccionado, borrar tus documentos ahí mismo. Lo vencido se elimina en el borrado automático de cada día.` },
    { title: "Tus derechos", body: `Puedes pedir acceso, rectificación, cancelación u oposición${notice.email ? ` escribiendo a ${notice.email}` : ""}. Indica tu folio y lo que solicitas.${notice.rightsProcedure ? " " + notice.rightsProcedure : ""}` },
    { title: "Servicios que intervienen", body: "Cloudflare aloja el sitio y guarda los registros y archivos." },
  ];
  const snapshot = JSON.stringify({ version: enlacesNoticeVersion, cycle: enlacesCycle, controller: notice.controller, address: notice.address, email: notice.email, consent: enlacesConsent, publishConsent: enlacesPublishConsent, sections });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(snapshot));
  const token = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return { ready, sections, snapshot, token, version: enlacesNoticeVersion };
}

export const enlacesColumns = "e.id,e.track,e.commission,e.community_kind AS communityKind,e.community_name AS communityName,e.birth_date AS birthDate,e.city_tie AS cityTie,e.city_tie_detail AS cityTieDetail,e.motives_text AS motivesText,e.previous_participation AS previousParticipation,e.proposal,e.publish_name_ok AS publishNameOk,e.status,e.seat,e.reference_code AS referenceCode,e.submitted_at AS submittedAt,e.created_at AS createdAt,e.updated_at AS updatedAt,e.retention_until AS retentionUntil";
type Row = Omit<EnlacesApplication, "publishNameOk"> & { publishNameOk: number };
export const readEnlacesRow = <T extends Row>(row: T) => ({ ...row, publishNameOk: Boolean(row.publishNameOk) });

/** The account's live application for this cycle: anything but a withdrawn one. */
export async function ownEnlacesApplication(accountId: string) {
  const row = await getRuntimeEnv().DB!.prepare(`SELECT ${enlacesColumns} FROM enlaces_applications e WHERE e.account_id=? AND e.cycle=? AND e.status<>'withdrawn' AND e.retention_until>?`).bind(accountId, enlacesCycle, Date.now()).first<Row>();
  return row ? readEnlacesRow(row) as EnlacesApplication : null;
}

/** Folio shown to the applicant. Letters and digits that are hard to confuse. */
export function enlacesReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "ENL27-" + Array.from(crypto.getRandomValues(new Uint8Array(8)), byte => alphabet[byte % alphabet.length]).join("");
}

export type PublishedResult = { name: string; status: "selected" | "substitute"; seat: string; track: string; commission: string; communityKind: string; communityName: string };
/** Names appear only with the person's authorization. */
export async function enlacesPublishedResults() {
  return (await getRuntimeEnv().DB!.prepare("SELECT a.name,e.status,e.seat,e.track,e.commission,e.community_kind AS communityKind,e.community_name AS communityName FROM enlaces_applications e JOIN staff_accounts a ON a.id=e.account_id WHERE e.cycle=? AND e.status IN ('selected','substitute') AND e.publish_name_ok=1 AND e.retention_until>? ORDER BY e.commission,e.community_name,e.status,CASE e.seat WHEN 'titular' THEN 0 ELSE 1 END,a.name").bind(enlacesCycle, Date.now()).all<PublishedResult>()).results;
}
