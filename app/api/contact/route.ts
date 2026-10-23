import { getDb } from "@/db";
import { contactRequests } from "@/db/schema";
import { assertDeclaredBodyWithinLimit, cleanEmail, cleanText, jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";
import { consumeRateLimit, requestNetworkIdentity } from "@/lib/rate-limit";
import { dataChannelConfiguration } from "@/lib/privacy-config";

const KINDS = new Set(["suggestion", "collaboration", "citizen_report", "complaint", "idea"]);
const MAX_JSON_BYTES = 25_000;
const DETAIL_FIELDS: Record<string, Record<string, number>> = {
  suggestion: { area: 120, proposal: 900 },
  collaboration: { skills: 700, activity: 700, availability: 240 },
  citizen_report: { location: 300, approximateTime: 160, authority: 240 },
  complaint: { approximateTime: 160, expectedResolution: 700 },
  idea: { beneficiaries: 500, firstStep: 700, supportNeeded: 700 },
};

function createReferenceCode(now: number) {
  const year = new Date(now).getUTCFullYear();
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `AJT-${year}-${random}`;
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  try { assertDeclaredBodyWithinLimit(request, MAX_JSON_BYTES); }
  catch (error) { return jsonBodyErrorResponse(error); }
  let payload: Record<string, unknown>;
  try {
    payload = await readJsonBody<Record<string, unknown>>(request, MAX_JSON_BYTES);
  }
  catch (error) { return jsonBodyErrorResponse(error); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });
  const { enabled, retentionDays, settings } = await dataChannelConfiguration("contact");
  if (!enabled) {
    return noStoreJson({ error: "El canal todavía no está habilitado. Falta validar al responsable de los datos personales." }, { status: 503 });
  }
  if (cleanText(payload.website, 200)) return noStoreJson({ ok: true }, { status: 202 });
  const kind = cleanText(payload.kind, 30);
  const message = cleanText(payload.message, 5000);
  const name = cleanText(payload.name, 100) || null;
  const email = cleanEmail(payload.email) || null;
  const institution = ["collaboration", "idea"].includes(kind) ? cleanText(payload.institution, 160) || null : null;
  const consent = payload.consent === true;
  if (!KINDS.has(kind) || message.length < 20) return noStoreJson({ error: "Selecciona el tipo y describe tu solicitud." }, { status: 400 });
  if (cleanText(payload.email, 254) && !email) return noStoreJson({ error: "Escribe un correo válido o deja el campo vacío." }, { status: 400 });
  if (name && !email) return noStoreJson({ error: "Añade el nombre o alias únicamente cuando solicites respuesta por correo." }, { status: 400 });
  if ((name || email) && !consent) return noStoreJson({ error: "Se requiere consentimiento para enviar datos de contacto." }, { status: 400 });
  const detailFields = DETAIL_FIELDS[kind] ?? {};
  const details = Object.fromEntries(Object.entries(detailFields)
    .map(([field, limit]) => [field, cleanText(payload[field], limit)] as const)
    .filter(([, value]) => Boolean(value)));
  const networkIdentity = requestNetworkIdentity(request);
  if (!networkIdentity) return noStoreJson({ error: "No fue posible verificar el origen de la solicitud." }, { status: 503 });
  if (!(await consumeRateLimit("contact-verification-10m", networkIdentity, 30, 10 * 60 * 1000))) {
    return noStoreJson({ error: "Se alcanzó el límite temporal de verificaciones para esta red. Intenta más tarde." }, { status: 429 });
  }
  const turnstileToken = cleanText(payload["cf-turnstile-response"], 2048);
  if (!turnstileToken) return noStoreJson({ error: "Completa la verificación antiabuso." }, { status: 400 });
  try {
    const verification = new FormData();
    verification.set("secret", settings.TURNSTILE_SECRET_KEY!);
    verification.set("response", turnstileToken);
    verification.set("remoteip", networkIdentity);
    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: verification, signal: AbortSignal.timeout(7_000) });
    if (!result.ok) throw new Error("Turnstile verification failed upstream.");
    const verdict = await result.json() as { success?: boolean; action?: string; hostname?: string };
    const expectedAction = settings.TURNSTILE_EXPECTED_ACTION!;
    const expectedHostname = settings.TURNSTILE_EXPECTED_HOSTNAME!.toLowerCase();
    if (!verdict.success || verdict.action !== expectedAction || verdict.hostname?.toLowerCase() !== expectedHostname) {
      return noStoreJson({ error: "No fue posible validar la verificación antiabuso." }, { status: 400 });
    }
  } catch {
    return noStoreJson({ error: "La verificación antiabuso no está disponible. Intenta más tarde." }, { status: 503 });
  }
  if (!(await consumeRateLimit("contact-10m", networkIdentity, 5, 10 * 60 * 1000))) {
    return noStoreJson({ error: "Alcanzaste el límite temporal de envíos. Intenta más tarde." }, { status: 429 });
  }

  try {
    const now = Date.now();
    const referenceCode = createReferenceCode(now);
    const [record] = await getDb().insert(contactRequests).values({ id: crypto.randomUUID(), kind: kind as "suggestion" | "collaboration" | "citizen_report" | "complaint" | "idea", name, email, phone: null, institution, message, detailsJson: Object.keys(details).length ? JSON.stringify(details) : null, referenceCode, consentAt: consent ? now : null, noticeVersion: settings.PRIVACY_NOTICE_VERSION!, retentionUntil: now + retentionDays * 86_400_000, status: "new", createdAt: now, updatedAt: now }).returning({ id: contactRequests.id, referenceCode: contactRequests.referenceCode });
    return noStoreJson({ record, message: "Solicitud recibida." }, { status: 201 });
  } catch {
    return noStoreJson({ error: "No fue posible recibir la solicitud." }, { status: 500 });
  }
}
