import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

// Regressions from the interface and function audit of 16 November 2026.
const realNow=Date.now;
const base={MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
const signup=(f,body)=>f.call('/api/registro-cuenta','POST',{'cf-turnstile-response':'isolated-challenge',name:'Persona Enlaces',email:'enlace@example.test',username:'enlace.persona',password:'Una frase privada para estas pruebas 82',adult:true,consent:true,...body},null,{'CF-Connecting-IP':'192.0.2.40'});

test('an account for Enlaces APJ can be created while the convocatoria is open, even with the internal registry closed',async()=>{
 const at=Date.parse('2026-11-25T18:00:00Z');Date.now=()=>at;
 const f=await createWorkerFixture({...base,MEMBERSHIP_ENABLED:'0'});
 try{
  const general=await(await f.call('/crear-cuenta','GET',undefined,null)).text();assert.match(general,/El registro no está abierto/);
  const html=(await(await f.call('/crear-cuenta?destino=enlaces','GET',undefined,null)).text()).replaceAll('\\"','"');
  const noticeToken=html.match(/"noticeToken":"([a-f0-9]{64})"/)?.[1];assert.ok(noticeToken,'the form is offered for Enlaces');
  assert.equal((await signup(f,{noticeToken})).status,503,'without Enlaces as destination the registry stays closed');
  const r=await signup(f,{noticeToken,destination:'enlaces'});assert.equal(r.status,201,await r.clone().text());
  assert.equal(f.db.prepare("SELECT return_to r FROM staff_email_verifications").get().r,'/cuenta/enlaces');
 }finally{f.close();Date.now=realNow;}
});

test('a signed-in account without a panel role sees why, instead of the sign-in form again',async()=>{
 const f=await createWorkerFixture(base);
 try{
  const r=await f.call('/admin','GET',undefined,'persona@example.test');assert.equal(r.status,200);
  const html=(await r.text()).replaceAll('<!-- -->','');assert.match(html,/Esta cuenta no tiene acceso al panel/);assert.match(html,/href="\/mi-comision"/);
  assert.equal((await f.call('/admin','GET',undefined,null)).status,307,'without a session it still goes to sign in');
 }finally{f.close();}
});

test('a page view reads the settings and the editable texts once, and the panel counters in one query',async()=>{
 const f=await createWorkerFixture(base);
 const orig=f.env.DB,seen=[];
 const wrap=s=>({...s,bind:(...v)=>wrap(s.bind(...v)),first:(...a)=>{seen.push(s.query);return s.first(...a);},all:()=>{seen.push(s.query);return s.all();},run:()=>{seen.push(s.query);return s.run();},raw:(...a)=>{seen.push(s.query);return s.raw(...a);}});
 f.env.DB={prepare:q=>wrap(orig.prepare(q)),batch:st=>{seen.push('BATCH');return orig.batch(st);}};
 try{
  for(const path of ['/admin','/','/admin/personas','/admin/contenido']){
   seen.length=0;const r=await f.call(path);assert.equal(r.status,200,path);await r.text();
   assert.ok(seen.filter(q=>/FROM site_settings/.test(q)).length<=1,`${path}: settings read once`);
   assert.ok(seen.filter(q=>/FROM site_content$/.test(q.trim())).length<=1,`${path}: texts read once`);
  }
  seen.length=0;await(await f.call('/admin')).text();
  assert.equal(seen.filter(q=>/count\(\*\)/.test(q)).length,1,'the summary counters travel together');
 }finally{f.close();}
});

test('the Enlaces convocatoria cannot be "restored" to an original that does not exist',async()=>{
 const f=await createWorkerFixture({...base,BUCKET:{async put(){return{};},async get(){return null;},async delete(){}}});
 try{
  f.db.prepare("INSERT INTO site_documents(slug,object_key,file_name,size_bytes,sha256,uploaded_at,uploaded_by) VALUES('convocatoria-enlaces-apj-2027','k','c.pdf',1,'a',5,'owner@example.test')").run();
  const r=await f.call('/api/admin/documentos/convocatoria-enlaces-apj-2027','DELETE',{expectedUploadedAt:5});assert.equal(r.status,409);assert.match((await r.json()).error,/sube el PDF nuevo/);
  assert.equal(f.db.prepare('SELECT count(*) n FROM site_documents').get().n,1);
 }finally{f.close();}
});

test('accounts that never confirm their email are deleted after seven days; confirmed ones stay',async()=>{
 const f=await createWorkerFixture(base);
 try{
  const now=Date.parse('2026-12-01T12:00:00Z'),old=now-8*86400000,recent=now-2*86400000;
  const add=(id,email,created,verified)=>f.db.prepare("INSERT INTO staff_accounts(id,email,name,username,password_hash,credential_version,self_registered,email_verification_required,email_verified_at,created_at,updated_at) VALUES(?,?,?,?,?,1,1,1,?,?,?)").run(id,email,email,id,'scrypt-v1$x',verified,created,created);
  add('old-unconfirmed','old@example.test',old,null);add('recent-unconfirmed','recent@example.test',recent,null);add('old-confirmed','confirmed@example.test',old,old+1000);
  f.db.prepare("INSERT INTO staff_email_verifications(account_id,token_hash,email,credential_version,return_to,expires_at) VALUES('old-unconfirmed','h','old@example.test',1,'/',?)").run(old+86400000);
  await f.scheduled(now);
  assert.deepEqual(f.db.prepare('SELECT id FROM staff_accounts ORDER BY id').all().map(r=>r.id),['old-confirmed','recent-unconfirmed']);
  assert.equal(f.db.prepare('SELECT count(*) n FROM staff_email_verifications').get().n,0);
 }finally{f.close();}
});

test('withdrawing an accepted application closes access to that commission',async()=>{
 const f=await createWorkerFixture({...base,MEMBERSHIP_ENABLED:'1'});
 try{
  f.seedAccount('ana@example.test');const id=f.db.prepare("SELECT id FROM staff_accounts WHERE email='ana@example.test'").get().id;
  const now=Date.now();
  f.db.prepare("INSERT INTO membership_applications(id,owner_email,name,commission,note,profile_json,reference_code,status,notice_version,notice_snapshot,consent_text,consent_at,adult_self_declared,retention_until,created_at,updated_at) VALUES('app1','ana@example.test','Ana Prueba','gobierno','','{}','APJ-1','accepted','v','{}','c',?,1,?,?,?)").run(now,now+90*86400000,now,now);
  f.db.prepare("INSERT INTO commission_members(id,account_id,commission,role,active,updated_at,updated_by) VALUES('m1',?,'gobierno','member',1,1,'owner')").run(id);
  const r=await f.call('/api/incorporaciones/app1','PATCH',{action:'withdraw',expectedUpdatedAt:now},'ana@example.test',{'x-expected-account-id':id});
  assert.equal(r.status,200,await r.clone().text());
  assert.equal(f.db.prepare("SELECT active FROM commission_members WHERE id='m1'").get().active,0);
 }finally{f.close();}
});
