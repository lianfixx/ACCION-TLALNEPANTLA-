import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

const base={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
const open={...base,ENLACES_ENABLED:'1',ENLACES_APPROVAL:'Acuerdo de prueba aislada'};
const user='member@example.test',other='other@example.test';
function bucket(){const files=new Map();return{files,async put(k,v){files.set(k,new Uint8Array(v));return{};},async get(k){return files.has(k)?{body:new Response(files.get(k)).body}:null;},async delete(k){for(const id of Array.isArray(k)?k:[k])files.delete(id);}};}
const fixture=env=>createWorkerFixture({...env,BUCKET:bucket()});
function account(f,email){f.seedAccount(email);const a=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email);f.db.prepare('UPDATE staff_accounts SET username=? WHERE id=?').run(email.split('@')[0],a.id);return a.id;}
async function token(f,email){const html=(await(await f.call('/participacion','GET',undefined,email)).text()).replaceAll('\\"','"');return html.match(/"noticeToken":"([a-f0-9]{64})"/)[1];}
const profile=(extra={})=>({participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',activity:'',experience:'',availability:'Cuatro horas por semana',projects:[],...extra});
async function apply(f,email,extra={}){return f.call('/api/incorporaciones','POST',{name:'Persona de prueba',commission:'gobierno',profile:profile(extra),note:'',consent:true,adultSelfDeclared:true,noticeToken:await token(f,email)},email);}
async function consent(f,email){const x=await(await f.call('/api/espacio','GET',undefined,email)).json();const r=await f.call('/api/espacio','POST',{action:'consent',version:'comisiones-2026-10-06.1',noticeToken:x.noticeToken,consent:true},email);assert.equal(r.status,200,await r.clone().text());}
const upload=(f,email,category)=>f.callRaw('/api/espacio/documentos?category='+category,'%PDF-1.4\n%%EOF',email,{'content-type':'application/pdf','x-file-name':encodeURIComponent('Carta de prueba.pdf')});

test('a closed call stays hidden from the public and refuses postulations',async()=>{const f=await fixture(base);try{
 account(f,user);
 assert.equal((await f.call('/enlaces','GET',undefined,null)).status,404);
 assert.equal((await f.call('/enlaces','GET',undefined,user)).status,404,'a participant account is not an administrator');
 const preview=await f.call('/enlaces','GET',undefined,'owner@example.test');assert.equal(preview.status,200);assert.match(await preview.text(),/Vista previa, no publicada/);
 assert.doesNotMatch(await(await f.call('/sitemap.xml','GET',undefined,null)).text(),/\/enlaces/);
 const refused=await apply(f,user,{enlaces:true});assert.equal(refused.status,409,await refused.clone().text());
 assert.equal((await apply(f,user)).status,201,'an ordinary application is unaffected');
}finally{f.close();}});

test('approval is required before the call opens',async()=>{const f=await fixture({...open,ENLACES_APPROVAL:''});try{
 assert.equal((await f.call('/enlaces','GET',undefined,null)).status,404);
}finally{f.close();}});

test('an open call accepts postulations and private letters only from postulants',async()=>{const f=await fixture(open);try{
 account(f,user);account(f,other);
 const page=await f.call('/enlaces','GET',undefined,null);assert.equal(page.status,200);const html=await page.text();
 assert.match(html,/Acuerdo de prueba aislada/);assert.doesNotMatch(html,/Vista previa/);
 assert.match(await(await f.call('/sitemap.xml','GET',undefined,null)).text(),/\/enlaces/);
 const created=await apply(f,user,{enlaces:true});assert.equal(created.status,201,await created.clone().text());
 assert.equal(JSON.parse((await created.json()).application.profileJson).enlaces,true);
 assert.equal((await apply(f,other)).status,201);
 const space=await(await f.call('/api/espacio','GET',undefined,user)).json();assert.ok(space.application.enlaces);assert.equal(space.enlacesOpen,true);
 assert.ok(!(await(await f.call('/api/espacio','GET',undefined,other)).json()).application.enlaces);
 await consent(f,user);await consent(f,other);
 for(const category of ['motivation_letter','recommendation_letter']){const r=await upload(f,user,category);assert.equal(r.status,201,await r.clone().text());}
 assert.equal((await upload(f,other,'motivation_letter')).status,403,'only postulants deliver letters');
 assert.equal((await upload(f,user,'ine_front')).status,201,'personal documents keep working');
 const mine=await(await f.call('/api/espacio/documentos?category=enlaces&manage=0','GET',undefined,user)).json();
 assert.deepEqual(mine.documents.map(d=>d.category).sort(),['motivation_letter','recommendation_letter']);
 const listed=await(await f.call('/api/espacio/documentos?category=enlaces&manage=0','GET',undefined,other)).json();
 assert.equal(listed.documents.length,0,'letters stay private to their owner');
 assert.equal(f.db.prepare("SELECT count(*) n FROM commission_documents WHERE category IN ('motivation_letter','recommendation_letter')").get().n,2);
}finally{f.close();}});

test('letters are refused once the call closes, even for postulants',async()=>{const f=await fixture(base);try{
 account(f,user);
 assert.equal((await apply(f,user)).status,201);
 f.db.prepare("UPDATE membership_applications SET profile_json=json_set(profile_json,'$.enlaces',json('true')) WHERE owner_email=?").run(user);
 await consent(f,user);
 const r=await upload(f,user,'motivation_letter');assert.equal(r.status,403);assert.match((await r.json()).error,/cerrada/);
}finally{f.close();}});

test('settings refuse to open the call without the Comité agreement or the internal registry',async()=>{const f=await fixture(base);try{
 const values={...Object.fromEntries(['DATA_CONTROLLER_NAME','DATA_CONTROLLER_ADDRESS','ARCO_EMAIL','PRIVACY_NOTICE_VERSION','CONTACT_RETENTION_DAYS','COMMENTS_RETENTION_DAYS','SOCIAL_INSTAGRAM','SOCIAL_FACEBOOK','SOCIAL_X','SOCIAL_YOUTUBE','SOCIAL_WHATSAPP','MEMBERSHIP_ENABLED','MEMBERSHIP_RETENTION_DAYS','MEMBERSHIP_NOTICE_APPROVED','MEMBERSHIP_DIRECT_CONSENT','DATA_CONTROLLER_REGIME','DATA_CONTROLLER_LEGAL_BASIS','TRANSPARENCY_ADDRESS','RIGHTS_PROCEDURE'].map(k=>[k,base[k]??''])),ENLACES_ENABLED:'1',ENLACES_APPROVAL:''};
 const missing=await f.call('/api/admin/settings','PATCH',{values,expectedUpdatedAt:0});assert.equal(missing.status,400);assert.match((await missing.json()).error,/acuerdo del Comité/);
 const closedRegistry=await f.call('/api/admin/settings','PATCH',{values:{...values,MEMBERSHIP_ENABLED:'0',ENLACES_APPROVAL:'Acuerdo de prueba aislada'},expectedUpdatedAt:0});assert.equal(closedRegistry.status,400);assert.match((await closedRegistry.json()).error,/registro interno/);
 const saved=await f.call('/api/admin/settings','PATCH',{values:{...values,ENLACES_APPROVAL:'Acuerdo de prueba aislada'},expectedUpdatedAt:0});assert.equal(saved.status,200,await saved.clone().text());
 assert.equal((await f.call('/enlaces','GET',undefined,null)).status,200);
}finally{f.close();}});
