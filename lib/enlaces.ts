import { effectiveSettings } from "./site-settings";
import { membershipConfiguration } from "./membership";

/** Enlaces APJ opens only with the Comité's approval reference and the internal registry open. */
export async function enlacesConfiguration() {
  const [s, membership] = await Promise.all([effectiveSettings(), membershipConfiguration()]);
  const approval = (s.ENLACES_APPROVAL ?? "").trim();
  return { open: s.ENLACES_ENABLED === "1" && approval.length >= 5 && membership.enabled, approval };
}

/** SQL fragment: the account has a live application marked as an Enlaces APJ postulation. */
export function enlacesApplicationGuard(email: string) {
  return { sql: "EXISTS (SELECT 1 FROM membership_applications ma WHERE ma.owner_email=? AND ma.status IN ('submitted','in_review','accepted') AND ma.retention_until>? AND json_extract(ma.profile_json,'$.enlaces')=1)", values: [email, Date.now()] as unknown[] };
}
