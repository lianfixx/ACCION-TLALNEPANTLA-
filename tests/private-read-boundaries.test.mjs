import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

// The hook creates one deterministic interleaving between independent D1 reads.
// It does not alter the production Worker or require a real account or file.
async function readFixture(){
 let f;const hooks={beforeRead:null,afterRead:null};
 function prepare(query,values=[]){
  const execute=()=>{
   hooks.beforeRead?.(query);
   const results=f.db.prepare(query).all(...values).map(row=>({...row}));
   hooks.afterRead?.(query);
   return {success:true,results,meta:{changes:f.db.prepare('SELECT changes() n').get().n}};
  };
  return {query,execute,bind(...next){return prepare(query,next);},async all(){return execute();},async run(){return execute();},async raw(){return execute().results.map(row=>Object.values(row));},async first(column){const row=execute().results[0];return row?(column?row[column]:row):null;}};
 }
 const binding={prepare,async batch(statements){f.db.exec('BEGIN');try{const result=statements.map(s=>s.execute());f.db.exec('COMMIT');return result;}catch(error){f.db.exec('ROLLBACK');throw error;}}};
 f=await createWorkerFixture({DB:binding});return Object.assign(f,{hooks});
}
function seed(f,email='member@example.test',commission='gobierno'){
 f.seedAccount(email);const id=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email).id;
 f.db.prepare('INSERT INTO commission_members(id,account_id,commission,role,active,updated_at,updated_by) VALUES(?,?,?,?,1,1,?)').run(crypto.randomUUID(),id,commission,'member','owner');
 return id;
}
function seedItem(f,owner,status='submitted'){
 const id=crypto.randomUUID(),now=Date.now();
 f.db.prepare("INSERT INTO commission_items(id,owner_id,commission,kind,title,details_json,status,created_at,updated_at,retention_until) VALUES(?,?,'gobierno','question','Actividad privada de prueba','{}',?,?,?,?)").run(id,owner,status,now,now,now+86400000);
 f.db.prepare('INSERT INTO commission_messages(id,item_id,author_id,body,created_at) VALUES(?,?,?,?,?)').run(crypto.randomUUID(),id,owner,'Acuerdo privado de prueba',now);
 return id;
}
function seedDocument(f,owner,itemId=null){
 const id=crypto.randomUUID(),now=Date.now();
 f.db.prepare("INSERT INTO commission_documents(id,owner_id,item_id,category,object_key,name,mime,size,status,notice_snapshot,created_at,updated_at,retention_until) VALUES(?,?,?,?,?,'Archivo privado de prueba.pdf','application/pdf',16,'received','{}',?,?,?)").run(id,owner,itemId,itemId?'evidence':'ine_front','private/test/'+id,now,now,now+86400000);
 return id;
}
function changeBefore(f,pattern,change,phase='beforeRead'){
 let fired=false;f.hooks[phase]=query=>{if(pattern.test(query)){f.hooks[phase]=null;fired=true;change();}};
 return()=>assert.equal(fired,true,'the intended interleaving was exercised');
}
async function denied(response,status){
 assert.equal(response.status,status,await response.clone().text());
 const body=await response.text();assert.doesNotMatch(body,/Actividad privada|Acuerdo privado|Archivo privado/);
}

test('activity detail withholds item and messages if access changes while messages load',async()=>{
 for(const mode of ['commission','session','draft-owner']){
  const f=await readFixture();try{
   const account=seed(f),next=seed(f,'next@example.test'),id=seedItem(f,account,mode==='draft-owner'?'draft':'submitted');
   const checked=changeBefore(f,/SELECT m\.id,m\.body,m\.created_at/,()=>{
    if(mode==='commission')f.db.prepare('UPDATE commission_members SET active=0 WHERE account_id=?').run(account);
    if(mode==='session')f.db.prepare('DELETE FROM staff_sessions WHERE account_id=?').run(account);
    if(mode==='draft-owner')f.db.prepare('UPDATE commission_items SET owner_id=? WHERE id=?').run(next,id);
   });
   await denied(await f.call('/api/espacio/items/'+id,'GET',undefined,'member@example.test'),404);checked();
  }finally{f.close();}
 }
});

test('document metadata page withholds names after administrative access or activity access is removed',async()=>{
 for(const mode of ['admin','commission','withdrawn']){
  const f=await readFixture();try{
   const owner=seed(f),id=mode==='admin'?null:seedItem(f,owner),documentId=seedDocument(f,owner,id);
   let actor='member@example.test',path='/api/espacio/documentos'+(id?'?itemId='+id:'?manage=1');
   if(mode==='admin'){actor='reviewer@example.test';f.seedAccount(actor);f.db.prepare("INSERT INTO user_roles(email,role,created_at,created_by) VALUES(?,'admin',1,'owner')").run(actor);}
   const checked=changeBefore(f,/SELECT d\.id,d\.owner_id,d\.item_id/,()=>{
    if(mode==='admin')f.db.prepare('UPDATE user_roles SET revoked_at=1 WHERE email=?').run(actor);
    if(mode==='commission')f.db.prepare('UPDATE commission_members SET active=0 WHERE account_id=?').run(owner);
    if(mode==='withdrawn')f.db.prepare("UPDATE commission_documents SET status='removed',retention_until=1 WHERE id=?").run(documentId);
   },'afterRead');
   await denied(await f.call(path,'GET',undefined,actor),403);checked();
  }finally{f.close();}
 }
});

test('workspace aggregation rechecks session, administrative role and commission before returning any panel data',async()=>{
 for(const mode of ['session','admin','commission','draft-owner']){
  const f=await readFixture();try{
   let actor='member@example.test';const owner=seed(f),next=seed(f,'next@example.test'),id=seedItem(f,owner,mode==='draft-owner'?'draft':'submitted');
   if(mode==='admin'){actor='reviewer@example.test';f.seedAccount(actor);f.db.prepare("INSERT INTO user_roles(email,role,created_at,created_by) VALUES(?,'admin',1,'owner')").run(actor);}
   const checked=changeBefore(f,/SELECT snapshot FROM workspace_consents/,()=>{
    if(mode==='session')f.db.prepare('DELETE FROM staff_sessions WHERE account_id=?').run(owner);
    if(mode==='admin')f.db.prepare('UPDATE user_roles SET revoked_at=1 WHERE email=?').run(actor);
    if(mode==='commission')f.db.prepare('UPDATE commission_members SET active=0 WHERE account_id=?').run(owner);
    if(mode==='draft-owner')f.db.prepare('UPDATE commission_items SET owner_id=? WHERE id=?').run(next,id);
   });
   await denied(await f.call('/api/espacio'+(mode==='admin'?'?manage=1':''),'GET',undefined,actor),403);checked();
  }finally{f.close();}
 }
});

test('unchanged authorization still returns the workspace, activity messages and private document page',async()=>{
 const f=await readFixture();try{
  const owner=seed(f),id=seedItem(f,owner);seedDocument(f,owner,id);
  for(const path of ['/api/espacio','/api/espacio/items/'+id,'/api/espacio/documentos?itemId='+id]){
   const response=await f.call(path,'GET',undefined,'member@example.test');assert.equal(response.status,200,await response.clone().text());
   assert.match(await response.text(),/Actividad privada|Archivo privado/);
  }
 }finally{f.close();}
});

test('PAN upload cannot complete if the personal documents naturally expire while storage responds',async()=>{
 const realNow=Date.now,started=realNow();let clock=started,f;const files=new Map();
 Date.now=()=>clock;
 const config={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
 const bucket={async put(key,bytes){files.set(key,bytes);clock=started+60_001;return{};},async delete(key){files.delete(key);}};
 try{
  f=await createWorkerFixture({...config,BUCKET:bucket});const account=seed(f);
  for(const category of ['ine_front','ine_back','address']){
   const id=seedDocument(f,account);
   f.db.prepare("UPDATE commission_documents SET category=?,status='checked',retention_until=? WHERE id=?").run(category,started+60_000,id);
  }
  const info=await(await f.call('/api/espacio','GET',undefined,'member@example.test')).json();
  assert.equal(info.personalDocumentsReady,true);
  const consent=await f.call('/api/espacio','POST',{action:'consent',version:'comisiones-2026-10-06.1',noticeToken:info.noticeToken,consent:true},'member@example.test');assert.equal(consent.status,200,await consent.clone().text());
  const result=await f.callRaw('/api/espacio/documentos?category=affiliation','%PDF-1.4\n%%EOF','member@example.test',{'content-type':'application/pdf','x-file-name':'Prueba.pdf'});
  assert.equal(clock,started+60_001,'storage completed after the prerequisite deadline');
  assert.equal(result.status,409,await result.clone().text());
  assert.equal(files.size,0);assert.equal(f.db.prepare("SELECT count(*) n FROM commission_documents WHERE category='affiliation'").get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM commission_affiliations').get().n,0);
 }finally{f?.close();Date.now=realNow;}
});
