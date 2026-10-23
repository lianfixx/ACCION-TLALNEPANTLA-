import { headers } from 'next/headers';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { getRuntimeEnv } from './runtime-env';

export const staffCookie = '__Host-apjt_session';
export const sessionLifetime = 8 * 60 * 60 * 1000;
const idleLifetime = 30 * 60 * 1000;
const work = { N: 32768, r: 8, p: 3, dkLen: 32, maxmem: 36 * 1024 * 1024 };
export class StaffCapacityError extends Error {}
let deriving = false;
async function derive(password: string, salt: Uint8Array) {
  if (deriving) throw new StaffCapacityError();
  deriving = true;
  try { return await scryptAsync(new TextEncoder().encode(password), salt, work); }
  finally { deriving = false; }
}
const hex = (bytes: Uint8Array) => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
export const randomSecret = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function secretHash(value: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
export function passwordValid(value: unknown): value is string { return typeof value === 'string' && Array.from(value).length >= 15 && Array.from(value).length <= 128; }

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await derive(password, salt);
  const result = `scrypt-v1$${hex(salt)}$${hex(derived)}`;
  derived.fill(0); return result;
}
export async function verifyPassword(password: unknown, stored: string | null) {
  if (typeof password !== 'string' || Array.from(password).length > 128) return false;
  const match = stored?.match(/^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{64})$/);
  const salt = match ? Uint8Array.from(match[1].match(/../g)!, b => parseInt(b, 16)) : new Uint8Array(16);
  // The same work is done for unknown accounts, without a user-enumeration hint.
  const actual = await derive(password, salt);
  const expected = match ? Uint8Array.from(match[2].match(/../g)!, b => parseInt(b, 16)) : new Uint8Array(32);
  let difference = 0; for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i];
  actual.fill(0); return Boolean(match) && difference === 0;
}

export function sessionToken(cookie: string | null) {
  const values = (cookie ?? '').split(';').map(s => s.trim()).filter(s => s.startsWith(`${staffCookie}=`));
  const token = values.length === 1 ? values[0].slice(staffCookie.length + 1) : '';
  return /^[a-f0-9]{64}$/.test(token) ? token : '';
}
export function setSessionCookie(response: Response, token: string, maxAge = sessionLifetime / 1000) {
  response.headers.append('Set-Cookie', `${staffCookie}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
  return response;
}
export function cleanUsername(value: unknown) {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return /^[a-z0-9][a-z0-9._-]{2,39}$/.test(username) ? username : '';
}
export type StaffIdentity = { selfRegistered?: boolean; username: string | null; accountId: string; email: string; displayName: string; credentialVersion: number; sessionHash: string; authMethod: 'password'; fullName: string };

export async function getStaffIdentity(): Promise<StaffIdentity | null> {
  const token = sessionToken((await headers()).get('cookie'));
  if (!token) return null;
  const db = getRuntimeEnv().DB; if (!db) return null;
  try {
    const now = Date.now(), hash = await secretHash(token);
    const row = await db.prepare("SELECT a.self_registered AS selfRegistered,a.id AS accountId,a.username,a.email,a.name AS displayName,a.credential_version AS credentialVersion,s.last_seen_at AS lastSeenAt FROM staff_sessions s JOIN staff_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.credential_version=a.credential_version AND a.disabled_at IS NULL AND a.password_hash IS NOT NULL AND (a.email_verification_required=0 OR a.email_verified_at IS NOT NULL) AND s.expires_at>? AND s.last_seen_at>?").bind(hash, now, now - idleLifetime).first<{ username: string | null; accountId: string; email: string; displayName: string; credentialVersion: number; lastSeenAt: number }>();
    if (!row) return null;
    if (now - row.lastSeenAt > 60_000) await db.prepare('UPDATE staff_sessions SET last_seen_at=? WHERE token_hash=? AND last_seen_at=?').bind(now, hash, row.lastSeenAt).run();
    return { ...row, fullName: row.displayName, sessionHash: hash, authMethod: 'password' };
  } catch { return null; }
}

export async function createStaffSession(accountId: string, version: number) {
  const db = getRuntimeEnv().DB!, now = Date.now(), token = randomSecret(), hash = await secretHash(token);
  const result = await db.prepare('INSERT INTO staff_sessions (token_hash,account_id,credential_version,created_at,last_seen_at,expires_at) SELECT ?,id,credential_version,?,?,? FROM staff_accounts WHERE id=? AND credential_version=? AND disabled_at IS NULL AND password_hash IS NOT NULL AND (email_verification_required=0 OR email_verified_at IS NOT NULL)').bind(hash, now, now, now + sessionLifetime, accountId, version).run();
  if (!result.meta.changes) throw new Error('La cuenta cambió. Vuelve a entrar.');
  await db.prepare('DELETE FROM staff_sessions WHERE expires_at<=? OR last_seen_at<=?').bind(now, now - idleLifetime).run();
  return token;
}
