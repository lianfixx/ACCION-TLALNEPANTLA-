import assert from 'node:assert/strict';
import test from 'node:test';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

const postFields={title:'Publicación de prueba',excerpt:'Resumen suficiente para una prueba aislada del panel.',body:'Contenido guardado solamente en la base temporal de las pruebas.',status:'draft'};
const audits=f=>f.db.prepare('SELECT count(*) AS n FROM audit_logs').get().n;
async function createPost(f){const response=await f.call('/api/posts','POST',postFields);assert.equal(response.status,201);return(await response.json()).post;}
function seedComment(f,postId){f.db.prepare("INSERT INTO comments(id,post_id,author_email,author_name,body,status,notice_version,consent_at,retention_until,created_at) VALUES('comment',?,'person@example.test','Persona','Comentario de prueba','pending','test',1,9999999999999,1)").run(postId);}

test('post edits require an explicit revision and cannot overwrite a newer draft by omitting it',async()=>{
 const f=await createWorkerFixture();try{
  const post=await createPost(f),path='/api/posts/'+post.id;
  for(const value of [undefined,null,'',' ',false,[],{},1.5,Number.MAX_SAFE_INTEGER+1]){
   const response=await f.call(path,'PATCH',{title:'No debe sustituir el título',expectedUpdatedAt:value});
   assert.equal(response.status,400,JSON.stringify(value));
  }
  assert.equal(audits(f),1);
  const changed=await f.call(path,'PATCH',{title:'Versión que debe conservarse',expectedUpdatedAt:String(post.updatedAt)});
  assert.equal(changed.status,200);
  const record=(await changed.json()).post;
  assert.equal((await f.call(path,'PATCH',{title:'Borrador anterior sin versión'})).status,400);
  assert.equal((await f.call(path,'PATCH',{title:'Borrador anterior con versión',expectedUpdatedAt:post.updatedAt})).status,409);
  assert.equal(f.db.prepare('SELECT title,updated_at FROM posts WHERE id=?').get(post.id).updated_at,record.updatedAt);
  assert.equal(audits(f),2);
 }finally{f.close();}
});

test('draft cover edits validate existence, permit private drafts and recheck the image at commit',async()=>{
 const f=await createWorkerFixture();try{
  const post=await createPost(f),path='/api/posts/'+post.id;
  assert.equal((await f.call(path,'PATCH',{coverMediaId:'missing',expectedUpdatedAt:post.updatedAt})).status,400);
  assert.equal(f.db.prepare('SELECT cover_media_id FROM posts WHERE id=?').get(post.id).cover_media_id,null);
  f.db.prepare("INSERT INTO media(id,object_key,file_name,mime_type,size_bytes,alt_text,visibility,uploaded_by,created_at,updated_at) VALUES('cover','cover','cover.png','image/png',1,'Portada de prueba','private','owner',1,1)").run();
  const changed=await f.call(path,'PATCH',{coverMediaId:'cover',expectedUpdatedAt:post.updatedAt});assert.equal(changed.status,200);
  const record=(await changed.json()).post;
  assert.equal((await f.call(path,'PATCH',{status:'published',expectedUpdatedAt:record.updatedAt})).status,400);
  f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare("DELETE FROM media WHERE id='cover'").run();};
  const stale=await f.call(path,'PATCH',{coverMediaId:'cover',title:'Cambio que debe rechazarse',expectedUpdatedAt:record.updatedAt});
  assert.equal(stale.status,409);
  assert.equal(f.db.prepare('SELECT title FROM posts WHERE id=?').get(post.id).title,post.title);
  assert.equal(audits(f),2);
 }finally{f.close();}
});

test('moderation requires its displayed revision and preserves the last reviewed state',async()=>{
 const f=await createWorkerFixture();try{
  seedComment(f,(await createPost(f)).id);
  for(const value of [undefined,null,'',' ',false,[],{},1.5])assert.equal((await f.call('/api/comments/comment','PATCH',{status:'approved',expectedUpdatedAt:value})).status,400);
  const approved=await f.call('/api/comments/comment','PATCH',{status:'approved',expectedUpdatedAt:1});assert.equal(approved.status,200);
  const record=(await approved.json()).comment;
  assert.equal((await f.call('/api/comments/comment','PATCH',{status:'rejected',expectedUpdatedAt:1})).status,409);
  assert.equal(f.db.prepare("SELECT status FROM comments WHERE id='comment'").get().status,'approved');
  const rejected=await f.call('/api/comments/comment','PATCH',{status:'rejected',expectedUpdatedAt:record.moderatedAt});assert.equal(rejected.status,200);
  const events=f.db.prepare("SELECT metadata_json FROM audit_logs WHERE entity_type='comment' ORDER BY created_at").all().map(row=>JSON.parse(row.metadata_json));
  assert.deepEqual(events,[{fromStatus:'pending',toStatus:'approved'},{fromStatus:'approved',toStatus:'rejected'}]);
 }finally{f.close();}
});

test('simultaneous moderation commits one decision without a stale audit or older timestamp',async()=>{
 const f=await createWorkerFixture();let release;try{
  seedComment(f,(await createPost(f)).id);
  let signal;const paused=new Promise(resolve=>{signal=resolve;}),gate=new Promise(resolve=>{release=resolve;});
  f.beforeBatch=async()=>{f.beforeBatch=undefined;signal();await gate;};
  const pending=f.call('/api/comments/comment','PATCH',{status:'approved',expectedUpdatedAt:1});await paused;
  const winner=await f.call('/api/comments/comment','PATCH',{status:'rejected',expectedUpdatedAt:1});
  release();const loser=await pending;
  assert.equal(winner.status,200);assert.equal(loser.status,409);
  const record=(await winner.json()).comment,row=f.db.prepare("SELECT status,moderated_at FROM comments WHERE id='comment'").get();
  assert.equal(row.status,'rejected');assert.equal(row.moderated_at,record.moderatedAt);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM audit_logs WHERE entity_type='comment'").get().n,1);
 }finally{release?.();f.close();}
});
