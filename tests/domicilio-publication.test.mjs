import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

const id='apj-cambio-domicilio-sondon-2026',slug='cambio-de-domicilio-con-victor-hugo-sondon',photo='/images/actualidad/cambio-domicilio-sondon.jpg';

test('the requested photograph and post appear in Actualidad, the API, sitemap and the editorial panel',async()=>{
 const f=await createWorkerFixture();try{
  const page=await f.call('/actualidad/'+slug,'GET',undefined,null);assert.equal(page.status,200);
  const html=await page.text();assert.match(html,/Mi cambio de domicilio con el Lic. Víctor Hugo Sondón/);
  assert.match(html,/Gracias, licenciado, por su tiempo/);assert.match(html,/Me da mucho gusto compartir este momento/);
  assert.ok(html.includes('src="'+photo+'"'));assert.match(html,/post-image-portrait/);
  assert.match(html,/width="864" height="1536"/);
  const source=readFileSync(new URL('../public'+photo,import.meta.url));
  assert.deepEqual(readFileSync(new URL('../dist/client'+photo,import.meta.url)),source);
  assert.deepEqual([...source.subarray(0,2)],[0xff,0xd8]);
  assert.match(await(await f.call('/actualidad','GET',undefined,null)).text(),new RegExp(slug));
  const posts=(await(await f.call('/api/posts','GET',undefined,null)).json()).posts;
  assert.equal(posts[0].id,id);assert.ok(posts.some(post=>post.id==='apj-encuentro-comite-2026'));
  assert.match(await(await f.call('/sitemap.xml','GET',undefined,null)).text(),new RegExp(slug));
  const panel=(await(await f.call('/admin?section=publicaciones&q=Sond%C3%B3n')).text()).replace(/<!--[\s\S]*?-->/g,'');assert.match(panel,/1 registros/);assert.match(panel,/Mi cambio de domicilio/);
  assert.equal(f.db.prepare('SELECT count(*) n FROM posts').get().n,0,'reading a supplied publication does not invent a database author');
 }finally{f.close();}
});

test('the new publication can be edited and archived without duplicating it or affecting the earlier event',async()=>{
 const f=await createWorkerFixture();try{
  const path='/api/posts/'+id,source=(await(await f.call(path,'GET',undefined,null)).json()).post;
  const other={title:'Otra publicación de prueba',excerpt:'Resumen de una publicación de prueba.',body:'Contenido suficiente para comprobar la reserva de esta publicación.',slug,status:'published'};
  assert.equal((await f.call('/api/posts','POST',other)).status,409);
  const saved=await f.call(path,'PATCH',{title:'Cambio de domicilio acompañado del Lic. Sondón',expectedUpdatedAt:source.updatedAt});
  assert.equal(saved.status,200);const record=(await saved.json()).post;assert.equal(record.coverMediaId,'apj-cambio-domicilio-sondon-original');
  const posts=(await(await f.call('/api/posts','GET',undefined,null)).json()).posts;assert.equal(posts.filter(post=>post.id===id).length,1);
  assert.equal((await f.call(path,'PATCH',{status:'archived',expectedUpdatedAt:record.updatedAt})).status,200);
  assert.equal((await f.call('/actualidad/'+slug,'GET',undefined,null)).status,404);
  assert.equal((await f.call('/actualidad/nuestro-encuentro-en-el-comite','GET',undefined,null)).status,200);
  const panel=await(await f.call('/admin?section=publicaciones&state=archived')).text();assert.match(panel,/Cambio de domicilio acompañado del Lic. Sondón/);
  assert.equal(f.db.prepare('SELECT count(*) n FROM posts').get().n,1);
 }finally{f.close();}
});
