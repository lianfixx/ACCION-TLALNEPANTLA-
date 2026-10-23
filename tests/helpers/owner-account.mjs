import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const ownerPassword='Cuenta solo para pruebas locales 938';
const token='c'.repeat(64);
export const ownerConfig={OWNER_ACCOUNT_EMAIL:'owner@example.test',OWNER_SETUP_HASH:createHash('sha256').update(token).digest('hex'),OWNER_SETUP_EXPIRES_AT:String(Date.now()+86400000),RATE_LIMIT_SECRET:'test-account-isolated-secret-'.repeat(3)};
export const cookieOf=r=>r.headers.get('set-cookie')?.split(';')[0];
export async function bootstrapOwner(f){const response=await f.call('/api/admin/access/activate','POST',{token,username:'owner',password:ownerPassword},null);assert.equal(response.status,200,await response.clone().text());return cookieOf(response);}
export function accountVersions(f,email){return{expectedAccountUpdatedAt:f.db.prepare('SELECT updated_at FROM staff_accounts WHERE email=?').get(email)?.updated_at??null,expectedRoleUpdatedAt:f.db.prepare('SELECT COALESCE(updated_at,created_at) n FROM user_roles WHERE email=?').get(email)?.n??null};}
