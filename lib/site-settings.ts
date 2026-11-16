import { getRuntimeEnv, type SiteRuntimeEnv } from "./runtime-env";
import { cleanEmail, cleanText } from "./security";

export const membershipSettingDefaults = { MEMBERSHIP_ENABLED: "0", MEMBERSHIP_RETENTION_DAYS: "", MEMBERSHIP_NOTICE_APPROVED: "0", MEMBERSHIP_DIRECT_CONSENT: "0", DATA_CONTROLLER_REGIME: "", DATA_CONTROLLER_LEGAL_BASIS: "", TRANSPARENCY_ADDRESS: "", RIGHTS_PROCEDURE: "" };
export const editableSettingKeys = ["DATA_CONTROLLER_NAME", "DATA_CONTROLLER_ADDRESS", "ARCO_EMAIL", "PRIVACY_NOTICE_VERSION", "CONTACT_RETENTION_DAYS", "COMMENTS_RETENTION_DAYS", "SOCIAL_INSTAGRAM", "SOCIAL_FACEBOOK", "SOCIAL_X", "SOCIAL_YOUTUBE", "SOCIAL_WHATSAPP", "MEMBERSHIP_ENABLED", "MEMBERSHIP_RETENTION_DAYS", "MEMBERSHIP_NOTICE_APPROVED", "MEMBERSHIP_DIRECT_CONSENT", "DATA_CONTROLLER_REGIME", "DATA_CONTROLLER_LEGAL_BASIS", "TRANSPARENCY_ADDRESS", "RIGHTS_PROCEDURE"] as const;
export type SettingKey = typeof editableSettingKeys[number];
export type EditableSettings = Record<SettingKey, string>;
export type SettingsRecord = { values: EditableSettings; updatedAt: number };

export function parseSettings(input: unknown): EditableSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("La configuración no es válida.");
  const data: Record<string, unknown> = { ...membershipSettingDefaults, ...input };
  const limits: Record<SettingKey, number> = { DATA_CONTROLLER_NAME: 180, DATA_CONTROLLER_ADDRESS: 500, ARCO_EMAIL: 254, PRIVACY_NOTICE_VERSION: 80, CONTACT_RETENTION_DAYS: 3, COMMENTS_RETENTION_DAYS: 3, SOCIAL_INSTAGRAM: 500, SOCIAL_FACEBOOK: 500, SOCIAL_X: 500, SOCIAL_YOUTUBE: 500, SOCIAL_WHATSAPP: 500, MEMBERSHIP_ENABLED: 1, MEMBERSHIP_RETENTION_DAYS: 3, MEMBERSHIP_NOTICE_APPROVED: 1, MEMBERSHIP_DIRECT_CONSENT: 1, DATA_CONTROLLER_REGIME: 10, DATA_CONTROLLER_LEGAL_BASIS: 2000, TRANSPARENCY_ADDRESS: 500, RIGHTS_PROCEDURE: 3000 };
  const result = {} as EditableSettings;
  for (const key of editableSettingKeys) {
    if (typeof data[key] !== "string") throw new Error("Revisa los campos de configuración.");
    if ((data[key] as string).length > limits[key]) throw new Error("Uno de los campos supera la longitud permitida.");
    result[key] = cleanText(data[key], limits[key]);
  }
  if (result.ARCO_EMAIL && !cleanEmail(result.ARCO_EMAIL)) throw new Error("Escribe un correo de privacidad válido.");
  for (const key of ["CONTACT_RETENTION_DAYS", "COMMENTS_RETENTION_DAYS", "MEMBERSHIP_RETENTION_DAYS"] as const) {
    if (result[key] && (!/^\d+$/.test(result[key]) || Number(result[key]) < 1 || Number(result[key]) > 365)) throw new Error("La conservación debe ser de 1 a 365 días.");
  }
  for (const key of ["MEMBERSHIP_ENABLED", "MEMBERSHIP_NOTICE_APPROVED", "MEMBERSHIP_DIRECT_CONSENT"] as const) if (!["0","1"].includes(result[key])) throw new Error("Revisa las opciones del registro interno.");
  if (!["", "private", "party"].includes(result.DATA_CONTROLLER_REGIME)) throw new Error("Indica el régimen del responsable.");
  if (result.MEMBERSHIP_ENABLED === "1" && !membershipSettingsComplete(result)) throw new Error("Para abrir el registro completa responsable, domicilio, correo, régimen, procedimiento de derechos, versión y conservación. Confirma el aviso y el consentimiento directo. Si lo opera el partido, añade fundamento y Unidad de Transparencia.");
  const hosts: Partial<Record<SettingKey, string[]>> = { SOCIAL_INSTAGRAM: ["instagram.com"], SOCIAL_FACEBOOK: ["facebook.com"], SOCIAL_X: ["x.com", "twitter.com"], SOCIAL_YOUTUBE: ["youtube.com", "youtu.be"], SOCIAL_WHATSAPP: ["wa.me", "api.whatsapp.com", "whatsapp.com"] };
  for (const [key, allowed] of Object.entries(hosts)) {
    const value = result[key as SettingKey];
    if (!value) continue;
    let url: URL; try { url = new URL(value); } catch { throw new Error("Revisa los enlaces de redes sociales."); }
    const host = url.hostname.replace(/^www\./, "");
    if (url.protocol !== "https:" || url.username || url.password || !allowed.includes(host)) throw new Error("Usa un enlace HTTPS de la plataforma correspondiente.");
  }
  return result;
}

export async function readSettingsRecord(): Promise<SettingsRecord> {
  const env = getRuntimeEnv();
  const values = Object.fromEntries(editableSettingKeys.map(key => [key, String(env[key] ?? membershipSettingDefaults[key as keyof typeof membershipSettingDefaults] ?? "")])) as EditableSettings;
  if (!env.DB) return { values, updatedAt: 0 };
  const row = await env.DB.prepare("SELECT values_json, updated_at FROM site_settings WHERE id = 'public'").first<{ values_json: string; updated_at: number }>();
  return row ? { values: parseSettings(JSON.parse(row.values_json)), updatedAt: row.updated_at } : { values, updatedAt: 0 };
}

export async function effectiveSettings(): Promise<SiteRuntimeEnv> {
  const env = getRuntimeEnv();
  try { return { ...env, ...(await readSettingsRecord()).values }; }
  catch { return { ...env, CONTACT_ENABLED: "0", COMMENTS_ENABLED: "0", MEMBERSHIP_ENABLED: "0", MEMBERSHIP_NOTICE_APPROVED: "0" }; }
}

export function membershipSettingsComplete(s: Partial<EditableSettings>) {
  return membershipRequirements(s).every(item => item.ready);
}

export function membershipRequirements(s: Partial<EditableSettings>) {
  return [
    {label:'Responsable y domicilio',ready:Boolean(s.DATA_CONTROLLER_NAME?.trim()&&s.DATA_CONTROLLER_ADDRESS?.trim())},
    {label:'Correo de privacidad',ready:Boolean(cleanEmail(s.ARCO_EMAIL))},
    {label:'Versión del aviso',ready:Boolean(s.PRIVACY_NOTICE_VERSION?.trim())},
    {label:'Régimen del responsable',ready:['private','party'].includes(s.DATA_CONTROLLER_REGIME??'')},
    {label:'Procedimiento de derechos sobre datos personales',ready:Boolean(s.RIGHTS_PROCEDURE?.trim())},
    {label:'Aviso aprobado por el responsable',ready:s.MEMBERSHIP_NOTICE_APPROVED==='1'},
    {label:'Solicitud personal de mayores de edad',ready:s.MEMBERSHIP_DIRECT_CONSENT==='1'},
    {label:'Plazo de conservación',ready:Number.isInteger(Number(s.MEMBERSHIP_RETENTION_DAYS))&&Number(s.MEMBERSHIP_RETENTION_DAYS)>=1&&Number(s.MEMBERSHIP_RETENTION_DAYS)<=365},
    ...(s.DATA_CONTROLLER_REGIME==='party'?[
      {label:'Fundamento de las atribuciones del PAN',ready:Boolean(s.DATA_CONTROLLER_LEGAL_BASIS?.trim())},
      {label:'Domicilio de la Unidad de Transparencia',ready:Boolean(s.TRANSPARENCY_ADDRESS?.trim())},
    ]:[]),
  ];
}
