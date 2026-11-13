import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';

test('the workers.dev address and www lead to the public domain once it is the origin',async()=>{const f=await createWorkerFixture({REGISTRATION_PUBLIC_ORIGIN:'https://dominio.example'});try{
 for(const from of ['https://sitio.cuenta.workers.dev/comisiones?x=1','https://www.dominio.example/comisiones?x=1']){
  const r=await f.fetchUrl(from);assert.equal(r.status,301,from);assert.equal(r.headers.get('location'),'https://dominio.example/comisiones?x=1');
 }
 const post=await f.fetchUrl('https://sitio.cuenta.workers.dev/api/registro-cuenta',{method:'POST'});assert.notEqual(post.status,301,'a submitted form is not redirected');
 assert.equal((await f.fetchUrl('https://dominio.example/comisiones')).status,200);
}finally{f.close();}});

test('while the origin is still workers.dev nothing is redirected',async()=>{const f=await createWorkerFixture({REGISTRATION_PUBLIC_ORIGIN:'https://sitio.cuenta.workers.dev'});try{
 assert.equal((await f.fetchUrl('https://sitio.cuenta.workers.dev/comisiones')).status,200);
}finally{f.close();}});
