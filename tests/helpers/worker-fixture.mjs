import {randomBytes,createHash} from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";

export async function createWorkerFixture(overrides = {}) {
  const db = new DatabaseSync(":memory:");
  for (const name of readdirSync(new URL("../../drizzle/", import.meta.url)).filter(name => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(new URL(`../../drizzle/${name}`, import.meta.url), "utf8"));
  }
  db.exec("PRAGMA foreign_keys=ON");
  const fixture = { db, beforeBatch: undefined };
  function prepare(query, params = []) {
    const execute = () => {
      const results = db.prepare(query).all(...params).map(row => ({ ...row }));
      return { success: true, results, meta: { changes: db.prepare("SELECT changes() AS n").get().n } };
    };
    return {
      query,
      execute,
      bind(...values) { return prepare(query, values); },
      async all() { return execute(); },
      async run() { return execute(); },
      async raw() { return execute().results.map(row => Object.values(row)); },
      async first(column) {
        const row = execute().results[0];
        return row ? column ? row[column] : row : null;
      },
    };
  }
  const binding = {
    prepare,
    async batch(statements) {
      await fixture.beforeBatch?.(statements);
      db.exec("BEGIN");
      try {
        // D1 batches are atomic: do not yield between statements.
        const results = statements.map(statement => statement.execute());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
  const { default: worker } = await import("../../dist/server/index.js");
  const env = { DB: binding, ADMIN_EMAILS: "owner@example.test", ASSETS: { fetch: () => new Response("", { status: 404 }) }, ...overrides };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const tokens=new Map();
  fixture.seedAccount=(email)=>{
    if(!tokens.has(email)){
      const existing=db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email);
      const id=existing?.id??crypto.randomUUID(),token=randomBytes(32).toString('hex'),now=Date.now();
      if(!existing)db.prepare('INSERT INTO staff_accounts(id,email,name,password_hash,credential_version,created_at,updated_at) VALUES(?,?,?,?,1,?,?)').run(id,email,email,'scrypt-v1$'+'0'.repeat(32)+'$'+'0'.repeat(64),now,now);
      db.prepare('INSERT INTO staff_sessions(token_hash,account_id,credential_version,created_at,last_seen_at,expires_at) SELECT ?,id,credential_version,?,?,? FROM staff_accounts WHERE id=?').run(createHash('sha256').update(token).digest('hex'),now,now,now+8*60*60_000,id);
      tokens.set(email,'__Host-apjt_session='+token);
    }
    return tokens.get(email);
  };
  fixture.call = (path, method = "GET", body, actor = "owner@example.test", extraHeaders = {}) => worker.fetch(new Request(`https://example.test${path}`, {
    method,
    headers: { origin: "https://example.test", "content-type": "application/json", ...(actor ? {cookie:fixture.seedAccount(actor)} : {}), ...extraHeaders },
    ...(method === "GET" ? {} : { body: JSON.stringify(body) }),
  }), env, ctx);
  fixture.callRaw = (path,body,actor="owner@example.test",headers={},method="POST") => worker.fetch(new Request(`https://example.test${path}`,{method,headers:{origin:"https://example.test",...(actor?{cookie:fixture.seedAccount(actor)}:{}),...headers},body}),env,ctx);
  fixture.close = () => db.close();
  fixture.scheduled = async scheduledTime => {
    const pending=[];
    await worker.scheduled({scheduledTime,cron:'17 10 * * *'},env,{...ctx,waitUntil(promise){pending.push(promise);}});
    await Promise.all(pending);
  };
  return fixture;
}
