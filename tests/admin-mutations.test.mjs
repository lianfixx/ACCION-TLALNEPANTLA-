import {ownerPassword,ownerConfig,bootstrapOwner,cookieOf,accountVersions} from './helpers/owner-account.mjs';
import assert from "node:assert/strict";
import test from "node:test";
import { createWorkerFixture } from "./helpers/worker-fixture.mjs";

const postFields = { title: "Publicación de prueba", excerpt: "Resumen suficientemente largo para la prueba aislada.", body: "Contenido de prueba almacenado únicamente en la base SQLite temporal.", status: "draft" };
const auditCount = fixture => fixture.db.prepare("SELECT count(*) AS n FROM audit_logs").get().n;
function seedRole(fixture, email, role) {
  fixture.db.prepare("INSERT INTO user_roles (email,role,created_at,created_by) VALUES (?,?,?,?)").run(email, role, 1, "owner@example.test");
}
async function createPost(fixture, extra = {}) {
  const response = await fixture.call("/api/posts", "POST", { ...postFields, ...extra });
  assert.equal(response.status, 201);
  return (await response.json()).post;
}
function seedMedia(fixture) {
  fixture.db.prepare("INSERT INTO media (id,object_key,file_name,mime_type,size_bytes,alt_text,visibility,uploaded_by,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
    .run("cover", "test-cover", "cover.png", "image/png", 8, "Imagen para prueba aislada", "public", "owner@example.test", 1);
}

test("post edits publish drafts, retain the publication date, enforce roles and detect stale edits", async () => {
  const fixture = await createWorkerFixture();
  try {
    seedRole(fixture, "editor@example.test", "editor");
    seedRole(fixture, "moderator@example.test", "moderator");
    const post = await createPost(fixture);
    assert.equal((await (await fixture.call("/api/posts")).json()).posts.some(item=>item.id===post.id), false);
    assert.equal((await fixture.call(`/api/posts/${post.id}`)).status, 404);
    for (const actor of [null, "moderator@example.test"]) assert.equal((await fixture.call(`/api/posts/${post.id}`, "PATCH", { status: "published" }, actor)).status, 403);
    const publishedResponse = await fixture.call(`/api/posts/${post.id}`, "PATCH", { status: "published", expectedUpdatedAt: post.updatedAt }, "editor@example.test");
    assert.equal(publishedResponse.status, 200);
    const published = (await publishedResponse.json()).post;
    assert.ok(published.publishedAt);
    assert.equal((await fixture.call(`/api/posts/${post.id}`)).status, 200);
    const correctedResponse = await fixture.call(`/api/posts/${post.id}`, "PATCH", { title: "Título corregido", expectedUpdatedAt: published.updatedAt });
    assert.equal(correctedResponse.status, 200);
    const corrected = (await correctedResponse.json()).post;
    assert.equal(corrected.publishedAt, published.publishedAt);
    assert.equal(auditCount(fixture), 3);
    assert.equal((await fixture.call(`/api/posts/${post.id}`, "PATCH", { status: "draft", expectedUpdatedAt: published.updatedAt })).status, 409);
    assert.equal(auditCount(fixture), 3);
    const archived = await fixture.call(`/api/posts/${post.id}`, "PATCH", { status: "archived", expectedUpdatedAt: corrected.updatedAt });
    assert.equal(archived.status, 200);
    assert.equal((await fixture.call(`/api/posts/${post.id}`)).status, 404);
    assert.equal(auditCount(fixture), 4);
  } finally { fixture.close(); }
});

test("request tracking commits status and audit together and rejects conflicts", async () => {
  const fixture = await createWorkerFixture();
  try {
    seedRole(fixture, "editor@example.test", "editor");
    seedRole(fixture, "admin@example.test", "admin");
    fixture.db.prepare("INSERT INTO contact_requests (id,kind,message,notice_version,retention_until,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)")
      .run("request", "idea", "Solicitud de prueba aislada", "test-only", 9999999999999, "new", 1, 1);
    const body = { status: "in_review", assignedTo: "admin@example.test", expectedUpdatedAt: 1 };
    assert.equal((await fixture.call("/api/admin/requests/request", "PATCH", body, "editor@example.test")).status, 403);
    const updated = await fixture.call("/api/admin/requests/request", "PATCH", body, "admin@example.test");
    assert.equal(updated.status, 200);
    const record = (await updated.json()).record;
    assert.equal(record.status, "in_review");
    assert.equal(record.assignedTo, "admin@example.test");
    assert.equal(auditCount(fixture), 1);
    assert.equal((await fixture.call("/api/admin/requests/request", "PATCH", body)).status, 409);
    assert.equal(auditCount(fixture), 1);
    fixture.beforeBatch = () => {
      fixture.beforeBatch = undefined;
      fixture.db.prepare("UPDATE contact_requests SET updated_at=? WHERE id='request'").run(record.updatedAt + 1);
    };
    assert.equal((await fixture.call("/api/admin/requests/request", "PATCH", { ...body, status: "closed", expectedUpdatedAt: record.updatedAt })).status, 409);
    assert.equal(auditCount(fixture), 1, "a race lost at the SQL update must not append an audit row");
    assert.equal((await fixture.call("/api/admin/requests/request", "PATCH", { ...body, status: "closed", expectedUpdatedAt: record.updatedAt + 1 })).status, 200);
    assert.equal(fixture.db.prepare("SELECT status,closed_at FROM contact_requests WHERE id='request'").get().status, "closed");
    assert.equal(auditCount(fixture), 2);
  } finally { fixture.close(); }
});

test("moderation updates an existing opinion with an atomic audit while public submissions remain disabled", async () => {
  const fixture = await createWorkerFixture();
  try {
    const post = await createPost(fixture);
    seedRole(fixture, "editor@example.test", "editor");
    seedRole(fixture, "moderator@example.test", "moderator");
    fixture.db.prepare("INSERT INTO comments (id,post_id,author_email,author_name,body,status,notice_version,consent_at,retention_until,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
      .run("comment", post.id, "participant@example.test", "Alias de prueba", "Opinión de prueba aislada", "pending", "test-only", 1, 9999999999999, 1);
    assert.equal((await fixture.call("/api/comments", "POST", {})).status, 503);
    assert.equal((await fixture.call("/api/contact", "POST", {})).status, 503);
    assert.equal((await fixture.call("/api/comments/comment", "PATCH", { status: "approved" }, "editor@example.test")).status, 403);
    const approved = await fixture.call("/api/comments/comment", "PATCH", { status: "approved", expectedUpdatedAt: 1 }, "moderator@example.test");
    assert.equal(approved.status, 200);
    const approvedRecord = (await approved.json()).comment;
    assert.equal(approvedRecord.status, "approved");
    assert.equal(auditCount(fixture), 2);
    const rejected = await fixture.call("/api/comments/comment", "PATCH", { status: "rejected", expectedUpdatedAt: approvedRecord.moderatedAt }, "moderator@example.test");
    assert.equal(rejected.status, 200);
    const rejectedRecord = (await rejected.json()).comment;
    assert.equal(auditCount(fixture), 3);
    fixture.beforeBatch = () => {
      fixture.beforeBatch = undefined;
      fixture.db.prepare("DELETE FROM comments WHERE id='comment'").run();
    };
    assert.equal((await fixture.call("/api/comments/comment", "PATCH", { status: "approved", expectedUpdatedAt: rejectedRecord.moderatedAt })).status, 409);
    assert.equal(auditCount(fixture), 3);
  } finally { fixture.close(); }
});

test("administrative JSON endpoints reject null, arrays and scalar bodies with JSON 400 responses", async () => {
  const fixture = await createWorkerFixture();
  try {
    const endpoints = [["/api/posts", "POST"], ["/api/posts/missing", "PATCH"], ["/api/media/missing", "PATCH"], ["/api/comments/missing", "PATCH"], ["/api/admin/requests/missing", "PATCH"], ["/api/admin/access/create", "POST"], ["/api/admin/maintenance/retention", "POST"]];
    for (const [path, method] of endpoints) for (const body of [null, [], "invalid"]) {
      const response = await fixture.call(path, method, body);
      assert.equal(response.status, 400, `${method} ${path} with ${JSON.stringify(body)}`);
      assert.equal(typeof (await response.json()).error, "string");
    }
    assert.equal(auditCount(fixture), 0);
  } finally { fixture.close(); }
});

for (const operation of ["create", "update"]) for (const pausedAction of ["publish", "privatize"]) {
  test(`${operation}: simultaneous publication and image privatization preserve public covers when ${pausedAction} pauses`, async () => {
    const fixture = await createWorkerFixture();
    try {
      seedMedia(fixture);
      const draft = operation === "update" ? await createPost(fixture, { coverMediaId: "cover" }) : null;
      const initialAuditCount = auditCount(fixture);
      const publish = () => draft
        ? fixture.call(`/api/posts/${draft.id}`, "PATCH", { status: "published", expectedUpdatedAt: draft.updatedAt })
        : fixture.call("/api/posts", "POST", { ...postFields, status: "published", coverMediaId: "cover" });
      const privatize = () => fixture.call("/api/media/cover", "PATCH", { visibility: "private", expectedUpdatedAt: 0 });
      let release, markPaused;
      const gate = new Promise(resolve => { release = resolve; });
      const paused = new Promise(resolve => { markPaused = resolve; });
      fixture.beforeBatch = async () => {
        fixture.beforeBatch = undefined;
        markPaused();
        await gate;
      };
      const pending = (pausedAction === "publish" ? publish : privatize)();
      await paused;
      const winner = await (pausedAction === "publish" ? privatize : publish)();
      release();
      const loser = await pending;
      assert.equal(winner.status, pausedAction === "privatize" && operation === "create" ? 201 : 200);
      assert.equal(loser.status, 409);
      assert.equal(fixture.db.prepare("SELECT count(*) AS n FROM posts JOIN media ON posts.cover_media_id=media.id WHERE posts.status='published' AND media.visibility!='public'").get().n, 0);
      assert.equal(auditCount(fixture), initialAuditCount + 1, "only the successful mutation must be audited");
    } finally { fixture.close(); }
  });
}

test("only configured owners manage accounts and revoked editors lose publishing access", async () => {
  const fixture = await createWorkerFixture(ownerConfig);
  try {
    const owner=await bootstrapOwner(fixture);
    const manage=(action,body)=>fixture.call(`/api/admin/access/${action}`,'POST',{currentPassword:ownerPassword,...body},null,{cookie:owner});
    seedRole(fixture, "admin@example.test", "admin");
    assert.equal((await fixture.call("/api/admin/access/create", "POST", {email:'editor@example.test',username:'editor',password:ownerPassword,currentPassword:ownerPassword,role:'editor'}, "admin@example.test")).status, 403);
    assert.equal((await manage('create',{email:'editor@example.test',username:'editor',name:'Editor de prueba',password:ownerPassword,role:'editor'})).status,200);
    const login=await fixture.call('/api/admin/access/login','POST',{username:'editor',password:ownerPassword},null);
    assert.equal(login.status,200);const editor={cookie:cookieOf(login)};
    assert.equal((await fixture.call("/api/posts", "POST", postFields, null,editor)).status, 201);
    assert.equal((await fixture.call("/api/admin/roles/editor@example.test", "PUT", {role:'admin'})).status,403);
    assert.equal((await manage('revoke',{email:'editor@example.test',...accountVersions(fixture,'editor@example.test')})).status,200);
    assert.equal((await fixture.call("/api/posts", "POST", { ...postFields, slug: "blocked" }, null,editor)).status, 403);
    assert.equal((await manage('create',{email:'editor@example.test',username:'editor',name:'Editor de prueba',password:ownerPassword,role:'editor',...accountVersions(fixture,'editor@example.test')})).status,200);
    const restored=await fixture.call('/api/admin/access/login','POST',{username:'editor',password:ownerPassword},null);
    assert.equal((await fixture.call("/api/posts", "POST", {...postFields,slug:'restored'}, null,{cookie:cookieOf(restored)})).status,201);
    assert.equal((await manage('revoke',{email:'owner@example.test'})).status,400);
  } finally { fixture.close(); }
});
