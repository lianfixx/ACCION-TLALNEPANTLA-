import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

const config={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
const categories=['ine_front','ine_back','address'];
const profile={participation:'collaborate',state:'Estado de México',municipality:'Tlalnepantla de Baz',availability:'Viernes por la tarde',activity:'',experience:'',projects:[]};
async function expect(response,status){assert.equal(response.status,status,await response.clone().text());return response.json();}
async function fixture(){
 const realNow=Date.now;let clock=realNow();const files=new Map();
 const bucket={files,onPut:null,async put(key,bytes){files.set(key,new Uint8Array(bytes));await this.onPut?.();return{};},async get(key){return files.has(key)?{body:new Response(files.get(key)).body}:null;},async delete(key){files.delete(key);}};
 Date.now=()=>clock;
 try{const f=await createWorkerFixture({...config,BUCKET:bucket});const close=f.close;f.close=()=>{try{close();}finally{Date.now=realNow;}};return Object.assign(f,{bucket,advance(ms=25){clock+=ms;}});}catch(error){Date.now=realNow;throw error;}
}
async function applicant(f,username='applicant'){
 const email=username+'@example.test';f.seedAccount(email);f.db.prepare('UPDATE staff_accounts SET username=? WHERE email=?').run(username,email);
 const html=(await(await f.call('/participacion','GET',undefined,email)).text()).replaceAll('\\"','"');
 const noticeToken=html.match(/"noticeToken":"([a-f0-9]{64})"/)?.[1];assert.ok(noticeToken);
 const submitted=await expect(await f.call('/api/incorporaciones','POST',{name:'Persona de prueba '+username,commission:'gobierno',profile,note:'Caso aislado de incorporación',consent:true,adultSelfDeclared:true,noticeToken},email),201);
 const app=submitted.application;
 await expect(await f.call('/api/admin/incorporaciones/'+app.id,'PATCH',{status:'in_review',expectedUpdatedAt:app.updatedAt}),200);
 const current=await expect(await f.call('/api/incorporaciones/'+app.id,'GET',undefined,email),200);
 await expect(await f.call('/api/admin/incorporaciones/'+app.id,'PATCH',{status:'accepted',response:'Solicitud revisada en prueba aislada',expectedUpdatedAt:current.application.updatedAt}),200);
 const info=await snapshot(f,{email});
 await expect(await f.call('/api/espacio','POST',{action:'consent',version:'comisiones-2026-10-06.1',noticeToken:info.noticeToken,consent:true},email),200);
 return {email,username,id:info.actor.id};
}
const snapshot=(f,a)=>f.call('/api/espacio','GET',undefined,a.email).then(r=>expect(r,200));
const upload=(f,a,category)=>{f.advance();return f.callRaw('/api/espacio/documentos?category='+category,'%PDF-1.4\n%%EOF',a.email,{'content-type':'application/pdf','x-file-name':'Prueba-'+category+'.pdf'});};
async function documents(f,a){return (await expect(await f.call('/api/espacio/documentos','GET',undefined,a.email),200)).documents;}
async function review(f,a,id,status='checked'){
 const doc=(await documents(f,a)).find(d=>d.id===id);assert.ok(doc);
 await expect(await f.call('/api/espacio/documentos/'+id,'PATCH',{status,note:status==='checked'?'Documento revisado para esta prueba':'Requiere corrección en esta prueba',expectedUpdatedAt:doc.updated_at}),200);
}
async function remove(f,a,id){
 const doc=(await documents(f,a)).find(d=>d.id===id);assert.ok(doc);
 await expect(await f.call('/api/espacio/documentos/'+id,'PATCH',{action:'remove',expectedUpdatedAt:doc.updated_at},a.email),200);
}
async function identityDocuments(f,a,checked=true){
 const ids=[];for(const category of categories){const result=await expect(await upload(f,a,category),201);ids.push(result.id);if(checked)await review(f,a,result.id);}return ids;
}
function team(f,a,extra={}){return f.call('/api/espacio','POST',{action:'team',commission:'gobierno',username:a.username,role:'member',active:true,...extra});}
async function membership(f,a){return (await expect(await f.call('/api/espacio?manage=1'),200)).team.find(m=>m.account_id===a.id&&m.commission==='gobierno');}

test('an accepted applicant needs all three reviewed documents before commission access and the final PAN upload',async()=>{
 const f=await fixture();try{
  const a=await applicant(f);assert.equal((await snapshot(f,a)).personalDocumentsReady,false);
  await expect(await team(f,a),409);
  const ids=await identityDocuments(f,a,false);await expect(await team(f,a),409);assert.equal((await snapshot(f,a)).personalDocumentsReady,false);
  await review(f,a,ids[0]);await review(f,a,ids[1]);await expect(await team(f,a),409);assert.equal((await snapshot(f,a)).personalDocumentsReady,false);
  assert.deepEqual((await snapshot(f,a)).roles,[]);
  await review(f,a,ids[2]);assert.equal((await snapshot(f,a)).personalDocumentsReady,true);await expect(await upload(f,a,'affiliation'),403);
  await expect(await team(f,a),200);assert.deepEqual((await snapshot(f,a)).roles,[{commission:'gobierno',role:'member'}]);
  const proof=await expect(await upload(f,a,'affiliation'),201);assert.ok(proof.id);
  assert.equal((await snapshot(f,a)).affiliations[0].status,'reported','upload still requires a separate human PAN review');
 }finally{f.close();}
});

test('a newer personal document awaiting review or requiring changes blocks all new PAN operations despite an older checked file',async()=>{
 for(const status of ['received','changes']){
  const f=await fixture();try{
   const a=await applicant(f),original=await identityDocuments(f,a);await expect(await team(f,a),200);
   const proof=await expect(await upload(f,a,'affiliation'),201);
   const replacement=await expect(await upload(f,a,'ine_front'),201);if(status==='changes')await review(f,a,replacement.id,'changes');
   assert.equal((await documents(f,a)).find(d=>d.id===original[0]).status,'checked');
   const info=await snapshot(f,a);assert.equal(info.personalDocumentsReady,false);assert.equal(info.roles.length,1,'existing commission work stays available');
   await expect(await upload(f,a,'affiliation'),403);
   await expect(await f.call('/api/espacio','POST',{action:'affiliation',folio:'FOLIO-DE-PRUEBA',expectedUpdatedAt:info.affiliations[0].updated_at},a.email),403);
   await expect(await f.call('/api/espacio','POST',{action:'review-affiliation',accountId:a.id,documentId:proof.id,status:'confirmed',source:'Comprobación de prueba',note:'Revisado en prueba aislada',expectedUpdatedAt:info.affiliations[0].updated_at}),409);
   assert.equal((await snapshot(f,a)).affiliations[0].status,'reported');
  }finally{f.close();}
 }
});

test('expiration or withdrawal of a required personal document removes readiness without silently revoking an existing commission',async()=>{
 for(const change of ['expiry','withdrawal']){
  const f=await fixture();try{
   const a=await applicant(f),ids=await identityDocuments(f,a);await expect(await team(f,a),200);
   if(change==='expiry'){f.db.prepare('UPDATE commission_documents SET retention_until=? WHERE id=?').run(Date.now()+500,ids[0]);f.advance(501);}else await remove(f,a,ids[0]);
   const info=await snapshot(f,a);assert.equal(info.personalDocumentsReady,false);assert.equal(info.roles.length,1);
   await expect(await upload(f,a,'affiliation'),403);
  }finally{f.close();}
 }
});

test('documents reviewed for another account cannot satisfy the applicant requirements',async()=>{
 const f=await fixture();try{
  const a=await applicant(f,'first'),other=await applicant(f,'second'),ids=await identityDocuments(f,other);
  assert.equal((await snapshot(f,other)).personalDocumentsReady,true);assert.equal((await snapshot(f,a)).personalDocumentsReady,false);
  await expect(await team(f,a),409);await expect(await upload(f,a,'affiliation'),403);
  await expect(await f.call('/api/espacio/documentos/'+ids[0],'GET',undefined,a.email),404);
  assert.deepEqual((await snapshot(f,a)).roles,[]);
 }finally{f.close();}
});

test('administration can demote and revoke active commission access after document withdrawal, while reactivation requires reviewed documents',async()=>{
 const f=await fixture();try{
  const a=await applicant(f),ids=await identityDocuments(f,a);await expect(await team(f,a,{role:'coordinator'}),200);
  await remove(f,a,ids[0]);assert.equal((await snapshot(f,a)).personalDocumentsReady,false);
  let current=await membership(f,a);await expect(await team(f,a,{role:'member',expectedUpdatedAt:current.updated_at}),200);
  assert.equal((await snapshot(f,a)).roles[0].role,'member');
  current=await membership(f,a);await expect(await team(f,a,{active:false,expectedUpdatedAt:current.updated_at}),200);
  assert.deepEqual((await snapshot(f,a)).roles,[]);
  current=await membership(f,a);await expect(await team(f,a,{active:true,expectedUpdatedAt:current.updated_at}),409);
  assert.equal((await membership(f,a)).active,0);
 }finally{f.close();}
});

test('withdrawal between the preliminary check and commission write or PAN storage completion prevents the action',async()=>{
 for(const phase of ['team','storage']){
  const f=await fixture();try{
   const a=await applicant(f),ids=await identityDocuments(f,a);let raced=false;
   if(phase==='team'){
    f.beforeBatch=async statements=>{if(statements.some(s=>s.query.startsWith('INSERT INTO commission_members'))){f.beforeBatch=undefined;raced=true;await remove(f,a,ids[0]);}};
    await expect(await team(f,a),409);assert.deepEqual((await snapshot(f,a)).roles,[]);
   }else{
    await expect(await team(f,a),200);
    f.bucket.onPut=async()=>{f.bucket.onPut=null;raced=true;await remove(f,a,ids[0]);};
    await expect(await upload(f,a,'affiliation'),409);
    assert.equal((await documents(f,a)).some(d=>d.category==='affiliation'),false);
    assert.deepEqual((await snapshot(f,a)).affiliations,[]);assert.equal(f.bucket.files.size,2,'only the two remaining personal documents exist in storage');
   }
   assert.equal(raced,true,'the change happened after the preliminary eligibility check');
   assert.equal((await snapshot(f,a)).personalDocumentsReady,false);
  }finally{f.close();}
 }
});
