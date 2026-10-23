import { getRuntimeEnv } from './runtime-env';

export type StaffAccountView = {
  email: string; username: string | null; name: string; role: string | null; disabledAt: number | null;
  accountUpdatedAt: number | null; roleUpdatedAt: number | null; roleRevokedAt: number | null;
  hasPassword: number; activationExpiresAt: number | null;
};

const base = `WITH emails AS (SELECT email FROM staff_accounts UNION SELECT email FROM user_roles)
  SELECT e.email,a.username,COALESCE(NULLIF(a.name,''),e.email) AS name,r.role,a.disabled_at AS disabledAt,
  a.updated_at AS accountUpdatedAt,COALESCE(r.updated_at,r.created_at) AS roleUpdatedAt,
  r.revoked_at AS roleRevokedAt,COALESCE(a.password_hash IS NOT NULL,0) AS hasPassword,
  a.activation_expires_at AS activationExpiresAt
  FROM emails e LEFT JOIN staff_accounts a ON a.email=e.email LEFT JOIN user_roles r ON r.email=e.email`;

export async function listStaffAccounts(q: string, requestedPage: number) {
  const db=getRuntimeEnv().DB!;
  const ownerEmails=[getRuntimeEnv().ADMIN_EMAILS,getRuntimeEnv().OWNER_ACCOUNT_EMAIL].filter(Boolean).join(',').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  const term=`%${q.replace(/[\\%_]/g,x=>`\\${x}`)}%`;
  const where=` WHERE (e.email LIKE ? ESCAPE '\\' OR a.name LIKE ? ESCAPE '\\' OR a.username LIKE ? ESCAPE '\\')${ownerEmails.length?` AND e.email NOT IN (${ownerEmails.map(()=>'?').join(',')})`:''}`;
  const args=[term,term,term,...ownerEmails];
  const total=Number((await db.prepare(`SELECT count(*) AS n FROM (${base}${where})`).bind(...args).first<{n:number}>())?.n??0);
  const pages=Math.max(1,Math.ceil(total/25)),page=Math.min(Math.max(1,requestedPage),pages);
  const accounts=(await db.prepare(`${base}${where} ORDER BY e.email LIMIT 25 OFFSET ?`).bind(...args,(page-1)*25).all<StaffAccountView>()).results;
  return {accounts,total,pages,page};
}
