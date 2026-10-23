import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';
const password='cuatro palabras solo para pruebas 72',newPassword='otras palabras solo para pruebas 93';
const setupToken='a'.repeat(64);
const config={RATE_LIMIT_SECRET:'isolated-test-secret-'.repeat(3),OWNER_ACCOUNT_EMAIL:'owner@example.test',OWNER_SETUP_HASH:createHash('sha256').update(setupToken).digest('hex'),OWNER_SETUP_EXPIRES_AT:String(Date.now()+86_400_000)};
const path=a=>`/api/admin/access/${a}`,cookie=r=>r.headers.get('set-cookie')?.split(';')[0];
async function bootstrap(f){const r=await f.call(path('activate'),'POST',{token:setupToken,username:'owner',password},null);assert.equal(r.status,200,await r.clone().text());return cookie(r);}
async function login(f,username,pw=password){return f.call(path('login'),'POST',{username,password:pw},null);}
async function create(f,ownerCookie,role='participant',email='person@example.test',username='persona'){
 const r=await f.call(path('create'),'POST',{email,username,name:'Persona de prueba',role,password,currentPassword:password},null,{cookie:ownerCookie});assert.equal(r.status,200,await r.clone().text());return r;
}
function versions(f,email){return{expectedAccountUpdatedAt:f.db.prepare('SELECT updated_at FROM staff_accounts WHERE email=?').get(email)?.updated_at??null,expectedRoleUpdatedAt:f.db.prepare('SELECT COALESCE(updated_at,created_at) AS n FROM user_roles WHERE email=?').get(email)?.n??null};}

test('private owner activation is single-use and platform headers never grant application access',async()=>{
 const f=await createWorkerFixture(config);try{
  assert.equal((await f.call('/api/admin/settings','PATCH',{},null,{'oai-authenticated-user-email':'owner@example.test'})).status,403);
  assert.equal((await f.call(path('password-sso'),'POST',{password},null)).status,404);
  assert.equal((await f.call(path('activate'),'POST',{token:'b'.repeat(64),username:'owner',password},null)).status,410);
  const session=await bootstrap(f);assert.match(session,/^__Host-apjt_session=[a-f0-9]{64}$/);
  assert.equal((await f.call(path('activate'),'POST',{token:setupToken,username:'intruso',password:newPassword},null)).status,410);
  const account=f.db.prepare('SELECT * FROM staff_accounts').get();assert.equal(account.username,'owner');assert.match(account.password_hash,/^scrypt-v1\$/);assert.ok(!account.password_hash.includes(password));
  assert.equal((await login(f,'owner','incorrecta y bastante larga')).status,401);
  const r=await login(f,'owner');assert.equal(r.status,200);assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  const page=await f.call('/admin/cuenta','GET',undefined,null,{cookie:cookie(r)});assert.match(await page.text(),/Crear una cuenta/);assert.equal(page.headers.get('cache-control'),'private, no-store');
  assert.equal((await f.call(path('logout'),'POST',{},null,{cookie:cookie(r)})).status,200);
  assert.equal((await f.call('/api/admin/settings','PATCH',{},null,{cookie:cookie(r)})).status,403);
 }finally{f.close();}
});

test('owner-created participants can enter their account without acquiring panel privileges',async()=>{
 const f=await createWorkerFixture(config);try{
  const owner=await bootstrap(f);await create(f,owner);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM user_roles').get().n,0);
  const r=await login(f,'PERSONA');assert.equal(r.status,200);assert.equal((await r.clone().json()).redirect,'/mi-comision');const session=cookie(r);
  const own=await f.call('/cuenta','GET',undefined,null,{cookie:session});assert.match(await own.text(),/Tu contraseña/);
  assert.equal((await f.call('/api/admin/incorporaciones/missing','GET',undefined,null,{cookie:session})).status,403);
  assert.equal((await f.call(path('create'),'POST',{email:'third@example.test',username:'tercera',role:'admin',password,currentPassword:password},null,{cookie:session})).status,403);
  assert.equal((await f.call(path('create'),'POST',{email:'other@example.test',username:'persona',role:'admin',password,currentPassword:password},null,{cookie:owner})).status,409);
  assert.equal((await f.call(path('create'),'POST',{email:'owner@example.test',username:'falso',role:'admin',password,currentPassword:password},null,{cookie:owner})).status,400);
  assert.equal((await f.call(path('password'),'POST',{password:newPassword,currentPassword:password},null,{cookie:session})).status,200);
  assert.equal((await f.call('/api/incorporaciones','GET',undefined,null,{cookie:session})).status,401);
  assert.equal((await login(f,'persona',newPassword)).status,200);
 }finally{f.close();}
});

test('reset, role changes and revocation invalidate sessions without losing account ownership',async()=>{
 const f=await createWorkerFixture(config);try{
  const owner=await bootstrap(f),email='reviewer@example.test';await create(f,owner,'admin',email,'revision');
  const signed=await login(f,'revision'),session=cookie(signed),accountId=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email).id;
  const reset=await f.call(path('reset'),'POST',{email,password:newPassword,currentPassword:password,...versions(f,email)},null,{cookie:owner});assert.equal(reset.status,200,await reset.clone().text());
  assert.equal((await login(f,'revision')).status,401);assert.equal((await f.call('/api/admin/incorporaciones/missing','GET',undefined,null,{cookie:session})).status,403);
  const changed=await login(f,'revision',newPassword),fresh=cookie(changed);assert.equal(changed.status,200);
  const role=await f.call(path('role'),'POST',{email,role:'participant',currentPassword:password,...versions(f,email)},null,{cookie:owner});assert.equal(role.status,200);
  assert.equal((await f.call('/api/admin/incorporaciones/missing','GET',undefined,null,{cookie:fresh})).status,403);
  const member=await login(f,'revision',newPassword);assert.equal((await member.clone().json()).redirect,'/mi-comision');
  const revoked=await f.call(path('revoke'),'POST',{email,currentPassword:password,...versions(f,email)},null,{cookie:owner});assert.equal(revoked.status,200);
  assert.equal((await f.call('/api/incorporaciones','GET',undefined,null,{cookie:cookie(member)})).status,401);assert.equal((await login(f,'revision',newPassword)).status,401);
  assert.equal(f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email).id,accountId);
 }finally{f.close();}
});

test('expired setup, stale sessions, concurrent updates and audit failures fail closed',async()=>{
 const expired=await createWorkerFixture({...config,OWNER_SETUP_EXPIRES_AT:'1'});try{assert.equal((await expired.call(path('activate'),'POST',{token:setupToken,username:'owner',password},null)).status,410);}finally{expired.close();}
 const f=await createWorkerFixture(config);try{
  const owner=await bootstrap(f),email='person@example.test';await create(f,owner);
  const before=versions(f,email);
  f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare('UPDATE staff_accounts SET updated_at=updated_at+1,credential_version=credential_version+1 WHERE email=?').run(email);};
  assert.equal((await f.call(path('reset'),'POST',{email,password:newPassword,currentPassword:password,...before},null,{cookie:owner})).status,409);
  assert.equal((await login(f,'persona')).status,200);
  f.db.exec("CREATE TRIGGER reject_account_audit BEFORE INSERT ON audit_logs WHEN NEW.action='account.password_reset' BEGIN SELECT RAISE(ABORT,'test failure'); END");
  assert.equal((await f.call(path('reset'),'POST',{email,password:newPassword,currentPassword:password,...versions(f,email)},null,{cookie:owner})).status,503);
  assert.equal((await login(f,'persona')).status,200);
  f.db.prepare('UPDATE staff_sessions SET last_seen_at=?').run(Date.now()-31*60_000);
  assert.equal((await f.call('/api/admin/settings','PATCH',{},null,{cookie:owner})).status,403);
 }finally{f.close();}
});

test('a valid owner setup code reports a username collision without consuming activation',async()=>{const f=await createWorkerFixture(config);try{f.seedAccount('someone@example.test');f.db.prepare("UPDATE staff_accounts SET username='owner' WHERE email='someone@example.test'").run();const r=await f.call(path('activate'),'POST',{token:setupToken,username:'owner',password},null);assert.equal(r.status,409);assert.match((await r.json()).error,/usuario no está disponible/);assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='owner.activated'").get().n,0);const valid=await f.call(path('activate'),'POST',{token:setupToken,username:'owner.real',password},null);assert.equal(valid.status,200);assert.ok(cookie(valid));}finally{f.close();}});
