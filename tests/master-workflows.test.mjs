import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerFixture } from './helpers/worker-fixture.mjs';
const values={DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',PRIVACY_NOTICE_VERSION:'test-2026',CONTACT_RETENTION_DAYS:'30',COMMENTS_RETENTION_DAYS:'30',SOCIAL_INSTAGRAM:'https://www.instagram.com/example/',SOCIAL_FACEBOOK:'',SOCIAL_X:'',SOCIAL_YOUTUBE:'',SOCIAL_WHATSAPP:''};
const visibleHTML=html=>html.replace(/<!--[\s\S]*?-->/g,'');

test('owner settings persist, appear in the site, preserve activation controls and reject stale edits',async()=>{
 const f=await createWorkerFixture();try{
 f.db.prepare('INSERT INTO user_roles (email,role,created_at,created_by) VALUES (?,?,?,?)').run('admin@example.test','admin',1,'owner@example.test');
 assert.equal((await f.call('/api/admin/settings','PATCH',{values,expectedUpdatedAt:0},'admin@example.test')).status,403);
 assert.equal((await f.call('/api/admin/settings','PATCH',{values:{...values,SOCIAL_INSTAGRAM:'https://evil.example.test'},expectedUpdatedAt:0})).status,400);
 const saved=await f.call('/api/admin/settings','PATCH',{values,expectedUpdatedAt:0});assert.equal(saved.status,200);const record=(await saved.json()).record;
 assert.equal((await f.call('/api/admin/settings','PATCH',{values,expectedUpdatedAt:0})).status,409);
 assert.equal((await f.call('/api/contact','POST',{})).status,503);assert.equal((await f.call('/api/comments','POST',{})).status,503);
 assert.match(await(await f.call('/','GET',undefined,null)).text(),/https:\/\/www.instagram.com\/example\//);
 const admin=await(await f.call('/admin?section=configuracion')).text();assert.match(admin,/Guardar configuración/);assert.match(admin,/Responsable de prueba/);
 assert.equal((await f.call('/api/admin/settings','PATCH',{values:{...values,CONTACT_RETENTION_DAYS:'999'},expectedUpdatedAt:record.updatedAt})).status,400);
 assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='settings.update'").get().n,1);
 }finally{f.close();}
});

test('stored privacy values are the effective public configuration when the environment opens a channel',async()=>{
 const f=await createWorkerFixture({COMMENTS_ENABLED:'1',RATE_LIMIT_SECRET:'z'.repeat(40)});try{
 assert.equal((await f.call('/api/admin/settings','PATCH',{values,expectedUpdatedAt:0})).status,200);
 const page=await(await f.call('/privacidad','GET',undefined,null)).text();assert.match(page,/Responsable de prueba/);assert.match(page,/privacy@example.test/);assert.match(page,/30 días/);
 const row=f.db.prepare("SELECT updated_at n FROM site_settings WHERE id='public'").get();
 assert.equal((await f.call('/api/admin/settings','PATCH',{values:{...values,DATA_CONTROLLER_NAME:''},expectedUpdatedAt:row.n})).status,200);
 assert.equal((await f.call('/api/comments','POST',{})).status,503);
 }finally{f.close();}
});

test('admin finds records beyond 100 and reports global counts independently of a page',async()=>{
 const f=await createWorkerFixture();try{
 const insert=f.db.prepare('INSERT INTO posts (id,slug,title,excerpt,body,status,author_email,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
 for(let i=0;i<107;i++)insert.run(`post-${String(i).padStart(3,'0')}`,`post-${i}`,`Registro_${i}`,'Resumen de prueba para comprobar la búsqueda','Contenido de prueba','published','owner@example.test',1,1,1);
 const fifth=visibleHTML(await(await f.call('/admin?section=publicaciones&page=5')).text());assert.match(fifth,/109 registros/);assert.match(fifth,/página 5 de 5/);assert.match(fifth,/Registro_0/);
 const filtered=visibleHTML(await(await f.call('/admin?section=publicaciones&q=Registro_106')).text());assert.match(filtered,/1 registros/);assert.match(filtered,/Registro_106/);assert.doesNotMatch(filtered,/Registro_105/);
 const summary=await(await f.call('/admin')).text();assert.match(summary,/>109<\/strong>/);
 const literal=visibleHTML(await(await f.call('/admin?section=publicaciones&q=%25')).text());assert.match(literal,/0 registros/);
 const existing=f.db.prepare("SELECT count(*) n FROM posts").get().n;assert.equal(existing,107);
 }finally{f.close();}
});

test('request case files retain notes and drafts, restrict assignment and expire with the parent',async()=>{
 const f=await createWorkerFixture();try{
 const now=Date.now();f.db.prepare('INSERT INTO contact_requests (id,kind,message,notice_version,retention_until,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run('request','idea','Mensaje de prueba','test',now+86400000,'new',now,now);
 assert.equal((await f.call('/api/admin/requests/request','PATCH',{status:'in_review',assignedTo:'nobody@example.test',expectedUpdatedAt:now})).status,400);
 assert.equal((await f.call('/api/admin/requests/request/entries','POST',{kind:'note',body:'Nota privada'},null)).status,403);
 assert.equal((await f.call('/api/admin/requests/request/entries','POST',{kind:'note',body:'Nota privada'})).status,201);
 const draft=await f.call('/api/admin/requests/request/entries','POST',{kind:'response_draft',body:'Borrador de respuesta privada'});assert.equal(draft.status,201);assert.match((await draft.json()).message,/No se ha enviado/);
 const detail=await(await f.call('/api/admin/requests/request/entries')).json();assert.equal(detail.entries.length,2);assert.equal(detail.history.length,2);
 const insert=f.db.prepare('INSERT INTO request_entries (id,request_id,kind,body,actor_email,created_at) VALUES (?,?,?,?,?,?)');
 for(let i=0;i<105;i++)insert.run(`entry-${String(i).padStart(3,'0')}`,'request','note',`Nota de prueba ${i}`,'owner@example.test',1);
 const older=await(await f.call('/api/admin/requests/request/entries?page=5')).json();assert.equal(older.pagination.entryTotal,107);assert.equal(older.pagination.pages,5);assert.equal(older.entries.length,7);assert.equal(older.entries.at(-1).body,'Nota de prueba 0');
 assert.doesNotMatch(JSON.stringify(f.db.prepare("SELECT metadata_json FROM audit_logs").all()),/Nota privada|Borrador de respuesta privada/);
 f.db.prepare("UPDATE contact_requests SET retention_until=? WHERE id='request'").run(now-1);
 assert.equal((await f.call('/api/admin/requests/request/entries')).status,404);
 assert.equal((await f.call('/api/admin/requests/request','PATCH',{status:'closed',assignedTo:'',expectedUpdatedAt:now})).status,404);
 const hidden=visibleHTML(await(await f.call('/admin?section=solicitudes')).text());assert.match(hidden,/0 registros/);assert.doesNotMatch(hidden,/Mensaje de prueba/);
 assert.equal((await f.call('/api/admin/maintenance/retention','POST',{confirmation:'PURGAR_VENCIDOS'})).status,200);
 assert.equal(f.db.prepare('SELECT count(*) n FROM request_entries').get().n,0);
 }finally{f.close();}
});

test('request assignment rechecks the delegate inside the transaction',async()=>{
 const f=await createWorkerFixture();try{
 const now=Date.now();f.db.prepare('INSERT INTO user_roles (email,role,created_at,created_by) VALUES (?,?,?,?)').run('delegate@example.test','admin',1,'owner@example.test');
 f.db.prepare('INSERT INTO contact_requests (id,kind,message,notice_version,retention_until,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run('request','idea','Prueba aislada','test',now+86400000,'new',now,now);
 f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare('UPDATE user_roles SET revoked_at=? WHERE email=?').run(now,'delegate@example.test');};
 assert.equal((await f.call('/api/admin/requests/request','PATCH',{status:'in_review',assignedTo:'delegate@example.test',expectedUpdatedAt:now})).status,409);
 assert.equal(f.db.prepare("SELECT assigned_to FROM contact_requests WHERE id='request'").get().assigned_to,null);assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs").get().n,0);
 }finally{f.close();}
});

test('expired opinions are absent from moderation lists and cannot be changed',async()=>{
 const f=await createWorkerFixture();try{
 f.db.prepare('INSERT INTO posts (id,slug,title,excerpt,body,status,author_email,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run('post','post','Nota','Resumen','Contenido','published','owner@example.test',1,1);
 f.db.prepare('INSERT INTO comments (id,post_id,author_email,author_name,body,status,notice_version,consent_at,retention_until,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('expired','post','test@example.test','Alias','Contenido vencido','pending','test',1,1,1);
 assert.equal((await f.call('/api/comments/expired','PATCH',{status:'approved',expectedUpdatedAt:1})).status,404);
 const html=visibleHTML(await(await f.call('/admin?section=opiniones')).text());assert.match(html,/0 registros/);assert.doesNotMatch(html,/Contenido vencido/);
 assert.equal(f.db.prepare('SELECT status FROM comments').get().status,'pending');
 }finally{f.close();}
});
