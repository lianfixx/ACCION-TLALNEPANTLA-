import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createWorkerFixture } from './helpers/worker-fixture.mjs';
import {ownerPassword,ownerConfig,bootstrapOwner} from './helpers/owner-account.mjs';

const approved=JSON.parse(readFileSync(new URL('../docs/registro-aprobado-2026-09-12.json',import.meta.url),'utf8'));
const migration=readFileSync(new URL('../drizzle/0008_approve_membership_notice.sql',import.meta.url),'utf8');
const config={...approved,RATE_LIMIT_SECRET:'test-only-limit-secret-'.repeat(3)};
const person='applicant@example.test';
const password=ownerPassword;
const cookie=r=>r.headers.get('set-cookie')?.split(';')[0];
async function payload(f){const html=(await(await f.call('/participacion','GET',undefined,null)).text()).replaceAll('\\"','"');const token=html.match(/"noticeToken":"([a-f0-9]{64})"/);assert.ok(token);return{name:'Persona de prueba',commission:'gobierno',profile:{participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',activity:'',experience:'',availability:'Sábados por la mañana',projects:[]},note:'Consulta de prueba',consent:true,adultSelfDeclared:true,noticeToken:token[1]};}
const oldSettings={...approved,MEMBERSHIP_ENABLED:'0',MEMBERSHIP_NOTICE_APPROVED:'0',PRIVACY_NOTICE_VERSION:'anterior',CONTACT_RETENTION_DAYS:'45',COMMENTS_RETENTION_DAYS:'45',SOCIAL_INSTAGRAM:'https://www.instagram.com/example',SOCIAL_FACEBOOK:'',SOCIAL_X:'',SOCIAL_YOUTUBE:'',SOCIAL_WHATSAPP:''};

test('approved party notice opens reception in env and its data migration preserves unrelated settings and consent',async()=>{
 const f=await createWorkerFixture({...config,...ownerConfig});try{
  const legal=await(await f.call('/privacidad/registro','GET',undefined,null)).text();
  assert.match(legal,/Boulevard Toluca/);assert.match(legal,/veinte días hábiles/);assert.doesNotMatch(legal,/La recepción de solicitudes está cerrada/);
  const body=await payload(f);
  const created=await f.call('/api/incorporaciones','POST',body,person);assert.equal(created.status,201);
  const proof=f.db.prepare('SELECT notice_snapshot,consent_text FROM membership_applications').get();
  const future=Date.now()+60000;
  f.db.prepare("INSERT INTO site_settings(id,values_json,updated_at,updated_by) VALUES('public',?,?,?)").run(JSON.stringify({...oldSettings,extraPreserved:'retain'}),future,'owner@example.test');
  assert.equal((await f.call('/api/incorporaciones','POST',body,'second@example.test')).status,503);
  f.db.exec('BEGIN');f.db.exec(migration);f.db.exec('COMMIT');
  const row=f.db.prepare("SELECT * FROM site_settings WHERE id='public'").get(),values=JSON.parse(row.values_json);
  for(const [key,value] of Object.entries(approved))assert.equal(values[key],value,key);
  assert.equal(values.CONTACT_RETENTION_DAYS,'45');assert.equal(values.SOCIAL_INSTAGRAM,oldSettings.SOCIAL_INSTAGRAM);assert.equal(values.extraPreserved,'retain');assert.equal(row.updated_at,future+1);
  assert.deepEqual(f.db.prepare('SELECT notice_snapshot,consent_text FROM membership_applications').get(),proof);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='settings.approved_notice_deployment'").get().n,1);
  assert.equal((await f.call('/api/admin/settings','PATCH',{values,expectedUpdatedAt:future})).status,409);
  assert.equal((await f.call('/api/incorporaciones','POST',await payload(f),'second@example.test')).status,201);
 }finally{f.close();}
});

test('a real password session reviews a personal-account application without exposing notes or granting roles',async()=>{
 const f=await createWorkerFixture({...config,...ownerConfig});try{
  await bootstrapOwner(f);
  const login=await f.call('/api/admin/access/login','POST',{username:'owner',password},null);assert.equal(login.status,200);const admin={cookie:cookie(login)};
  const submission=await f.call('/api/incorporaciones','POST',{...await payload(f),ownerEmail:'owner@example.test',role:'admin',status:'accepted'},person);assert.equal(submission.status,201);
  const item=(await submission.json()).application;assert.equal(item.ownerEmail,person);assert.equal(item.status,'submitted');
  assert.equal((await f.call(`/api/incorporaciones/${item.id}`,'GET',undefined,'stranger@example.test')).status,404);
  const path=`/api/admin/incorporaciones/${item.id}`;
  const review=await f.call(path,'PATCH',{status:'in_review',response:'Ya revisamos tu solicitud.',note:'Nota privada',expectedUpdatedAt:item.updatedAt},null,admin);assert.equal(review.status,200);
  const detail=await(await f.call(`/api/incorporaciones/${item.id}`,'GET',undefined,person)).json();assert.match(JSON.stringify(detail),/Ya revisamos/);assert.doesNotMatch(JSON.stringify(detail),/Nota privada|owner@example.test/);
  assert.equal((await f.call(path,'PATCH',{status:'accepted',response:'Aceptación interna de prueba.',expectedUpdatedAt:detail.application.updatedAt},null,admin)).status,200);
  const accepted=await(await f.call(`/api/incorporaciones/${item.id}`,'GET',undefined,person)).json();assert.equal(accepted.application.status,'accepted');
  assert.equal((await f.call(`/api/incorporaciones/${item.id}`,'PATCH',{action:'withdraw',expectedUpdatedAt:accepted.application.updatedAt},person)).status,200);
  const withdrawn=await(await f.call(`/api/incorporaciones/${item.id}`,'GET',undefined,person)).json();assert.equal(withdrawn.application.status,'withdrawn');
  assert.equal((await f.call(path,'PATCH',{status:'in_review',expectedUpdatedAt:withdrawn.application.updatedAt},null,admin)).status,409);
  assert.equal(f.db.prepare('SELECT count(*) n FROM user_roles').get().n,0);
  await f.call('/api/admin/access/logout','POST',{},null,admin);
  assert.equal((await f.call(path,'GET',undefined,null,admin)).status,403);
 }finally{f.close();}
});

test('cross-origin, oversized and excessive incorporation submissions leave no extra records',async()=>{
 const f=await createWorkerFixture({...config,...ownerConfig});try{
  const body=await payload(f);
  for(const headers of [{origin:''},{origin:'https://attacker.example'},{'sec-fetch-site':'cross-site'}])assert.equal((await f.call('/api/incorporaciones','POST',body,person,headers)).status,403);
  assert.equal((await f.call('/api/incorporaciones','POST',{...body,padding:'x'.repeat(49000)},person)).status,413);
  assert.equal(f.db.prepare('SELECT count(*) n FROM membership_applications').get().n,0);
  for(let i=0;i<5;i++)assert.ok([200,201].includes((await f.call('/api/incorporaciones','POST',body,person)).status));
  assert.equal((await f.call('/api/incorporaciones','POST',body,person)).status,429);
  assert.equal(f.db.prepare('SELECT count(*) n FROM membership_applications').get().n,1);
  assert.equal(f.db.prepare('SELECT count(*) n FROM membership_events').get().n,1);
 }finally{f.close();}
});

test('malformed password attempts cannot spend the account quota and forwarded headers cannot rotate network identity',async()=>{
 const f=await createWorkerFixture({...config,...ownerConfig});try{
  await bootstrapOwner(f);
  for(let i=0;i<10;i++)assert.equal((await f.call('/api/admin/access/login','POST',{username:'owner',password:'x'.repeat(129)},null)).status,400);
  assert.equal(f.db.prepare("SELECT count(*) n FROM rate_limits WHERE scope='staff-login-account'").get().n,0);
  const login=await f.call('/api/admin/access/login','POST',{username:'owner',password},null);assert.equal(login.status,200);
  for(let i=12;i<30;i++)assert.equal((await f.call('/api/admin/access/login','POST',{username:'owner',password:'x'.repeat(129)},null,{'x-forwarded-for':`192.0.2.${i}`})).status,400);
  assert.equal((await f.call('/api/admin/access/login','POST',{username:'other',password},null,{'x-forwarded-for':'198.51.100.1'})).status,429);
  const page=await f.call('/admin/cuenta','GET',undefined,null,{cookie:cookie(login)});assert.equal(page.status,200);assert.equal(page.headers.get('referrer-policy'),'no-referrer');assert.equal(page.headers.get('cache-control'),'private, no-store');assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(page.headers.get('content-security-policy'),/form-action 'self'/);assert.match(page.headers.get('content-security-policy'),/base-uri 'none'/);
 }finally{f.close();}
});

test('plain HTTP cannot receive credentials and safe navigation upgrades to HTTPS',async()=>{
 const {default:worker}=await import('../dist/server/index.js');const ctx={waitUntil(){},passThroughOnException(){}};
 const page=await worker.fetch(new Request('http://example.test/admin/ingresar'),{},ctx);assert.equal(page.status,308);assert.equal(page.headers.get('location'),'https://example.test/admin/ingresar');
 const form=await worker.fetch(new Request('http://example.test/api/admin/access/login',{method:'POST',body:'{}'}),{},ctx);assert.equal(form.status,403);assert.equal(form.headers.get('location'),null);assert.equal(form.headers.get('cache-control'),'no-store');
});
