import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

const applicant='applicant@example.test',reviewer='reviewer@example.test';
async function fixture(){
 let f;const hooks={afterRead:null};
 function prepare(query,values=[]){
  const execute=()=>{const results=f.db.prepare(query).all(...values).map(row=>({...row}));hooks.afterRead?.(query);return{success:true,results,meta:{changes:f.db.prepare('SELECT changes() n').get().n}};};
  return{query,execute,bind(...next){return prepare(query,next);},async all(){return execute();},async run(){return execute();},async raw(){return execute().results.map(row=>Object.values(row));},async first(column){const row=execute().results[0];return row?(column?row[column]:row):null;}};
 }
 const binding={prepare,async batch(statements){f.db.exec('BEGIN');try{const results=statements.map(s=>s.execute());f.db.exec('COMMIT');return results;}catch(error){f.db.exec('ROLLBACK');throw error;}}};
 f=await createWorkerFixture({DB:binding});return Object.assign(f,{hooks});
}
function seed(f){
 f.seedAccount(applicant);f.seedAccount(reviewer);
 f.db.prepare("INSERT INTO user_roles(email,role,created_at,created_by) VALUES(?,'admin',1,'owner')").run(reviewer);
 const id=crypto.randomUUID(),now=Date.now();
 f.db.prepare("INSERT INTO membership_applications(id,owner_email,name,commission,note,profile_json,reference_code,notice_version,notice_snapshot,consent_text,consent_at,adult_self_declared,retention_until,created_at,updated_at) VALUES(?,?,'Perfil privado de prueba','gobierno','Nota privada del perfil','{}',?,'test','Aviso privado de prueba','Consentimiento privado de prueba',?,1,?,?,?)").run(id,applicant,'TEST-'+id,now,now+86400000,now,now);
 for(const kind of ['response','note'])f.db.prepare("INSERT INTO membership_events(id,application_id,kind,body,actor_type,actor_email,created_at) VALUES(?,?,?,'Historial privado de prueba','admin',?,?)").run(crypto.randomUUID(),id,kind,reviewer,now);
 return id;
}
function interleave(f,pattern,change){
 let fired=false;f.hooks.afterRead=query=>{if(pattern.test(query)){f.hooks.afterRead=null;fired=true;change();}};
 return()=>assert.equal(fired,true,'the change happened after private data loaded');
}
async function noPrivateData(response,status){
 const text=await response.text();assert.equal(response.status,status,text);
 assert.doesNotMatch(text,/Perfil privado|Nota privada|Historial privado|Aviso privado|Consentimiento privado/);
 assert.match(response.headers.get('cache-control'),/no-store/);
}
function revokeSession(f,email,mode){
 if(mode==='session')f.db.prepare('DELETE FROM staff_sessions WHERE account_id=(SELECT id FROM staff_accounts WHERE email=?)').run(email);
 if(mode==='credentials')f.db.prepare('UPDATE staff_accounts SET credential_version=credential_version+1 WHERE email=?').run(email);
 if(mode==='disabled')f.db.prepare('UPDATE staff_accounts SET disabled_at=1 WHERE email=?').run(email);
 if(mode==='session-expiry')f.db.prepare('UPDATE staff_sessions SET expires_at=1 WHERE account_id=(SELECT id FROM staff_accounts WHERE email=?)').run(email);
}

test('applicant list withholds loaded profiles after session revocation, credential reset, disablement or expiry',async()=>{
 for(const mode of ['session','credentials','disabled','session-expiry']){
  const f=await fixture();try{seed(f);
   const check=interleave(f,/SELECT id,owner_email AS ownerEmail.*ORDER BY created_at DESC,id DESC LIMIT 25/,()=>revokeSession(f,applicant,mode));
   await noPrivateData(await f.call('/api/incorporaciones','GET',undefined,applicant),403);check();
  }finally{f.close();}
 }
});

test('applicant detail withholds profile, consent and history if the session or record changes during history loading',async()=>{
 for(const mode of ['session','retention','owner']){
  const f=await fixture();try{const id=seed(f);
   const check=interleave(f,/SELECT id,kind,body,created_at AS createdAt,actor_type AS actorType FROM membership_events/,()=>{
    if(mode==='session')revokeSession(f,applicant,'session');
    if(mode==='retention')f.db.prepare('UPDATE membership_applications SET retention_until=1 WHERE id=?').run(id);
    if(mode==='owner')f.db.prepare("UPDATE membership_applications SET owner_email='different@example.test' WHERE id=?").run(id);
   });
   await noPrivateData(await f.call('/api/incorporaciones/'+id,'GET',undefined,applicant),404);check();
  }finally{f.close();}
 }
});

test('administrative membership detail withholds private notes after administrator revocation, session loss or record expiry',async()=>{
 for(const mode of ['role','session','retention']){
  const f=await fixture();try{const id=seed(f);
   const check=interleave(f,/SELECT id,kind,body,created_at AS createdAt,actor_type AS actorType,actor_email AS actorEmail FROM membership_events/,()=>{
    if(mode==='role')f.db.prepare('UPDATE user_roles SET revoked_at=1 WHERE email=?').run(reviewer);
    if(mode==='session')revokeSession(f,reviewer,'session');
    if(mode==='retention')f.db.prepare('UPDATE membership_applications SET retention_until=1 WHERE id=?').run(id);
   });
   await noPrivateData(await f.call('/api/admin/incorporaciones/'+id,'GET',undefined,reviewer),403);check();
  }finally{f.close();}
 }
});

test('administrative contact journal withholds loaded notes after permissions, session or retention change',async()=>{
 for(const mode of ['role','session','retention']){
  const f=await fixture();try{seed(f);const id=crypto.randomUUID(),now=Date.now();
   f.db.prepare("INSERT INTO contact_requests(id,kind,name,message,created_at,retention_until) VALUES(?,'idea','Perfil privado de prueba','Nota privada de prueba',?,?)").run(id,now,now+86400000);
   f.db.prepare("INSERT INTO request_entries(id,request_id,kind,body,actor_email,created_at) VALUES(?,?,'note','Historial privado de prueba',?,?)").run(crypto.randomUUID(),id,reviewer,now);
   const check=interleave(f,/SELECT id,action,actor_email AS actorEmail,created_at AS createdAt FROM audit_logs/,()=>{
    if(mode==='role')f.db.prepare('UPDATE user_roles SET revoked_at=1 WHERE email=?').run(reviewer);
    if(mode==='session')revokeSession(f,reviewer,'session');
    if(mode==='retention')f.db.prepare('UPDATE contact_requests SET retention_until=1 WHERE id=?').run(id);
   });
   await noPrivateData(await f.call('/api/admin/requests/'+id+'/entries','GET',undefined,reviewer),403);check();
  }finally{f.close();}
 }
});

test('authorized applicant and administrator reads still return their proper fields and histories',async()=>{
 const f=await fixture();try{const id=seed(f);
  const list=await f.call('/api/incorporaciones','GET',undefined,applicant);assert.equal(list.status,200);assert.equal((await list.json()).applications.length,1);
  const detail=await f.call('/api/incorporaciones/'+id,'GET',undefined,applicant);assert.equal(detail.status,200);const own=await detail.json();assert.equal(own.events.length,1);assert.equal(own.events[0].actorEmail,undefined);assert.match(own.proof.snapshot,/Aviso privado/);
  const administrative=await f.call('/api/admin/incorporaciones/'+id,'GET',undefined,reviewer);assert.equal(administrative.status,200);assert.equal((await administrative.json()).events.length,2);
  const other=await f.call('/api/incorporaciones','GET',undefined,'other@example.test');assert.equal(other.status,200);assert.deepEqual((await other.json()).applications,[]);
 }finally{f.close();}
});

test('server-rendered administration withholds loaded applicant profiles after session or role revocation',async()=>{
 for(const mode of ['role','session']){
  const f=await fixture();try{seed(f);
   const check=interleave(f,/SELECT r\.id,r\.owner_email AS ownerEmail/,()=>{
    if(mode==='role')f.db.prepare('UPDATE user_roles SET revoked_at=1 WHERE email=?').run(reviewer);
    else revokeSession(f,reviewer,'session');
   });
   const response=await f.call('/admin?section=incorporaciones','GET',undefined,reviewer);
   const html=await response.text();check();
   assert.doesNotMatch(html,/Perfil privado de prueba|Nota privada del perfil|Historial privado de prueba/);
   assert.match(response.headers.get('cache-control'),/no-store/);
  }finally{f.close();}
 }
});

test('server-rendered private print view withholds its content and attachment names after access changes',async()=>{
 for(const mode of ['session','commission','role','draft-owner','retention','document']){
  const f=await fixture();try{seed(f);const account=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(applicant).id,id=crypto.randomUUID(),document=crypto.randomUUID(),now=Date.now();
   f.db.prepare("INSERT INTO commission_members(id,account_id,commission,role,active,updated_at,updated_by) VALUES(?,?,'gobierno','member',1,1,'owner')").run(crypto.randomUUID(),account);
   f.db.prepare("INSERT INTO commission_items(id,owner_id,commission,kind,title,details_json,status,created_at,updated_at,retention_until) VALUES(?,?,'gobierno','question','Contenido confidencial de impresion','{}',?,?,?,?)").run(id,account,mode==='draft-owner'?'draft':'submitted',now,now,now+86400000);
   f.db.prepare("INSERT INTO commission_documents(id,owner_id,item_id,category,object_key,name,mime,size,status,notice_snapshot,created_at,updated_at,retention_until) VALUES(?,?,?,'evidence',?,'Adjunto confidencial de impresion.pdf','application/pdf',16,'received','{}',?,?,?)").run(document,account,id,'private/'+document,now,now,now+86400000);
   const check=interleave(f,/SELECT id,name FROM commission_documents WHERE item_id=/,()=>{
    if(mode==='session')revokeSession(f,applicant,'session');
    if(mode==='commission')f.db.prepare('UPDATE commission_members SET active=0 WHERE account_id=?').run(account);
    if(mode==='role')f.db.prepare('UPDATE user_roles SET revoked_at=1 WHERE email=?').run(reviewer);
    if(mode==='draft-owner')f.db.prepare('UPDATE commission_items SET owner_id=(SELECT id FROM staff_accounts WHERE email=?) WHERE id=?').run(reviewer,id);
    if(mode==='retention')f.db.prepare('UPDATE commission_items SET retention_until=1 WHERE id=?').run(id);
    if(mode==='document')f.db.prepare("UPDATE commission_documents SET status='removed',retention_until=1 WHERE id=?").run(document);
   });
   const response=await f.call('/mi-comision/documento/'+id,'GET',undefined,mode==='role'?reviewer:applicant);
   const html=await response.text();check();
   assert.doesNotMatch(html,/Contenido confidencial de impresion|Adjunto confidencial de impresion/);
   assert.match(response.headers.get('cache-control'),/no-store/);
  }finally{f.close();}
 }
});
