import { effectiveSettings, membershipSettingsComplete, membershipRequirements } from "./site-settings";
import { getRuntimeEnv } from "./runtime-env";
import { noStoreJson } from "./security";
import { membershipConsent, type MembershipApplication, type MembershipEvent, type MembershipNotice } from "./membership-shared";

import { registrationNoticeSections } from "./membership-notice";

export const membershipColumns = "id,owner_email AS ownerEmail,name,commission,note,profile_json AS profileJson,reference_code AS referenceCode,status,notice_version AS noticeVersion,consent_at AS consentAt,retention_until AS retentionUntil,created_at AS createdAt,updated_at AS updatedAt";
export function membershipJson(data: unknown, init?: ResponseInit) {
  const response = noStoreJson(data,init);
  response.headers.set("Cache-Control","private, no-store");
  response.headers.set("Vary","Cookie");
  return response;
}
export async function membershipConfiguration() {
  const s = await effectiveSettings();
  const notice: MembershipNotice = { controller:s.DATA_CONTROLLER_NAME ?? "", address:s.DATA_CONTROLLER_ADDRESS ?? "", email:s.ARCO_EMAIL ?? "", version:s.PRIVACY_NOTICE_VERSION ? `${s.PRIVACY_NOTICE_VERSION}-comisiones-2026-10-06` : "", regime:s.DATA_CONTROLLER_REGIME ?? "", legalBasis:s.DATA_CONTROLLER_LEGAL_BASIS ?? "", rightsProcedure:s.RIGHTS_PROCEDURE ?? "", retentionDays:Number(s.MEMBERSHIP_RETENTION_DAYS)||0, audience:s.MEMBERSHIP_DIRECT_CONSENT ?? "0" };
  const sections=registrationNoticeSections(notice,s.TRANSPARENCY_ADDRESS ?? "");
  const snapshot = JSON.stringify({ template:"registro-comisiones-2026-10-06.1", ...notice, transparencyAddress:s.TRANSPARENCY_ADDRESS ?? "", consent:membershipConsent, sections });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(snapshot));
  const noticeToken = [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  const ready=membershipSettingsComplete(s) && Boolean(s.DB && s.RATE_LIMIT_SECRET && s.RATE_LIMIT_SECRET.length >= 32);
  return { ready, enabled:s.MEMBERSHIP_ENABLED === "1" && ready, complete:membershipSettingsComplete(s), sections, notice, noticeToken, snapshot, transparencyAddress:s.TRANSPARENCY_ADDRESS ?? "" };
}
export async function membershipReadiness() {
  const s=await effectiveSettings();
  return [...membershipRequirements(s),{label:'Almacenamiento de solicitudes',ready:Boolean(s.DB)},{label:'Protección de envíos',ready:(s.RATE_LIMIT_SECRET?.length??0)>=32}];
}
export async function ownedMembership(id: string, email: string) {
  return getRuntimeEnv().DB!.prepare(`SELECT ${membershipColumns} FROM membership_applications WHERE id=? AND owner_email=? AND retention_until>?`).bind(id,email,Date.now()).first<MembershipApplication>();
}
export async function membershipHistory(id: string, internal = false, requestedPage = 1) {
  const db=getRuntimeEnv().DB!,condition=`application_id=?${internal ? "" : " AND kind <> 'note'"}`;
  const total=(await db.prepare(`SELECT count(*) AS n FROM membership_events WHERE ${condition}`).bind(id).first<{n:number}>())?.n??0;
  const pages=Math.max(1,Math.ceil(total/50)),page=Math.min(pages,Number.isSafeInteger(requestedPage)&&requestedPage>0?requestedPage:1);
  const query = `SELECT id,kind,body,created_at AS createdAt,actor_type AS actorType${internal ? ",actor_email AS actorEmail" : ""} FROM membership_events WHERE ${condition} ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET ?`;
  const result=await db.prepare(query).bind(id,(page-1)*50).all<MembershipEvent>();
  return {events:result.results.reverse(),pagination:{total,pages,page}};
}
