import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,scryptSync} from 'node:crypto';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';
import {seedReviewedIdentityDocuments} from './helpers/identity-documents.mjs';

// Resend's batch endpoint is the only provider call made by the panel. It is simulated here;
// the fixture keeps simulating the single-message endpoint used by confirmations.
const batches=[];let batchFailure=false;
const realFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 if(String(url)==='https://api.resend.com/emails/batch'){
  if(batchFailure)return new Response('',{status:503});
  const messages=JSON.parse(options.body);batches.push({headers:new Headers(options.headers),messages});
  return Response.json({data:messages.map(()=>({id:'re_'+randomBytes(6).toString('hex')}))});
 }
 return realFetch(url,options);
};

const base={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
function bucket(){const files=new Map();return{files,failDelete:false,async put(k,v){files.set(k,new Uint8Array(v));return{};},async get(k){return files.has(k)?{body:new Response(files.get(k)).body}:null;},async delete(k){if(this.failDelete)throw new Error('Unavailable');for(const id of Array.isArray(k)?k:[k])files.delete(id);}};}
async function fixture(env={}){const b=bucket(),f=await createWorkerFixture({...base,BUCKET:b,...env});f.bucket=b;return f;}
const owner='owner@example.test';

function person(f,email,{name,username=email.split('@')[0]}={}){
 f.seedAccount(email);
 const {id}=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email);
 f.db.prepare('UPDATE staff_accounts SET username=?,name=? WHERE id=?').run(username,name??username,id);
 return id;
}
function application(f,email,commission='gobierno',status='submitted',extra={}){
 const id=crypto.randomUUID(),now=Date.now();
 f.db.prepare("INSERT INTO membership_applications(id,owner_email,name,commission,note,profile_json,reference_code,status,notice_version,notice_snapshot,consent_text,consent_at,adult_self_declared,retention_until,created_at,updated_at) VALUES(?,?,?,?,'',?,?,?,'v','{}','consentimiento',?,1,?,?,?)")
  .run(id,email,'Nombre en solicitud',commission,JSON.stringify({version:1,participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',activity:'',experience:'',availability:'Fines de semana',projects:[],...extra}),'APJ-'+id.slice(0,8),status,now,now+90*86400000,now,now);
 return id;
}
const version=(f,id)=>f.db.prepare('SELECT updated_at FROM staff_accounts WHERE id=?').get(id).updated_at;
const act=(f,id,body,actor=owner)=>f.call('/api/admin/personas/'+id,'POST',body,actor);
async function ok(response){assert.ok(response.ok,`${response.status} ${await response.clone().text()}`);return response.json();}
function passwordHash(password){const salt=randomBytes(16);return `scrypt-v1$${salt.toString('hex')}$${scryptSync(password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex')}`;}

test('only administrators reach the people list, the record and its actions',async()=>{const f=await fixture();try{
 const target=person(f,'ana@example.test',{name:'Ana Prueba'});person(f,'editor@example.test');
 f.db.prepare("INSERT INTO user_roles(email,role,created_at,created_by) VALUES('editor@example.test','editor',1,'owner@example.test')").run();
 for(const actor of ['ana@example.test','editor@example.test',null]){
  for(const path of ['/admin/personas','/admin/personas/'+target]){const page=await f.call(path,'GET',undefined,actor);assert.equal(page.status,307,path);assert.doesNotMatch(await page.text(),/Ana Prueba/);}
  assert.equal((await act(f,target,{action:'note.add',body:'No debe guardarse'},actor)).status,403);
  assert.equal((await f.call('/api/admin/personas/exportar','POST',{filters:{}},actor)).status,403);
  assert.equal((await f.call('/api/admin/personas/correo','POST',{mode:'preview'},actor)).status,403);
 }
 assert.equal(f.db.prepare('SELECT count(*) n FROM person_notes').get().n,0);
 assert.equal((await f.call('/admin/personas','GET',undefined,owner)).status,200);
 const cross=await f.call('/api/admin/personas/'+target,'POST',{action:'note.add',body:'x'},owner,{origin:'https://evil.example'});assert.equal(cross.status,403);
 const other=await f.call('/api/admin/personas/'+target,'POST',{action:'note.add',body:'x'},owner,{'x-expected-account-id':'otra-cuenta'});assert.equal(other.status,412);
}finally{f.close();}});

test('the list searches and filters by commission, request, documents, affiliation, suspension and tag',async()=>{const f=await fixture();try{
 const ana=person(f,'ana@example.test',{name:'Ana Prueba'}),beto=person(f,'beto@example.test',{name:'Beto Prueba'}),caro=person(f,'caro@example.test',{name:'Caro Prueba'});
 application(f,'ana@example.test','gobierno','accepted');application(f,'beto@example.test','cultura','submitted');
 await seedReviewedIdentityDocuments(f,ana);
 f.db.prepare("INSERT INTO commission_affiliations(account_id,status,updated_at,retention_until) VALUES(?,'reported',?,?)").run(ana,Date.now(),Date.now()+86400000);
 f.db.prepare('UPDATE staff_accounts SET disabled_at=? WHERE id=?').run(Date.now(),caro);
 assert.equal((await act(f,beto,{action:'tag.add',tag:'  Brigada   Norte '})).status,200);
 const names=async query=>{const html=await(await f.call('/admin/personas'+query,'GET',undefined,owner)).text();return ['Ana Prueba','Beto Prueba','Caro Prueba'].filter(name=>html.includes(name));};
 assert.deepEqual(await names(''),['Ana Prueba','Beto Prueba','Caro Prueba']);
 const ownerId=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get('owner@example.test')?.id;
 assert.ok(ownerId&&!(await(await f.call('/admin/personas','GET',undefined,owner)).text()).includes('/admin/personas/'+ownerId),'the owner account is not listed');
 assert.deepEqual(await names('?q=beto'),['Beto Prueba']);
 assert.deepEqual(await names('?q=caro%40example'),['Caro Prueba']);
 assert.deepEqual(await names('?commission=gobierno'),['Ana Prueba']);
 assert.deepEqual(await names('?status=submitted'),['Beto Prueba']);
 assert.deepEqual(await names('?status=none'),['Caro Prueba']);
 assert.deepEqual(await names('?documents=complete'),['Ana Prueba']);
 assert.deepEqual(await names('?documents=pending'),['Beto Prueba','Caro Prueba']);
 assert.deepEqual(await names('?affiliation=reported'),['Ana Prueba']);
 assert.deepEqual(await names('?suspended=1'),['Caro Prueba']);
 assert.deepEqual(await names('?suspended=0'),['Ana Prueba','Beto Prueba']);
 assert.deepEqual(await names('?tag=brigada+norte'),['Beto Prueba']);
 assert.deepEqual(await names('?q=%25'),[],'LIKE wildcards are searched literally');
 for(let n=0;n<26;n++)person(f,`extra${n}@example.test`,{name:`Extra ${n}`});
 const first=await(await f.call('/admin/personas','GET',undefined,owner)).text();assert.match(first,/Página 1 de 2/);
 assert.match(await(await f.call('/admin/personas?page=2','GET',undefined,owner)).text(),/Página 2 de 2/);
 const record=await f.call('/admin/personas/'+ana,'GET',undefined,owner);assert.equal(record.status,200);
 const html=await record.text();assert.match(html,/Ana Prueba/);assert.match(html,/3 de 3 revisados/);assert.match(html,/Solicitud aceptada/);
 assert.equal((await f.call('/admin/personas/no-existe','GET',undefined,owner)).status,404);
}finally{f.close();}});

test('notes and tags are internal, normalized and audited',async()=>{const f=await fixture();try{
 const id=person(f,'ana@example.test',{name:'Ana Prueba'});
 assert.equal((await act(f,id,{action:'note.add',body:'  Prefiere contacto por la tarde. '})).status,200);
 const note=f.db.prepare('SELECT * FROM person_notes').get();assert.equal(note.body,'Prefiere contacto por la tarde.');assert.equal(note.author_email,owner);
 assert.equal((await act(f,id,{action:'note.add',body:'x'.repeat(2001)})).status,400);
 assert.equal((await act(f,id,{action:'tag.add',tag:'Voluntaria  Activa'})).status,200);
 assert.equal(f.db.prepare('SELECT tag FROM person_tags').get().tag,'voluntaria activa');
 assert.equal((await act(f,id,{action:'tag.add',tag:'voluntaria activa'})).status,409);
 for(const tag of ['','x'.repeat(31),'<script>','-inicio'])assert.equal((await act(f,id,{action:'tag.add',tag})).status,400,tag);
 const html=await(await f.call('/admin/personas/'+id,'GET',undefined,owner)).text();assert.match(html,/Prefiere contacto por la tarde/);assert.match(html,/voluntaria activa/);
 assert.doesNotMatch(await(await f.call('/api/espacio','GET',undefined,'ana@example.test')).text(),/Prefiere contacto/,'the person never sees internal notes');
 assert.equal((await act(f,id,{action:'note.delete',noteId:note.id})).status,200);
 assert.equal((await act(f,id,{action:'tag.remove',tag:'voluntaria activa'})).status,200);
 assert.equal(f.db.prepare('SELECT count(*) n FROM person_notes').get().n+f.db.prepare('SELECT count(*) n FROM person_tags').get().n,0);
 const audit=f.db.prepare("SELECT action,entity_id,metadata_json FROM audit_logs WHERE action LIKE 'person.%' ORDER BY created_at,rowid").all();
 assert.deepEqual(audit.map(row=>row.action),['person.note.add','person.tag.add','person.note.delete','person.tag.remove']);
 assert.ok(audit.every(row=>row.entity_id===id&&!row.metadata_json.includes('Prefiere')),'note bodies stay out of the audit trail');
}finally{f.close();}});

test('suspension closes sessions and blocks sign-in; reactivation restores it',async()=>{const f=await fixture();try{
 const id=person(f,'ana@example.test',{name:'Ana Prueba',username:'ana'}),password='Contraseña de prueba larga 123';
 f.db.prepare('UPDATE staff_accounts SET password_hash=? WHERE id=?').run(passwordHash(password),id);
 const login=()=>f.call('/api/admin/access/login','POST',{username:'ana',password},null);
 assert.equal((await f.call('/api/espacio','GET',undefined,'ana@example.test')).status,200);
 assert.equal((await act(f,id,{action:'suspend',expectedUpdatedAt:version(f,id)-1})).status,409,'a stale record is refused');
 assert.equal((await act(f,id,{action:'suspend',expectedUpdatedAt:version(f,id)})).status,200);
 assert.ok(f.db.prepare('SELECT disabled_at FROM staff_accounts WHERE id=?').get(id).disabled_at);
 assert.equal(f.db.prepare('SELECT count(*) n FROM staff_sessions WHERE account_id=?').get(id).n,0);
 assert.equal((await f.call('/api/espacio','GET',undefined,'ana@example.test')).status,401,'the open session no longer works');
 assert.equal((await login()).status,401,'a suspended account cannot sign in');
 assert.equal((await act(f,id,{action:'suspend',expectedUpdatedAt:version(f,id)})).status,409,'already suspended');
 assert.equal((await act(f,id,{action:'reactivate',expectedUpdatedAt:version(f,id)})).status,200);
 const back=await login();assert.equal(back.status,200,await back.clone().text());
 const audit=f.db.prepare("SELECT action FROM audit_logs WHERE entity_id=? AND action LIKE 'person.%' ORDER BY created_at").all(id).map(row=>row.action);
 assert.deepEqual(audit,['person.suspend','person.reactivate']);
}finally{f.close();}});

test('the owner account, your own account and accounts with panel roles are protected',async()=>{const f=await fixture();try{
 const ownerId=person(f,owner,{username:'owner'}),admin=person(f,'admin2@example.test'),editor=person(f,'editor@example.test');
 f.db.prepare("INSERT INTO user_roles(email,role,created_at,created_by) VALUES('admin2@example.test','admin',1,?),('editor@example.test','editor',1,?)").run(owner,owner);
 for(const action of ['suspend','delete','update','note.add'])assert.equal((await act(f,ownerId,{action,confirm:'owner',expectedUpdatedAt:version(f,ownerId),body:'x',name:'Otro'})).status,403,action);
 assert.equal((await f.call('/admin/personas','GET',undefined,owner)).status,200);
 assert.ok(!(await(await f.call('/admin/personas','GET',undefined,owner)).text()).includes('@owner'));
 assert.equal((await act(f,admin,{action:'suspend',expectedUpdatedAt:version(f,admin)},'admin2@example.test')).status,403,'not your own account');
 assert.equal((await act(f,editor,{action:'suspend',expectedUpdatedAt:version(f,editor)},'admin2@example.test')).status,403,'role holders are managed by the owner');
 assert.equal((await act(f,editor,{action:'delete',confirm:'editor',expectedUpdatedAt:version(f,editor)},'admin2@example.test')).status,403);
 assert.equal((await act(f,editor,{action:'suspend',expectedUpdatedAt:version(f,editor)})).status,200,'the owner can');
 assert.equal(f.db.prepare('SELECT disabled_at FROM staff_accounts WHERE id=?').get(ownerId).disabled_at,null);
 assert.equal(f.db.prepare('SELECT disabled_at FROM staff_accounts WHERE id=?').get(admin).disabled_at,null);
}finally{f.close();}});

test('account data changes are recorded, and the commission changes through the request',async()=>{const f=await fixture();try{
 const id=person(f,'ana@example.test',{name:'Ana Prueba',username:'ana'});person(f,'beto@example.test',{username:'beto'});
 const app=application(f,'ana@example.test','gobierno','in_review');
 const appVersion=()=>f.db.prepare('SELECT updated_at FROM membership_applications WHERE id=?').get(app).updated_at;
 assert.equal((await act(f,id,{action:'update',name:'Ana',username:'beto',expectedUpdatedAt:version(f,id)})).status,409,'username in use');
 assert.equal((await act(f,id,{action:'update',name:'Ana',username:'NO VALE',expectedUpdatedAt:version(f,id)})).status,400);
 assert.equal((await act(f,id,{action:'update',name:'Ana María Prueba',username:'ana.maria',commission:'cultura',expectedUpdatedAt:version(f,id),expectedApplicationUpdatedAt:appVersion()})).status,200);
 const row=f.db.prepare('SELECT name,username FROM staff_accounts WHERE id=?').get(id);assert.deepEqual({...row},{name:'Ana María Prueba',username:'ana.maria'});
 assert.equal(f.db.prepare('SELECT commission FROM membership_applications WHERE id=?').get(app).commission,'cultura');
 assert.match(f.db.prepare("SELECT body FROM membership_events WHERE application_id=? AND kind='updated'").get(app).body,/Cultura/);
 const audit=f.db.prepare("SELECT metadata_json FROM audit_logs WHERE action='person.update'").get();assert.deepEqual(JSON.parse(audit.metadata_json),{fields:['name','username','commission']});
 assert.doesNotMatch(audit.metadata_json,/Ana/);
 assert.equal((await act(f,id,{action:'update',name:'Ana María Prueba',username:'ana.maria',expectedUpdatedAt:version(f,id)})).status,400,'no changes');
}finally{f.close();}});

test('deletion needs the exact username and leaves no rows or stored files of the person',async()=>{const f=await fixture();try{
 const email='ana@example.test',id=person(f,email,{name:'Ana Prueba',username:'ana'}),other=person(f,'beto@example.test',{username:'beto'});
 const app=application(f,email,'gobierno','accepted',{enlaces:true,enlacesPlan:'Plan de prueba'}),now=Date.now();
 f.db.prepare("INSERT INTO membership_events(id,application_id,kind,body,actor_type,actor_email,created_at) VALUES(?,?,'submitted','Recibida','applicant',?,?)").run(crypto.randomUUID(),app,email,now);
 const otherApp=application(f,'beto@example.test','cultura','in_review');
 f.db.prepare("INSERT INTO membership_events(id,application_id,kind,body,actor_type,actor_email,created_at) VALUES(?,?,'note','Nota de Ana como administradora','admin',?,?)").run(crypto.randomUUID(),otherApp,email,now);
 await seedReviewedIdentityDocuments(f,id);
 const key=(doc)=>f.db.prepare('SELECT object_key FROM commission_documents WHERE id=?').get(doc).object_key;
 const insertDoc=(owner,item,category)=>{const doc=crypto.randomUUID(),k='private/commission/'+doc;f.db.prepare("INSERT INTO commission_documents(id,owner_id,item_id,category,object_key,name,mime,size,status,notice_snapshot,created_at,updated_at,retention_until) VALUES(?,?,?,?,?,'archivo.pdf','application/pdf',8,'received','s',?,?,?)").run(doc,owner,item,category,k,now,now,now+86400000);f.bucket.files.set(k,new Uint8Array(8));return doc;};
 const item=crypto.randomUUID(),otherItem=crypto.randomUUID();
 for(const [itemId,owner] of [[item,id],[otherItem,other]])f.db.prepare("INSERT INTO commission_items(id,owner_id,commission,kind,title,details_json,status,created_at,updated_at,retention_until) VALUES(?,?,'gobierno','event','Foro de prueba','{}','submitted',?,?,?)").run(itemId,owner,now,now,now+86400000);
 const evidenceByOther=insertDoc(other,item,'evidence'),evidenceOnOther=insertDoc(id,otherItem,'evidence'),otherOwn=insertDoc(other,otherItem,'evidence'),letter=insertDoc(id,null,'motivation_letter');
 f.db.prepare('INSERT INTO commission_messages(id,item_id,author_id,body,created_at) VALUES(?,?,?,?,?),(?,?,?,?,?),(?,?,?,?,?)').run(crypto.randomUUID(),item,other,'Mensaje de Beto',now,crypto.randomUUID(),otherItem,id,'Mensaje de Ana',now,crypto.randomUUID(),otherItem,other,'Respuesta de Beto',now);
 f.db.prepare("INSERT INTO commission_members(id,account_id,commission,role,active,updated_at,updated_by) VALUES(?,?,'gobierno','member',1,?,?),(?,?,'cultura','member',1,?,?)").run(crypto.randomUUID(),id,now,other,crypto.randomUUID(),other,now,id);
 f.db.prepare("INSERT INTO commission_affiliations(account_id,folio,status,updated_at,retention_until) VALUES(?,'F-1','reported',?,?)").run(id,now,now+86400000);
 f.db.prepare("INSERT INTO workspace_consents(id,account_id,version,snapshot,accepted_at) VALUES(?,?,'v','s',?)").run(crypto.randomUUID(),id,now);
 f.db.prepare("INSERT INTO contact_requests(id,kind,name,email,message,notice_version,retention_until,created_at) VALUES(?,'idea','Ana',?,'Mensaje','v',?,?)").run(crypto.randomUUID(),email,now+86400000,now);
 f.db.prepare("INSERT INTO staff_email_verifications(account_id,token_hash,email,credential_version,return_to,expires_at) VALUES(?,?,?,1,'/',?)").run(id,'f'.repeat(64),email,now+1000);
 f.db.prepare("INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,created_at) VALUES(?,?,'commission.created','commission',?,?),(?,?,'document.reviewed','commission',?,?)").run(crypto.randomUUID(),email,item,now,crypto.randomUUID(),owner,letter,now);
 assert.equal((await act(f,id,{action:'note.add',body:'Nota sobre Ana'})).status,200);
 assert.equal((await act(f,id,{action:'tag.add',tag:'arco'})).status,200);
 f.db.prepare("INSERT INTO outbound_emails(id,batch_id,account_id,subject,status,sent_by,created_at) VALUES(?,?,?,'Hola','sent',?,?)").run(crypto.randomUUID(),'b',id,owner,now);
 const keys=f.db.prepare('SELECT object_key FROM commission_documents WHERE owner_id=? OR item_id=?').all(id,item).map(row=>row.object_key);
 assert.ok(keys.includes(key(evidenceByOther))&&keys.every(k=>f.bucket.files.has(k)));
 assert.equal(keys.length,6,'three identity documents, the letter and both evidence files tied to the person');

 assert.equal((await act(f,id,{action:'delete',confirm:'Ana',expectedUpdatedAt:version(f,id)})).status,400,'confirmation must match exactly');
 assert.equal((await act(f,id,{action:'delete',confirm:'ana ',expectedUpdatedAt:version(f,id)})).status,400);
 assert.equal(f.db.prepare('SELECT disabled_at FROM staff_accounts WHERE id=?').get(id).disabled_at,null,'a refused confirmation changes nothing');

 f.bucket.failDelete=true;
 const failed=await act(f,id,{action:'delete',confirm:'ana',expectedUpdatedAt:version(f,id)});assert.equal(failed.status,502);assert.match((await failed.json()).error,/no pudimos borrar 6 de 6 archivos/);
 assert.ok(f.db.prepare('SELECT disabled_at FROM staff_accounts WHERE id=?').get(id).disabled_at,'the account stays suspended');
 assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents WHERE owner_id=?').get(id).n,5,'no row is removed when storage fails');
 f.bucket.failDelete=false;
 const done=await act(f,id,{action:'delete',confirm:'ana',expectedUpdatedAt:version(f,id)});assert.equal(done.status,200,await done.clone().text());
 assert.equal((await done.json()).redirect,'/admin/personas');

 for(const k of keys)assert.ok(!f.bucket.files.has(k),'object removed: '+k);
 assert.ok(f.bucket.files.has(key(otherOwn)),'other people keep their files');
 const tables=f.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'").all().map(row=>row.name);
 for(const table of tables){
  const leaked=f.db.prepare(`SELECT * FROM "${table}"`).all().filter(row=>{const text=JSON.stringify(row);return text.includes(id)||text.includes(email)||text.includes(app)||text.includes(item)||text.includes(letter)||text.includes(evidenceOnOther);});
  assert.deepEqual(leaked,[],`${table} still references the person`);
 }
 assert.equal(f.db.prepare('SELECT count(*) n FROM commission_messages').get().n,1,'only the message on the other person\'s item by another author remains');
 assert.equal(f.db.prepare('SELECT count(*) n FROM commission_items').get().n,1);
 assert.equal(f.db.prepare('SELECT count(*) n FROM membership_events WHERE application_id=?').get(otherApp).n,1,'events on other requests remain, without the email');
 const audit=f.db.prepare("SELECT * FROM audit_logs WHERE action='person.delete'").get();
 assert.match(audit.entity_id,/^persona-eliminada-[a-f0-9]{16}$/);assert.equal(audit.actor_email,owner);
 assert.deepEqual(JSON.parse(audit.metadata_json),{documents:6,items:1,applications:1,messages:1});
 assert.equal((await f.call('/admin/personas/'+id,'GET',undefined,owner)).status,404);
 assert.equal((await act(f,other,{action:'note.add',body:'Beto sigue disponible'})).status,200);
}finally{f.close();}});

test('the export is an Excel-ready CSV with neutralized formulas and an audit row',async()=>{const f=await fixture();try{
 person(f,'ana@example.test',{name:'=HYPERLINK("https://evil.example","Abrir")'});person(f,'beto@example.test',{name:'Beto, "el bueno"'});person(f,'caro@example.test',{name:'@Caro'});
 application(f,'beto@example.test','cultura','submitted');
 const response=await f.call('/api/admin/personas/exportar','POST',{filters:{q:'example',status:'',commission:'nada'}},owner);
 assert.equal(response.status,200,await response.clone().text());
 assert.match(response.headers.get('content-type'),/^text\/csv; charset=utf-8/);
 assert.match(response.headers.get('content-disposition'),/^attachment; filename="personas-\d{4}-\d{2}-\d{2}\.csv"$/);
 const bytes=new Uint8Array(await response.arrayBuffer());assert.deepEqual([...bytes.slice(0,3)],[0xef,0xbb,0xbf]);
 const text=new TextDecoder().decode(bytes.slice(3)),lines=text.trimEnd().split('\r\n');
 assert.equal(lines[0],'"Nombre","Usuario","Correo","Comisión","Solicitud","Documentos revisados (de 3)","Afiliación PAN","Etiquetas","Alta","Suspendida desde"');
 assert.equal(lines.length,4);
 assert.ok(text.includes('"\'=HYPERLINK(""https://evil.example"",""Abrir"")"'),'formula is neutralized and quotes are doubled');
 assert.ok(text.includes('"\'@Caro"'));assert.ok(text.includes('"Beto, ""el bueno"""'));assert.ok(text.includes('"Cultura","Recibida","0"'));
 assert.doesNotMatch(text,/owner@example/);
 const audit=f.db.prepare("SELECT * FROM audit_logs WHERE action='people.export'").get();assert.equal(audit.actor_email,owner);
 assert.deepEqual(JSON.parse(audit.metadata_json),{filters:{search:true},rows:3});
 const filtered=await f.call('/api/admin/personas/exportar','POST',{filters:{commission:'cultura'}},owner);
 assert.equal(new TextDecoder().decode(await filtered.arrayBuffer()).trimEnd().split('\r\n').length,2);
 assert.deepEqual(JSON.parse(f.db.prepare("SELECT metadata_json FROM audit_logs WHERE action='people.export' ORDER BY created_at DESC,rowid DESC").get().metadata_json),{filters:{commission:'cultura',search:false},rows:1});
}finally{f.close();}});

test('without Resend the panel says so and records nothing as sent',async()=>{const f=await fixture({RESEND_API_KEY:''});try{
 const id=person(f,'ana@example.test');batches.length=0;
 const preview=await ok(await f.call('/api/admin/personas/correo','POST',{mode:'preview',accountId:id},owner));
 assert.deepEqual(preview,{count:1,excluded:0,limit:100,configured:false});
 const sent=await f.call('/api/admin/personas/correo','POST',{mode:'send',accountId:id,subject:'Aviso',body:'Hola',confirm:true,expectedCount:1},owner);
 assert.equal(sent.status,503);assert.match((await sent.json()).error,/no está configurado.*No se envió nada/);
 assert.equal(f.db.prepare('SELECT count(*) n FROM outbound_emails').get().n,0);assert.equal(batches.length,0);
 assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='people.email'").get().n,0);
}finally{f.close();}});

test('messages go through Resend in one batch, to confirmed addresses only, one row per recipient',async()=>{const f=await fixture();try{
 batches.length=0;batchFailure=false;
 const ana=person(f,'ana@example.test'),beto=person(f,'beto@example.test');person(f,'caro@example.test');
 application(f,'ana@example.test','gobierno');application(f,'beto@example.test','gobierno');application(f,'caro@example.test','gobierno');
 f.db.prepare("UPDATE staff_accounts SET email_verification_required=1,email_verified_at=NULL WHERE email='caro@example.test'").run();
 const group={filters:{commission:'gobierno'}};
 assert.deepEqual(await ok(await f.call('/api/admin/personas/correo','POST',{...group,mode:'preview'},owner)),{count:2,excluded:1,limit:100,configured:true});
 const stale=await f.call('/api/admin/personas/correo','POST',{...group,mode:'send',subject:'Reunión',body:'Nos vemos el sábado.',confirm:true,expectedCount:3},owner);
 assert.equal(stale.status,409);assert.equal(batches.length,0);
 assert.equal((await f.call('/api/admin/personas/correo','POST',{...group,mode:'send',subject:'Reunión',body:'Nos vemos el sábado.',expectedCount:2},owner)).status,409,'explicit confirmation is required');
 const sent=await ok(await f.call('/api/admin/personas/correo','POST',{...group,mode:'send',subject:'Reunión\r\nBcc: x@evil.example',body:'Nos vemos el sábado.',confirm:true,expectedCount:2},owner));
 assert.equal(sent.sent,2);assert.equal(batches.length,1);
 assert.deepEqual(batches[0].messages.map(m=>m.to[0]).sort(),['ana@example.test','beto@example.test']);
 assert.ok(batches[0].messages.every(m=>m.subject==='Reunión Bcc: x@evil.example'&&m.text==='Nos vemos el sábado.'&&m.from==='no-reply@example.test'&&!m.html));
 assert.match(batches[0].headers.get('idempotency-key'),/^apj-panel-/);
 const rows=f.db.prepare('SELECT * FROM outbound_emails ORDER BY account_id').all();
 assert.equal(rows.length,2);assert.ok(rows.every(row=>row.status==='sent'&&row.provider_id.startsWith('re_')&&row.sent_by===owner&&row.batch_id===rows[0].batch_id));
 assert.deepEqual(rows.map(row=>row.account_id).sort(),[ana,beto].sort());
 const audit=JSON.parse(f.db.prepare("SELECT metadata_json FROM audit_logs WHERE action='people.email'").get().metadata_json);
 assert.deepEqual(audit,{batchId:rows[0].batch_id,recipients:2,filters:{commission:'gobierno',search:false}});
 batchFailure=true;
 const failed=await f.call('/api/admin/personas/correo','POST',{mode:'send',accountId:ana,subject:'Recordatorio',body:'Texto',confirm:true,expectedCount:1},owner);
 assert.equal(failed.status,502);
 assert.equal(f.db.prepare("SELECT status FROM outbound_emails WHERE subject='Recordatorio'").get().status,'failed');
 batchFailure=false;
 assert.match(await(await f.call('/admin/personas/'+ana,'GET',undefined,owner)).text(),/Recordatorio/);
 for(let n=0;n<101;n++){const id=person(f,`grupo${n}@example.test`);void id;}
 const tooMany=await ok(await f.call('/api/admin/personas/correo','POST',{mode:'preview',filters:{q:'grupo'}},owner));assert.equal(tooMany.count,101);
 assert.equal((await f.call('/api/admin/personas/correo','POST',{mode:'send',filters:{q:'grupo'},subject:'Masivo',body:'Texto',confirm:true,expectedCount:101},owner)).status,400);
}finally{f.close();}});

test('administration resends the confirmation e-mail only to pending, active accounts',async()=>{const f=await fixture();try{
 const id=person(f,'ana@example.test'),done=person(f,'beto@example.test');
 f.db.prepare('UPDATE staff_accounts SET email_verification_required=1,email_verified_at=NULL WHERE id=?').run(id);
 const before=f.mail.length;
 assert.equal((await act(f,id,{action:'resend-confirmation',expectedUpdatedAt:version(f,id)})).status,200);
 assert.equal(f.mail.length,before+1);assert.deepEqual(f.mail.at(-1).to,['ana@example.test']);
 assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='person.confirmation_resent' AND entity_id=?").get(id).n,1);
 assert.equal((await act(f,done,{action:'resend-confirmation',expectedUpdatedAt:version(f,done)})).status,409);
 f.db.prepare('UPDATE staff_accounts SET disabled_at=1 WHERE id=?').run(id);
 assert.equal((await act(f,id,{action:'resend-confirmation',expectedUpdatedAt:version(f,id)})).status,409);
 assert.equal(f.mail.length,before+1);
}finally{f.close();}});
