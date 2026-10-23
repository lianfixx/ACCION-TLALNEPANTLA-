import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';
import {seedReviewedIdentityDocuments,reviewIdentityDocument} from './helpers/identity-documents.mjs';
const config={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
const user='member@example.test',other='other@example.test';
function bucket(){const files=new Map();return{files,failDelete:false,async put(k,v){files.set(k,new Uint8Array(v));return{};},async get(k){return files.has(k)?{body:new Response(files.get(k)).body}:null;},async delete(k){if(this.failDelete)throw new Error('Unavailable');for(const id of Array.isArray(k)?k:[k])files.delete(id);}};}
async function fixture(){const b=bucket(),f=await createWorkerFixture({...config,BUCKET:b});f.bucket=b;return f;}
function seed(f,email=user,commission='gobierno',role='member'){f.seedAccount(email);const a=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email);f.db.prepare('UPDATE staff_accounts SET username=? WHERE id=?').run(email.split('@')[0],a.id);f.db.prepare('INSERT INTO commission_members(id,account_id,commission,role,active,updated_at,updated_by) VALUES(?,?,?,?,1,1,?)').run(crypto.randomUUID(),a.id,commission,role,'owner');return a.id;}
async function accept(f,email=user){const x=await(await f.call('/api/espacio','GET',undefined,email)).json();const r=await f.call('/api/espacio','POST',{action:'consent',version:'comisiones-2026-10-06.1',noticeToken:x.noticeToken,consent:true},email);assert.equal(r.status,200,await r.clone().text());}
const event=(extra={})=>({action:'create',kind:'event',commission:'gobierno',title:'Reunión de planeación',venue:'Sala del Comité',startsAt:Date.UTC(2026,11,5,16),endsAt:Date.UTC(2026,11,5,18),submit:true,details:{objective:'Revisar proyectos',audience:'Equipo de la comisión',responsible:'Responsables asignados',program:'Revisión y acuerdos',resources:'Material de trabajo',budget:'No requiere gasto',permissions:'Solicitar espacio',result:'Acuerdos registrados'},...extra});
async function create(f,email=user,extra={}){const r=await f.call('/api/espacio','POST',event(extra),email);assert.equal(r.status,201,await r.clone().text());return (await r.json()).id;}
async function item(f,id,email=user){const r=await f.call('/api/espacio/items/'+id,'GET',undefined,email);assert.equal(r.status,200,await r.clone().text());return (await r.json()).item;}
async function upload(f,email=user,category='ine_front',id='',body='%PDF-1.4\n%%EOF',headers={}){return f.callRaw('/api/espacio/documentos?category='+category+(id?'&itemId='+id:''),body,email,{'content-type':'application/pdf','x-file-name':encodeURIComponent('Archivo de prueba.pdf'),...headers});}
async function registerPayload(f,extra={}){const html=(await(await f.call('/crear-cuenta','GET',undefined,null)).text()).replaceAll('\\"','"');const token=html.match(/"noticeToken":"([a-f0-9]{64})"/);assert.ok(token);return{name:'Cuenta de prueba',email:'new@example.test',username:'new.account',password:'una frase de prueba suficientemente larga',adult:true,consent:true,noticeToken:token[1],...extra};}

test('private downloads recheck session, credentials, account and document after waiting for storage',async()=>{
 for(const change of ['session','password','disabled','expiry','removed']){const f=await fixture();try{
  const account=seed(f);await accept(f);const id=(await(await upload(f)).json()).id;
  const originalGet=f.bucket.get.bind(f.bucket);let read=false;
  f.bucket.get=async key=>{const object=await originalGet(key);read=true;
   if(change==='session')f.db.prepare('DELETE FROM staff_sessions WHERE account_id=?').run(account);
   if(change==='password')f.db.prepare('UPDATE staff_accounts SET credential_version=credential_version+1 WHERE id=?').run(account);
   if(change==='disabled')f.db.prepare('UPDATE staff_accounts SET disabled_at=? WHERE id=?').run(Date.now(),account);
   if(change==='expiry')f.db.prepare('UPDATE commission_documents SET retention_until=1 WHERE id=?').run(id);
   if(change==='removed')f.db.prepare("UPDATE commission_documents SET status='removed',retention_until=1 WHERE id=?").run(id);
   return object;
  };
  const response=await f.call('/api/espacio/documentos/'+id,'GET',undefined,user);
  assert.equal(read,true);assert.equal(response.status,404,change);assert.doesNotMatch(await response.text(),/%PDF/);
 }finally{f.close();}}
});

test('an in-flight private download loses revoked administrative and commission access',async()=>{
 for(const change of ['admin','commission','draft-owner']){const f=await fixture();try{
  const account=seed(f);seed(f,other);await accept(f);
  const itemId=change==='admin'?'':await create(f,user,{submit:change!=='draft-owner'});
  const id=(await(await upload(f,user,itemId?'evidence':'ine_front',itemId)).json()).id;
  const reviewer='reviewer@example.test';f.seedAccount(reviewer);
  f.db.prepare("INSERT INTO user_roles(email,role,created_at,created_by) VALUES(?,'admin',1,'owner')").run(reviewer);
  const next=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(other).id;
  const originalGet=f.bucket.get.bind(f.bucket);let read=false;
  f.bucket.get=async key=>{const object=await originalGet(key);read=true;
   if(change==='admin')f.db.prepare('UPDATE user_roles SET revoked_at=1 WHERE email=?').run(reviewer);
   if(change==='commission')f.db.prepare('UPDATE commission_members SET active=0 WHERE account_id=?').run(account);
   if(change==='draft-owner')f.db.prepare('UPDATE commission_items SET owner_id=? WHERE id=?').run(next,itemId);
   return object;
  };
  const response=await f.call('/api/espacio/documentos/'+id,'GET',undefined,change==='admin'?reviewer:user);
  assert.equal(read,true);assert.equal(response.status,404,change);assert.doesNotMatch(await response.text(),/%PDF/);
 }finally{f.close();}}
});

test('self registration reserves privileged identities, retains consent and creates an unprivileged password account',async()=>{const f=await fixture();try{
 for(const email of ['owner@example.test','reserved@example.test']){if(email.startsWith('reserved'))f.db.prepare("INSERT INTO user_roles(email,role,created_at,created_by,revoked_at) VALUES(?,'admin',1,'owner',2)").run(email);const r=await f.call('/api/registro-cuenta','POST',await registerPayload(f,{email}),null);assert.equal(r.status,409);}
 const payload=await registerPayload(f),r=await f.call('/api/registro-cuenta','POST',payload,null);assert.equal(r.status,201,await r.clone().text());assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
 const a=f.db.prepare('SELECT * FROM staff_accounts WHERE email=?').get(payload.email);assert.equal(a.self_registered,1);assert.match(a.registration_notice,/nombre/);assert.ok(a.registration_consent_at);assert.notEqual(a.password_hash,payload.password);assert.equal(f.db.prepare('SELECT count(*) n FROM user_roles WHERE email=?').get(payload.email).n,0);
 assert.equal((await f.call('/api/registro-cuenta','POST',payload,null)).status,409);
 const cookie=r.headers.get('set-cookie').split(';')[0];const view=await f.call('/api/espacio','GET',undefined,null,{cookie});assert.equal((await view.json()).actor.admin,false);
 const login=await f.call('/api/admin/access/login','POST',{username:payload.username,password:payload.password},null);assert.equal(login.status,200);assert.equal((await login.json()).redirect,'/mi-comision');
 }finally{f.close();}});

test('commission work requires active membership and specific consent; drafts and commissions remain isolated',async()=>{const f=await fixture();try{seed(f);seed(f,other,'cultura');assert.equal((await f.call('/api/espacio','POST',event(),user)).status,400);await accept(f);const id=await create(f);assert.equal((await f.call('/api/espacio/items/'+id,'GET',undefined,other)).status,404);assert.equal((await f.call('/api/espacio/items/'+id,'PATCH',{action:'status',status:'approved',expectedUpdatedAt:(await item(f,id)).updated_at},user)).status,403);
 const draft=await create(f,user,{submit:false});seed(f,'colleague@example.test');assert.equal((await f.call('/api/espacio/items/'+draft,'GET',undefined,'colleague@example.test')).status,404);
 const list=await(await f.call('/api/espacio','GET',undefined,other)).json();assert.equal(list.items.length,0);
 }finally{f.close();}});

test('event approval checks venue conflicts atomically, adjustments invalidate space approval and stale edits fail',async()=>{const f=await fixture();try{seed(f);await accept(f);const a=await create(f),b=await create(f),first=await item(f,a);
 let r=await f.call('/api/espacio/items/'+a,'PATCH',{action:'status',status:'approved',note:'Espacio autorizado',spaceConfirmed:true,expectedUpdatedAt:first.updated_at});assert.equal(r.status,200,await r.clone().text());
 const second=await item(f,b);r=await f.call('/api/espacio/items/'+b,'PATCH',{action:'status',status:'approved',note:'Confirma sala',spaceConfirmed:true,expectedUpdatedAt:second.updated_at});assert.equal(r.status,409);
 const current=await item(f,a);assert.equal(current.space_confirmed,1);r=await f.call('/api/espacio/items/'+a,'PATCH',{action:'status',status:'changes',note:'Ajustar el horario',expectedUpdatedAt:current.updated_at});assert.equal(r.status,200);assert.equal((await item(f,a)).space_confirmed,0);
 assert.equal((await f.call('/api/espacio/items/'+a,'PATCH',{...event(),action:'edit',expectedUpdatedAt:first.updated_at},user)).status,409);
 }finally{f.close();}});

test('private identity documents cannot be listed or downloaded by another member or coordinator',async()=>{const f=await fixture();try{const account=seed(f);seed(f,other,'gobierno','coordinator');await accept(f);const r=await upload(f);assert.equal(r.status,201,await r.clone().text());const id=(await r.json()).id;
 assert.equal((await f.call('/api/espacio/documentos/'+id,'GET',undefined,other)).status,404);assert.equal((await f.call('/api/espacio/documentos/'+id,'GET',undefined,null)).status,401);const list=await(await f.call('/api/espacio/documentos','GET',undefined,other)).json();assert.equal(list.documents.length,0);
 const download=await f.call('/api/espacio/documentos/'+id,'GET',undefined,user);assert.equal(download.status,200);assert.match(download.headers.get('content-disposition'),/^attachment/);assert.equal(download.headers.get('cache-control'),'private, no-store');assert.match(download.headers.get('content-security-policy'),/^sandbox/);
 assert.equal((await f.call('/api/espacio/documentos/'+id,'GET')).status,200);assert.equal(f.db.prepare('SELECT owner_id FROM commission_documents').get().owner_id,account);
 }finally{f.close();}});

test('uploads reject false MIME and streamed excess size and clean up after permission revocation',async()=>{const f=await fixture();try{seed(f);await accept(f);assert.equal((await upload(f,user,'ine_front','','not a pdf')).status,415);assert.equal((await upload(f,user,'ine_front','',new Uint8Array(5*1024*1024+1),{'content-length':'20'})).status,413);assert.equal(f.bucket.files.size,0);
 f.beforeBatch=statements=>{if(statements.some(s=>s.query.startsWith('UPDATE commission_documents'))){f.beforeBatch=undefined;f.db.prepare('DELETE FROM staff_sessions WHERE account_id=(SELECT id FROM staff_accounts WHERE email=?)').run(user);}};
 assert.equal((await upload(f)).status,409);assert.equal(f.bucket.files.size,0);assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents').get().n,0);
 }finally{f.close();}});

test('an archived work item rejects an upload already in progress and expired files are hidden during storage failure',async()=>{const f=await fixture();try{seed(f);await accept(f);const id=await create(f);f.beforeBatch=statements=>{if(statements.some(s=>s.query.startsWith('UPDATE commission_documents'))){f.beforeBatch=undefined;f.db.prepare("UPDATE commission_items SET status='archived' WHERE id=?").run(id);}};assert.equal((await upload(f,user,'evidence',id)).status,409);assert.equal(f.bucket.files.size,0);
 const r=await upload(f),doc=(await r.json()).id;f.db.prepare('UPDATE commission_documents SET retention_until=1 WHERE id=?').run(doc);f.bucket.failDelete=true;await f.scheduled(Date.now());assert.equal(f.bucket.files.size,1);assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents').get().n,1);assert.equal((await f.call('/api/espacio/documentos/'+doc,'GET',undefined,user)).status,404);f.bucket.failDelete=false;await f.scheduled(Date.now());assert.equal(f.bucket.files.size,0);assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents').get().n,0);
 }finally{f.close();}});

test('affiliation evidence and a checked document never automatically confirm official affiliation',async()=>{const f=await fixture();try{const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);const r=await upload(f,user,'affiliation');assert.equal(r.status,201);const queued=f.db.prepare('SELECT * FROM commission_affiliations').get();assert.equal((await f.call('/api/espacio','POST',{action:'affiliation',folio:'PAN-PRUEBA',expectedUpdatedAt:queued.updated_at},user)).status,200);
 let record=f.db.prepare('SELECT * FROM commission_affiliations').get();assert.equal(record.status,'reported');assert.equal((await f.call('/api/espacio','POST',{action:'review-affiliation',accountId:record.account_id,status:'confirmed',note:'Revisado',source:'',expectedUpdatedAt:record.updated_at})).status,400);
 assert.equal((await f.call('/api/espacio','POST',{action:'review-affiliation',accountId:record.account_id,documentId:f.db.prepare("SELECT id FROM commission_documents WHERE category='affiliation'").get().id,status:'confirmed',note:'Comprobación realizada',source:'Referencia institucional de prueba',expectedUpdatedAt:record.updated_at})).status,200);record=f.db.prepare('SELECT * FROM commission_affiliations').get();assert.equal(record.status,'confirmed');assert.ok(record.verified_at);
 f.db.prepare('UPDATE commission_affiliations SET retention_until=1').run();assert.equal((await f.call('/api/espacio','POST',{action:'affiliation',folio:'NUEVO-FOLIO',expectedUpdatedAt:0},user)).status,200);assert.equal(f.db.prepare('SELECT status FROM commission_affiliations').get().status,'reported');
 }finally{f.close();}});

test('an affiliation document alone reaches the administrative queue and its commission without a second submission',async()=>{const f=await fixture();try{
 const account=seed(f);seed(f,other,'cultura');await accept(f);await seedReviewedIdentityDocuments(f,account);const r=await upload(f,user,'affiliation');assert.equal(r.status,201,await r.clone().text());const id=(await r.json()).id;
 for(const path of ['/api/espacio?manage=1','/api/espacio?manage=1&commission=gobierno']){const response=await f.call(path);assert.equal(response.status,200);const data=await response.json();assert.equal(data.affiliationTotal,1);assert.equal(data.affiliations.length,1);assert.equal(data.affiliations[0].account_id,account);assert.equal(data.affiliations[0].status,'reported');assert.equal(data.affiliations[0].folio,'');assert.equal(data.affiliations[0].verified_at,null);}
 const different=await(await f.call('/api/espacio?manage=1&commission=cultura')).json();assert.equal(different.affiliationTotal,0);assert.deepEqual(different.affiliations,[]);
 const own=await(await f.call('/api/espacio','GET',undefined,user)).json();assert.equal(own.affiliations.length,1);assert.equal(own.affiliations[0].status,'reported');
 const documents=await(await f.call('/api/espacio/documentos?manage=1&category=affiliation&accountId='+account)).json();assert.equal(documents.documents.length,1);assert.equal(documents.documents[0].id,id);assert.equal(documents.documents[0].status,'received');assert.equal((await f.call('/api/espacio/documentos/'+id,'GET',undefined,other)).status,404);
 assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='affiliation.document_received' AND entity_id=?").get(account).n,1);
}finally{f.close();}});

test('a newer affiliation document requires a fresh review while preserving its folio and original deadline',async()=>{const f=await fixture();try{
 const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);assert.equal((await upload(f,user,'affiliation')).status,201);let row=f.db.prepare('SELECT * FROM commission_affiliations').get();
 assert.equal((await f.call('/api/espacio','POST',{action:'affiliation',folio:'PAN-REFERENCIA',expectedUpdatedAt:row.updated_at},user)).status,200);row=f.db.prepare('SELECT * FROM commission_affiliations').get();
 const review={action:'review-affiliation',accountId:account,documentId:f.db.prepare("SELECT id FROM commission_documents WHERE category='affiliation'").get().id,status:'confirmed',note:'Documento comprobado',source:'Referencia institucional de prueba',expectedUpdatedAt:row.updated_at};assert.equal((await f.call('/api/espacio','POST',review)).status,200);
 // An existing deadline must survive additional files, even when it is much nearer than 90 days.
 f.db.prepare('UPDATE commission_affiliations SET retention_until=? WHERE account_id=?').run(Date.now()+86400000,account);const previous=f.db.prepare('SELECT * FROM commission_affiliations').get();
 const r=await upload(f,user,'affiliation');assert.equal(r.status,201,await r.clone().text());const uploadedId=(await r.json()).id,current=f.db.prepare('SELECT * FROM commission_affiliations').get();assert.equal(f.db.prepare('SELECT retention_until FROM commission_documents WHERE id=?').get(uploadedId).retention_until,previous.retention_until);
 assert.equal(current.status,'reported');assert.equal(current.folio,'PAN-REFERENCIA');assert.equal(current.retention_until,previous.retention_until);assert.ok(current.updated_at>previous.updated_at);assert.equal(current.note,'');assert.equal(current.verification_source,'');assert.equal(current.verified_at,null);assert.equal(current.reviewed_by,null);
 assert.equal((await f.call('/api/espacio','POST',{...review,expectedUpdatedAt:previous.updated_at})).status,409);assert.deepEqual(f.db.prepare('SELECT * FROM commission_affiliations').get(),current);
 assert.equal((await f.call('/api/espacio','POST',{...review,documentId:uploadedId,expectedUpdatedAt:current.updated_at})).status,200);assert.equal(f.db.prepare('SELECT status FROM commission_affiliations').get().status,'confirmed');
 assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='affiliation.document_received'").get().n,2);
}finally{f.close();}});

test('a fresh affiliation upload does not resurrect an expired folio or its former verification',async()=>{const f=await fixture();try{
 const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);assert.equal((await upload(f,user,'affiliation')).status,201);f.db.prepare("UPDATE commission_affiliations SET folio='FOLIO-VENCIDO',status='confirmed',note='Respuesta anterior',verification_source='Fuente anterior',verified_at=1,reviewed_by='owner',retention_until=1 WHERE account_id=?").run(account);
 const before=Date.now(),r=await upload(f,user,'affiliation');assert.equal(r.status,201,await r.clone().text());const row=f.db.prepare('SELECT * FROM commission_affiliations').get();assert.equal(row.status,'reported');assert.equal(row.folio,'');assert.equal(row.note,'');assert.equal(row.verification_source,'');assert.equal(row.verified_at,null);assert.equal(row.reviewed_by,null);assert.ok(row.retention_until>=before+90*86400000);assert.ok(row.retention_until<=Date.now()+90*86400000);
}finally{f.close();}});

test('failed or revoked affiliation uploads leave review records, audit history and stored files unchanged',async()=>{
 for(const existing of [false,true])for(const failure of ['storage','transaction','revoked-session']){const f=await fixture();try{
  const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);if(existing){assert.equal((await upload(f,user,'affiliation')).status,201);f.db.prepare("UPDATE commission_affiliations SET folio='REFERENCIA-VALIDA',status='confirmed',note='Revisado',verification_source='Fuente de prueba',verified_at=1,reviewed_by='owner' WHERE account_id=?").run(account);}
  const previous=f.db.prepare('SELECT * FROM commission_affiliations').get(),audit=f.db.prepare('SELECT * FROM audit_logs ORDER BY id').all(),documents=f.db.prepare('SELECT * FROM commission_documents ORDER BY id').all(),keys=[...f.bucket.files.keys()].sort();
  if(failure==='storage'){const put=f.bucket.put.bind(f.bucket);f.bucket.put=async(...args)=>{await put(...args);throw new Error('Storage interrupted after receiving bytes');};}
  else if(failure==='transaction')f.db.exec("CREATE TEMP TRIGGER affiliation_finalization_fail BEFORE INSERT ON commission_affiliations BEGIN SELECT RAISE(ABORT,'Finalization unavailable'); END");
  else f.beforeBatch=statements=>{if(statements.some(s=>s.query.startsWith('UPDATE commission_documents'))){f.beforeBatch=undefined;f.db.prepare('DELETE FROM staff_sessions WHERE account_id=?').run(account);}};
  const r=await upload(f,user,'affiliation');assert.equal(r.status,failure==='revoked-session'?409:503,`${failure}, existing=${existing}: ${await r.clone().text()}`);
  assert.deepEqual(f.db.prepare('SELECT * FROM commission_affiliations').get(),previous);assert.deepEqual(f.db.prepare('SELECT * FROM audit_logs ORDER BY id').all(),audit);assert.deepEqual(f.db.prepare('SELECT * FROM commission_documents ORDER BY id').all(),documents);assert.deepEqual([...f.bucket.files.keys()].sort(),keys);
 }finally{f.close();}}
});

test('a removed coordinator loses write access inside the mutation and a successor sees work without private IDs',async()=>{const f=await fixture();try{seed(f,user,'gobierno','coordinator');await accept(f);const id=await create(f);const doc=await upload(f);const docId=(await doc.json()).id;seed(f,other,'gobierno','coordinator');await accept(f,other);
 f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare('UPDATE commission_members SET active=0 WHERE account_id=(SELECT id FROM staff_accounts WHERE email=?)').run(user);};assert.equal((await f.call('/api/espacio/items/'+id,'PATCH',{action:'message',body:'No debe guardarse'},user)).status,409);
 assert.equal((await f.call('/api/espacio/items/'+id,'GET',undefined,user)).status,404);assert.equal((await f.call('/api/espacio/items/'+id,'GET',undefined,other)).status,200);assert.equal((await f.call('/api/espacio/documentos/'+docId,'GET',undefined,other)).status,404);
 }finally{f.close();}});

test('registration opens PAN affiliation only after commission confirmation, then proof review, report and handover work',async()=>{const f=await fixture();try{
 const payload=await registerPayload(f);const registration=await f.call('/api/registro-cuenta','POST',payload,null);assert.equal(registration.status,201);
 const email=payload.email;const page=(await(await f.call('/participacion','GET',undefined,email)).text()).replaceAll('\\"','"');const token=page.match(/"noticeToken":"([a-f0-9]{64})"/)[1];
 const request=await f.call('/api/incorporaciones','POST',{name:'Cuenta de prueba',commission:'gobierno',profile:{participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',activity:'',experience:'',availability:'Viernes por la tarde',projects:[]},note:'',consent:true,adultSelfDeclared:true,noticeToken:token},email);assert.equal(request.status,201,await request.clone().text());let app=(await request.json()).application;
 await accept(f,email);
 for(const category of ['affiliation','affiliation_receipt']){const early=await upload(f,email,category);assert.equal(early.status,403);assert.match(await early.text(),/último paso/);}
 assert.equal((await f.call('/api/espacio','POST',{action:'affiliation',folio:'EARLY',expectedUpdatedAt:0},email)).status,403);
 const identityDocuments=[];
 for(const category of ['ine_front','ine_back','address']){const document=await upload(f,email,category);assert.equal(document.status,201);identityDocuments.push((await document.json()).id);}
 let r=await f.call('/api/admin/incorporaciones/'+app.id,'PATCH',{status:'in_review',expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200);
 app=(await(await f.call('/api/incorporaciones/'+app.id,'GET',undefined,email)).json()).application;
 r=await f.call('/api/admin/incorporaciones/'+app.id,'PATCH',{status:'accepted',response:'Incorporación confirmada',expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200);
 assert.equal((await upload(f,email,'affiliation')).status,403);
 assert.equal(f.db.prepare('SELECT count(*) n FROM commission_affiliations').get().n,0);
 const assignment={action:'team',commission:'gobierno',username:payload.username,role:'coordinator',active:true};
 r=await f.call('/api/espacio','POST',assignment);assert.equal(r.status,409,await r.clone().text());assert.equal(f.db.prepare('SELECT count(*) n FROM commission_members').get().n,0);
 for(const id of identityDocuments)await reviewIdentityDocument(f,id);
 assert.equal((await(await f.call('/api/espacio','GET',undefined,email)).json()).personalDocumentsReady,true);
 r=await f.call('/api/espacio','POST',assignment);assert.equal(r.status,200,await r.clone().text());await accept(f,email);
 const account=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email).id;
 const receipt=(await(await upload(f,email,'affiliation_receipt')).json()).id;
 assert.equal((await confirmation(f,account,receipt)).status,400);
 let progress=(await(await f.call('/api/espacio','GET',undefined,email)).json()).affiliations[0];assert.equal(progress.status,'reported');assert.equal(progress.verified_document_id,null);
 const proofResponse=await upload(f,email,'affiliation');assert.equal(proofResponse.status,201);const proof=(await proofResponse.json()).id;
 assert.equal((await confirmation(f,account,proof)).status,200);
 progress=(await(await f.call('/api/espacio','GET',undefined,email)).json()).affiliations[0];assert.equal(progress.status,'confirmed');assert.equal(progress.verified_document_id,proof);
 r=await f.call('/api/espacio','POST',{action:'create',kind:'report',commission:'gobierno',title:'Reporte de octubre',submit:true,details:{month:'2026-10',results:'Reunión de trabajo y acuerdos',team:'Responsables del equipo',resources:'Sin gastos',next:'Revisar pendientes el siguiente mes'}},email);assert.equal(r.status,201,await r.clone().text());const id=(await r.json()).id;
 for(const status of ['approved','completed','archived']){const current=await item(f,id,email);r=await f.call('/api/espacio/items/'+id,'PATCH',{action:'status',status,note:'Revisión registrada',expectedUpdatedAt:current.updated_at});assert.equal(r.status,200,await r.clone().text());}
 seed(f,other,'gobierno','coordinator');const archive=await(await f.call('/api/espacio?view=archive','GET',undefined,other)).json();assert.equal(archive.items.length,1);assert.equal(archive.items[0].title,'Reporte de octubre');assert.equal((await f.call('/mi-comision/documento/'+id,'GET',undefined,other)).status,200);
 // Team access can still be removed when the initial application has expired.
 f.db.prepare('UPDATE membership_applications SET retention_until=1 WHERE owner_email=?').run(email);const team=f.db.prepare('SELECT * FROM commission_members WHERE account_id=(SELECT id FROM staff_accounts WHERE email=?)').get(email);
 r=await f.call('/api/espacio','POST',{action:'team',commission:'gobierno',username:payload.username,role:'member',active:false,expectedUpdatedAt:team.updated_at});assert.equal(r.status,200,await r.clone().text());assert.equal((await f.call('/api/espacio/items/'+id,'GET',undefined,email)).status,404);
 }finally{f.close();}});

test('partial drafts can be saved but cannot be submitted before required details are completed',async()=>{const f=await fixture();try{seed(f);await accept(f);const r=await f.call('/api/espacio','POST',{action:'create',kind:'event',commission:'gobierno',title:'Propuesta inicial',submit:false,details:{}},user);assert.equal(r.status,201,await r.clone().text());const id=(await r.json()).id;const current=await item(f,id);assert.equal((await f.call('/api/espacio/items/'+id,'PATCH',{action:'status',status:'submitted',expectedUpdatedAt:current.updated_at},user)).status,400);
 }finally{f.close();}});

test('client versions cannot extend retention for new work or affiliation records',async()=>{const f=await fixture();try{const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);const before=Date.now(),id=await create(f,user,{expectedUpdatedAt:9999999999999});const i=await item(f,id);assert.ok(i.created_at>=before&&i.created_at<=Date.now());assert.equal(i.retention_until-i.created_at,365*86400000);
 const r=await f.call('/api/espacio','POST',{action:'affiliation',folio:'REFERENCIA',expectedUpdatedAt:9999999999999},user);assert.equal(r.status,200);const a=f.db.prepare('SELECT * FROM commission_affiliations').get();assert.ok(a.updated_at<=Date.now());assert.equal(a.retention_until-a.updated_at,90*86400000);
}finally{f.close();}});

test('a fresh notice acceptance works when an older snapshot has the same version',async()=>{const f=await fixture();try{const id=seed(f);f.db.prepare('INSERT INTO workspace_consents(id,account_id,version,snapshot,accepted_at) VALUES(?,?,?,?,1)').run('old',id,'comisiones-2026-10-06.1','old snapshot');await accept(f);assert.equal(f.db.prepare('SELECT count(*) n FROM workspace_consents WHERE account_id=?').get(id).n,2);assert.equal((await upload(f)).status,201);
}finally{f.close();}});

test('coordinators cannot restore access withdrawn by an administrator even with the current version',async()=>{const f=await fixture();try{seed(f,user,'gobierno','coordinator');const id=seed(f,other);await seedReviewedIdentityDocuments(f,id);f.db.prepare('UPDATE commission_members SET active=0,updated_at=123 WHERE account_id=?').run(id);const body={action:'team',commission:'gobierno',username:'other',role:'member',active:true,expectedUpdatedAt:123};assert.equal((await f.call('/api/espacio','POST',body,user)).status,409);assert.equal(f.db.prepare('SELECT active FROM commission_members WHERE account_id=?').get(id).active,0);assert.equal((await f.call('/api/espacio','POST',body)).status,200);
}finally{f.close();}});

test('administrative handover transfers work to an active successor with history, without transferring personal files',async()=>{const f=await fixture();try{const old=seed(f),next=seed(f,other);await accept(f);await accept(f,other);const id=await create(f,user,{submit:false});const doc=await upload(f),docId=(await doc.json()).id;let current=await item(f,id);const body={action:'assign',username:'other',note:'Entrega al siguiente equipo',expectedUpdatedAt:current.updated_at};assert.equal((await f.call('/api/espacio/items/'+id,'PATCH',body,user)).status,403);
 f.db.prepare('UPDATE commission_members SET active=0 WHERE account_id=?').run(old);assert.equal((await f.call('/api/espacio/items/'+id,'PATCH',body)).status,200);current=await item(f,id,other);assert.equal(current.owner_id,next);assert.equal((await f.call('/api/espacio/items/'+id,'GET',undefined,user)).status,404);assert.equal((await f.call('/api/espacio/documentos/'+docId,'GET',undefined,other)).status,404);
 const details=await(await f.call('/api/espacio/items/'+id,'GET',undefined,other)).json();assert.match(details.messages[0].body,/Entrega al siguiente equipo/);assert.match(details.messages[0].body,/member@example.test/);
 assert.equal((await f.call('/api/espacio/items/'+id,'PATCH',{...event(),action:'edit',expectedUpdatedAt:current.updated_at},other)).status,200);
 // Recheck successor access inside the write, not just before it.
 seed(f,'third@example.test');current=await item(f,id,other);f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare("UPDATE commission_members SET active=0 WHERE account_id=(SELECT id FROM staff_accounts WHERE email='third@example.test')").run();};
 assert.equal((await f.call('/api/espacio/items/'+id,'PATCH',{action:'assign',username:'third',note:'No debe transferirse',expectedUpdatedAt:current.updated_at})).status,409);assert.equal((await item(f,id,other)).owner_id,next);
}finally{f.close();}});

test('closing new applications preserves existing commission work while an unapproved notice blocks it',async()=>{const f=await createWorkerFixture({...config,MEMBERSHIP_ENABLED:'0',BUCKET:bucket()});try{seed(f);await accept(f);assert.equal((await f.call('/api/espacio','GET',undefined,user)).status,200);const id=await create(f);assert.ok(id);assert.equal((await upload(f)).status,201);assert.equal((await f.call('/api/registro-cuenta','POST',{},null)).status,503);
}finally{f.close();}const blocked=await createWorkerFixture({...config,MEMBERSHIP_ENABLED:'0',MEMBERSHIP_NOTICE_APPROVED:'0'});try{seed(blocked);const d=await(await blocked.call('/api/espacio','GET',undefined,user)).json();assert.equal(d.documentsEnabled,false);assert.equal((await blocked.call('/api/espacio','POST',{action:'consent',version:'comisiones-2026-10-06.1',noticeToken:d.noticeToken,consent:true},user)).status,503);}finally{blocked.close();}});

test('a date-less draft prints pending fields instead of an epoch date',async()=>{const f=await fixture();try{seed(f);await accept(f);const id=await create(f,user,{submit:false,startsAt:null,endsAt:null,venue:''});const html=await(await f.call('/mi-comision/documento/'+id,'GET',undefined,user)).text();assert.match(html,/Fecha por confirmar/);assert.match(html,/Espacio por confirmar/);assert.doesNotMatch(html,/1969|1970/);
}finally{f.close();}});

test('signup preserves only a known commission in its internal destination',async()=>{const f=await fixture();try{const body=await registerPayload(f,{commission:'cultura'});const r=await f.call('/api/registro-cuenta','POST',body,null);assert.equal(r.status,201);assert.equal((await r.json()).redirect,'/participacion?comision=cultura#registro');const invalid=await f.call('/api/registro-cuenta','POST',await registerPayload(f,{email:'second@example.test',username:'second',commission:'https://evil.example'}),null);assert.equal(invalid.status,201);assert.equal((await invalid.json()).redirect,'/participacion#registro');
}finally{f.close();}});

test('reassigning a private draft revokes an in-flight message and evidence upload from its former owner',async()=>{const f=await fixture();try{seed(f);const next=seed(f,other);await accept(f);let id=await create(f,user,{submit:false});f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare('UPDATE commission_items SET owner_id=? WHERE id=?').run(next,id);};assert.equal((await f.call('/api/espacio/items/'+id,'PATCH',{action:'message',body:'Debe rechazarse'},user)).status,409);assert.equal(f.db.prepare('SELECT count(*) n FROM commission_messages WHERE item_id=?').get(id).n,0);
 id=await create(f,user,{submit:false});f.beforeBatch=statements=>{if(statements.some(s=>s.query.startsWith('UPDATE commission_documents'))){f.beforeBatch=undefined;f.db.prepare('UPDATE commission_items SET owner_id=? WHERE id=?').run(next,id);}};assert.equal((await upload(f,user,'evidence',id)).status,409);assert.equal(f.bucket.files.size,0);
}finally{f.close();}});


async function confirmation(f,account,documentId,extra={}){
 const current=f.db.prepare('SELECT * FROM commission_affiliations WHERE account_id=?').get(account);
 return f.call('/api/espacio','POST',{action:'review-affiliation',accountId:account,documentId,status:'confirmed',source:'Documento PAN comprobado en prueba aislada',note:'Comprobación registrada',expectedUpdatedAt:current.updated_at,...extra});
}

test('PAN review requires a specific, current affiliation proof owned by the person, not a receipt or ID',async()=>{const f=await fixture();try{
 const account=seed(f),otherAccount=seed(f,other);await accept(f);await accept(f,other);await seedReviewedIdentityDocuments(f,account);await seedReviewedIdentityDocuments(f,otherAccount);
 const receipt=await upload(f,user,'affiliation_receipt');assert.equal(receipt.status,201);const receiptId=(await receipt.json()).id;
 assert.equal((await(await f.call('/api/espacio?manage=1')).json()).affiliations[0].status,'reported');
 const identityId=(await(await upload(f)).json()).id,otherProof=(await(await upload(f,other,'affiliation')).json()).id;
 await reviewIdentityDocument(f,identityId);
 for(const documentId of ['',receiptId,identityId,otherProof])assert.equal((await confirmation(f,account,documentId)).status,400);
 const proofId=(await(await upload(f,user,'affiliation')).json()).id;
 assert.equal((await confirmation(f,account,proofId)).status,200);const row=f.db.prepare('SELECT * FROM commission_affiliations WHERE account_id=?').get(account);assert.equal(row.verified_document_id,proofId);
 const mine=(await(await f.call('/api/espacio','GET',undefined,user)).json()).affiliations[0];assert.equal(mine.status,'confirmed');assert.equal(mine.current_document_id,proofId);assert.equal(mine.document_count,2);
 const docs=(await(await f.call('/api/espacio/documentos?manage=1&category=affiliation&accountId='+account)).json()).documents;assert.deepEqual(new Set(docs.map(d=>d.category)),new Set(['affiliation','affiliation_receipt']));
 assert.equal((await f.call('/api/espacio','POST',{action:'review-affiliation',accountId:account,documentId:proofId,status:'confirmed',source:'Unprivileged',note:'Attempt',expectedUpdatedAt:row.updated_at},user)).status,403);
}finally{f.close();}});

test('withdrawing or requesting corrections to the verified proof invalidates the review even if storage deletion fails',async()=>{
 for(const action of ['remove','changes']){const f=await fixture();try{
  const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);const proofId=(await(await upload(f,user,'affiliation')).json()).id;assert.equal((await confirmation(f,account,proofId)).status,200);
  const previous=f.db.prepare('SELECT * FROM commission_affiliations').get(),doc=f.db.prepare('SELECT * FROM commission_documents WHERE id=?').get(proofId);f.bucket.failDelete=true;
  const r=await f.call('/api/espacio/documentos/'+proofId,'PATCH',{action:action==='remove'?'remove':'review',status:'changes',note:'El archivo no permite comprobar la afiliación',expectedUpdatedAt:doc.updated_at},action==='remove'?user:undefined);assert.equal(r.status,200,await r.clone().text());
  const current=f.db.prepare('SELECT * FROM commission_affiliations').get();assert.equal(current.status,'changes');assert.equal(current.verified_document_id,null);assert.equal(current.verified_at,null);assert.equal(current.verification_source,'');assert.ok(current.updated_at>previous.updated_at);assert.equal(current.retention_until,previous.retention_until);
  assert.equal((await confirmation(f,account,proofId,{expectedUpdatedAt:previous.updated_at})).status,400);
  const data=(await(await f.call('/api/espacio','GET',undefined,user)).json()).affiliations[0];assert.equal(data.status,'changes');assert.equal(data.document_count,action==='remove'?0:1);
  if(action==='remove'){assert.equal(f.bucket.files.size,4);assert.equal((await f.call('/api/espacio/documentos/'+proofId,'GET',undefined,user)).status,404);}
 }finally{f.close();}}
});

test('retiring an unrelated receipt preserves the reviewed proof but invalidates stale administrative submissions',async()=>{const f=await fixture();try{
 const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);const receiptId=(await(await upload(f,user,'affiliation_receipt')).json()).id,proofId=(await(await upload(f,user,'affiliation')).json()).id;assert.equal((await confirmation(f,account,proofId)).status,200);
 const previous=f.db.prepare('SELECT * FROM commission_affiliations').get(),receipt=f.db.prepare('SELECT * FROM commission_documents WHERE id=?').get(receiptId);
 assert.equal((await f.call('/api/espacio/documentos/'+receiptId,'PATCH',{action:'remove',expectedUpdatedAt:receipt.updated_at},user)).status,200);
 const current=f.db.prepare('SELECT * FROM commission_affiliations').get();assert.equal(current.status,'confirmed');assert.equal(current.verified_document_id,proofId);assert.ok(current.updated_at>previous.updated_at);
 assert.equal((await confirmation(f,account,proofId,{expectedUpdatedAt:previous.updated_at})).status,409);
}finally{f.close();}});

test('expired or missing proof stops displaying confirmation before the scheduled purge',async()=>{
 for(const unavailable of ['expired','deleted','legacy-unlinked']){const f=await fixture();try{
  const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);const proofId=(await(await upload(f,user,'affiliation')).json()).id;assert.equal((await confirmation(f,account,proofId)).status,200);
  if(unavailable==='expired')f.db.prepare('UPDATE commission_documents SET retention_until=1 WHERE id=?').run(proofId);
  if(unavailable==='deleted')f.db.prepare('DELETE FROM commission_documents WHERE id=?').run(proofId);
  if(unavailable==='legacy-unlinked')f.db.prepare('UPDATE commission_affiliations SET verified_document_id=NULL WHERE account_id=?').run(account);
  for(const actor of [user,'owner@example.test']){const data=(await(await f.call('/api/espacio?manage=1','GET',undefined,actor)).json()).affiliations[0];assert.equal(data.status,'changes');assert.equal(data.verified_at,null);assert.equal(data.verified_document_id,null);assert.equal(data.document_count,unavailable==='legacy-unlinked'?1:0);}
  if(unavailable!=='legacy-unlinked')assert.equal((await confirmation(f,account,proofId)).status,400);
 }finally{f.close();}}
});

test('document withdrawal and administrative confirmation recheck evidence in the same transaction',async()=>{const f=await fixture();try{
 const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);const proofId=(await(await upload(f,user,'affiliation')).json()).id;
 f.beforeBatch=statements=>{if(statements.some(s=>s.query.startsWith('UPDATE commission_affiliations SET status='))){f.beforeBatch=undefined;f.db.prepare("UPDATE commission_documents SET status='removed',retention_until=1 WHERE id=?").run(proofId);}};
 assert.equal((await confirmation(f,account,proofId)).status,409);assert.equal(f.db.prepare('SELECT status FROM commission_affiliations').get().status,'reported');assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='affiliation.review'").get().n,0);
}finally{f.close();}});

test('document and affiliation updates roll back together if follow-up auditing fails',async()=>{const f=await fixture();try{
 const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);const proofId=(await(await upload(f,user,'affiliation')).json()).id;assert.equal((await confirmation(f,account,proofId)).status,200);
 const previous=f.db.prepare('SELECT * FROM commission_affiliations').get(),doc=f.db.prepare('SELECT * FROM commission_documents WHERE id=?').get(proofId),audit=f.db.prepare('SELECT * FROM audit_logs ORDER BY id').all();
 f.db.exec("CREATE TEMP TRIGGER fail_affiliation_audit BEFORE INSERT ON audit_logs WHEN NEW.action='affiliation.evidence_changed' BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
 assert.equal((await f.call('/api/espacio/documentos/'+proofId,'PATCH',{action:'remove',expectedUpdatedAt:doc.updated_at},user)).status,503);
 assert.deepEqual(f.db.prepare('SELECT * FROM commission_affiliations').get(),previous);assert.deepEqual(f.db.prepare('SELECT * FROM commission_documents WHERE id=?').get(proofId),doc);assert.deepEqual(f.db.prepare('SELECT * FROM audit_logs ORDER BY id').all(),audit);assert.equal(f.bucket.files.size,4);
}finally{f.close();}});

test('public registration keeps PAN as the final step while direct upload links retain authentication',async()=>{const f=await fixture();try{
 const html=await(await f.call('/participacion','GET',undefined,null)).text();assert.match(html,/último paso, después de confirmar tu comisión/);assert.doesNotMatch(html,/Quiero afiliarme/);assert.doesNotMatch(html,/mi-comision\?tab=afiliacion/);
 const guest=await f.call('/mi-comision?tab=afiliacion','GET',undefined,null);assert.equal(guest.status,307);assert.equal(guest.headers.get('location'),'/ingresar?returnTo=%2Fmi-comision%3Ftab%3Dafiliacion');
}finally{f.close();}});

test('identity documents and PAN documents remain in separate queues with ownership and administrative review intact',async()=>{const f=await fixture();try{
 const account=seed(f);seed(f,other,'cultura');await accept(f);await accept(f,other);
 const identityId=(await(await upload(f,user,'ine_front')).json()).id;
 const identityBackId=(await(await upload(f,user,'ine_back')).json()).id;
 const addressId=(await(await upload(f,user,'address')).json()).id;
 for(const id of [identityId,identityBackId,addressId])await reviewIdentityDocument(f,id);
 const receiptId=(await(await upload(f,user,'affiliation_receipt')).json()).id;
 const proofId=(await(await upload(f,user,'affiliation')).json()).id;
 await upload(f,other,'ine_front');
 const read=async(path,actor=user)=>{const r=await f.call(path,'GET',undefined,actor);assert.equal(r.status,200);return(await r.json()).documents;};
 assert.deepEqual(new Set((await read('/api/espacio/documentos?category=identity')).map(d=>d.id)),new Set([identityId,identityBackId,addressId]));
 assert.deepEqual(new Set((await read('/api/espacio/documentos?category=affiliation')).map(d=>d.id)),new Set([receiptId,proofId]));
 assert.deepEqual(new Set((await read('/api/espacio/documentos?manage=1&category=identity&accountId='+account,'owner@example.test')).map(d=>d.id)),new Set([identityId,identityBackId,addressId]));
 assert.deepEqual(new Set((await read('/api/espacio/documentos?manage=1&commission=gobierno&category=identity','owner@example.test')).map(d=>d.id)),new Set([identityId,identityBackId,addressId]));
 assert.equal((await read('/api/espacio/documentos?manage=1&category=identity&accountId='+account,other)).length,1);
 assert.equal((await f.call('/api/espacio/documentos/'+identityId,'GET',undefined,other)).status,404);
 const pending=(await(await f.call('/api/espacio?manage=1&commission=gobierno')).json()).affiliations;
 assert.equal(pending.length,1);assert.equal(pending[0].account_id,account);assert.equal(pending[0].status,'reported');
}finally{f.close();}});

test('saving the same PAN folio preserves an already checked affiliation and rejects a stale version',async()=>{const f=await fixture();try{
 const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);const proofId=(await(await upload(f,user,'affiliation')).json()).id;
 const initial=f.db.prepare('SELECT * FROM commission_affiliations').get();
 assert.equal((await f.call('/api/espacio','POST',{action:'affiliation',folio:'PAN-PRUEBA',expectedUpdatedAt:initial.updated_at},user)).status,200);
 assert.equal((await confirmation(f,account,proofId)).status,200);
 const confirmed=f.db.prepare('SELECT * FROM commission_affiliations').get(),auditCount=f.db.prepare('SELECT count(*) n FROM audit_logs').get().n;
 const body={action:'affiliation',folio:'PAN-PRUEBA',expectedUpdatedAt:confirmed.updated_at};
 assert.equal((await f.call('/api/espacio','POST',body,user)).status,200);
 assert.deepEqual(f.db.prepare('SELECT * FROM commission_affiliations').get(),confirmed);
 assert.equal(f.db.prepare('SELECT count(*) n FROM audit_logs').get().n,auditCount);
 assert.equal((await f.call('/api/espacio','POST',{...body,expectedUpdatedAt:confirmed.updated_at-1},user)).status,409);
 assert.deepEqual(f.db.prepare('SELECT * FROM commission_affiliations').get(),confirmed);
}finally{f.close();}});

test('all commission workspace destinations survive sign-in and render only supported tab and commission parameters',async()=>{const f=await fixture();try{
 for(const tab of ['solicitud','expediente','afiliacion','actividades','equipo','archivo']){
  const guest=await f.call('/mi-comision?tab='+tab,'GET',undefined,null);assert.equal(guest.status,307);
  assert.equal(guest.headers.get('location'),'/ingresar?returnTo='+encodeURIComponent('/mi-comision?tab='+tab));
  const html=(await(await f.call('/mi-comision?tab='+tab,'GET',undefined,user)).text()).replaceAll('\\"','"');
  assert.match(html,new RegExp('"initialTab":"'+tab+'"'));
 }
 const deep=await f.call('/mi-comision?tab=equipo&commission=gobierno','GET',undefined,null);
 assert.equal(deep.headers.get('location'),'/ingresar?returnTo='+encodeURIComponent('/mi-comision?tab=equipo&commission=gobierno'));
 const unsafe=await f.call('/mi-comision?tab=unknown&commission=https://evil.test','GET',undefined,null);
 assert.equal(unsafe.headers.get('location'),'/ingresar?returnTo=%2Fmi-comision');
 const publicPage=await(await f.call('/comisiones','GET',undefined,null)).text();
 for(const commission of ['gobierno','administracion','comunicacion','cultura','tecnologia','mujeres']){
  assert.match(publicPage,new RegExp('id="'+commission+'"'));assert.match(publicPage,new RegExp('/participacion\\?comision='+commission));
 }
}finally{f.close();}});

test('revoked commission access blocks PAN writes but preserves access to previously delivered documents',async()=>{
 for(const phase of ['upload-start','upload-finish','folio','review']){const f=await fixture();try{
  const account=seed(f);await accept(f);await seedReviewedIdentityDocuments(f,account);const existing=await upload(f,user,'affiliation');assert.equal(existing.status,201);const proof=(await existing.json()).id;
  const previous=f.db.prepare('SELECT * FROM commission_affiliations').get(),files=[...f.bucket.files.keys()].sort();
  if(phase==='upload-start')f.db.prepare('UPDATE commission_members SET active=0 WHERE account_id=?').run(account);
  else f.beforeBatch=statements=>{const target=phase==='upload-finish'?'UPDATE commission_documents':phase==='folio'?'INSERT INTO commission_affiliations':'UPDATE commission_affiliations SET status=';if(statements.some(s=>s.query.startsWith(target))){f.beforeBatch=undefined;f.db.prepare('UPDATE commission_members SET active=0 WHERE account_id=?').run(account);}};
  const response=phase==='folio'?await f.call('/api/espacio','POST',{action:'affiliation',folio:'CHANGED',expectedUpdatedAt:previous.updated_at},user):phase==='review'?await confirmation(f,account,proof):await upload(f,user,'affiliation');
  assert.equal(response.status,phase==='upload-start'?403:409,phase+' '+await response.clone().text());
  assert.deepEqual(f.db.prepare('SELECT * FROM commission_affiliations').get(),previous);
  assert.deepEqual([...f.bucket.files.keys()].sort(),files);
  assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents').get().n,4);
  assert.equal((await f.call('/api/espacio/documentos/'+proof,'GET',undefined,user)).status,200);
  assert.equal((await confirmation(f,account,proof)).status,409);
 }finally{f.close();}}
});

test('impossible dates and out-of-range event timestamps are rejected before saving',async()=>{const f=await fixture();try{
 seed(f);await accept(f);
 assert.equal((await f.call('/api/espacio','POST',event({startsAt:9007199254680991,endsAt:9007199254740991}),user)).status,400);
 for(const deadline of ['2026-99-99','2026-02-30','2025-02-29'])assert.equal((await f.call('/api/espacio','POST',{action:'create',kind:'question',commission:'gobierno',title:'Consulta de prueba',submit:true,details:{request:'Solicitud de espacio',context:'Reunión mensual',deadline}},user)).status,400,deadline);
 assert.equal(f.db.prepare('SELECT count(*) n FROM commission_items').get().n,0);
 assert.equal((await f.call('/api/espacio','POST',{action:'create',kind:'question',commission:'gobierno',title:'Consulta de prueba',submit:true,details:{request:'Solicitud de espacio',context:'Reunión mensual',deadline:'2028-02-29'}},user)).status,201);
 }finally{f.close();}});

test('retention advances beyond its first batch while preserving failed storage deletions for retry',async()=>{const f=await fixture();try{
 const account=seed(f);const insert=f.db.prepare("INSERT INTO commission_documents(id,owner_id,category,object_key,name,mime,size,status,notice_snapshot,created_at,updated_at,retention_until) VALUES(?,?,'ine_front',?,'Prueba.pdf','application/pdf',10,'received','test',1,1,1)");
 for(let n=0;n<205;n++){const id=String(n).padStart(4,'0');insert.run(id,account,id);await f.bucket.put(id,new TextEncoder().encode('private'));}
 const original=f.bucket.delete.bind(f.bucket);f.bucket.delete=async key=>{if(key==='0000')throw new Error('Isolated storage failure');return original(key);};
 await f.scheduled(Date.now());assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents').get().n,1);assert.deepEqual([...f.bucket.files.keys()],['0000']);
 f.bucket.delete=original;await f.scheduled(Date.now());assert.equal(f.bucket.files.size,0);assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents').get().n,0);
 }finally{f.close();}});
