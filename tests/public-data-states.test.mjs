import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerFixture } from './helpers/worker-fixture.mjs';

test('public pages distinguish empty data, missing records and storage failures', async () => {
  const f = await createWorkerFixture();
  try {
    assert.match(await(await f.call('/actualidad','GET',undefined,null)).text(), /Nuestro encuentro en el Comité/);
    assert.equal((await f.call('/actualidad/no-existe','GET',undefined,null)).status,404);
    const now=Date.now();
    f.db.prepare('INSERT INTO posts (id,slug,title,excerpt,body,status,author_email,created_at,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('test','test','Título de prueba','Resumen de una publicación de prueba.','Contenido de prueba para comprobar el estado público.','published','owner@example.test',now,now,now);
    f.db.exec('DROP TABLE comments');
    const detail=await f.call('/actualidad/test','GET',undefined,null);
    assert.equal(detail.status,200);
    assert.match(await detail.text(),/No pudimos cargar las opiniones/);
    f.db.exec('DROP TABLE posts');
    const listing=await(await f.call('/actualidad','GET',undefined,null)).text();
    assert.match(listing,/No pudimos cargar las publicaciones/);
    assert.doesNotMatch(listing,/Todavía no hay publicaciones/);
    const unavailable=await f.call('/actualidad/test','GET',undefined,null);
    assert.equal(unavailable.status,200);
    assert.match(await unavailable.text(),/No pudimos cargar esta publicación/);
    f.db.exec('DROP TABLE activities');
    assert.match(await(await f.call('/agenda','GET',undefined,null)).text(),/No pudimos cargar las actividades/);
  } finally { f.close(); }
});
