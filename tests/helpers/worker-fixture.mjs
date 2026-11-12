import {randomBytes,createHash} from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import assert from 'node:assert/strict';

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
  // Mock only external providers. Application routes, hashes, sessions and SQL remain real.
  const providerKey = crypto.randomUUID();
  const mail = [];
  fixture.mail = mail;
  fixture.captchaVerdict = {success:true,action:'signup',hostname:'example.test'};
  fixture.emailFailure = false;
  const priorFetch = globalThis.fetch;
  globalThis.fetch = async (url,options) => {
    if(String(url)==='https://api.resend.com/emails' && new Headers(options?.headers).get('authorization')===`Bearer ${providerKey}`) {
      if(fixture.emailFailure) return new Response('',{status:503});
      mail.push(JSON.parse(options.body));
      return Response.json({id:crypto.randomUUID()});
    }
    if(String(url)==='https://challenges.cloudflare.com/turnstile/v0/siteverify' && options?.body instanceof FormData && options.body.get('secret')===providerKey) {
      if(fixture.captchaFailure) throw new Error('isolated provider outage');
      return Response.json(fixture.captchaVerdict);
    }
    return priorFetch(url,options);
  };
  // Vinext captures fetch at module initialization; install the stub before import.
  const { default: worker } = await import("../../dist/server/index.js");
  const env = { DB: binding, ADMIN_EMAILS: "owner@example.test", ASSETS: { fetch: () => new Response("", { status: 404 }) },
    RESEND_API_KEY:providerKey,REGISTRATION_EMAIL_FROM:'no-reply@example.test',REGISTRATION_PUBLIC_ORIGIN:'https://example.test',
    REGISTRATION_TURNSTILE_SITE_KEY:'isolated-site-key',REGISTRATION_TURNSTILE_SECRET_KEY:providerKey,REGISTRATION_TURNSTILE_HOSTNAME:'example.test', ...overrides };
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
  fixture.confirmEmail = async email => {
    const sent=mail.findLast(message=>message.to.includes(email));
    assert.ok(sent,'confirmation must be delivered to the mock provider');
    const token=sent.text.match(/#codigo=([a-f0-9]{64})/)?.[1];assert.ok(token);
    const confirmed=await fixture.call('/api/confirmar-correo','POST',{action:'confirm',token},null);
    assert.equal(confirmed.status,200,await confirmed.clone().text());
    return confirmed;
  };
  fixture.confirmAndLogin = async payload => {
    await fixture.confirmEmail(payload.email);
    const login=await fixture.call('/api/admin/access/login','POST',{username:payload.username,password:payload.password},null);
    assert.equal(login.status,200,await login.clone().text());return login;
  };
  fixture.close = () => { globalThis.fetch=priorFetch; db.close(); };
  fixture.scheduled = async scheduledTime => {
    const pending=[];
    await worker.scheduled({scheduledTime,cron:'17 10 * * *'},env,{...ctx,waitUntil(promise){pending.push(promise);}});
    await Promise.all(pending);
  };
  return fixture;
}
