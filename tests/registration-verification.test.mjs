import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';
const config={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
const password='Frase privada solo para pruebas 286';
async function body(f,extra={}){const html=(await(await f.call('/crear-cuenta','GET',undefined,null)).text()).replaceAll('\\"','"');return{name:'Persona de prueba',email:'new@example.test',username:'new.person',password,adult:true,consent:true,noticeToken:html.match(/"noticeToken":"([a-f0-9]{64})"/)?.[1],'cf-turnstile-response':'isolated-challenge',...extra};}
const signup=(f,x)=>f.call('/api/registro-cuenta','POST',x,null);
const code=f=>f.mail.at(-1).text.match(/#codigo=([a-f0-9]{64})/)[1];
const confirm=(f,token=code(f))=>f.call('/api/confirmar-correo','POST',{action:'confirm',token},null);
const resend=(f,email='new@example.test')=>f.call('/api/confirmar-correo','POST',{action:'resend',email,'cf-turnstile-response':'isolated-challenge'},null);
const login=(f,pw=password)=>f.call('/api/admin/access/login','POST',{username:'new.person',password:pw},null);

test('new signup has no session until one-use email confirmation and a password sign-in',async()=>{
 const f=await createWorkerFixture(config);try{
  const r=await signup(f,await body(f,{commission:'cultura'}));assert.equal(r.status,201);assert.equal(r.headers.get('set-cookie'),null);assert.equal((await r.json()).requiresEmailConfirmation,true);
  const account=f.db.prepare('SELECT * FROM staff_accounts').get();assert.equal(account.email_verification_required,1);assert.equal(account.email_verified_at,null);
  assert.equal(f.db.prepare('SELECT count(*) n FROM staff_sessions').get().n,0);
  const premature=f.seedAccount('new@example.test');
  assert.equal((await f.call('/api/espacio','GET',undefined,null,{cookie:premature})).status,401);
  assert.equal((await login(f,'Contraseña equivocada de prueba')).status,401);assert.equal((await login(f)).status,403);
  const token=code(f),stored=f.db.prepare('SELECT * FROM staff_email_verifications').get();assert.notEqual(stored.token_hash,token);assert.equal(stored.token_hash,createHash('sha256').update(token).digest('hex'));
  assert.ok(stored.expires_at>Date.now()+23*3600000);assert.ok(!JSON.stringify(account).includes(token));
  const verified=await confirm(f,token);assert.equal(verified.status,200);assert.equal(verified.headers.get('set-cookie'),null);assert.equal((await verified.json()).redirect,'/ingresar?returnTo=%2Fparticipacion%3Fcomision%3Dcultura%23registro');
  assert.equal((await confirm(f,token)).status,410);assert.equal(f.db.prepare('SELECT count(*) n FROM staff_email_verifications').get().n,0);
  assert.equal((await f.call('/api/espacio','GET',undefined,null,{cookie:premature})).status,401);
  assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='account.email_confirmed'").get().n,1);
  const signed=await login(f);assert.equal(signed.status,200);assert.match(signed.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);assert.equal(f.db.prepare('SELECT count(*) n FROM user_roles').get().n,0);
 }finally{f.close();}
});

test('captcha is mandatory and fails closed for wrong action, hostname, expired token or outage',async()=>{
 for(const scenario of ['missing','action','hostname','expired','outage']){const f=await createWorkerFixture(config);try{
  const payload=await body(f);
  if(scenario==='missing')delete payload['cf-turnstile-response'];
  if(scenario==='action')f.captchaVerdict.action='contact';
  if(scenario==='hostname')f.captchaVerdict.hostname='evil.example';
  if(scenario==='expired')f.captchaVerdict.success=false;
  if(scenario==='outage')f.captchaFailure=true;
  const response=await signup(f,payload);assert.equal(response.status,scenario==='outage'?503:400);
  assert.equal(f.db.prepare('SELECT count(*) n FROM staff_accounts').get().n,0);assert.equal(f.mail.length,0);
 }finally{f.close();}}
});

test('missing provider configuration closes signup without changing legacy account verification',async()=>{
 for(const missing of ['RESEND_API_KEY','REGISTRATION_EMAIL_FROM','REGISTRATION_PUBLIC_ORIGIN','REGISTRATION_TURNSTILE_SECRET_KEY','REGISTRATION_TURNSTILE_HOSTNAME']){const f=await createWorkerFixture({...config,[missing]:''});try{
  const page=await(await f.call('/crear-cuenta','GET',undefined,null)).text();assert.match(page,/El registro no está abierto/);assert.doesNotMatch(page,/<input[^>]*name="password"/);
  assert.equal((await signup(f,{})).status,503);f.seedAccount('legacy@example.test');const a=f.db.prepare('SELECT email_verified_at,email_verification_required FROM staff_accounts').get();assert.equal(a.email_verified_at,null);assert.equal(a.email_verification_required,0);
 }finally{f.close();}}
});

test('delivery failure leaves a pending account recoverable by resend and logs only safe correlation fields',async()=>{
 const f=await createWorkerFixture(config),logs=[],original=console.error;console.error=value=>logs.push(value);
 try{f.emailFailure=true;const payload=await body(f),r=await signup(f,payload);assert.equal(r.status,503);const result=await r.json();assert.ok(result.requestId);assert.equal((await login(f)).status,403);
  assert.equal(f.db.prepare('SELECT count(*) n FROM staff_accounts').get().n,1);assert.equal(f.db.prepare('SELECT count(*) n FROM staff_sessions').get().n,0);
  const event=JSON.parse(logs[0]);assert.deepEqual(Object.keys(event).sort(),['event','operation','requestId','stage']);assert.equal(event.requestId,result.requestId);assert.equal(event.stage,'email');assert.ok(!logs.join('').includes(payload.email));assert.ok(!logs.join('').includes(password));
  f.emailFailure=false;assert.equal((await resend(f)).status,200);assert.equal(f.mail.length,1);assert.equal((await confirm(f)).status,200);assert.equal((await login(f)).status,200);
 }finally{console.error=original;f.close();}
});

test('resend invalidates the previous link, limits delivery and does not claim an unknown address exists',async()=>{
 const f=await createWorkerFixture(config);try{
  assert.equal((await signup(f,await body(f))).status,201);const old=code(f);
  const sent=await resend(f);assert.equal(sent.status,200);const publicMessage=await sent.text();assert.equal((await confirm(f,old)).status,410);
  assert.equal(await(await resend(f,'unknown@example.test')).text(),publicMessage);
  for(let n=0;n<2;n++)assert.equal((await resend(f)).status,200);
  assert.equal((await resend(f)).status,429);assert.equal(f.mail.length,4);
  assert.equal((await confirm(f)).status,200);
 }finally{f.close();}
});

test('expired tokens and concurrent disablement, changed email or credentials cannot verify a pending account',async()=>{
 for(const mutation of ['expiry','disabled','email','credentials','race']){const f=await createWorkerFixture(config);try{
  assert.equal((await signup(f,await body(f))).status,201);const token=code(f);
  if(mutation==='expiry')f.db.exec('UPDATE staff_email_verifications SET expires_at=1');
  if(mutation==='disabled')f.db.exec('UPDATE staff_accounts SET disabled_at=1');
  if(mutation==='email')f.db.exec("UPDATE staff_accounts SET email='changed@example.test'");
  if(mutation==='credentials')f.db.exec('UPDATE staff_accounts SET credential_version=credential_version+1');
  if(mutation==='race')f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.exec('UPDATE staff_accounts SET disabled_at=1');};
  assert.equal((await confirm(f,token)).status,410);assert.equal(f.db.prepare('SELECT email_verified_at FROM staff_accounts').get().email_verified_at,null);
 }finally{f.close();}}
});

test('confirmation rolls back with its audit and cannot be replayed concurrently',async()=>{
 const f=await createWorkerFixture(config);try{
  assert.equal((await signup(f,await body(f))).status,201);const token=code(f);
  f.db.exec("CREATE TRIGGER fail_confirmation_audit BEFORE INSERT ON audit_logs WHEN NEW.action='account.email_confirmed' BEGIN SELECT RAISE(ABORT,'isolated failure'); END");
  assert.equal((await confirm(f,token)).status,503);assert.equal(f.db.prepare('SELECT email_verified_at FROM staff_accounts').get().email_verified_at,null);
  f.db.exec('DROP TRIGGER fail_confirmation_audit');
  const responses=await Promise.all([confirm(f,token),confirm(f,token)]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,410]);
 }finally{f.close();}
});

test('form fallback uses POST, rejects non-JSON without reflecting credentials, and keeps confirmation private',async()=>{
 const f=await createWorkerFixture(config);try{
  for(const [page,path] of [['/ingresar','/api/admin/access/login'],['/crear-cuenta','/api/registro-cuenta'],['/confirmar-correo','/api/confirmar-correo']]){
   const html=await(await f.call(page,'GET',undefined,null)).text();assert.match(html,/<form\b[^>]*method="post"/i);assert.ok(html.includes(`action="${path}"`));
   const r=await f.callRaw(path,'username=test&password=SYNTHETIC_SECRET',null,{'content-type':'application/x-www-form-urlencoded',accept:'text/html',origin:'null'});assert.equal(r.status,415);const message=await r.text();assert.match(message,/JavaScript/);assert.doesNotMatch(message,/SYNTHETIC_SECRET/);
  }
  const page=await f.call('/confirmar-correo','GET',undefined,null);assert.equal(page.headers.get('cache-control'),'private, no-store');assert.equal(page.headers.get('referrer-policy'),'no-referrer');
  assert.equal((await f.call('/api/confirmar-correo','POST',{action:'confirm',token:'a'.repeat(64)},null,{origin:'https://evil.example'})).status,403);
  assert.equal((await f.call('/api/confirmar-correo','POST',[],null)).status,400);
 }finally{f.close();}
});
