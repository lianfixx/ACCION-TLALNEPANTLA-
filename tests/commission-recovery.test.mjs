import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';
import {seedReviewedIdentityDocuments} from './helpers/identity-documents.mjs';

const config={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
const person='applicant@example.test';
const profile={participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',availability:'Viernes por la tarde',activity:'',experience:'',projects:[]};
const fields={name:'Persona de prueba',commission:'gobierno',profile,note:'Nota inicial'};

async function application(f){
 f.seedAccount(person);
 f.db.prepare('UPDATE staff_accounts SET username=? WHERE email=?').run('applicant',person);
 const html=(await(await f.call('/participacion','GET',undefined,person)).text()).replaceAll('\\"','"');
 const noticeToken=html.match(/"noticeToken":"([a-f0-9]{64})"/)[1];
 const r=await f.call('/api/incorporaciones','POST',{...fields,consent:true,adultSelfDeclared:true,noticeToken},person);
 assert.equal(r.status,201,await r.clone().text());return (await r.json()).application;
}

async function acceptApplication(f,app){
 assert.equal((await f.call('/api/admin/incorporaciones/'+app.id,'PATCH',{status:'in_review',expectedUpdatedAt:app.updatedAt})).status,200);
 const current=(await(await f.call('/api/incorporaciones/'+app.id,'GET',undefined,person)).json()).application;
 assert.equal((await f.call('/api/admin/incorporaciones/'+app.id,'PATCH',{status:'accepted',response:'Incorporación confirmada',expectedUpdatedAt:current.updatedAt})).status,200);
}

test('disabled accounts cannot join or resume a commission, including disablement at commit, but can have access removed',async()=>{
 const f=await createWorkerFixture(config);
 try{
  const app=await application(f);await acceptApplication(f,app);
  const account=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(person).id;
  await seedReviewedIdentityDocuments(f,account);
  const assignment={action:'team',commission:'gobierno',username:'applicant',role:'coordinator',active:true};
  f.db.prepare('UPDATE staff_accounts SET disabled_at=? WHERE id=?').run(Date.now(),account);
  assert.equal((await f.call('/api/espacio','POST',assignment)).status,404);
  assert.equal(f.db.prepare('SELECT count(*) n FROM commission_members').get().n,0);
  f.db.prepare('UPDATE staff_accounts SET disabled_at=NULL WHERE id=?').run(account);
  f.beforeBatch=statements=>{if(statements.some(s=>s.query.startsWith('INSERT INTO commission_members'))){f.beforeBatch=undefined;f.db.prepare('UPDATE staff_accounts SET disabled_at=? WHERE id=?').run(Date.now(),account);}};
  assert.equal((await f.call('/api/espacio','POST',assignment)).status,409);
  assert.equal(f.db.prepare('SELECT count(*) n FROM commission_members').get().n,0);
  assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='commission.team'").get().n,0);
  f.db.prepare('UPDATE staff_accounts SET disabled_at=NULL WHERE id=?').run(account);
  assert.equal((await f.call('/api/espacio','POST',assignment)).status,200);
  const membership=f.db.prepare('SELECT * FROM commission_members WHERE account_id=?').get(account);
  f.db.prepare('UPDATE staff_accounts SET disabled_at=? WHERE id=?').run(Date.now(),account);
  assert.equal((await f.call('/api/espacio','POST',{...assignment,active:false,expectedUpdatedAt:membership.updated_at})).status,200);
  const removed=f.db.prepare('SELECT * FROM commission_members WHERE account_id=?').get(account);
  assert.equal(removed.active,0);
  assert.equal((await f.call('/api/espacio','POST',{...assignment,expectedUpdatedAt:removed.updated_at})).status,404);
  assert.deepEqual(f.db.prepare('SELECT * FROM commission_members WHERE account_id=?').get(account),removed);
 }finally{f.close();}
});

test('every activity message remains accessible across stable, bounded pages without exposing another commission',async()=>{
 const f=await createWorkerFixture(config);
 try{
  f.seedAccount(person);const account=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(person).id;
  f.db.prepare("INSERT INTO commission_members(id,account_id,commission,role,active,updated_at,updated_by) VALUES(?,?,'gobierno','member',1,1,'owner')").run(crypto.randomUUID(),account);
  const cfg=await(await f.call('/api/espacio','GET',undefined,person)).json();
  assert.equal((await f.call('/api/espacio','POST',{action:'consent',version:'comisiones-2026-10-06.1',noticeToken:cfg.noticeToken,consent:true},person)).status,200);
  const created=await f.call('/api/espacio','POST',{action:'create',kind:'question',commission:'gobierno',title:'Seguimiento de la actividad',submit:true,details:{request:'Confirmar el espacio',context:'Acuerdos de planeación',deadline:'2026-12-01'}},person);
  assert.equal(created.status,201);const id=(await created.json()).id,stamp=Date.now()-1000;
  for(let n=0;n<101;n++)f.db.prepare('INSERT INTO commission_messages(id,item_id,author_id,body,created_at) VALUES(?,?,?,?,?)').run('message-'+String(n).padStart(3,'0'),id,account,n===0?'Acuerdo original':'Seguimiento '+n,stamp);
  const all=[];
  for(let page=1;page<=3;page++){
   const r=await f.call('/api/espacio/items/'+id+'?page='+page,'GET',undefined,person);assert.equal(r.status,200);
   const data=await r.json();assert.deepEqual(data.messagePagination,{page,pages:3,total:101});assert.equal(data.messages.length,page===3?1:50);
   assert.deepEqual(data.messages.map(m=>m.id),data.messages.map(m=>m.id).sort());all.push(...data.messages);
  }
  assert.equal(new Set(all.map(m=>m.id)).size,101);assert.equal(all.find(m=>m.id==='message-000').body,'Acuerdo original');
  for(const [query,page] of [['-1',1],['1.5',1],['Infinity',1],['999999',3]]){const data=await(await f.call('/api/espacio/items/'+id+'?page='+query,'GET',undefined,person)).json();assert.equal(data.messagePagination.page,page);}
  assert.equal((await f.call('/api/espacio/items/'+id+'?page=3','GET',undefined,'unrelated@example.test')).status,404);
  assert.equal((await f.call('/api/espacio/items/'+id,'PATCH',{action:'message',body:'Acuerdo nuevo'},person)).status,200);
  const latest=await(await f.call('/api/espacio/items/'+id+'?page=1','GET',undefined,person)).json();assert.equal(latest.messagePagination.total,102);assert.equal(latest.messages.at(-1).body,'Acuerdo nuevo');
 }finally{f.close();}
});

test('an incorporation correction can resume only with a reviewed current version and still rejects a second concurrent change',async()=>{
 const f=await createWorkerFixture(config);
 try{
  const app=await application(f),draft={...fields,note:'Corrección preparada por la persona',profile:{...profile,availability:'Sábado por la mañana'}};
  assert.equal((await f.call('/api/admin/incorporaciones/'+app.id,'PATCH',{status:'in_review',response:'Revisa tu disponibilidad',expectedUpdatedAt:app.updatedAt})).status,200);
  const path='/api/incorporaciones/'+app.id;
  assert.equal((await f.call(path,'PATCH',{...draft,action:'edit',expectedUpdatedAt:app.updatedAt},person)).status,409);
  const review=await(await f.call(path,'GET',undefined,person)).json();assert.ok(review.events.some(event=>event.body==='Revisa tu disponibilidad'));assert.equal(review.application.note,'Nota inicial');
  // A further administrative response still invalidates the version the person just reviewed.
  assert.equal((await f.call('/api/admin/incorporaciones/'+app.id,'PATCH',{status:'in_review',response:'Segunda aclaración',expectedUpdatedAt:review.application.updatedAt})).status,200);
  assert.equal((await f.call(path,'PATCH',{...draft,action:'edit',expectedUpdatedAt:review.application.updatedAt},person)).status,409);
  const fresh=await(await f.call(path,'GET',undefined,person)).json();
  assert.equal((await f.call(path,'PATCH',{...draft,action:'edit',expectedUpdatedAt:fresh.application.updatedAt},person)).status,200);
  const result=await(await f.call(path,'GET',undefined,person)).json();assert.equal(result.application.note,draft.note);assert.equal(JSON.parse(result.application.profileJson).availability,draft.profile.availability);assert.ok(result.events.some(event=>event.body==='Segunda aclaración'));
 }finally{f.close();}
});
