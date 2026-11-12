import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

const config={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
const post={title:'Publicación de prueba',excerpt:'Resumen suficientemente largo para la prueba aislada.',body:'Contenido de prueba almacenado únicamente en SQLite temporal.',status:'draft'};
const activity={title:'Reunión de prueba',description:'Detalles de una reunión aislada de prueba.',location:'Sala de prueba',startsAt:Date.UTC(2026,11,2,15),endsAt:Date.UTC(2026,11,2,16),status:'draft'};
const user='member@example.test';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0]);
function bucket(){const files=new Map();return{files,async put(k,v){files.set(k,new Uint8Array(v));},async get(k){return files.has(k)?{body:new Response(files.get(k)).body}:null;},async delete(k){files.delete(k);}};}
const images={async info(){return{format:'image/png',width:1,height:1};},input(){return{transform(){return{async output(){return{contentType:()=> 'image/png',image:()=>new Blob([png]).stream()};}};}};}};
function multipart(type='application/octet-stream',bytes=png){const form=new FormData();form.set('file',new File([bytes],'prueba.png',{type}));form.set('altText','Imagen de prueba aislada');return form;}
function role(f,email,value){f.seedAccount(email);f.db.prepare('INSERT INTO user_roles(email,role,created_at,created_by) VALUES(?,?,1,?)').run(email,value,'owner@example.test');}
function member(f,email=user){f.seedAccount(email);const id=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email).id;f.db.prepare('INSERT INTO commission_members(id,account_id,commission,role,active,updated_at,updated_by) VALUES(?,?,?,\'member\',1,1,\'owner\')').run(crypto.randomUUID(),id,'gobierno');return id;}
async function accept(f,email=user){const info=await(await f.call('/api/espacio','GET',undefined,email)).json();const r=await f.call('/api/espacio','POST',{action:'consent',version:'comisiones-2026-10-06.1',noticeToken:info.noticeToken,consent:true},email);assert.equal(r.status,200,await r.clone().text());}
async function token(f,path='/crear-cuenta',email=null){const html=(await(await f.call(path,'GET',undefined,email)).text()).replaceAll('\\"','"');return html.match(/"noticeToken":"([a-f0-9]{64})"/)[1];}
function settings(){return{...config,MEMBERSHIP_ENABLED:'0',CONTACT_RETENTION_DAYS:'90',COMMENTS_RETENTION_DAYS:'90',SOCIAL_INSTAGRAM:'',SOCIAL_FACEBOOK:'',SOCIAL_X:'',SOCIAL_YOUTUBE:'',SOCIAL_WHATSAPP:'',DATA_CONTROLLER_LEGAL_BASIS:'',TRANSPARENCY_ADDRESS:''};}
function revokeAtCommit(f,email,mode='session'){f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare(mode==='role'?'UPDATE user_roles SET revoked_at=1 WHERE email=?':'DELETE FROM staff_sessions WHERE account_id=(SELECT id FROM staff_accounts WHERE email=?)').run(email);};}
const audits=f=>f.db.prepare('SELECT count(*) n FROM audit_logs').get().n;

test('partial event dates save as drafts and a complete zero-budget event can be submitted',async()=>{const f=await createWorkerFixture(config);try{member(f);await accept(f);
 const event={action:'create',kind:'event',commission:'gobierno',title:'Reunión de prueba',submit:false,startsAt:activity.startsAt,details:{}};
 let r=await f.call('/api/espacio','POST',event,user);assert.equal(r.status,201,await r.clone().text());const id=(await r.json()).id,row=f.db.prepare('SELECT * FROM commission_items WHERE id=?').get(id);assert.equal(row.starts_at,activity.startsAt);assert.equal(row.ends_at,null);
 r=await f.call('/api/espacio/items/'+id,'PATCH',{action:'status',status:'submitted',expectedUpdatedAt:row.updated_at},user);assert.equal(r.status,400);
 const details={objective:'Revisar propuestas',audience:'Equipo de la comisión',responsible:'Responsable de prueba',program:'Revisión y acuerdos',resources:'Material de trabajo',budget:'0',permissions:'Solicitar espacio',result:'Acuerdos registrados'};
 r=await f.call('/api/espacio/items/'+id,'PATCH',{...event,action:'edit',expectedUpdatedAt:row.updated_at,venue:'Sala del Comité',endsAt:activity.endsAt,submit:true,details},user);assert.equal(r.status,200,await r.clone().text());assert.equal(f.db.prepare('SELECT status FROM commission_items WHERE id=?').get(id).status,'submitted');
 }finally{f.close();}});

test('six distinct accounts can register from one shared network while identifier quotas remain enforced',async()=>{const f=await createWorkerFixture(config);try{const noticeToken=await token(f);const body={name:'Persona de prueba',password:'una frase privada para pruebas aisladas',adult:true,consent:true,noticeToken,'cf-turnstile-response':'isolated-challenge'};
 for(let n=0;n<6;n++){const r=await f.call('/api/registro-cuenta','POST',{...body,email:`member${n}@example.test`,username:`member${n}`},null,{'CF-Connecting-IP':'192.0.2.10'});assert.equal(r.status,201,await r.clone().text());}
 for(let n=1;n<=5;n++){const r=await f.call('/api/registro-cuenta','POST',{...body,email:'member0@example.test',username:'member0'},null,{'CF-Connecting-IP':'192.0.2.10'});assert.equal(r.status,n<5?409:429);}
 assert.equal(f.db.prepare('SELECT count(*) n FROM staff_accounts').get().n,6);
 }finally{f.close();}});

test('username patterns work with current HTML syntax and the sign-in link preserves the selected commission',async()=>{const f=await createWorkerFixture(config);try{const html=await(await f.call('/crear-cuenta?comision=gobierno','GET',undefined,null)).text();const pattern=html.match(/pattern="([^"]+)"/)[1];const re=new RegExp('^(?:'+pattern+')$','v');assert.ok(re.test('persona-uno'));assert.ok(re.test('persona.uno'));assert.equal(re.test('persona uno'),false);assert.match(html,/href="\/ingresar\?returnTo=%2Fparticipacion%3Fcomision%3Dgobierno%23registro"/);const login=await(await f.call('/ingresar?returnTo=%2Fparticipacion%3Fcomision%3Dgobierno%23registro','GET',undefined,null)).text();assert.match(login,/href="\/crear-cuenta\?comision=gobierno"/);
 }finally{f.close();}});

test('accepted Unicode field lengths fit publication, activity and settings request limits',async()=>{const f=await createWorkerFixture(config);try{let r=await f.call('/api/posts','POST',{...post,body:'é'.repeat(11000)});assert.equal(r.status,201,await r.clone().text());assert.equal(f.db.prepare('SELECT length(body) n FROM posts').get().n,11000);
 r=await f.call('/api/activities','POST',{...activity,title:'界'.repeat(140),description:'界'.repeat(1800),location:'界'.repeat(220),registrationUrl:'https://example.test/'+ 'a'.repeat(960)});assert.equal(r.status,201,await r.clone().text());
 const values={...settings(),DATA_CONTROLLER_NAME:'界'.repeat(180),DATA_CONTROLLER_ADDRESS:'界'.repeat(500),DATA_CONTROLLER_LEGAL_BASIS:'界'.repeat(2000),TRANSPARENCY_ADDRESS:'界'.repeat(500),RIGHTS_PROCEDURE:'界'.repeat(3000)};r=await f.call('/api/admin/settings','PATCH',{values,expectedUpdatedAt:0});assert.equal(r.status,200,await r.clone().text());assert.equal(JSON.parse(f.db.prepare('SELECT values_json FROM site_settings').get().values_json).RIGHTS_PROCEDURE.length,3000);
 }finally{f.close();}});

test('multipart uploads work without Content-Length and infer a missing MIME only from allowed signatures',async()=>{const b=bucket(),f=await createWorkerFixture({BUCKET:b,IMAGES:images,RATE_LIMIT_SECRET:config.RATE_LIMIT_SECRET});try{for(const type of ['', 'application/octet-stream','image/png']){const r=await f.callRaw('/api/media',multipart(type));assert.equal(r.status,201,await r.clone().text());assert.equal((await r.json()).media.visibility,'private');}assert.equal(b.files.size,3);
 assert.equal((await f.callRaw('/api/media',multipart('application/octet-stream',new TextEncoder().encode('<html>invalid image</html>')))).status,400);
 assert.equal((await f.callRaw('/api/media',multipart('image/png'),undefined,{'Content-Length':String(9*1024*1024)})).status,413);
 assert.equal((await f.callRaw('/api/media',multipart('image/png',new Uint8Array(9*1024*1024)))).status,413);assert.equal(b.files.size,3);
 }finally{f.close();}});

test('an upload revoked before its metadata commit leaves neither a stored image nor an audit row',async()=>{const b=bucket(),f=await createWorkerFixture({BUCKET:b,IMAGES:images,RATE_LIMIT_SECRET:config.RATE_LIMIT_SECRET});try{const email='editor@example.test';role(f,email,'editor');revokeAtCommit(f,email,'role');const r=await f.callRaw('/api/media',multipart(),email);assert.equal(r.status,409,await r.clone().text());assert.equal(b.files.size,0);assert.equal(f.db.prepare('SELECT count(*) n FROM media').get().n,0);assert.equal(audits(f),0);
 }finally{f.close();}});

test('private PDF uploads accept unknown MIME and reject files whose bytes are not an allowed format',async()=>{const b=bucket(),f=await createWorkerFixture({...config,BUCKET:b});try{member(f);await accept(f);for(const type of ['', 'application/octet-stream']){const r=await f.callRaw('/api/espacio/documentos?category=ine_front','%PDF-1.4\n%%EOF',user,{'Content-Type':type,'X-File-Name':'documento.pdf'});assert.equal(r.status,201,await r.clone().text());}
 assert.equal((await f.callRaw('/api/espacio/documentos?category=ine_front','<html>no es un documento</html>',user,{'Content-Type':'application/octet-stream','X-File-Name':'documento.pdf'})).status,415);assert.equal(b.files.size,2);
 }finally{f.close();}});

test('administration can save full-length responses and private notes without losing either',async()=>{const f=await createWorkerFixture(config);try{member(f);const noticeToken=await token(f,'/participacion',user);const r=await f.call('/api/incorporaciones','POST',{name:'Persona de prueba',commission:'gobierno',profile:{participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',availability:'Viernes por la tarde',activity:'',experience:'',projects:[]},note:'',consent:true,adultSelfDeclared:true,noticeToken},user);assert.equal(r.status,201);const app=(await r.json()).application;const review=await f.call('/api/admin/incorporaciones/'+app.id,'PATCH',{status:'in_review',response:'界'.repeat(1500),note:'界'.repeat(1500),expectedUpdatedAt:app.updatedAt});assert.equal(review.status,200,await review.clone().text());const rows=f.db.prepare("SELECT kind,length(body) n FROM membership_events WHERE application_id=? AND kind IN ('response','note')").all(app.id);assert.equal(rows.length,2);assert.ok(rows.every(x=>x.n===1500));
 }finally{f.close();}});

for(const mode of ['session','role']) test(`${mode} revocation during admin create, update, review and request writes blocks persistence`,async()=>{
 const cases=[
  {role:'editor',path:'/api/posts',method:'POST',body:post,setup:async()=>{},check:f=>assert.equal(f.db.prepare('SELECT count(*) n FROM posts').get().n,0)},
  {role:'editor',path:'/api/posts/p',method:'PATCH',body:{title:'No debe guardarse',expectedUpdatedAt:1},setup:async f=>{f.db.prepare("INSERT INTO posts(id,slug,title,excerpt,body,status,author_email,created_at,updated_at) VALUES('p','p','Título anterior','Resumen anterior','Contenido anterior','draft','owner',1,1)").run();},check:f=>assert.equal(f.db.prepare('SELECT title FROM posts').get().title,'Título anterior')},
  {role:'editor',path:'/api/activities',method:'POST',body:activity,setup:async()=>{},check:f=>assert.equal(f.db.prepare('SELECT count(*) n FROM activities').get().n,0)},
  {role:'editor',path:'/api/activities/a',method:'PATCH',body:{...activity,title:'No debe guardarse',expectedUpdatedAt:1},setup:async f=>{f.db.prepare("INSERT INTO activities(id,title,description,location,starts_at,ends_at,status,created_at,updated_at) VALUES('a','Anterior','Descripción','Sala',1,2,'draft',1,1)").run();},check:f=>assert.equal(f.db.prepare('SELECT title FROM activities').get().title,'Anterior')},
  {role:'editor',path:'/api/media/m',method:'PATCH',body:{altText:'No debe guardarse',expectedUpdatedAt:1},setup:async f=>{f.db.prepare("INSERT INTO media(id,object_key,file_name,mime_type,size_bytes,alt_text,visibility,uploaded_by,created_at,updated_at) VALUES('m','m','m.png','image/png',10,'Descripción anterior','private','owner',1,1)").run();},check:f=>assert.equal(f.db.prepare('SELECT alt_text FROM media').get().alt_text,'Descripción anterior')},
  {role:'admin',path:'/api/admin/requests/r',method:'PATCH',body:{status:'in_review',expectedUpdatedAt:1},setup:async f=>{f.db.prepare("INSERT INTO contact_requests(id,kind,message,notice_version,retention_until,status,created_at,updated_at) VALUES('r','idea','Prueba','test',9999999999999,'new',1,1)").run();},check:f=>assert.equal(f.db.prepare('SELECT status FROM contact_requests').get().status,'new')},
  {role:'admin',path:'/api/admin/requests/r/entries',method:'POST',body:{kind:'note',body:'No debe guardarse'},expected:404,setup:async f=>{f.db.prepare("INSERT INTO contact_requests(id,kind,message,notice_version,retention_until,status,created_at,updated_at) VALUES('r','idea','Prueba','test',9999999999999,'new',1,1)").run();},check:f=>assert.equal(f.db.prepare('SELECT count(*) n FROM request_entries').get().n,0)},
  {role:'moderator',path:'/api/comments/c',method:'PATCH',body:{status:'approved',expectedUpdatedAt:1},setup:async f=>{f.db.prepare("INSERT INTO posts(id,slug,title,excerpt,body,status,author_email,created_at,updated_at) VALUES('p','p','Título','Resumen','Contenido','draft','owner',1,1)").run();f.db.prepare("INSERT INTO comments(id,post_id,author_email,author_name,body,status,notice_version,consent_at,retention_until,created_at) VALUES('c','p','other@example.test','Prueba','Comentario','pending','test',1,9999999999999,1)").run();},check:f=>assert.equal(f.db.prepare('SELECT status FROM comments').get().status,'pending')}
 ];
 for(const c of cases){const f=await createWorkerFixture();try{const email='delegate@example.test';role(f,email,c.role);await c.setup(f);revokeAtCommit(f,email,mode);const r=await f.call(c.path,c.method,c.body,email);assert.equal(r.status,c.expected??409,`${c.path} ${await r.clone().text()}`);c.check(f);assert.equal(audits(f),0,c.path);}finally{f.close();}}
});

test('owner settings and manual retention recheck the exact session at commit',async()=>{const f=await createWorkerFixture(config);try{f.seedAccount('owner@example.test');revokeAtCommit(f,'owner@example.test');let r=await f.call('/api/admin/settings','PATCH',{values:settings(),expectedUpdatedAt:0});assert.equal(r.status,409);assert.equal(f.db.prepare('SELECT count(*) n FROM site_settings').get().n,0);
 }finally{f.close();}const g=await createWorkerFixture();try{g.db.prepare("INSERT INTO contact_requests(id,kind,message,notice_version,retention_until,status,created_at,updated_at) VALUES('r','idea','Prueba','test',1,'new',1,1)").run();g.seedAccount('owner@example.test');revokeAtCommit(g,'owner@example.test');const r=await g.call('/api/admin/maintenance/retention','POST',{confirmation:'PURGAR_VENCIDOS'});assert.equal(r.status,409,await r.clone().text());assert.equal(g.db.prepare('SELECT count(*) n FROM contact_requests').get().n,1);assert.equal(audits(g),0);await g.scheduled(Date.now());assert.equal(g.db.prepare('SELECT count(*) n FROM contact_requests').get().n,0);
 }finally{g.close();}});

test('forms opened under a different account cannot submit work, private files or a new incorporation',async()=>{const b=bucket(),f=await createWorkerFixture({...config,BUCKET:b});try{const first=member(f),second=member(f,'other@example.test');await accept(f,'other@example.test');const headers={'X-Expected-Account-Id':first};let r=await f.call('/api/espacio','POST',{action:'create',kind:'event',commission:'gobierno',title:'Borrador anterior',submit:false,details:{}},'other@example.test',headers);assert.equal(r.status,412);r=await f.callRaw('/api/espacio/documentos?category=ine_front','%PDF-1.4\n%%EOF','other@example.test',{...headers,'Content-Type':'application/pdf','X-File-Name':'test.pdf'});assert.equal(r.status,412);assert.equal(b.files.size,0);
 const noticeToken=await token(f,'/participacion','other@example.test');const payload={name:'Persona de prueba',commission:'gobierno',profile:{participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',availability:'Viernes por la tarde',activity:'',experience:'',projects:[]},note:'',consent:true,adultSelfDeclared:true,noticeToken};r=await f.call('/api/incorporaciones','POST',payload,'other@example.test',headers);assert.equal(r.status,412);assert.equal(f.db.prepare('SELECT count(*) n FROM membership_applications').get().n,0);r=await f.call('/api/incorporaciones','POST',payload,'other@example.test',{'X-Expected-Account-Id':second});assert.equal(r.status,201,await r.clone().text());
 }finally{f.close();}});

test('public and private page HTML references client assets that exist in the deployable build',async()=>{const f=await createWorkerFixture(config);try{const paths=['/','/comisiones','/agenda','/participacion','/crear-cuenta','/ingresar','/mi-comision','/cuenta','/privacidad','/privacidad/registro','/terminos','/actualidad','/admin/ingresar','/admin/activar','/admin/recuperar','/admin/cuenta','/admin/comisiones',...['publicaciones','agenda','incorporaciones','solicitudes','opiniones','medios','roles','configuracion','auditoria','resumen'].map(s=>'/admin?section='+s)];for(const path of paths){const r=await f.call(path);assert.equal(r.status,200,path);const html=await r.text();assert.doesNotMatch(html.replaceAll('\\"','"'),/"setupPending":true/);const assets=[...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"?]+\.(?:js|css))(?:\?[^"\s]+)?"/g)].map(m=>m[1]);assert.ok(assets.length>0,path);for(const asset of assets)assert.ok(existsSync(new URL('../dist/client'+asset,import.meta.url)),path+' '+asset);}
 }finally{f.close();}});


test('editorial image quotas stop repeated uploads before decoding and leave another editor available',async()=>{
 const b=bucket();let decoded=0;const f=await createWorkerFixture({BUCKET:b,IMAGES:{...images,async info(){decoded++;return images.info();}},RATE_LIMIT_SECRET:config.RATE_LIMIT_SECRET});
 try{
  role(f,'editor@example.test','editor');
  for(let n=0;n<30;n++)assert.equal((await f.callRaw('/api/media',multipart())).status,201);
  const rejected=await f.callRaw('/api/media',multipart());assert.equal(rejected.status,429);assert.ok(Number(rejected.headers.get('Retry-After'))>0);assert.match(rejected.headers.get('Cache-Control'),/no-store/);
  assert.equal(decoded,30);assert.equal(b.files.size,30);assert.equal(f.db.prepare('SELECT count(*) n FROM media').get().n,30);assert.equal(audits(f),30);
  assert.equal((await f.callRaw('/api/media',multipart(),'editor@example.test')).status,201);assert.equal(decoded,31);
 }finally{f.close();}
});

test('the shared daily image quota and unavailable quota storage fail before any new object',async()=>{
 const b=bucket();let decoded=0;const f=await createWorkerFixture({BUCKET:b,IMAGES:{...images,async info(){decoded++;return images.info();}},RATE_LIMIT_SECRET:config.RATE_LIMIT_SECRET});
 try{
  assert.equal((await f.callRaw('/api/media',multipart())).status,201);
  f.db.prepare("UPDATE rate_limits SET count=200 WHERE scope='editorial-media-day'").run();role(f,'editor@example.test','editor');
  assert.equal((await f.callRaw('/api/media',multipart(),'editor@example.test')).status,429);
  f.db.exec("CREATE TEMP TRIGGER fail_media_quota BEFORE INSERT ON rate_limits WHEN NEW.scope='editorial-media-hour' BEGIN SELECT RAISE(ABORT,'isolated quota failure'); END");
  assert.equal((await f.callRaw('/api/media',multipart())).status,503);
  assert.equal(decoded,1);assert.equal(b.files.size,1);assert.equal(f.db.prepare('SELECT count(*) n FROM media').get().n,1);assert.equal(audits(f),1);
 }finally{f.close();}
});

test('account-bound incorporation reads reject a different session without disclosing records',async()=>{
 const f=await createWorkerFixture(config);try{
  const first=member(f),second=member(f,'other@example.test');const noticeToken=await token(f,'/participacion','other@example.test');
  const payload={name:'Persona de prueba',commission:'gobierno',profile:{participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',availability:'Viernes por la tarde',activity:'',experience:'',projects:[]},note:'',consent:true,adultSelfDeclared:true,noticeToken};
  const r=await f.call('/api/incorporaciones','POST',payload,'other@example.test');assert.equal(r.status,201);const id=(await r.json()).application.id;
  for(const path of ['/api/incorporaciones','/api/incorporaciones/'+id,'/api/espacio','/api/espacio/documentos']){
   const rejected=await f.call(path,'GET',undefined,'other@example.test',{'X-Expected-Account-Id':first});assert.equal(rejected.status,412,path);assert.doesNotMatch(await rejected.text(),/Persona de prueba/);
   assert.equal((await f.call(path,'GET',undefined,'other@example.test',{'X-Expected-Account-Id':second})).status,200,path);
  }
 }finally{f.close();}
});

test('comments bind the open form to its account and recheck session and publication at commit',async()=>{
 for(const change of ['account','session','publication','none']){
  const f=await createWorkerFixture({...config,COMMENTS_ENABLED:'1',COMMENTS_RETENTION_DAYS:'90'});try{
   const first=member(f),second=member(f,'other@example.test');
   f.db.prepare("INSERT INTO posts(id,slug,title,excerpt,body,status,author_email,created_at,updated_at) VALUES('p','p','Prueba','Resumen','Contenido','published','owner',1,1)").run();
   f.beforeBatch=statements=>{if(statements.some(s=>s.query.startsWith('INSERT INTO comments'))){f.beforeBatch=undefined;if(change==='session')f.db.prepare('DELETE FROM staff_sessions WHERE account_id=?').run(second);if(change==='publication')f.db.prepare("UPDATE posts SET status='archived' WHERE id='p'").run();}};
   const r=await f.call('/api/comments','POST',{postId:'p',body:'Opinión de prueba',publicName:'Nombre público',consent:true},'other@example.test',{'X-Expected-Account-Id':change==='account'?first:second});
   assert.equal(r.status,change==='none'?201:change==='account'?412:409,await r.clone().text());assert.equal(f.db.prepare('SELECT count(*) n FROM comments').get().n,change==='none'?1:0);
   assert.equal((await f.call('/api/comments','POST',null,'other@example.test')).status,400);
  }finally{f.close();}
 }
});

test('editorial image delivery checks permissions again after reading storage',async()=>{
 for(const change of ['session','role','visibility','none']){const b=bucket(),f=await createWorkerFixture({BUCKET:b});try{
  const email='editor@example.test';role(f,email,'editor');f.db.prepare("INSERT INTO media(id,object_key,file_name,mime_type,size_bytes,alt_text,visibility,uploaded_by,created_at,updated_at) VALUES('m','key','image.png','image/png',12,'Imagen de prueba',?,'editor',1,1)").run(change==='visibility'?'public':'private');await b.put('key',png);
  const original=b.get.bind(b);b.get=async key=>{const result=await original(key);if(change==='session')f.db.prepare('DELETE FROM staff_sessions WHERE account_id=(SELECT id FROM staff_accounts WHERE email=?)').run(email);if(change==='role')f.db.prepare('UPDATE user_roles SET revoked_at=1 WHERE email=?').run(email);if(change==='visibility')f.db.prepare("UPDATE media SET visibility='private' WHERE id='m'").run();return result;};
  const r=await f.call(change==='visibility'?'/api/media/m':'/api/admin/media/m/content','GET',undefined,email);assert.equal(r.status,change==='none'?200:404,change);if(change==='none')assert.deepEqual(new Uint8Array(await r.arrayBuffer()),png);else assert.doesNotMatch(r.headers.get('Content-Type'),/image/);
 }finally{f.close();}}
});

test('failed editorial uploads retain a cleanup ledger and scheduled maintenance removes their objects',async()=>{
 const b=bucket(),remove=b.delete.bind(b),f=await createWorkerFixture({BUCKET:b,IMAGES:images,RATE_LIMIT_SECRET:config.RATE_LIMIT_SECRET});try{
  b.delete=async()=>{throw new Error('Isolated storage failure');};
  f.beforeBatch=()=>{f.beforeBatch=undefined;throw new Error('Isolated metadata failure');};
  const r=await f.callRaw('/api/media',multipart());assert.equal(r.status,500);assert.equal(b.files.size,1);assert.equal(f.db.prepare('SELECT count(*) n FROM media').get().n,0);assert.equal(f.db.prepare('SELECT count(*) n FROM media_uploads').get().n,1);
  f.db.prepare('UPDATE media_uploads SET expires_at=1').run();await f.scheduled(Date.now());assert.equal(b.files.size,1);assert.equal(f.db.prepare('SELECT count(*) n FROM media_uploads').get().n,1);
  b.delete=remove;await f.scheduled(Date.now());assert.equal(b.files.size,0);assert.equal(f.db.prepare('SELECT count(*) n FROM media_uploads').get().n,0);
  assert.equal((await f.callRaw('/api/media',multipart())).status,201);assert.equal(b.files.size,1);assert.equal(f.db.prepare('SELECT count(*) n FROM media_uploads').get().n,0);await f.scheduled(Date.now()+3_600_001);assert.equal(b.files.size,1);
 }finally{f.close();}
});
