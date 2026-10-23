import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

async function statements(name) {
  const sql = await readFile(new URL(`../drizzle/${name}`, import.meta.url), "utf8");
  return sql.split("--> statement-breakpoint").map((item) => item.trim()).filter(Boolean);
}

function apply(db, items) {
  for (const statement of items) db.exec(statement);
}

test("applies every migration to a new SQLite/D1-compatible database", async () => {
  const db = new DatabaseSync(":memory:");
  apply(db, await statements("0000_last_thunderbird.sql"));
  apply(db, await statements("0001_brave_dorian_gray.sql"));
  apply(db, await statements("0002_sweet_runaways.sql"));
  assert.equal(db.prepare("PRAGMA quick_check").get().quick_check, "ok");
  assert.equal(db.prepare("SELECT count(*) AS total FROM sqlite_master WHERE type='table' AND name IN ('posts','comments','contact_requests','media','user_roles','audit_logs','rate_limits')").get().total, 7);
  assert.equal(db.prepare("SELECT count(*) AS total FROM pragma_index_list('rate_limits') WHERE name='rate_limits_scope_identity_window_unique'").get().total, 1);
  db.close();
});

test("upgrades legacy rows without fabricating consent", async () => {
  const db = new DatabaseSync(":memory:");
  apply(db, await statements("0000_last_thunderbird.sql"));
  db.exec("PRAGMA foreign_keys=ON");
  db.prepare("INSERT INTO posts (id,slug,title,excerpt,body,status,author_email,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run("post-1", "legacy", "Título previo", "Resumen previo suficientemente largo", "Contenido previo suficientemente largo para migración.", "published", "editor@example.test", 1, 1);
  db.prepare("INSERT INTO comments (id,post_id,author_email,author_name,body,status,created_at) VALUES (?,?,?,?,?,?,?)").run("comment-1", "post-1", "person@example.test", "Persona", "Opinión heredada", "approved", 1);
  db.prepare("INSERT INTO contact_requests (id,kind,message,status,created_at) VALUES (?,?,?,?,?)").run("request-1", "idea", "Solicitud heredada con longitud suficiente", "new", 1);
  apply(db, await statements("0001_brave_dorian_gray.sql"));
  apply(db, await statements("0002_sweet_runaways.sql"));
  const comment = db.prepare("SELECT notice_version,consent_at,retention_until FROM comments WHERE id='comment-1'").get();
  const request = db.prepare("SELECT notice_version,retention_until FROM contact_requests WHERE id='request-1'").get();
  assert.equal(comment.notice_version, "legacy-unversioned");
  assert.equal(comment.consent_at, 0);
  assert.equal(comment.retention_until, 0);
  assert.equal(request.notice_version, "legacy-unversioned");
  assert.equal(request.retention_until, 0);
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(db.prepare("PRAGMA quick_check").get().quick_check, "ok");
  db.close();
});

test("changes() gates audit inserts when an optimistic update loses a race", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE records (id TEXT PRIMARY KEY, version INTEGER NOT NULL); CREATE TABLE audit (id TEXT PRIMARY KEY, record_id TEXT NOT NULL)");
  db.prepare("INSERT INTO records (id, version) VALUES (?, ?)").run("record-1", 1);

  db.prepare("UPDATE records SET version = ? WHERE id = ? AND version = ?").run(2, "record-1", 1);
  db.prepare("INSERT INTO audit (id, record_id) SELECT ?, ? WHERE changes() > 0").run("audit-winner", "record-1");

  db.prepare("UPDATE records SET version = ? WHERE id = ? AND version = ?").run(3, "record-1", 1);
  db.prepare("INSERT INTO audit (id, record_id) SELECT ?, ? WHERE changes() > 0").run("audit-loser", "record-1");

  assert.deepEqual(
    db.prepare("SELECT id FROM audit ORDER BY id").all().map((row) => row.id),
    ["audit-winner"],
  );
  db.close();
});

test('profile migration preserves a preexisting membership and its consent verbatim',async()=>{
 const {readdir}=await import('node:fs/promises');
 const db=new DatabaseSync(':memory:');
 try{
  const files=(await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort();
  for(const file of files.filter(x=>!x.startsWith('0011_')))apply(db,await statements(file));
  db.prepare("INSERT INTO membership_applications(id,owner_email,name,commission,note,reference_code,status,notice_version,notice_snapshot,consent_text,consent_at,adult_self_declared,retention_until,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run('legacy','person@example.test','Nombre anterior','gobierno','Nota anterior','APJ-OLD','submitted','previous','Original notice','Original consent',1,1,Date.now()+90000,1,1);
  apply(db,await statements(files.find(x=>x.startsWith('0011_'))));
  const row=db.prepare('SELECT * FROM membership_applications').get();
  assert.equal(row.profile_json,'{}');assert.equal(row.notice_snapshot,'Original notice');assert.equal(row.consent_text,'Original consent');assert.equal(row.name,'Nombre anterior');
  assert.equal(db.prepare('PRAGMA quick_check').get().quick_check,'ok');
 }finally{db.close();}
});
