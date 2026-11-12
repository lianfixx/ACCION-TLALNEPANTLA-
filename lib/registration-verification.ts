import { getRuntimeEnv } from './runtime-env';
import { cleanEmail } from './security';
import { randomSecret, secretHash } from './staff-auth';
import { safeReturnTo, signInPath } from './account-paths';

export class RegistrationServiceError extends Error {
  constructor(public readonly stage: 'captcha' | 'email') { super(stage); }
}

export function registrationServices() {
  const env = getRuntimeEnv();
  let origin = '';
  try {
    const url = new URL(env.REGISTRATION_PUBLIC_ORIGIN ?? '');
    if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) origin = url.origin;
  } catch { /* Missing configuration keeps registration closed. */ }
  const hostname = env.REGISTRATION_TURNSTILE_HOSTNAME ?? '';
  const captchaReady = Boolean(env.REGISTRATION_TURNSTILE_SITE_KEY?.trim() && env.REGISTRATION_TURNSTILE_SECRET_KEY?.trim()
    && hostname.length <= 253 && hostname.includes('.') && hostname.split('.').every(label => /^(?!-)[a-z0-9-]{1,63}(?<!-)$/.test(label)));
  const emailReady = Boolean(env.RESEND_API_KEY?.trim() && cleanEmail(env.REGISTRATION_EMAIL_FROM) && origin);
  return { ready: captchaReady && emailReady, captchaReady, emailReady, origin, hostname, siteKey: env.REGISTRATION_TURNSTILE_SITE_KEY ?? '' };
}

export async function verifyRegistrationChallenge(value: unknown, ip: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2048) return false;
  const config = registrationServices();
  if (!config.captchaReady) throw new RegistrationServiceError('captcha');
  try {
    const body = new FormData();
    body.set('secret', getRuntimeEnv().REGISTRATION_TURNSTILE_SECRET_KEY!);
    body.set('response', value);
    if (ip) body.set('remoteip', ip);
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body, signal: AbortSignal.timeout(7_000) });
    if (!response.ok) throw new Error('upstream');
    const verdict = await response.json() as { success?: boolean; action?: string; hostname?: string };
    return verdict.success === true && verdict.action === 'signup' && verdict.hostname?.toLowerCase() === config.hostname;
  } catch { throw new RegistrationServiceError('captcha'); }
}

/** Stores only a hash; delivery failure leaves the account pending for resend. */
export async function sendRegistrationConfirmation(accountId: string, destination: string) {
  const env = getRuntimeEnv(), config = registrationServices(), db = env.DB!;
  if (!config.emailReady) throw new RegistrationServiceError('email');
  const account = await db.prepare('SELECT email,credential_version FROM staff_accounts WHERE id=? AND disabled_at IS NULL AND email_verification_required=1 AND email_verified_at IS NULL').bind(accountId).first<{email:string;credential_version:number}>();
  if (!account) return;
  const token = randomSecret(), hash = await secretHash(token);
  const written = await db.prepare(`INSERT INTO staff_email_verifications(account_id,token_hash,email,credential_version,return_to,expires_at)
    SELECT id,?,email,credential_version,?,? FROM staff_accounts WHERE id=? AND email=? AND credential_version=? AND disabled_at IS NULL AND email_verified_at IS NULL AND email_verification_required=1
    ON CONFLICT(account_id) DO UPDATE SET token_hash=excluded.token_hash,email=excluded.email,credential_version=excluded.credential_version,return_to=excluded.return_to,expires_at=excluded.expires_at`)
    .bind(hash, safeReturnTo(destination) || '/participacion#registro', Date.now() + 24 * 60 * 60_000, accountId, account.email, account.credential_version).run();
  if (!written.meta.changes) return;
  const link = `${config.origin}/confirmar-correo#codigo=${token}`;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `apj-confirm-${hash}` },
      body: JSON.stringify({ from: cleanEmail(env.REGISTRATION_EMAIL_FROM), to: [account.email], subject: 'Confirma tu correo en Acción Política Juvenil Tlalnepantla', text: `Solicitaste crear una cuenta en Acción Política Juvenil Tlalnepantla.\n\nAbre este enlace y pulsa Confirmar mi correo:\n${link}\n\nEl enlace vence en 24 horas y solo puede usarse una vez. Confirmar el correo no acredita identidad civil, aceptación de solicitud ni afiliación. Si no solicitaste esta cuenta, ignora este mensaje y no confirmes el enlace. Nunca te pediremos enviar tu contraseña por correo.` }),
    });
    if (!response.ok) throw new Error('delivery');
  } catch { throw new RegistrationServiceError('email'); }
}

export async function confirmRegistrationEmail(token: string) {
  const db = getRuntimeEnv().DB!, hash = await secretHash(token), now = Date.now();
  const pending = await db.prepare('SELECT account_id,return_to FROM staff_email_verifications WHERE token_hash=? AND expires_at>?').bind(hash, now).first<{account_id:string;return_to:string}>();
  if (!pending) return null;
  const [updated] = await db.batch([
    db.prepare(`UPDATE staff_accounts SET email_verified_at=?,credential_version=credential_version+1,updated_at=MAX(updated_at+1,?) WHERE id=? AND disabled_at IS NULL AND email_verification_required=1 AND email_verified_at IS NULL
      AND EXISTS(SELECT 1 FROM staff_email_verifications v WHERE v.account_id=staff_accounts.id AND v.token_hash=? AND v.expires_at>? AND v.email=staff_accounts.email AND v.credential_version=staff_accounts.credential_version)`)
      .bind(now, now, pending.account_id, hash, Date.now()),
    db.prepare("INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,created_at) SELECT ?,email,'account.email_confirmed','staff_account',id,? FROM staff_accounts WHERE id=? AND changes()>0").bind(crypto.randomUUID(), now, pending.account_id),
    db.prepare('DELETE FROM staff_email_verifications WHERE token_hash=? AND EXISTS(SELECT 1 FROM staff_accounts WHERE id=? AND email_verified_at=?)').bind(hash, pending.account_id, now),
  ]);
  // Confirmation is not sign-in; the password is still required.
  return updated.meta.changes ? signInPath(safeReturnTo(pending.return_to) || '/participacion#registro') : null;
}
