import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

test('admin forms opened by A reject B sessions before any write or private response', async()=>{
 const f=await createWorkerFixture();
 try{
  f.seedAccount('a@example.test');f.seedAccount('owner@example.test');
  const a=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get('a@example.test').id;
  const b=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get('owner@example.test').id;
  const before=f.db.prepare('SELECT * FROM audit_logs ORDER BY id').all();
  const endpoints=[
   ['/api/posts','POST'],['/api/posts/missing','PATCH'],
   ['/api/activities','POST'],['/api/activities/missing','PATCH'],
   ['/api/media/missing','PATCH'],['/api/comments/missing','PATCH'],
   ['/api/admin/requests/missing','PATCH'],['/api/admin/requests/missing/entries','POST'],
   ['/api/admin/incorporaciones/missing','PATCH'],['/api/admin/settings','PATCH'],
   ['/api/admin/maintenance/retention','POST'],
   ['/api/admin/incorporaciones/missing','GET'],['/api/admin/requests/missing/entries','GET'],
   ['/api/admin/media/search','GET']
  ];
  for(const [path,method] of endpoints){
   const r=await f.call(path,method,{},'owner@example.test',{'X-Expected-Account-Id':a});
   assert.equal(r.status,412,`${method} ${path}: ${await r.clone().text()}`);
   assert.match(r.headers.get('Cache-Control'),/no-store/);
  }
  const media=await f.callRaw('/api/media',new FormData(),'owner@example.test',{'X-Expected-Account-Id':a});assert.equal(media.status,412);
  assert.deepEqual(f.db.prepare('SELECT * FROM audit_logs ORDER BY id').all(),before);
  assert.equal(f.db.prepare('SELECT count(*) n FROM posts').get().n,0);
  assert.equal(f.db.prepare('SELECT count(*) n FROM activities').get().n,0);
  const valid=await f.call('/api/posts','POST',{title:'Prueba aislada',excerpt:'Resumen suficiente para esta prueba local.',body:'Contenido de la prueba local de cambio de cuenta entre pestañas.',status:'draft'},'owner@example.test',{'X-Expected-Account-Id':b});
  assert.equal(valid.status,201,await valid.clone().text());
  assert.equal(f.db.prepare('SELECT author_email FROM posts').get().author_email,'owner@example.test');
  const html=(await(await f.call('/admin')).text()).replaceAll('\\"','"');
  assert.ok(html.includes(`"accountId":"${b}"`),'the current identity is bound to the rendered admin boundary');
 }finally{f.close();}
});

test('image transforms reject arbitrary source variants and unsupported quality before fetching assets',async()=>{
 let fetched=0;
 const f=await createWorkerFixture({ASSETS:{fetch:async()=>{fetched++;return new Response(new Uint8Array([137,80,78,71]),{headers:{'Content-Type':'image/png'}});}}});
 try{
  for(const source of ['/api/espacio/documentos/private','https://outside.example/image.png','/images/a.png?random=1','/images/../a.png','/images/a.svg']){
   const r=await f.call(`/_next/image?url=${encodeURIComponent(source)}&w=640&q=75`,'GET',undefined,null);assert.equal(r.status,400,source);
  }
  assert.equal((await f.call('/_next/image?url=%2Fimages%2Fa.png&w=640&q=76','GET',undefined,null)).status,400);
  assert.equal((await f.call('/_next/image?url=%2Fimages%2Fa.png&w=640&q=75','POST',{},null)).status,405);
  assert.equal(fetched,0);
  const ok=await f.call('/_next/image?url=%2Fimages%2Fa.png&w=640&q=75','GET',undefined,null);
  assert.equal(ok.status,200);assert.equal(fetched,1);assert.equal(ok.headers.get('X-Content-Type-Options'),'nosniff');assert.match(ok.headers.get('Content-Security-Policy'),/sandbox/);
 }finally{f.close();}
});
