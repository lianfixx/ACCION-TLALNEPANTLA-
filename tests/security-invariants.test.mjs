import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("public post responses use an explicit field allowlist", async () => {
  const single = await read("app/api/posts/[id]/route.ts");
  const list = await read("app/api/posts/route.ts");
  assert.match(single, /id: posts\.id/);
  assert.match(single, /publishedAt: posts\.publishedAt/);
  assert.doesNotMatch(single.slice(0, single.indexOf("export async function PATCH")), /authorEmail|select\(\)/);
  assert.doesNotMatch(list.slice(0, list.indexOf("export async function POST")), /authorEmail|select\(\)/);
});

test("public aliases never fall back to the authenticated email", async () => {
  const auth = await read("lib/staff-auth.ts");
  const comments = await read("app/api/comments/route.ts");
  assert.match(auth, /a\.name AS displayName/);
  assert.doesNotMatch(auth, /displayName:.*\?\?.*email/);
  assert.match(comments, /authorName = cleanText\(payload\.publicName, 80\) \|\| "Participante"/);
});

test("retention and limits are backed by deployable migrations", async () => {
  const first = await read("drizzle/0001_brave_dorian_gray.sql");
  const second = await read("drizzle/0002_sweet_runaways.sql");
  assert.match(first, /CREATE TABLE `rate_limits`/);
  assert.match(first, /DEFAULT 'legacy-unversioned'/);
  assert.match(first, /`retention_until` integer NOT NULL DEFAULT 0/);
  assert.match(second, /comments_retention_idx/);
  assert.match(second, /contact_retention_idx/);
  assert.match(second, /rate_limits_scope_identity_window_unique/);
});

test("sensitive channels require full legal configuration and remain feature-gated", async () => {
  const config = await read("lib/privacy-config.ts");
  assert.match(config, /DATA_CONTROLLER_NAME/);
  assert.match(config, /DATA_CONTROLLER_ADDRESS/);
  assert.match(config, /ARCO_EMAIL/);
  assert.match(config, /PRIVACY_NOTICE_VERSION/);
  assert.match(config, /RATE_LIMIT_SECRET\.trim\(\)\.length >= 32/);
  assert.match(config, /TURNSTILE_EXPECTED_ACTION/);
  assert.match(config, /TURNSTILE_EXPECTED_HOSTNAME/);
  assert.match(config, /validTurnstileAction/);
  assert.match(config, /validTurnstileHostname/);
  assert.match(config, /TURNSTILE_EXPECTED_ACTION === "contact"/);
  assert.match(config, /featureEnabled && configurationComplete/);
  const contact = await read("app/api/contact/route.ts");
  assert.match(contact, /verdict\.action !== expectedAction/);
  assert.match(contact, /verdict\.hostname\?\.toLowerCase\(\) !== expectedHostname/);
  assert.ok(contact.indexOf('consumeRateLimit("contact-verification-10m"') < contact.indexOf("siteverify"), "a coarse abuse quota must protect the verification subrequest");
  assert.ok(contact.indexOf("siteverify") < contact.indexOf('consumeRateLimit("contact-10m"'), "valid Turnstile proof must be checked before consuming the submission quota");
  assert.match(contact, /AbortSignal\.timeout\(7_000\)/);
  assert.match(contact, /phone: null, institution/);
  assert.doesNotMatch(contact, /cleanText\(payload\.phone/);
  assert.match(contact, /cleanText\(payload\.institution, 160\)/);
  assert.match(contact, /\["collaboration", "idea"\]\.includes\(kind\)/);
  assert.match(contact, /DETAIL_FIELDS/);
  assert.match(contact, /referenceCode/);
  const form = await read("app/participacion/ContactForm.tsx");
  assert.match(form, /data-action="contact"/);
});

test("uploads validate bytes and compensate an orphaned object", async () => {
  const route = await read("app/api/media/route.ts");
  const normalizer = await read("lib/media-security.ts");
  assert.match(route, /imageBytesMatchMime/);
  assert.match(route, /readBodyBytes\(request,MAX_BYTES\+512_000\)/);
  assert.match(route, /normalizeRasterImage/);
  assert.match(route, /BUCKET\.put\(objectKey, normalized\.bytes/);
  assert.match(route, /metadataPolicy:mimeType==="image\/jpeg"\?"discard-except-copyright":"discard-all"/);
  assert.match(route, /initialVisibility:"private"/);
  assert.match(route, /adminWriteCondition\(actor,\["admin","editor"\]\)/);
  assert.match(route, /runtime\.BUCKET!?\.delete\(objectKey\)/);
  assert.doesNotMatch(route, /customMetadata[\s\S]*actor\.email/);
  assert.match(normalizer, /images\.info/);
  assert.match(normalizer, /\.output\(\{/);
  assert.match(normalizer, /anim: false/);
  assert.match(normalizer, /MAX_PIXELS/);
  assert.match(normalizer, /readOutputWithinLimit/);
});

test("legacy role mutations stay closed and account management rechecks owner credentials", async () => {
  const legacy = await read("app/api/admin/roles/[email]/route.ts");
  assert.match(legacy, /status:403/);
  assert.doesNotMatch(legacy, /getDb|userRoles/);
  const route = await read("app/api/admin/access/[action]/route.ts");
  assert.match(route, /canManageRoles/);
  assert.match(route, /verifyPassword\(input.currentPassword/);
  const management = await read("lib/staff-management.ts");
  assert.match(management, /credential_version/);
  assert.match(management, /db.batch/);
});

test("all JSON mutations use the bounded streaming reader", async () => {
  const security = await read("lib/security.ts");
  assert.match(security, /assertDeclaredBodyWithinLimit/);
  assert.match(security, /request\.body\.getReader\(\)/);
  assert.match(security, /totalBytes > maxBytes/);
  assert.match(security, /reader\.cancel\("body-too-large"\)/);
  const routes = [
    "app/api/contact/route.ts",
    "app/api/comments/route.ts",
    "app/api/posts/route.ts",
    "app/api/posts/[id]/route.ts",
    "app/api/comments/[id]/route.ts",
    "app/api/media/[id]/route.ts",
    "app/api/admin/requests/[id]/route.ts",
    "app/api/admin/access/[action]/route.ts",
    "app/api/admin/maintenance/retention/route.ts",
  ];
  for (const path of routes) {
    const source = await read(path);
    assert.match(source, /readJsonBody/);
    assert.doesNotMatch(source, /request\.text\(\)|request\.json\(\)/);
  }
});

test("guarded updates only write an audit row when the mutation succeeds", async () => {
  for (const path of ["app/api/posts/[id]/route.ts", "app/api/admin/requests/[id]/route.ts", "app/api/comments/[id]/route.ts"]) {
    const source = await read(path);
    assert.match(source, /const auditInsert = db\.insert\(auditLogs\)\.select\(sql`/);
    assert.match(source, /WHERE changes\(\) > 0/);
    assert.match(source, /db\.batch\(\[[\s\S]*auditInsert/);
  }
});

test("retention can run from a Cloudflare scheduled event and the protected manual endpoint", async () => {
  const worker = await read("worker/index.ts");
  const helper = await read("lib/retention.ts");
  const route = await read("app/api/admin/maintenance/retention/route.ts");
  assert.match(worker, /async scheduled\(controller: ScheduledController/);
  assert.match(worker, /ctx\.waitUntil\(purgeExpiredData\("system:scheduled", "scheduled", controller\.scheduledTime\)\)/);
  assert.match(helper, /db\.delete\(comments\)/);
  assert.match(helper, /db\.delete\(contactRequests\)/);
  assert.match(helper, /db\.delete\(rateLimits\)/);
  assert.match(route, /PURGAR_VENCIDOS/);
  assert.match(route, /purgeExpiredData\(actor\.email, "manual",Date\.now\(\),actor\)/);
  const deployedConfig = JSON.parse(await read("dist/server/wrangler.json"));
  assert.equal(deployedConfig.images?.binding, "IMAGES");
  assert.deepEqual(deployedConfig.triggers?.crons, ["17 10 * * *"]);
});

test("dependency pins retain the verified security patch versions", async () => {
  const manifest = JSON.parse(await read("package.json"));
  const lock = JSON.parse(await read("package-lock.json"));
  assert.equal(manifest.dependencies.next, "16.3.8");
  assert.equal(manifest.devDependencies["react-server-dom-webpack"], "19.2.8");
  assert.equal(manifest.devDependencies.vite, "8.2.1");
  assert.equal(manifest.devDependencies.eslint, "9.39.5");
  assert.equal(manifest.overrides["fast-uri"], "3.1.8");
  assert.equal(lock.packages["node_modules/fast-uri"].version, "3.1.8");
});
