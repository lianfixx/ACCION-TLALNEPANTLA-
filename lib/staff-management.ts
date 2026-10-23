import {sessionWriteGuard} from './session-write-guard';
import type {StaffIdentity} from './staff-auth';
import { getRuntimeEnv } from './runtime-env';
import { isConfiguredOwner } from './authz';
import { cleanEmail, cleanText, noStoreJson } from './security';
import { cleanUsername, hashPassword, passwordValid } from './staff-auth';

type Account={password_hash:string|null;id:string;username:string|null;name:string;updated_at:number;credential_version:number;disabled_at:number|null};
type Role={role:string;version:number;revokedAt:number|null};
const reply=(error:string,status=400)=>noStoreJson({error},{status});
export async function manageStaffAccess(action:string,input:Record<string,unknown>,actorEmail:string,actorVersion:number,actor:StaffIdentity) {
  const db=getRuntimeEnv().DB!,email=cleanEmail(input.email);
  if(!email||isConfiguredOwner(email))return reply('La cuenta propietaria se administra desde su propio acceso.');
  const account=await db.prepare('SELECT id,username,name,password_hash,updated_at,credential_version,disabled_at FROM staff_accounts WHERE email=?').bind(email).first<Account>();
  const roleRow=await db.prepare('SELECT role,COALESCE(updated_at,created_at) AS version,revoked_at AS revokedAt FROM user_roles WHERE email=?').bind(email).first<Role>();
  const accountVersion=account?.updated_at??null,roleVersion=roleRow?.version??null;
  if(account||roleRow||Object.hasOwn(input,'expectedAccountUpdatedAt')||Object.hasOwn(input,'expectedRoleUpdatedAt')) {
    if(input.expectedAccountUpdatedAt!==accountVersion||input.expectedRoleUpdatedAt!==roleVersion)return reply('La cuenta cambió. Actualiza la página antes de continuar.',409);
  }
  if(action==='revoke'&&!account&&!roleRow)return reply('No encontramos esa cuenta.',404);
  if((action==='role'||action==='reset')&&(!account||account.disabled_at!==null))return reply('Esta cuenta no tiene acceso activo. Reactívala antes de continuar.',409);
  if(action==='create'&&account&&account.disabled_at===null&&account.password_hash!==null)return reply('Esta cuenta ya existe. Puedes restablecer su contraseña.',409);
  const role=action==='reset'?(roleRow&&roleRow.revokedAt===null?roleRow.role:'participant'):input.role;
  if(action!=='revoke'&&!['admin','editor','moderator','participant'].includes(String(role)))return reply('Elige los permisos de esta cuenta.');
  const username=action==='create'?cleanUsername(input.username):account?.username??null;
  if(action==='create'&&!username)return reply('El usuario debe tener de 3 a 40 letras, números, puntos, guiones o guiones bajos.');
  if(username&&await db.prepare('SELECT 1 FROM staff_accounts WHERE username=? AND email<>?').bind(username,email).first())return reply('Ese usuario no está disponible. Elige otro.',409);
  const changesPassword=action==='create'||action==='reset';
  if(changesPassword&&!passwordValid(input.password))return reply('La contraseña debe tener de 15 a 128 caracteres.');
  const hash=changesPassword?await hashPassword(input.password as string):null;
  const name=cleanText(input.name,120)||account?.name||email;
  const now=Math.max(Date.now(),(accountVersion??0)+1,(roleVersion??0)+1),id=account?.id??crypto.randomUUID(),operation=crypto.randomUUID();
  const actionName={role:'staff.role_changed',revoke:'staff.revoked',create:'account.created',reset:'account.password_reset'}[action];
  if(!actionName)return reply('Esta función no está disponible.',404);
  const sg=sessionWriteGuard(actor);
  const marker='EXISTS(SELECT 1 FROM audit_logs WHERE id=?)';
  const statements=[db.prepare(`INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,metadata_json,created_at)
    SELECT ?,?,?,'staff_account',?,'{}',? WHERE
    (SELECT updated_at FROM staff_accounts WHERE email=?) IS ? AND
    (SELECT COALESCE(updated_at,created_at) FROM user_roles WHERE email=?) IS ? AND
    (SELECT revoked_at FROM user_roles WHERE email=?) IS ? AND
    (SELECT credential_version FROM staff_accounts WHERE email=?) IS ? AND
    EXISTS(SELECT 1 FROM staff_accounts WHERE email=? AND credential_version=? AND disabled_at IS NULL) AND ${sg.sql}`)
    .bind(operation,actorEmail,actionName,id,now,email,accountVersion,email,roleVersion,email,roleRow?.revokedAt??null,email,account?.credential_version??null,actorEmail,actorVersion,...sg.values)];
  if(action==='revoke') {
    statements.push(db.prepare(`UPDATE user_roles SET revoked_at=?,revoked_by=?,updated_at=?,updated_by=? WHERE email=? AND ${marker}`).bind(now,actorEmail,now,actorEmail,email,operation));
    statements.push(db.prepare(`UPDATE staff_accounts SET disabled_at=?,password_hash=NULL,activation_hash=NULL,activation_expires_at=NULL,credential_version=credential_version+1,updated_at=? WHERE email=? AND ${marker}`).bind(now,now,email,operation));
  } else {
    if(changesPassword) {
      if(account)statements.push(db.prepare(`UPDATE staff_accounts SET username=?,name=?,password_hash=?,activation_hash=NULL,activation_expires_at=NULL,credential_version=credential_version+1,disabled_at=NULL,updated_at=? WHERE id=? AND ${marker}`).bind(username,name,hash,now,id,operation));
      else statements.push(db.prepare(`INSERT INTO staff_accounts(id,email,name,username,password_hash,credential_version,created_at,updated_at) SELECT ?,?,?,?,?,1,?,? WHERE ${marker}`).bind(id,email,name,username,hash,now,now,operation));
    }else statements.push(db.prepare(`UPDATE staff_accounts SET credential_version=credential_version+1,updated_at=? WHERE email=? AND ${marker}`).bind(now,email,operation));
    if(action==='create'||action==='role') {
      if(role==='participant')statements.push(db.prepare(`DELETE FROM user_roles WHERE email=? AND ${marker}`).bind(email,operation));
      else statements.push(db.prepare(`INSERT INTO user_roles(email,role,created_at,created_by,updated_at,updated_by,revoked_at,revoked_by) SELECT ?,?,?,?,?,?,NULL,NULL WHERE ${marker} ON CONFLICT(email) DO UPDATE SET role=excluded.role,updated_at=excluded.updated_at,updated_by=excluded.updated_by,revoked_at=NULL,revoked_by=NULL`).bind(email,String(role),now,actorEmail,now,actorEmail,operation));
    }
  }
  statements.push(db.prepare(`DELETE FROM staff_sessions WHERE account_id IN (SELECT id FROM staff_accounts WHERE email=?) AND ${marker}`).bind(email,operation));
  const [result]=await db.batch(statements);
  if(!result.meta.changes)return reply('La cuenta cambió mientras guardabas. Actualiza la página antes de continuar.',409);
  return noStoreJson({message:action==='revoke'?'Acceso revocado. Sus sesiones quedaron cerradas.':action==='create'?'Cuenta creada. Comparte el usuario y la contraseña de forma privada.':action==='reset'?'Contraseña restablecida. Las sesiones anteriores quedaron cerradas.':'Permisos actualizados. La persona deberá volver a entrar.'});
}
