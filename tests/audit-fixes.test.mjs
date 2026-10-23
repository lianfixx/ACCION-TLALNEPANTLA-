import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createWorkerFixture } from './helpers/worker-fixture.mjs';
import { ownerConfig as config, ownerPassword as password, bootstrapOwner as ownerCookie, cookieOf as responseCookie, accountVersions as revision } from './helpers/owner-account.mjs';

const nextPassword = 'otra contraseña de prueba para acceso 83';
const seedRole=(f,email,role='admin')=>f.db.prepare('INSERT INTO user_roles(email,role,created_at,created_by) VALUES(?,?,?,?)').run(email,role,1,'owner@example.test');
const seedMedia=f=>f.db.prepare('INSERT INTO media(id,object_key,file_name,mime_type,size_bytes,alt_text,visibility,uploaded_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)').run('image','image.webp','image.webp','image/webp',100,'Descripción de prueba','public','owner@example.test',1,1);
const access = (f, cookie, action, body) => f.call(`/api/admin/access/${action}`, 'POST', body, null, { cookie });

async function createLocal(f, cookie, email, role = 'admin', pw = password) {
  const response = await access(f, cookie, 'create', {
    email, username: email.split('@')[0], name: 'Persona de prueba', role,
    password: pw, currentPassword: password, ...revision(f, email),
  });
  assert.equal(response.status, 200, await response.clone().text());
}

async function loginCookie(f, username, pw = password) {
  const response = await f.call('/api/admin/access/login', 'POST', {
    username, password: pw,
  }, null);
  assert.equal(response.status, 200, await response.clone().text());
  return responseCookie(response);
}

test('owner activates role-only delegates and changes permissions with revision guards', async () => {
  const f = await createWorkerFixture(config);
  try {
    const cookie = await ownerCookie(f), email = 'legacy@example.test';
    seedRole(f, email);
    const page = await f.call('/admin/cuenta', 'GET', undefined, null, { cookie });
    assert.match(await page.text(), /legacy@example.test/);
    await createLocal(f, cookie, email);
    const delegateCookie = await loginCookie(f, 'legacy'), old = revision(f, email);
    assert.equal((await access(f, cookie, 'role', {
      email, role: 'editor', ...old, currentPassword: password,
    })).status, 200);
    assert.equal((await access(f, cookie, 'revoke', {
      email, ...old, currentPassword: password,
    })).status, 409);
    assert.equal((await access(f, cookie, 'revoke', {
      email, ...revision(f, email), currentPassword: password,
    })).status, 200);
    assert.equal((await f.call('/api/posts', 'POST', {}, null, { cookie: delegateCookie })).status, 403);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM audit_logs WHERE action IN ('staff.revoked','staff.role_changed')").get().n, 2);
  } finally { f.close(); }
});

test('concurrent revocation blocks stale account creation and reset cannot reactivate it', async () => {
  const f = await createWorkerFixture(config);
  try {
    const cookie = await ownerCookie(f), email = 'legacy@example.test';
    seedRole(f, email);
    const snapshot = revision(f, email);
    f.beforeBatch = () => {
      f.beforeBatch = undefined;
      f.db.prepare('UPDATE user_roles SET revoked_at=1,updated_at=2 WHERE email=?').run(email);
    };
    const stale = await access(f, cookie, 'create', {
      email, username: 'legacy', name: 'Cuenta de prueba', role: 'editor',
      password, currentPassword: password, ...snapshot,
    });
    assert.equal(stale.status, 409);
    assert.equal(f.db.prepare('SELECT count(*) AS n FROM staff_accounts WHERE email=?').get(email).n, 0);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='account.created'").get().n, 0);
    assert.equal((await access(f, cookie, 'reset', {
      email, password: nextPassword, currentPassword: password, ...revision(f, email),
    })).status, 409);
    // Reactivation requires a fresh, explicit owner operation.
    await createLocal(f, cookie, email, 'editor');
    assert.equal(f.db.prepare('SELECT revoked_at FROM user_roles WHERE email=?').get(email).revoked_at, null);
  } finally { f.close(); }
});

test('failed staff audit leaves permissions, credentials and sessions unchanged', async () => {
  const f = await createWorkerFixture(config);
  try {
    const cookie = await ownerCookie(f), email = 'reviewer@example.test';
    await createLocal(f, cookie, email);
    const delegateCookie = await loginCookie(f, 'reviewer');
    const before = f.db.prepare('SELECT password_hash,credential_version,disabled_at FROM staff_accounts WHERE email=?').get(email);
    f.db.exec("CREATE TRIGGER fail_staff BEFORE INSERT ON audit_logs WHEN NEW.action='staff.revoked' BEGIN SELECT RAISE(ABORT,'isolated'); END");
    assert.equal((await access(f, cookie, 'revoke', {
      email, ...revision(f, email), currentPassword: password,
    })).status, 503);
    assert.equal(f.db.prepare('SELECT revoked_at FROM user_roles WHERE email=?').get(email).revoked_at, null);
    assert.deepEqual(f.db.prepare('SELECT password_hash,credential_version,disabled_at FROM staff_accounts WHERE email=?').get(email), before);
    assert.equal((await f.call('/api/admin/incorporaciones/missing', 'GET', undefined, null, { cookie: delegateCookie })).status, 404);
  } finally { f.close(); }
});

test('password changes follow the local session and obsolete identity recovery has no effect', async () => {
  const f = await createWorkerFixture(config);
  try {
    const owner = await ownerCookie(f), email = 'editor@example.test';
    await createLocal(f, owner, email, 'editor');
    const editor = await loginCookie(f, 'editor');
    const ownerHash = f.db.prepare('SELECT password_hash FROM staff_accounts WHERE email=?').get('owner@example.test').password_hash;
    assert.equal((await access(f, owner, 'password-sso', {
      password: nextPassword, expectedEmail: 'owner@example.test',
    })).status, 404);
    assert.equal((await f.call('/api/admin/access/password', 'POST', {
      password: nextPassword, currentPassword: password,
    }, null, { 'oai-authenticated-user-email': 'owner@example.test' })).status, 403);
    // An email in the body cannot select whose password gets changed.
    const changed = await access(f, editor, 'password', {
      email: 'owner@example.test', expectedEmail: 'owner@example.test',
      currentPassword: password, password: nextPassword,
    });
    assert.equal(changed.status, 200);
    assert.equal(f.db.prepare('SELECT password_hash FROM staff_accounts WHERE email=?').get('owner@example.test').password_hash, ownerHash);
    assert.equal((await f.call('/api/posts', 'POST', {}, null, { cookie: editor })).status, 403);
    await loginCookie(f, 'editor', nextPassword);
    assert.equal((await access(f, owner, 'password', {
      email, currentPassword: password, password: nextPassword,
    })).status, 200);
    assert.equal((await f.call('/api/admin/settings', 'PATCH', {}, null, { cookie: owner })).status, 403);
  } finally { f.close(); }
});

test('concurrent revocation prevents a password change from restoring access', async () => {
  const f = await createWorkerFixture(config);
  try {
    const owner = await ownerCookie(f), email = 'editor@example.test';
    await createLocal(f, owner, email, 'editor');
    const editor = await loginCookie(f, 'editor');
    const accountId = f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email).id;
    f.beforeBatch = () => {
      f.beforeBatch = undefined;
      const now = Date.now();
      f.db.prepare('UPDATE user_roles SET revoked_at=?,updated_at=? WHERE email=?').run(now, now, email);
      f.db.prepare('UPDATE staff_accounts SET password_hash=NULL,disabled_at=?,credential_version=credential_version+1,updated_at=? WHERE id=?').run(now, now, accountId);
      f.db.prepare('DELETE FROM staff_sessions WHERE account_id=?').run(accountId);
    };
    assert.equal((await access(f, editor, 'password', {
      currentPassword: password, password: nextPassword,
    })).status, 409);
    const account = f.db.prepare('SELECT password_hash,disabled_at FROM staff_accounts WHERE id=?').get(accountId);
    assert.equal(account.password_hash, null);
    assert.ok(account.disabled_at);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='staff.password_changed' AND entity_id=?").get(accountId).n, 0);
    assert.equal((await f.call('/api/posts', 'POST', {}, null, { cookie: editor })).status, 403);
  } finally { f.close(); }
});

test('account search and pagination include more than 200 pending accounts and escape wildcards', async () => {
  const f = await createWorkerFixture(config);
  try {
    const cookie = await ownerCookie(f);
    for (let i = 0; i < 207; i++) seedRole(f, `person${String(i).padStart(3, '0')}@example.test`, 'editor');
    const page = await f.call('/admin/cuenta?page=9', 'GET', undefined, null, { cookie });
    const html = await page.text();
    assert.match(html, /person206@example.test/);
    assert.match(html, /207/);
    assert.doesNotMatch(html, /person000@example.test/);
    const search = await f.call('/admin/cuenta?q=person206', 'GET', undefined, null, { cookie });
    assert.match(await search.text(), /person206@example.test/);
    const wildcard = await f.call('/admin/cuenta?q=%25', 'GET', undefined, null, { cookie });
    assert.doesNotMatch(await wildcard.text(), /person206@example.test/);
  } finally { f.close(); }
});

test('legacy role routes cannot reactivate accounts and owner reactivation preserves identity', async () => {
  const f = await createWorkerFixture(config);
  try {
    const cookie = await ownerCookie(f), email = 'reviewer@example.test';
    await createLocal(f, cookie, email);
    const previousSession = await loginCookie(f, 'reviewer');
    const accountId = f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email).id;
    assert.equal((await access(f, cookie, 'revoke', {
      email, ...revision(f, email), currentPassword: password,
    })).status, 200);
    assert.equal((await f.call('/api/admin/roles/reviewer@example.test', 'PUT', { role: 'editor' }, null, { cookie })).status, 403);
    assert.equal((await access(f, cookie, 'reset', {
      email, ...revision(f, email), password: nextPassword, currentPassword: password,
    })).status, 409);
    await createLocal(f, cookie, email, 'editor', nextPassword);
    const account = f.db.prepare('SELECT id,email,disabled_at FROM staff_accounts WHERE email=?').get(email);
    assert.equal(account.id, accountId);
    assert.equal(account.email, email);
    assert.equal(account.disabled_at, null);
    assert.equal(f.db.prepare('SELECT role FROM user_roles WHERE email=?').get(email).role, 'editor');
    assert.equal((await f.call('/api/posts', 'POST', {}, null, { cookie: previousSession })).status, 403);
    const restored = await loginCookie(f, 'reviewer', nextPassword);
    assert.equal((await f.call('/admin', 'GET', undefined, null, { cookie: restored })).status, 200);
  } finally { f.close(); }
});


test('stale media edits preserve privacy and do not create false audit entries',async()=>{
 const f=await createWorkerFixture();try{seedMedia(f);
  assert.equal((await f.call('/api/media/image','PATCH',{visibility:'private'})).status,400);
  assert.equal((await f.call('/api/media/image','PATCH',{visibility:'private',expectedUpdatedAt:1})).status,200);
  assert.equal((await f.call('/api/media/image','PATCH',{visibility:'public',altText:'Otro texto de descripción',expectedUpdatedAt:1})).status,409);
  assert.equal(f.db.prepare('SELECT visibility FROM media').get().visibility,'private');
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='media.update'").get().n,1);
  const version=f.db.prepare('SELECT updated_at AS n FROM media').get().n;
  f.beforeBatch=()=>{f.beforeBatch=undefined;f.db.prepare('UPDATE media SET updated_at=updated_at+1').run();};
  assert.equal((await f.call('/api/media/image','PATCH',{visibility:'public',expectedUpdatedAt:version})).status,409);
  assert.equal(f.db.prepare('SELECT visibility FROM media').get().visibility,'private');
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='media.update'").get().n,1);
 }finally{f.close();}
});

test('media migration preserves existing files and initializes their revision',()=>{
 const db=new DatabaseSync(':memory:');try{
  const migrations=readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort();
  for(const name of migrations.filter(n=>!n.startsWith('0009_')))db.exec(readFileSync(new URL(`../drizzle/${name}`,import.meta.url),'utf8'));
  db.prepare('INSERT INTO media(id,object_key,file_name,mime_type,size_bytes,alt_text,visibility,uploaded_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run('old','old.webp','old.webp','image/webp',100,'Descripción original','private','owner@example.test',42);
  db.exec(readFileSync(new URL('../drizzle/0009_petite_pyro.sql',import.meta.url),'utf8'));
  assert.deepEqual({...db.prepare('SELECT object_key,visibility,updated_at FROM media').get()},{object_key:'old.webp',visibility:'private',updated_at:42});
 }finally{db.close();}
});

test('scheduled retention deletes expired records and children while preserving current records',async()=>{
 const f=await createWorkerFixture();try{
  const now=Date.now(),insert=f.db.prepare('INSERT INTO contact_requests(id,kind,message,notice_version,retention_until,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)');
  insert.run('expired','idea','Mensaje de prueba','test',now-1,'new',1,1);
  insert.run('current','idea','Mensaje vigente','test',now+86400000,'new',1,1);
  f.db.prepare('INSERT INTO request_entries(id,request_id,kind,body,actor_email,created_at) VALUES(?,?,?,?,?,?)').run('entry','expired','note','Nota privada de prueba','owner@example.test',1);
  await f.scheduled(now);
  assert.deepEqual(f.db.prepare('SELECT id FROM contact_requests').all().map(r=>r.id),['current']);
  assert.equal(f.db.prepare('SELECT count(*) AS n FROM request_entries').get().n,0);
  assert.equal(f.db.prepare("SELECT count(*) AS n FROM audit_logs WHERE action='retention.purge.scheduled'").get().n,1);
 }finally{f.close();}
});
