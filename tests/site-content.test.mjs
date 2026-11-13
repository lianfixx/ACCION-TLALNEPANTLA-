import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

const owner='owner@example.test',editor='editor@example.test',member='member@example.test';
function bucket(){const files=new Map();return{files,async put(k,v){files.set(k,new Uint8Array(v));return{};},async get(k){return files.has(k)?{body:new Response(files.get(k)).body}:null;},async delete(k){for(const id of Array.isArray(k)?k:[k])files.delete(id);}};}
const fixture=async()=>{const b=bucket(),f=await createWorkerFixture({BUCKET:b});f.bucket=b;return f;};
const save=(f,key,value,expectedUpdatedAt=0,actor=owner)=>f.call('/api/admin/contenido','POST',{action:'save',key,value,expectedUpdatedAt},actor);
const reset=(f,key,expectedUpdatedAt,actor=owner)=>f.call('/api/admin/contenido','POST',{action:'reset',key,expectedUpdatedAt},actor);
const page=async(f,path)=>(await f.call(path,'GET',undefined,null)).text();
const gobierno={name:'Gobierno y ciudad',purpose:'Organiza foros sobre la ciudad con escuelas de Tlalnepantla.',tasks:['Preparar el programa del foro.','Registrar acuerdos y pendientes.'],result:'Un resumen de cada foro con sus acuerdos.'};
const pdf=text=>new TextEncoder().encode('%PDF-1.4\n'+text+'\n%%EOF');

test('only administration can change site content', async()=>{const f=await fixture();try{
 f.seedAccount(member);f.seedAccount(editor);
 f.db.prepare("INSERT INTO user_roles(email,role,created_at,created_by) VALUES(?,'editor',1,?)").run(editor,owner);
 assert.equal((await save(f,'commission.gobierno',gobierno,0,null)).status,403,'no session');
 assert.equal((await save(f,'commission.gobierno',gobierno,0,member)).status,403,'a participant account');
 assert.equal((await save(f,'commission.gobierno',gobierno,0,editor)).status,403,'an editor is not an administrator');
 assert.equal((await f.callRaw('/api/admin/documentos/guia-gobierno?expectedUploadedAt=0',pdf('x'),editor,{'content-type':'application/pdf'})).status,403);
 assert.equal((await f.callRaw('/api/admin/documentos/guia-gobierno?expectedUploadedAt=0',pdf('x'),null,{'content-type':'application/pdf'})).status,403);
 const foreign=await f.call('/api/admin/contenido','POST',{action:'save',key:'commission.gobierno',value:gobierno,expectedUpdatedAt:0},owner,{origin:'https://outside.example'});
 assert.equal(foreign.status,403,'another origin');
 assert.equal(f.db.prepare('SELECT count(*) n FROM site_content').get().n,0);
 const panel=await f.call('/admin/contenido','GET',undefined,editor);assert.ok([302,303,307,308].includes(panel.status),'the panel page redirects non-administrators');assert.match(panel.headers.get('location')??'',/\/admin$/);
 assert.equal((await f.call('/admin/contenido','GET',undefined,owner)).status,200);
}finally{f.close();}});

test('a saved commission appears on the public pages and resetting restores the original', async()=>{const f=await fixture();try{
 assert.match(await page(f,'/comisiones'),/Organiza foros, parlamentos y modelos de Naciones Unidas\./);
 const saved=await save(f,'commission.gobierno',gobierno);assert.equal(saved.status,200,await saved.clone().text());
 const {record}=await saved.json();assert.equal(record.custom,true);assert.ok(record.updatedAt>0);
 for(const path of ['/comisiones','/','/participacion']){const html=await page(f,path);assert.match(html,/Gobierno y ciudad/,path);assert.match(html,/Organiza foros sobre la ciudad con escuelas de Tlalnepantla\./,path);}
 const comisiones=await page(f,'/comisiones');assert.match(comisiones,/Registrar acuerdos y pendientes\./);assert.doesNotMatch(comisiones,/parlamentos y modelos de Naciones Unidas/);
 const audit=f.db.prepare("SELECT actor_email,action,entity_id FROM audit_logs WHERE action LIKE 'content.%'").all();
 assert.deepEqual(audit.map(row=>({...row})),[{actor_email:owner,action:'content.update',entity_id:'commission.gobierno'}]);
 const order=['mujeres','gobierno','administracion','comunicacion','cultura','tecnologia'];
 assert.equal((await save(f,'commissions.order',{order})).status,200);
 const reordered=await page(f,'/comisiones');assert.ok(reordered.indexOf('id="mujeres"')<reordered.indexOf('id="gobierno"'),'the saved order is used');
 const restored=await reset(f,'commission.gobierno',record.updatedAt);assert.equal(restored.status,200,await restored.clone().text());
 assert.equal(f.db.prepare("SELECT count(*) n FROM site_content WHERE key='commission.gobierno'").get().n,0,'reset deletes the row');
 const back=await page(f,'/comisiones');assert.match(back,/Organiza foros, parlamentos y modelos de Naciones Unidas\./);assert.doesNotMatch(back,/Gobierno y ciudad/);
 assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE action='content.reset' AND entity_id='commission.gobierno'").get().n,1);
}finally{f.close();}});

test('home, Participa and process steps read the edited text', async()=>{const f=await fixture();try{
 assert.equal((await save(f,'home.hero',{eyebrow:'Tlalnepantla de Baz',title:'Tu energía puede',emphasis:'cambiar tu colonia.'})).status,200);
 const steps={cuenta:{title:'Abre tu cuenta',hint:'Usuario y contraseña.'},solicitud:{title:'Envía tu solicitud',hint:'Tus datos y tu comisión.'},documentos:{title:'Sube tus documentos',hint:'INE y comprobante.'},comision:{title:'Te confirmamos',hint:'Administración revisa.'},afiliacion:{title:'Afiliación al PAN',hint:'Último paso.'}};
 assert.equal((await save(f,'process.steps',{steps})).status,200);
 const home=await page(f,'/');assert.match(home,/Tu energía puede<br\/?><em>cambiar tu colonia\.<\/em>/);assert.doesNotMatch(home,/mover Tlalnepantla\./);
 assert.match(await page(f,'/comisiones'),/Abre tu cuenta/);assert.match(await page(f,'/participacion'),/Abre tu cuenta/);
 assert.equal((await save(f,'enlaces.calendar',{title:'Fechas',emphasis:'de la convocatoria.',items:[{when:'20 de noviembre',what:'Se publica la convocatoria revisada'}]})).status,200);
 const enlaces=await(await f.call('/enlaces','GET',undefined,owner)).text();assert.match(enlaces,/Se publica la convocatoria revisada/);assert.doesNotMatch(enlaces,/Cierran postulaciones a las 23:59/);
 const injected=await save(f,'home.welcome',{title:'<script>alert(1)</script>',text:'Texto'});assert.equal(injected.status,200);
 const escaped=await page(f,'/');assert.doesNotMatch(escaped,/<script>alert\(1\)<\/script>/);assert.match(escaped,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
}finally{f.close();}});

test('content saves are guarded against stale versions', async()=>{const f=await fixture();try{
 const first=await save(f,'commission.cultura',{...gobierno,name:'Cultura viva'});assert.equal(first.status,200);
 const {record}=await first.json();
 const stale=await save(f,'commission.cultura',{...gobierno,name:'Cultura de barrio'},0);assert.equal(stale.status,409,'a second insert from version 0');
 const old=await save(f,'commission.cultura',{...gobierno,name:'Cultura de barrio'},record.updatedAt-1);assert.equal(old.status,409,'an older version');
 assert.equal((await reset(f,'commission.cultura',record.updatedAt+5)).status,409,'reset of a version that is not current');
 assert.match(await page(f,'/comisiones'),/Cultura viva/);
 const next=await save(f,'commission.cultura',{...gobierno,name:'Cultura de barrio'},record.updatedAt);assert.equal(next.status,200);
 assert.match(await page(f,'/comisiones'),/Cultura de barrio/);
}finally{f.close();}});

test('content is validated strictly', async()=>{const f=await fixture();try{
 const base={eyebrow:'Cómo se selecciona',note:'Evalúan tres personas.'};
 const wrong=await save(f,'enlaces.selection',{...base,criteria:[{label:'Carta de motivos',percent:30},{label:'Entrevista',percent:30}]});
 assert.equal(wrong.status,400);assert.match((await wrong.json()).error,/suman 60\. Deben sumar 100/);
 assert.equal((await save(f,'enlaces.selection',{...base,criteria:[{label:'Carta de motivos',percent:60},{label:'Entrevista',percent:40}]})).status,200);
 assert.equal((await save(f,'commission.gobierno',{...gobierno,tasks:[]})).status,400,'at least one task');
 assert.equal((await save(f,'commission.gobierno',{...gobierno,tasks:Array(9).fill('Tarea')})).status,400,'at most eight tasks');
 assert.equal((await save(f,'commission.gobierno',{...gobierno,name:'x'.repeat(61)})).status,400,'name length');
 assert.equal((await save(f,'commission.gobierno',{...gobierno,id:'otra'})).status,400,'unknown fields');
 assert.equal((await save(f,'commission.gobierno',{...gobierno,result:42})).status,400,'types');
 assert.equal((await save(f,'commission.nueva',gobierno)).status,400,'commissions cannot be added');
 assert.equal((await save(f,'commissions.order',{order:['gobierno','gobierno','administracion','comunicacion','cultura','tecnologia']})).status,400,'order must keep the six commissions');
 assert.equal((await save(f,'commissions.order',{order:['gobierno','administracion','comunicacion','cultura','tecnologia']})).status,400);
 assert.equal(f.db.prepare("SELECT count(*) n FROM site_content WHERE key<>'enlaces.selection'").get().n,0);
 // A corrupted row never breaks the public page: the default is shown instead.
 f.db.prepare("INSERT INTO site_content(key,value_json,updated_at,updated_by) VALUES('commission.tecnologia','{\"name\":1}',5,?)").run(owner);
 assert.match(await page(f,'/comisiones'),/Cuida y mejora las herramientas digitales del equipo\./);
}finally{f.close();}});

test('a replacement PDF is served from the public route and the original comes back after reset', async()=>{const f=await fixture();try{
 const original=await f.call('/archivos/guia-gobierno.pdf','GET',undefined,null);
 assert.equal(original.status,302);assert.equal(new URL(original.headers.get('location')).pathname,'/documentos/guia-gobierno.pdf');
 assert.equal((await f.call('/archivos/otro.pdf','GET',undefined,null)).status,404);
 assert.match(await page(f,'/comisiones'),/href="\/archivos\/guia-gobierno\.pdf"/,'links use the dynamic route');
 assert.doesNotMatch(await page(f,'/comisiones'),/\/documentos\/guia-/);
 const notPdf=await f.callRaw('/api/admin/documentos/guia-gobierno?expectedUploadedAt=0','<html>no es un PDF</html>',owner,{'content-type':'application/pdf'});
 assert.equal(notPdf.status,415);
 assert.equal((await f.callRaw('/api/admin/documentos/guia-falsa?expectedUploadedAt=0',pdf('x'),owner,{'content-type':'application/pdf'})).status,404);
 const tooLarge=await f.callRaw('/api/admin/documentos/guia-gobierno?expectedUploadedAt=0',new Uint8Array(15*1024*1024+1).fill(32),owner,{'content-type':'application/pdf'});
 assert.equal(tooLarge.status,413);
 const uploaded=await f.callRaw('/api/admin/documentos/guia-gobierno?expectedUploadedAt=0',pdf('nueva guía'),owner,{'content-type':'application/pdf','x-file-name':encodeURIComponent('Guía nueva.pdf')});
 assert.equal(uploaded.status,201,await uploaded.clone().text());
 const {document}=await uploaded.json();assert.match(document.object_key,/^site-documents\/guia-gobierno\/[a-f0-9]{64}\.pdf$/);assert.equal(document.file_name,'Guía nueva.pdf');
 const served=await f.call('/archivos/guia-gobierno.pdf','GET',undefined,null);
 assert.equal(served.status,200);assert.equal(served.headers.get('content-type'),'application/pdf');assert.match(served.headers.get('content-disposition'),/filename="guia-gobierno\.pdf"/);assert.match(served.headers.get('cache-control'),/max-age=60/);
 assert.equal(await served.text(),'%PDF-1.4\nnueva guía\n%%EOF');
 assert.equal((await f.callRaw('/api/admin/documentos/guia-gobierno?expectedUploadedAt=0',pdf('otra'),owner,{'content-type':'application/pdf'})).status,409,'a stale upload is refused');
 const replaced=await f.callRaw('/api/admin/documentos/guia-gobierno?expectedUploadedAt='+document.uploaded_at,pdf('tercera'),owner,{'content-type':'application/pdf'});
 assert.equal(replaced.status,201);const second=(await replaced.json()).document;
 assert.deepEqual(f.db.prepare('SELECT object_key FROM site_documents').all().map(row=>row.object_key),[second.object_key]);assert.deepEqual([...f.bucket.files.keys()],[second.object_key],'the previous version is removed from storage');
 assert.equal((await f.call('/api/admin/documentos/guia-gobierno','DELETE',{expectedUploadedAt:document.uploaded_at})).status,409);
 const restored=await f.call('/api/admin/documentos/guia-gobierno','DELETE',{expectedUploadedAt:second.uploaded_at});assert.equal(restored.status,200,await restored.clone().text());
 assert.equal(f.db.prepare('SELECT count(*) n FROM site_documents').get().n,0);assert.equal(f.bucket.files.size,0,'reset deletes the stored object');
 const back=await f.call('/archivos/guia-gobierno.pdf','GET',undefined,null);assert.equal(back.status,302);assert.equal(new URL(back.headers.get('location')).pathname,'/documentos/guia-gobierno.pdf');
 assert.deepEqual(f.db.prepare("SELECT action FROM audit_logs WHERE action LIKE 'document.%' ORDER BY rowid").all().map(row=>row.action),['document.replace','document.replace','document.reset']);
}finally{f.close();}});
