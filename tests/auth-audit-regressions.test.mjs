import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';
import {ownerConfig,ownerPassword,bootstrapOwner} from './helpers/owner-account.mjs';

const config={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
async function signupBody(f,extra={}){
 const html=(await(await f.call('/crear-cuenta','GET',undefined,null)).text()).replaceAll('\\"','"');
 const noticeToken=html.match(/"noticeToken":"([a-f0-9]{64})"/)[1];
 return{name:'Cuenta de prueba',email:'new@example.test',username:'new.person',password:'Una frase privada para estas pruebas 82',adult:true,consent:true,noticeToken,...extra};
}
const signup=(f,body,ip='192.0.2.10')=>f.call('/api/registro-cuenta','POST',body,null,{'CF-Connecting-IP':ip});
const quota=f=>f.db.prepare("SELECT COALESCE(sum(count),0) n FROM rate_limits WHERE scope='self-register-created'").get().n;

test('empty signups exhaust only their network allowance, never the global capacity for real accounts',async()=>{
 const f=await createWorkerFixture(config);try{
  const valid=await signupBody(f);
  for(let n=0;n<120;n++)assert.equal((await signup(f,{})).status,400);
  assert.equal((await signup(f,{})).status,429,'the offending network remains limited');
  assert.equal(quota(f),0);assert.equal(f.db.prepare('SELECT count(*) n FROM staff_accounts').get().n,0);
  const r=await signup(f,valid,'198.51.100.20');assert.equal(r.status,201,await r.clone().text());
  assert.equal(quota(f),1);assert.equal(f.db.prepare('SELECT count(*) n FROM staff_accounts').get().n,1);
 }finally{f.close();}
});

test('duplicate accounts and stale notices do not consume successful signup capacity',async()=>{
 const f=await createWorkerFixture(config);try{
  const body=await signupBody(f);assert.equal((await signup(f,body)).status,201);
  for(let n=0;n<3;n++)assert.equal((await signup(f,body)).status,409);
  assert.equal((await signup(f,{...body,email:'second@example.test',username:'second.person',noticeToken:'expired'})).status,409);
  assert.equal(quota(f),1);assert.equal(f.db.prepare('SELECT count(*) n FROM staff_accounts').get().n,1);
 }finally{f.close();}
});

test('two signups competing for the final global place cannot exceed capacity',async()=>{
 const f=await createWorkerFixture(config);try{
  const first=await signupBody(f),second={...first,email:'second@example.test',username:'second.person'};
  const windowStart=Math.floor(Date.now()/3600000)*3600000;
  f.db.prepare('INSERT INTO rate_limits(id,scope,identity_hash,window_started_at,count,expires_at) VALUES(?,?,?,?,99,?)').run(`self-register-created:site:${windowStart}`,'self-register-created','site',windowStart,windowStart+7200000);
  let competed=false;
  f.beforeBatch=async()=>{f.beforeBatch=undefined;competed=true;const r=await signup(f,second,'198.51.100.20');assert.equal(r.status,201,await r.clone().text());};
  const r=await signup(f,first);assert.ok(competed);assert.equal(r.status,429,await r.clone().text());
  assert.equal(quota(f),100);
  assert.deepEqual(f.db.prepare('SELECT username FROM staff_accounts').all().map(a=>a.username),['second.person']);
 }finally{f.close();}
});

test('a failed quota write rolls back the account and leaves its registration place available',async()=>{
 const f=await createWorkerFixture(config);try{
  const body=await signupBody(f);
  f.db.exec("CREATE TEMP TRIGGER fail_signup_quota BEFORE INSERT ON rate_limits WHEN NEW.scope='self-register-created' BEGIN SELECT RAISE(ABORT,'isolated quota failure'); END");
  assert.equal((await signup(f,body)).status,503);
  assert.equal(quota(f),0);assert.equal(f.db.prepare('SELECT count(*) n FROM staff_accounts').get().n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM staff_sessions').get().n,0);
  f.db.exec('DROP TRIGGER fail_signup_quota');
  const retry=await signup(f,body);assert.equal(retry.status,201,await retry.clone().text());assert.equal(quota(f),1);
 }finally{f.close();}
});

test('account settings opened as A cannot change B even when both accounts share an initial password',async()=>{
 const f=await createWorkerFixture(ownerConfig);try{
  const owner=await bootstrapOwner(f),hash=f.db.prepare("SELECT password_hash FROM staff_accounts WHERE email='owner@example.test'").get().password_hash;
  for(const [email,username] of [['a@example.test','persona.a'],['b@example.test','persona.b']]){f.seedAccount(email);f.db.prepare('UPDATE staff_accounts SET username=?,password_hash=? WHERE email=?').run(username,hash,email);}
  const a=f.db.prepare("SELECT id FROM staff_accounts WHERE email='a@example.test'").get().id,b=f.db.prepare("SELECT id FROM staff_accounts WHERE email='b@example.test'").get().id;
  const oldPage=(await(await f.call('/cuenta','GET',undefined,'a@example.test')).text()).replaceAll('\\"','"');assert.match(oldPage,/persona\.a/);assert.ok(oldPage.includes(`"accountId":"${a}"`));
  const beforeAccounts=f.db.prepare('SELECT * FROM staff_accounts ORDER BY id').all(),beforeSessions=f.db.prepare('SELECT * FROM staff_sessions ORDER BY token_hash').all(),beforeAudits=f.db.prepare('SELECT * FROM audit_logs ORDER BY id').all();
  const staleHeaders={'X-Expected-Account-Id':a},nextPassword='Una nueva frase privada de prueba 82';
  let r=await f.call('/api/admin/access/password','POST',{currentPassword:ownerPassword,password:nextPassword},'b@example.test',staleHeaders);assert.equal(r.status,412);
  r=await f.call('/api/admin/access/logout','POST',{},'b@example.test',staleHeaders);assert.equal(r.status,412);assert.equal(r.headers.get('set-cookie'),null);
  for(const action of ['create','reset','revoke','role']){
   r=await f.call(`/api/admin/access/${action}`,'POST',{email:'third@example.test',username:'third.person',role:'participant',currentPassword:ownerPassword,password:nextPassword},null,{cookie:owner,...staleHeaders});assert.equal(r.status,412,action);
  }
  assert.deepEqual(f.db.prepare('SELECT * FROM staff_accounts ORDER BY id').all(),beforeAccounts);
  assert.deepEqual(f.db.prepare('SELECT * FROM staff_sessions ORDER BY token_hash').all(),beforeSessions);
  assert.deepEqual(f.db.prepare('SELECT * FROM audit_logs ORDER BY id').all(),beforeAudits);
  r=await f.call('/api/admin/access/password','POST',{currentPassword:ownerPassword,password:nextPassword},'b@example.test',{'X-Expected-Account-Id':b});assert.equal(r.status,200,await r.clone().text());
  assert.equal(f.db.prepare('SELECT credential_version n FROM staff_accounts WHERE id=?').get(a).n,1);
  assert.equal(f.db.prepare('SELECT credential_version n FROM staff_accounts WHERE id=?').get(b).n,2);
 }finally{f.close();}
});
