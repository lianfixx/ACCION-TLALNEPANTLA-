import { effectiveSettings } from "@/lib/site-settings";
import { cleanEmail } from "@/lib/security";

function validTurnstileAction(value: string | undefined) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(value);
}

function validTurnstileHostname(value: string | undefined) {
  if (typeof value !== "string" || value !== value.trim() || value.length < 1 || value.length > 253) return false;
  if (value.includes(":") || value.includes("/") || value.includes("*") || value !== value.toLowerCase()) return false;
  return value.split(".").every((label) => /^(?!-)[a-z0-9-]{1,63}(?<!-)$/.test(label));
}

export async function dataChannelConfiguration(channel: "comments" | "contact") {
  const settings = await effectiveSettings();
  const retentionDays = Number(channel === "comments" ? settings.COMMENTS_RETENTION_DAYS ?? 0 : settings.CONTACT_RETENTION_DAYS ?? 0);
  const featureEnabled = channel === "comments" ? settings.COMMENTS_ENABLED === "1" : settings.CONTACT_ENABLED === "1";
  const configurationComplete = Boolean(
    settings.DATA_CONTROLLER_NAME?.trim()
      && settings.DATA_CONTROLLER_ADDRESS?.trim()
      && cleanEmail(settings.ARCO_EMAIL)
      && settings.PRIVACY_NOTICE_VERSION?.trim()
      && settings.RATE_LIMIT_SECRET?.trim()
      && settings.RATE_LIMIT_SECRET.trim().length >= 32
      && Number.isInteger(retentionDays)
      && retentionDays >= 1
      && retentionDays <= 365,
  );
  const antiAbuseComplete = channel === "comments" || Boolean(
    settings.TURNSTILE_SITE_KEY?.trim()
      && settings.TURNSTILE_SECRET_KEY?.trim()
      && validTurnstileAction(settings.TURNSTILE_EXPECTED_ACTION)
      && settings.TURNSTILE_EXPECTED_ACTION === "contact"
      && validTurnstileHostname(settings.TURNSTILE_EXPECTED_HOSTNAME),
  );
  return { enabled: featureEnabled && configurationComplete && antiAbuseComplete, retentionDays, settings };
}

/** Only readiness flags leave the server; never expose secret values. */
export async function contactReadiness() {
  const { settings: s } = await dataChannelConfiguration("contact");
  return [
    { label: "Responsable de datos", ready: Boolean(s.DATA_CONTROLLER_NAME?.trim()) },
    { label: "Domicilio del responsable", ready: Boolean(s.DATA_CONTROLLER_ADDRESS?.trim()) },
    { label: "Correo para privacidad", ready: Boolean(cleanEmail(s.ARCO_EMAIL)) },
    { label: "Versión del aviso y conservación", ready: Boolean(s.PRIVACY_NOTICE_VERSION?.trim()) && Number.isInteger(Number(s.CONTACT_RETENTION_DAYS)) && Number(s.CONTACT_RETENTION_DAYS) >= 1 && Number(s.CONTACT_RETENTION_DAYS) <= 365 },
    { label: "Verificación antiabuso", ready: Boolean(s.TURNSTILE_SITE_KEY?.trim() && s.TURNSTILE_SECRET_KEY?.trim() && s.RATE_LIMIT_SECRET && s.RATE_LIMIT_SECRET.length >= 32 && s.TURNSTILE_EXPECTED_ACTION === "contact" && validTurnstileHostname(s.TURNSTILE_EXPECTED_HOSTNAME)) },
    { label: "Recepción de solicitudes activada", ready: s.CONTACT_ENABLED === "1" },
  ];
}
