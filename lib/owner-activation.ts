import { getRuntimeEnv } from './runtime-env';
import { cleanEmail } from './security';
import { cleanUsername, hashPassword, passwordValid, secretHash } from './staff-auth';

// The setup capability is provisioned by the authenticated Site owner. It
// cannot replace a password or create a second owner account from public input.
export async function activateOwner(input: Record<string, unknown>) {
  const env=getRuntimeEnv(),db=env.DB!,email=cleanEmail(env.OWNER_ACCOUNT_EMAIL);
  if(!email||!env.OWNER_SETUP_HASH||!Number.isFinite(Number(env.OWNER_SETUP_EXPIRES_AT))||Date.now()>=Number(env.OWNER_SETUP_EXPIRES_AT))return null;
  if(typeof input.token!=='string'||await secretHash(input.token)!==env.OWNER_SETUP_HASH)return null;
  const username=cleanUsername(input.username);
  if(!username||!passwordValid(input.password))return null;
  const previous=await db.prepare('SELECT id,password_hash,disabled_at FROM staff_accounts WHERE email=?').bind(email).first<{id:string;password_hash:string|null;disabled_at:number|null}>();
  if(previous?.password_hash||previous?.disabled_at)return null;
  if(await db.prepare('SELECT 1 FROM staff_accounts WHERE username=? AND email<>?').bind(username,email).first())return {conflict:true as const};
  const hash=await hashPassword(input.password),id=previous?.id??crypto.randomUUID(),now=Date.now(),operation=crypto.randomUUID();
  const [result]=await db.batch([
    db.prepare(`INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,metadata_json,created_at)
      SELECT ?,?,'owner.activated','staff_account',?,'{}',? WHERE
      NOT EXISTS(SELECT 1 FROM staff_accounts WHERE email=? AND (password_hash IS NOT NULL OR disabled_at IS NOT NULL))
      AND NOT EXISTS(SELECT 1 FROM audit_logs WHERE action='owner.activated' AND actor_email=?)
      AND NOT EXISTS(SELECT 1 FROM staff_accounts WHERE username=? AND email<>?)`)
      .bind(operation,email,id,now,email,email,username,email),
    db.prepare(`INSERT INTO staff_accounts(id,email,name,username,password_hash,credential_version,created_at,updated_at)
      SELECT ?,?,'Cuenta propietaria',?,?,1,?,? WHERE EXISTS(SELECT 1 FROM audit_logs WHERE id=?)
      ON CONFLICT(email) DO UPDATE SET username=excluded.username,password_hash=excluded.password_hash,
      activation_hash=NULL,activation_expires_at=NULL,credential_version=credential_version+1,updated_at=excluded.updated_at`)
      .bind(id,email,username,hash,now,now,operation),
  ]);
  if(!result.meta.changes){
    if(await db.prepare('SELECT 1 FROM staff_accounts WHERE username=? AND email<>?').bind(username,email).first())return {conflict:true as const};
    return null;
  }
  return db.prepare('SELECT id,email,credential_version FROM staff_accounts WHERE email=?').bind(email).first<{id:string;email:string;credential_version:number}>();
}
