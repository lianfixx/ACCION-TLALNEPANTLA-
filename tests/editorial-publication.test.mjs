import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';
const id='apj-encuentro-comite-2026',slug='nuestro-encuentro-en-el-comite';
test('the supplied event photo is published without runtime seeding and has consistent public routes',async()=>{
 const f=await createWorkerFixture();try{
  const article=await f.call(`/actualidad/${slug}`,'GET',undefined,null);assert.equal(article.status,200);
  const html=await article.text();assert.match(html,/encuentro-comite-tlalnepantla\.jpg/);assert.match(html,/1280/);assert.match(html,/Nuestro encuentro en el Comité/);
  assert.equal((html.match(/<figure class="post-attachment">/g)??[]).length,2);
  assert.match(html,/<img\b[^>]*src="\/images\/actualidad\/flyer-cafecito-juvenil\.webp"/);
  assert.match(html,/<img\b[^>]*src="\/images\/actualidad\/aviso-transporte-box-lunch\.webp"/);
  assert.match(html,/Anuncio original de transporte y box lunch, con la mascota de aquella etapa/);
  const list=await(await f.call('/api/posts','GET',undefined,null)).json();assert.equal(list.posts.length,2);assert.ok(list.posts.some(post=>post.id===id));
  assert.equal((await f.call(`/api/posts/${id}`,'GET',undefined,null)).status,200);
  assert.match(await(await f.call('/sitemap.xml','GET',undefined,null)).text(),new RegExp(slug));
  const panel=await(await f.call('/admin?section=publicaciones')).text();assert.match(panel,/Nuestro encuentro en el Comité/);
  assert.equal(f.db.prepare('SELECT count(*) n FROM posts').get().n,0,'public reads do not write content');
 }finally{f.close();}
});
test('an authenticated editor can change, rename and archive the source publication without its reappearing',async()=>{
 const f=await createWorkerFixture();try{
  const source=(await(await f.call(`/api/posts/${id}`,'GET',undefined,null)).json()).post;
  assert.equal((await f.call(`/api/posts/${id}`,'PATCH',{title:'Cambio indebido',expectedUpdatedAt:source.updatedAt},null)).status,403);
  const response=await f.call(`/api/posts/${id}`,'PATCH',{title:'Memoria del encuentro en el Comité',slug:'memoria-comite',expectedUpdatedAt:source.updatedAt});
  assert.equal(response.status,200,await response.clone().text());const item=(await response.json()).post;
  assert.equal(item.publishedAt,source.publishedAt);assert.equal(item.coverMediaId,'apj-encuentro-comite-original');
  assert.equal((await f.call(`/actualidad/${slug}`,'GET',undefined,null)).status,404);
  const renamed=await f.call('/actualidad/memoria-comite','GET',undefined,null);assert.equal(renamed.status,200);
  assert.equal((await renamed.text()).match(/<figure class="post-attachment">/g)?.length,2,'both attachments survive the first stored edit and a new slug');
  assert.equal((await f.call(`/api/posts/${id}`,'PATCH',{title:'Cambio viejo',expectedUpdatedAt:source.updatedAt})).status,409);
  const removed=await f.call(`/api/posts/${id}`,'PATCH',{coverMediaId:'',expectedUpdatedAt:item.updatedAt});assert.equal(removed.status,200);
  const withoutCover=(await removed.json()).post;assert.equal(withoutCover.coverMediaId,null);
  assert.equal((await f.call(`/api/posts/${id}`,'PATCH',{status:'archived',expectedUpdatedAt:withoutCover.updatedAt})).status,200);
  const posts=(await(await f.call('/api/posts','GET',undefined,null)).json()).posts;assert.equal(posts.some(post=>post.id===id),false);
  assert.equal((await f.call(`/actualidad/${slug}`,'GET',undefined,null)).status,404);
  assert.equal((await f.call('/actualidad/memoria-comite','GET',undefined,null)).status,404);
  assert.equal(f.db.prepare('SELECT count(*) n FROM audit_logs').get().n,3);
 }finally{f.close();}
});

test('an editor can remove both inline event images without changing the group-photo cover',async()=>{
 const f=await createWorkerFixture();try{
  const source=(await(await f.call(`/api/posts/${id}`,'GET',undefined,null)).json()).post;
  const body=source.body.replace('[[flyer-cafecito-juvenil]]','').replace('[[aviso-transporte-box-lunch]]','');
  const response=await f.call(`/api/posts/${id}`,'PATCH',{body,expectedUpdatedAt:source.updatedAt});
  assert.equal(response.status,200,await response.clone().text());
  const stored=(await response.json()).post;assert.equal(stored.coverMediaId,'apj-encuentro-comite-original');
  const html=await(await f.call(`/actualidad/${slug}`,'GET',undefined,null)).text();
  assert.doesNotMatch(html,/<figure class="post-attachment">/);
  assert.match(html,/<img\b[^>]*src="\/images\/actualidad\/encuentro-comite-tlalnepantla\.jpg"/);
  assert.equal((await(await f.call(`/api/posts/${id}`,'GET',undefined,null)).json()).post.body,body.trim());
 }finally{f.close();}
});

test('unknown attachment markers and arbitrary markup remain escaped text',async()=>{
 const f=await createWorkerFixture();try{
  const source=(await(await f.call(`/api/posts/${id}`,'GET',undefined,null)).json()).post;
  const body='Esta edición comprueba que el texto no puede convertirse en código ejecutable.\n\n[[https://outside.example/image.png]]\n\n<img src="https://outside.example/image.png" onerror="window.injected=1">\n\n<script>window.injected=1</script>\n\nTexto junto al marcador [[flyer-cafecito-juvenil]]';
  const response=await f.call(`/api/posts/${id}`,'PATCH',{body,expectedUpdatedAt:source.updatedAt});
  assert.equal(response.status,200,await response.clone().text());
  const html=await(await f.call(`/actualidad/${slug}`,'GET',undefined,null)).text();
  assert.doesNotMatch(html,/<figure class="post-attachment">/);
  assert.doesNotMatch(html,/<img\b[^>]*src="https:\/\/outside\.example/);
  assert.doesNotMatch(html,/<script>window\.injected=1<\/script>/);
  assert.match(html,/&lt;img src=&quot;https:\/\/outside\.example\/image\.png&quot;/);
  assert.match(html,/&lt;script&gt;window\.injected=1&lt;\/script&gt;/);
  assert.match(html,/Texto junto al marcador \[\[flyer-cafecito-juvenil\]\]/);
 }finally{f.close();}
});
test('a concurrent first edit cannot overwrite another editor or duplicate audit history',async()=>{
 const f=await createWorkerFixture();try{
  const source=(await(await f.call(`/api/posts/${id}`,'GET',undefined,null)).json()).post;
  f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare('INSERT INTO posts(id,slug,title,excerpt,body,status,author_email,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,slug,'Edición concurrente','Resumen de la edición concurrente.','Contenido ya guardado por otra persona.','draft','owner@example.test',source.updatedAt,source.updatedAt+1,source.publishedAt);};
  assert.equal((await f.call(`/api/posts/${id}`,'PATCH',{title:'Cambio que pierde',expectedUpdatedAt:source.updatedAt})).status,409);
  assert.equal(f.db.prepare('SELECT title FROM posts').get().title,'Edición concurrente');
  assert.equal(f.db.prepare('SELECT count(*) n FROM audit_logs').get().n,0);
  assert.equal((await f.call(`/actualidad/${slug}`,'GET',undefined,null)).status,404);
 }finally{f.close();}
});

test('the source slug cannot be appropriated by a different post and later resurrected',async()=>{
 const f=await createWorkerFixture();try{
  const data={title:'Título alternativo válido',excerpt:'Resumen suficientemente largo para esta prueba.',body:'Contenido suficientemente largo para comprobar la reserva del identificador.',status:'published'};
  assert.equal((await f.call('/api/posts','POST',{...data,slug})).status,409);
  const response=await f.call('/api/posts','POST',{...data,slug:'otra-publicacion'});assert.equal(response.status,201);const other=(await response.json()).post;
  assert.equal((await f.call(`/api/posts/${other.id}`,'PATCH',{slug,expectedUpdatedAt:other.updatedAt})).status,409);
  assert.equal((await f.call(`/api/posts/${id}`,'GET',undefined,null)).status,200);
 }finally{f.close();}
});
