import type { StaffIdentity } from './staff-auth';
/** Recheck the exact session inside the statement that changes private data. */
export function sessionWriteGuard(actor:StaffIdentity,now=Date.now()){
 return {
  sql:"EXISTS (SELECT 1 FROM staff_sessions live_session JOIN staff_accounts live_account ON live_account.id=live_session.account_id WHERE live_session.token_hash=? AND live_account.id=? AND live_session.credential_version=? AND live_session.credential_version=live_account.credential_version AND live_account.disabled_at IS NULL AND live_account.password_hash IS NOT NULL AND (live_account.email_verification_required=0 OR live_account.email_verified_at IS NOT NULL) AND live_session.expires_at>? AND live_session.last_seen_at>?)",
  values:[actor.sessionHash,actor.accountId,actor.credentialVersion,now,now-30*60*1000] as const,
 };
}
