import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerFixture } from './helpers/worker-fixture.mjs';
const config={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'30',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada, sin uso productivo.',PRIVACY_NOTICE_VERSION:'registro-test-1',RATE_LIMIT_SECRET:'q'.repeat(40)};
const person='person@example.test';

test('a party notice without its mandatory particulars stays closed even when opening is requested', async () => {
 const f=await createWorkerFixture({...config,DATA_CONTROLLER_REGIME:'party',DATA_CONTROLLER_LEGAL_BASIS:'',TRANSPARENCY_ADDRESS:''});
 try {
  const html=await(await f.call('/privacidad/registro','GET',undefined,null)).text();
  assert.match(html,/Responsable de prueba/);
  assert.match(html,/La recepción de solicitudes está cerrada/);
  assert.doesNotMatch(html,/Fundamento de sus atribuciones para este tratamiento: pendiente/);
  assert.doesNotMatch(html,/Domicilio de la Unidad de Transparencia: pendiente/);
  assert.equal((await f.call('/api/incorporaciones','POST',await payload(f),person)).status,503);
  assert.equal(f.db.prepare('SELECT count(*) n FROM membership_applications').get().n,0);
 } finally { f.close(); }
});

async function payload(f,extra={}){const html=(await(await f.call('/participacion','GET',undefined,null)).text()).replaceAll('\\"','"');const token=html.match(/"noticeToken":"([a-f0-9]{64})"/);assert.ok(token,'public form includes the current notice fingerprint');return{name:'Persona de prueba',commission:'gobierno',profile:{participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',activity:'',experience:'',availability:'Sábados por la mañana',projects:[]},note:'Nota de prueba',consent:true,adultSelfDeclared:true,noticeToken:token[1],...extra};}
async function create(f,actor=person){const r=await f.call('/api/incorporaciones','POST',await payload(f),actor);assert.equal(r.status,201,await r.clone().text());return(await r.json()).application;}
async function own(f,id,actor=person){return(await(await f.call(`/api/incorporaciones/${id}`,'GET',undefined,actor)).json()).application;}

test('internal registration validates consent, uses server identity, records a complete notice and avoids duplicates',async()=>{
 const f=await createWorkerFixture(config);try{
 const body=await payload(f);assert.equal((await f.call('/api/incorporaciones','POST',body,null)).status,401);
 for(const extra of [{consent:false},{adultSelfDeclared:false},{commission:'inventada'},{name:'X'},{note:'n'.repeat(601)}])assert.equal((await f.call('/api/incorporaciones','POST',{...body,...extra},person)).status,400);
 assert.equal((await f.call('/api/incorporaciones','POST',{...body,noticeToken:'stale'},person)).status,409);
 const r=await f.call('/api/incorporaciones','POST',{...body,ownerEmail:'other@example.test',status:'accepted'},person);assert.equal(r.status,201);assert.equal(r.headers.get('cache-control'),'private, no-store');
 const item=(await r.json()).application;assert.equal(item.ownerEmail,person);assert.equal(item.status,'submitted');assert.match(item.referenceCode,/^APJ-[A-F0-9]{12}$/);
 const repeat=await f.call('/api/incorporaciones','POST',{...body,name:'Intento duplicado'},person);assert.equal(repeat.status,200);assert.equal((await repeat.json()).application.id,item.id);
 assert.equal(f.db.prepare('SELECT count(*) n FROM membership_applications').get().n,1);assert.equal(f.db.prepare('SELECT count(*) n FROM membership_events').get().n,1);
 const record=f.db.prepare('SELECT * FROM membership_applications').get();assert.equal(record.adult_self_declared,1);assert.match(record.consent_text,/consiento expresamente/);assert.equal(JSON.parse(record.notice_snapshot).sections.length,7);assert.match(record.notice_snapshot,/representante/);
 assert.equal(f.db.prepare('SELECT count(*) n FROM user_roles').get().n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM audit_logs').get().n,0);
 const detail=await(await f.call(`/api/incorporaciones/${item.id}`,'GET',undefined,person)).json();assert.match(detail.proof.snapshot,/Acceso y comunicaciones/);assert.equal(detail.events[0].actorEmail,undefined);
 }finally{f.close();}
});

test('privacy defaults stay closed and old settings rows remain readable',async()=>{
 const f=await createWorkerFixture();try{
 const body=await payload(f);assert.equal((await f.call('/api/incorporaciones','POST',body,person)).status,503);
 const old={DATA_CONTROLLER_NAME:'Anterior',DATA_CONTROLLER_ADDRESS:'Domicilio',ARCO_EMAIL:'privacy@example.test',PRIVACY_NOTICE_VERSION:'old',CONTACT_RETENTION_DAYS:'30',COMMENTS_RETENTION_DAYS:'30',SOCIAL_INSTAGRAM:'',SOCIAL_FACEBOOK:'',SOCIAL_X:'',SOCIAL_YOUTUBE:'',SOCIAL_WHATSAPP:''};
 f.db.prepare("INSERT INTO site_settings (id,values_json,updated_at,updated_by) VALUES ('public',?,1,'owner@example.test')").run(JSON.stringify(old));
 const html=await(await f.call('/admin?section=configuracion')).text();assert.match(html,/Anterior/);assert.match(html,/Recepción de incorporaciones/);assert.doesNotMatch(html,/Configuración de datos pendiente/);
 assert.equal((await f.call('/api/admin/settings','PATCH',{values:{...old,MEMBERSHIP_ENABLED:'1'},expectedUpdatedAt:1})).status,400);
 assert.equal((await f.call('/api/incorporaciones','POST',body,person)).status,503);
 }finally{f.close();}
});

test('an applicant cannot read or modify another record, and editors or moderators cannot administer it',async()=>{
 const f=await createWorkerFixture(config);try{
 const item=await create(f);
 for(const email of ['editor@example.test','moderator@example.test'])f.db.prepare('INSERT INTO user_roles (email,role,created_at,created_by) VALUES (?,?,1,?)').run(email,email.startsWith('editor')?'editor':'moderator','owner@example.test');
 assert.equal((await f.call('/api/incorporaciones','GET',undefined,null)).status,401);
 const list=await(await f.call('/api/incorporaciones','GET',undefined,'other@example.test')).json();assert.deepEqual(list.applications,[]);
 for(const method of ['GET','PATCH'])assert.equal((await f.call(`/api/incorporaciones/${item.id}`,method,method==='PATCH'?{action:'withdraw',expectedUpdatedAt:item.updatedAt}:undefined,'other@example.test')).status,404);
 for(const actor of [person,'editor@example.test','moderator@example.test',null]){
 assert.equal((await f.call(`/api/admin/incorporaciones/${item.id}`,'GET',undefined,actor)).status,403);
 assert.equal((await f.call(`/api/admin/incorporaciones/${item.id}`,'PATCH',{status:'in_review',expectedUpdatedAt:item.updatedAt},actor)).status,403);
 }
 const adminPage=await f.call('/admin?section=incorporaciones');assert.equal(adminPage.headers.get('cache-control'),'private, no-store');assert.match(await adminPage.text(),/Persona de prueba/);
 }finally{f.close();}
});

test('review, private notes, visible responses and internal acceptance persist without adding roles',async()=>{
 const f=await createWorkerFixture(config);try{
 const item=await create(f),path=`/api/admin/incorporaciones/${item.id}`;
 assert.equal((await f.call(path,'PATCH',{status:'accepted',expectedUpdatedAt:item.updatedAt})).status,409);
 assert.equal((await f.call(path,'PATCH',{status:'in_review',response:'Recibimos la documentación interna.',note:'Nota privada de administración',expectedUpdatedAt:item.updatedAt})).status,200);
 const current=await own(f,item.id);assert.equal(current.status,'in_review');
 const detail=await(await f.call(`/api/incorporaciones/${item.id}`,'GET',undefined,person)).json();assert.equal(detail.events.length,3);assert.doesNotMatch(JSON.stringify(detail),/Nota privada|owner@example.test/);
 const admin=await(await f.call(path)).json();assert.equal(admin.events.length,4);assert.match(JSON.stringify(admin),/Nota privada de administración/);
 assert.equal((await f.call(path,'PATCH',{status:'accepted',response:'Incorporación registrada.',expectedUpdatedAt:current.updatedAt})).status,200);
 assert.equal((await own(f,item.id)).status,'accepted');assert.equal(f.db.prepare('SELECT count(*) n FROM user_roles').get().n,0);
 assert.equal((await f.call(path,'PATCH',{status:'closed',expectedUpdatedAt:(await own(f,item.id)).updatedAt})).status,400);
 assert.equal(f.db.prepare('SELECT count(*) n FROM audit_logs').get().n,0);
 }finally{f.close();}
});

test('corrections reject unchanged data, stale versions and changed notices without extending retention',async()=>{
 const f=await createWorkerFixture(config);try{
 const item=await create(f),path=`/api/incorporaciones/${item.id}`;
 const body={action:'edit',name:item.name,commission:item.commission,note:item.note,profile:JSON.parse(item.profileJson),expectedUpdatedAt:item.updatedAt};
 assert.equal((await f.call(path,'PATCH',body,person)).status,400);
 assert.equal((await f.call(path,'PATCH',{...body,name:'Nombre corregido'},person)).status,200);
 const updated=await own(f,item.id);assert.equal(updated.name,'Nombre corregido');assert.equal(updated.retentionUntil,item.retentionUntil);
 const count=f.db.prepare('SELECT count(*) n FROM membership_events').get().n;
 assert.equal((await f.call(path,'PATCH',{...body,name:'Otra corrección'},person)).status,409);assert.equal(f.db.prepare('SELECT count(*) n FROM membership_events').get().n,count);
 const settings={...config,CONTACT_RETENTION_DAYS:'',COMMENTS_RETENTION_DAYS:'',SOCIAL_INSTAGRAM:'',SOCIAL_FACEBOOK:'',SOCIAL_X:'',SOCIAL_YOUTUBE:'',SOCIAL_WHATSAPP:'',PRIVACY_NOTICE_VERSION:'registro-test-2'};
 assert.equal((await f.call('/api/admin/settings','PATCH',{values:settings,expectedUpdatedAt:0})).status,200);
 assert.equal((await f.call(path,'PATCH',{...body,name:'Nuevo aviso',expectedUpdatedAt:updated.updatedAt},person)).status,409);
 assert.equal(f.db.prepare('SELECT count(*) n FROM membership_events').get().n,count);
 }finally{f.close();}
});

test('closing reception preserves consultation and withdrawal; withdrawn records cannot be revived',async()=>{
 const f=await createWorkerFixture(config);try{
 const item=await create(f);const settings={...config,MEMBERSHIP_ENABLED:'0',CONTACT_RETENTION_DAYS:'',COMMENTS_RETENTION_DAYS:'',SOCIAL_INSTAGRAM:'',SOCIAL_FACEBOOK:'',SOCIAL_X:'',SOCIAL_YOUTUBE:'',SOCIAL_WHATSAPP:''};
 assert.equal((await f.call('/api/admin/settings','PATCH',{values:settings,expectedUpdatedAt:0})).status,200);
 assert.equal((await f.call('/api/incorporaciones','GET',undefined,person)).status,200);
 assert.equal((await f.call(`/api/incorporaciones/${item.id}`,'PATCH',{action:'edit',name:'Cambio',commission:'cultura',expectedUpdatedAt:item.updatedAt},person)).status,503);
 assert.equal((await f.call(`/api/incorporaciones/${item.id}`,'PATCH',{action:'withdraw',expectedUpdatedAt:item.updatedAt},person)).status,200);
 const current=await own(f,item.id);assert.equal(current.status,'withdrawn');
 assert.equal((await f.call(`/api/admin/incorporaciones/${item.id}`,'PATCH',{status:'in_review',expectedUpdatedAt:current.updatedAt})).status,409);
 }finally{f.close();}
});

test('a revoked administrator or concurrent withdrawal cannot change a record or insert orphan history',async()=>{
 const f=await createWorkerFixture(config);try{
 const item=await create(f),actor='delegate@example.test';f.db.prepare('INSERT INTO user_roles (email,role,created_at,created_by) VALUES (?,\'admin\',1,\'owner@example.test\')').run(actor);
 f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare('UPDATE user_roles SET revoked_at=? WHERE email=?').run(Date.now(),actor);};
 assert.equal((await f.call(`/api/admin/incorporaciones/${item.id}`,'PATCH',{status:'in_review',note:'No debe persistir',expectedUpdatedAt:item.updatedAt},actor)).status,409);
 assert.equal(f.db.prepare('SELECT count(*) n FROM membership_events').get().n,1);
 // Same timestamp simulates a collision: events must depend on changes(), not EXISTS(updated_at).
 f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare("UPDATE membership_applications SET status='withdrawn',updated_at=? WHERE id=?").run(item.updatedAt+1,item.id);};
 assert.equal((await f.call(`/api/admin/incorporaciones/${item.id}`,'PATCH',{status:'in_review',note:'No debe persistir',expectedUpdatedAt:item.updatedAt})).status,409);
 assert.equal(f.db.prepare('SELECT count(*) n FROM membership_events').get().n,1);
 }finally{f.close();}
});

for(const operation of ['create','edit','withdraw','review'])for(const invalidation of ['session revoked','account disabled']){
 test(`${operation} cannot write private data or history when its ${invalidation} before commit`,async()=>{
  const f=await createWorkerFixture(config);try{
   const item=await create(f),actor=operation==='review'?'owner@example.test':person;
   const requestBody=operation==='create'?await payload(f):operation==='edit'
    ?{action:'edit',name:item.name,commission:item.commission,note:'Este cambio no debe guardarse.',profile:JSON.parse(item.profileJson),expectedUpdatedAt:item.updatedAt}
    :operation==='withdraw'?{action:'withdraw',expectedUpdatedAt:item.updatedAt}
    :{status:'in_review',response:'Esta respuesta no debe guardarse.',note:'Esta nota tampoco.',expectedUpdatedAt:item.updatedAt};
   // Creating a replacement normally purges this expired record and its history.
   // Losing authorization must prevent that deletion as well as the new insert.
   if(operation==='create')f.db.prepare('UPDATE membership_applications SET retention_until=1 WHERE id=?').run(item.id);
   f.seedAccount(actor);
   const account=f.db.prepare('SELECT id,credential_version FROM staff_accounts WHERE email=?').get(actor);
   const activeSession=f.db.prepare('SELECT token_hash FROM staff_sessions WHERE account_id=?').get(account.id).token_hash;
   // A different valid session must not authorize the revoked request's cookie.
   const now=Date.now(),otherSession='f'.repeat(64);
   f.db.prepare('INSERT INTO staff_sessions(token_hash,account_id,credential_version,created_at,last_seen_at,expires_at) VALUES(?,?,?,?,?,?)').run(otherSession,account.id,account.credential_version,now,now,now+3600000);
   const beforeRecords=f.db.prepare('SELECT * FROM membership_applications ORDER BY id').all();
   const beforeHistory=f.db.prepare('SELECT * FROM membership_events ORDER BY id').all();
   let reachedCommit=false;
   f.beforeBatch=()=>{
    f.beforeBatch=undefined;reachedCommit=true;
    if(invalidation==='session revoked')f.db.prepare('DELETE FROM staff_sessions WHERE token_hash=?').run(activeSession);
    else f.db.prepare('UPDATE staff_accounts SET disabled_at=? WHERE id=?').run(Date.now(),account.id);
   };
   const path=operation==='create'?'/api/incorporaciones':`/api/${operation==='review'?'admin/':''}incorporaciones/${item.id}`;
   const response=await f.call(path,operation==='create'?'POST':'PATCH',requestBody,actor);
   assert.ok(reachedCommit,'authorization was removed after the initial access check');
   assert.equal(response.status,409,await response.clone().text());
   assert.equal((await response.json()).application,undefined,'a failed mutation must not return private records');
   assert.deepEqual(f.db.prepare('SELECT * FROM membership_applications ORDER BY id').all(),beforeRecords);
   assert.deepEqual(f.db.prepare('SELECT * FROM membership_events ORDER BY id').all(),beforeHistory);
   assert.ok(f.db.prepare('SELECT 1 FROM staff_sessions WHERE token_hash=?').get(otherSession),'an unrelated session remains present');
  }finally{f.close();}
 });
}

test('membership history is paginated and all expired private data is purged in cascade',async()=>{
 const f=await createWorkerFixture(config);try{
 const item=await create(f);const insert=f.db.prepare('INSERT INTO membership_events (id,application_id,kind,body,actor_type,actor_email,created_at) VALUES (?,?,\'response\',?,\'admin\',\'owner@example.test\',?)');
 for(let i=0;i<105;i++)insert.run(`evt-${i}`,item.id,`Respuesta ${i}`,item.createdAt+i+1);
 const first=await(await f.call(`/api/incorporaciones/${item.id}`,'GET',undefined,person)).json();assert.equal(first.events.length,50);assert.equal(first.pagination.pages,3);
 const last=await(await f.call(`/api/incorporaciones/${item.id}?page=3`,'GET',undefined,person)).json();assert.equal(last.events.length,6);assert.equal(last.events[0].kind,'submitted');
 f.db.prepare('UPDATE membership_applications SET retention_until=1 WHERE id=?').run(item.id);
 assert.equal((await f.call(`/api/incorporaciones/${item.id}`,'GET',undefined,person)).status,404);assert.equal((await f.call(`/api/admin/incorporaciones/${item.id}`)).status,404);
 const list=await(await f.call('/api/incorporaciones','GET',undefined,person)).json();assert.equal(list.applications.length,0);
 const admin=await(await f.call('/admin?section=incorporaciones')).text();assert.doesNotMatch(admin,/Persona de prueba/);
 assert.equal((await f.call('/api/admin/maintenance/retention','POST',{confirmation:'PURGAR_VENCIDOS'})).status,200);
 assert.equal(f.db.prepare('SELECT count(*) n FROM membership_applications').get().n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM membership_events').get().n,0);
 }finally{f.close();}
});

test('coordination requires three distinct projects and never persists unrequested identity fields',async()=>{
 const f=await createWorkerFixture(config);try{
  const body=await payload(f);
  const project={title:'Foro abierto',proposal:'Organizar un foro con preguntas y acuerdos para los participantes.',firstStep:'Revisar el tema y confirmar al responsable.',needs:'Un espacio y material disponible.',timeframe:'Seis semanas',result:'Un programa y una memoria del encuentro.'};
  const profile={...body.profile,participation:'coordinate',experience:'He organizado proyectos escolares.',projects:[project,{...project,title:'Memoria de actividades'},{...project,title:'Agenda de seguimiento'}]};
  for(const invalid of [{...profile,projects:[]},{...profile,projects:[project]},{...profile,projects:[project,project,project]},{...profile,projects:[project,{...project,title:'Otro proyecto'}, {...project,title:'Tercer proyecto',proposal:''}]}]) {
   const bad=await f.call('/api/incorporaciones','POST',{...body,profile:invalid},person);assert.equal(bad.status,400);
  }
  const result=await f.call('/api/incorporaciones','POST',{...body,profile:{...profile,ine:'NEVER-STORE',address:'NEVER-STORE'},ine:'NEVER-STORE',address:'NEVER-STORE'},person);
  assert.equal(result.status,201,await result.clone().text());
  const application=(await result.json()).application,stored=JSON.parse(application.profileJson);
  assert.equal(stored.projects.length,3);assert.equal(stored.state,'Estado de México');assert.doesNotMatch(application.profileJson,/NEVER-STORE/);
  assert.equal((await f.call(`/api/incorporaciones/${application.id}`,'GET',undefined,'stranger@example.test')).status,404);
  const panel=await(await f.call('/admin?section=incorporaciones')).text();assert.match(panel,/Memoria de actividades/);assert.match(panel,/Sábados por la mañana/);
  const corrected={...stored,projects:stored.projects.map((p,i)=>i===0?{...p,title:'Foro revisado'}:p)};
  const edited=await f.call(`/api/incorporaciones/${application.id}`,'PATCH',{action:'edit',name:application.name,commission:application.commission,note:application.note,profile:corrected,expectedUpdatedAt:application.updatedAt},person);
  assert.equal(edited.status,200);assert.match((await edited.json()).application.profileJson,/Foro revisado/);
 }finally{f.close();}
});

test('legacy applications stay readable and explain consent changes before demanding a new profile',async()=>{
 const f=await createWorkerFixture(config);try{
  const item=await create(f);
  f.db.prepare("UPDATE membership_applications SET profile_json='{}',notice_snapshot='previous-notice' WHERE id=?").run(item.id);
  const detail=await f.call(`/api/incorporaciones/${item.id}`,'GET',undefined,person);assert.equal(detail.status,200);assert.equal((await detail.json()).application.profileJson,'{}');
  const response=await f.call(`/api/incorporaciones/${item.id}`,'PATCH',{action:'edit',name:'Nombre corregido',commission:item.commission,note:'',expectedUpdatedAt:item.updatedAt},person);
  assert.equal(response.status,409);assert.match((await response.json()).error,/El aviso cambió/);
 }finally{f.close();}
});
