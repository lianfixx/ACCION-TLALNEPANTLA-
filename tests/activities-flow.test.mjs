import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkerFixture } from './helpers/worker-fixture.mjs';

test('activity lifecycle persists, protects drafts, detects conflicts and exports a safe calendar', async()=>{
  const fixture=await createWorkerFixture();
  const db=fixture.db;
  const call=(path,method='GET',body,actor=true)=>fixture.call(path,method,body,actor?'owner@example.test':null);
  try {
    assert.equal((await call('/api/activities','POST',null)).status,400);
    const base={title:'Actividad de prueba',description:'Una actividad usada solamente en esta prueba local.',location:'Sede de prueba',startsAt:Date.now()+86400000,endsAt:Date.now()+90000000,registrationUrl:'https://example.test/registro',status:'draft'};
    assert.equal((await call('/api/activities','POST',base,false)).status,403);
    assert.equal((await call('/api/activities','POST',{...base,registrationUrl:'javascript:alert(1)'})).status,400);
    const created=await call('/api/activities','POST',base);assert.equal(created.status,201);const{id}=await created.json();
    assert.equal((await (await call('/api/activities')).json()).activities.length,0);
    assert.equal((await call(`/api/activities/${id}/calendar`)).status,404);
    const row=db.prepare('SELECT updated_at FROM activities WHERE id=?').get(id);
    assert.equal((await call(`/api/activities/${id}`,'PATCH',{...base,status:'published',expectedUpdatedAt:row.updated_at})).status,200);
    const conflict=await call(`/api/activities/${id}`,'PATCH',{...base,status:'cancelled',expectedUpdatedAt:row.updated_at});assert.equal(conflict.status,409);
    assert.equal(db.prepare('SELECT count(*) n FROM audit_logs').get().n,2);
    const listing=await(await call('/api/activities')).json();assert.equal(listing.activities[0].id,id);
    const calendar=await call(`/api/activities/${id}/calendar`);assert.equal(calendar.status,200);assert.match(calendar.headers.get('content-type'),/^text\/calendar/);const ics=await calendar.text();assert.match(ics,/BEGIN:VEVENT/);assert.match(ics,/STATUS:CONFIRMED/);assert.match(ics,/DTSTART:\d{8}T\d{6}Z/);
    for(let n=0;n<105;n++)db.prepare('INSERT INTO activities (id,title,description,location,starts_at,ends_at,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(`old-${n}`,'Anterior','Actividad anterior','Sede',946684800000+n*10000,946684810000+n*10000,'published',1,1);
    const many=await(await call('/api/activities')).json();assert.equal(many.activities[0].id,id);
    const version=db.prepare('SELECT updated_at FROM activities WHERE id=?').get(id).updated_at;
    assert.equal((await call(`/api/activities/${id}`,'PATCH',{...base,status:'cancelled',expectedUpdatedAt:version})).status,200);
    assert.match(await(await call(`/api/activities/${id}/calendar`)).text(),/STATUS:CANCELLED/);
    const admin=await call('/admin');assert.equal(admin.status,200);const html=await admin.text();assert.match(html,/Panel del equipo/);assert.match(html,/Configuración/);
  } finally {fixture.close();}
});
