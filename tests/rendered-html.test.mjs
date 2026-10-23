import assert from "node:assert/strict";
import test from "node:test";

test("browser icon aliases resolve to the bundled PAN mark", async () => {
  const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url).href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  for (const path of ["/favicon.ico", "/apple-touch-icon.png", "/apple-touch-icon-precomposed.png"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = await worker.fetch(new Request(`https://example.test${path}`, { method }), env, ctx);
      assert.equal(response.status, 308);
      assert.equal(response.headers.get("location"), "https://example.test/images/real/pan-logo-oficial.png");
      assert.equal(response.headers.get("set-cookie"), null);
    }
  }
  const { stat } = await import("node:fs/promises");
  assert.ok((await stat(new URL("../dist/client/images/real/pan-logo-oficial.png", import.meta.url))).size > 0);
});

test("renders production metadata and remains indexable", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.doesNotMatch(html, /codex-preview|noindex|nofollow/i);
  assert.match(html, /property="og:title" content="Acción Política Juvenil Tlalnepantla"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /rel="canonical" href="https:\/\/accion-juvenil-tlalnepantla\.emilianomilla\.chatgpt\.site\/?"/i);
  assert.match(html, /type="application\/ld\+json"/i);
});

test("publishes crawler rules and a safe sitemap", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("seo-routes", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const robots = await worker.fetch(new Request("https://example.test/robots.txt"), env, ctx);
  assert.equal(robots.status, 200);
  const robotsText = await robots.text();
  assert.match(robotsText, /Allow: \/\n/);
  assert.match(robotsText, /Disallow: \/admin/);
  assert.match(robotsText, /Disallow: \/api\//);
  const sitemap = await worker.fetch(new Request("https://example.test/sitemap.xml"), env, ctx);
  assert.equal(sitemap.status, 200);
  const sitemapText = await sitemap.text();
  assert.match(sitemapText, /<urlset/);
  assert.match(sitemapText, /accion-juvenil-tlalnepantla\.emilianomilla\.chatgpt\.site\/participacion/);
  assert.doesNotMatch(sitemapText, /\/admin|\/api\//);
});

test("renders the official general youth platform without forum content", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("content-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Acción Juvenil/);
  assert.match(html, /Tlalnepantla/);
  assert.match(html, /Tu talento puede/);
  assert.match(html, /mover Tlalnepantla/);
  assert.match(html, /Comisiones de trabajo/);
  assert.match(html, /Mujeres al frente/);
  assert.match(html, /Nace Acción Juvenil/);
  assert.match(html, /Déborah Martínez/);
  assert.match(html, /victor-hugo-sondon-hueso\.webp/);
  assert.match(html, /laura-rojas-hueso\.webp/);
  assert.match(html, /marko-cortes-hueso\.webp/);
  assert.match(html, /felipe-calderon-hueso\.webp/);
  assert.match(html, /Experiencias de Acción Juvenil en México/);
  // Bundled, already compressed images must use deployable static paths.
  const imageTags = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
  assert.ok(imageTags.length > 5);
  const { stat } = await import("node:fs/promises");
  for (const tag of imageTags) {
    assert.match(tag, /src="\/images\//);
    assert.doesNotMatch(tag, /\/_next\/image|\/_vinext\/image/);
    const src = tag.match(/\bsrc="([^"]+)"/)[1];
    const asset = await stat(new URL(`../dist/client${src}`, import.meta.url));
    assert.ok(asset.size > 0, `Missing or empty deployed image: ${src}`);
  }
  assert.doesNotMatch(html, /Documento de trabajo no oficial|Propuesta juvenil|Formación · comunidad · acción pública|Aprende haciendo|Crece en comunidad|Pon una idea en marcha|Próximas conversaciones|Todo liderazgo tuvo un primer día|Nuestro ritmo/i);
  assert.doesNotMatch(html, /<i\b[^>]*\sstyle=/i);
  assert.doesNotMatch(html, /1 de septiembre de 2026|2 de septiembre de 2026|Foro 01|Generación Presente/i);
});

test("sets security headers on HTML and HSTS only over HTTPS", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("headers-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const http = await worker.fetch(new Request("http://localhost/"), env, ctx);
  assert.equal(http.headers.get("x-content-type-options"), "nosniff");
  assert.equal(http.headers.get("x-frame-options"), "DENY");
  assert.equal(http.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(http.headers.get("strict-transport-security"), null);
  const https = await worker.fetch(new Request("https://example.test/"), env, ctx);
  assert.match(https.headers.get("strict-transport-security") ?? "", /max-age=31536000/);
  const csp = https.headers.get("content-security-policy") ?? "";
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce);
  assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  const html = await https.text();
  const scripts = [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0]);
  assert.ok(scripts.length > 0);
  for (const script of scripts) assert.match(script, new RegExp(`\\bnonce=["']${nonce}["']`));
});

test("rejects cross-origin mutations and unsupported JSON types before storage", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("mutation-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  const crossOrigin = await worker.fetch(new Request("http://localhost/api/comments", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" }), env, ctx);
  assert.equal(crossOrigin.status, 403);
  const wrongType = await worker.fetch(new Request("http://localhost/api/contact", { method: "POST", headers: { origin: "http://localhost", "content-type": "text/plain" }, body: "{}" }), env, ctx);
  assert.equal(wrongType.status, 415);
});

test("rejects declared and streamed JSON bodies before they can grow without bound", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("body-limit-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };

  const declared = await worker.fetch(new Request("http://localhost/api/comments", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json", "content-length": "5001" },
    body: "{}",
  }), env, ctx);
  assert.equal(declared.status, 413);

  const streamedBody = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(20_000));
      controller.enqueue(new Uint8Array(6_000));
      controller.close();
    },
  });
  const streamed = await worker.fetch(new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json" },
    body: streamedBody,
    duplex: "half",
  }), env, ctx);
  assert.equal(streamed.status, 413);
});

test("contact remains fail-closed without Turnstile action and hostname expectations", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("turnstile-config-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("https://example.test/api/contact", {
    method: "POST",
    headers: { origin: "https://example.test", "content-type": "application/json" },
    body: JSON.stringify({ kind: "idea", message: "Una propuesta suficientemente detallada para la prueba." }),
  }), {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    CONTACT_ENABLED: "1",
    DATA_CONTROLLER_NAME: "Responsable de prueba",
    DATA_CONTROLLER_ADDRESS: "Domicilio de prueba",
    ARCO_EMAIL: "arco@example.test",
    PRIVACY_NOTICE_VERSION: "test-v1",
    CONTACT_RETENTION_DAYS: "30",
    RATE_LIMIT_SECRET: "0123456789abcdef0123456789abcdef",
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET_KEY: "secret-key",
  }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 503);
});

test("contact rejects successful Turnstile tokens with the wrong action or hostname", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("turnstile-verdict-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const db = {
    prepare(query) {
      return {
        async first() { return null; },
        bind(...params) {
          return {
            query,
            params,
            async run() { return { success: true, results: [], meta: {} }; },
            async first() { return { count: 1 }; },
          };
        },
      };
    },
  };
  const env = {
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    DB: db,
    CONTACT_ENABLED: "1",
    DATA_CONTROLLER_NAME: "Responsable de prueba",
    DATA_CONTROLLER_ADDRESS: "Domicilio de prueba",
    ARCO_EMAIL: "arco@example.test",
    PRIVACY_NOTICE_VERSION: "test-v1",
    CONTACT_RETENTION_DAYS: "30",
    RATE_LIMIT_SECRET: "0123456789abcdef0123456789abcdef",
    TURNSTILE_SITE_KEY: "site-key",
    TURNSTILE_SECRET_KEY: "secret-key",
    TURNSTILE_EXPECTED_ACTION: "contact",
    TURNSTILE_EXPECTED_HOSTNAME: "example.test",
  };
  const body = JSON.stringify({ kind: "idea", message: "Una propuesta suficientemente detallada para la prueba.", "cf-turnstile-response": "token" });
  const originalFetch = globalThis.fetch;
  try {
    for (const verdict of [
      { success: true, action: "other", hostname: "example.test" },
      { success: true, action: "contact", hostname: "other.example.test" },
    ]) {
      globalThis.fetch = async () => Response.json(verdict);
      const response = await worker.fetch(new Request("https://example.test/api/contact", {
        method: "POST",
        headers: { origin: "https://example.test", "content-type": "application/json", "cf-connecting-ip": "192.0.2.1" },
        body,
      }), env, { waitUntil() {}, passThroughOnException() {} });
      assert.equal(response.status, 400);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("scheduled retention queues a D1 purge through waitUntil", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("scheduled-test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const sql = [];
  const db = {
    prepare(query) {
      sql.push(query);
      return { bind: (...params) => ({ query, params, all: async()=>({results:[]}) }) };
    },
    async batch(statements) {
      assert.ok([2,5].includes(statements.length));
      return statements.map(() => ({ success: true, results: [], meta: {} }));
    },
  };
  let task;
  await worker.scheduled({ scheduledTime: 1_800_000_000_000, cron: "17 10 * * *" }, { DB: db }, {
    waitUntil(promise) { task = promise; },
    passThroughOnException() {},
  });
  assert.ok(task instanceof Promise);
  await task;
  assert.ok(sql.some((query) => /delete from "comments"/i.test(query)));
  assert.ok(sql.some((query) => /delete from "contact_requests"/i.test(query)));
  assert.ok(sql.some((query) => /delete from "membership_applications"/i.test(query)));
  assert.ok(sql.some((query) => /delete from "rate_limits"/i.test(query)));
  assert.ok(sql.some((query) => /insert into "audit_logs"/i.test(query)));
});


test("both image routes serve local images without an optional transformer and reject unsafe sources", async () => {
  const { readFile } = await import("node:fs/promises");
  const image = await readFile(new URL("../public/images/real/pan-logo-oficial.png", import.meta.url));
  const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url).href);
  let assetCalls = 0;
  const env = { ASSETS: { fetch: async (request) => {
    assetCalls++;
    assert.equal(new URL(request.url).pathname, "/images/real/pan-logo-oficial.png");
    return new Response(image, { headers: { "Content-Type": "image/png" } });
  } } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  for (const path of ["/_next/image", "/_vinext/image"]) {
    const response = await worker.fetch(new Request(`https://example.test${path}?url=%2Fimages%2Freal%2Fpan-logo-oficial.png&w=640&q=75`), env, ctx);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "image/png");
    assert.match(response.headers.get("Cache-Control") ?? "", /immutable/);
    assert.match(response.headers.get("Content-Security-Policy") ?? "", /script-src 'none'/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
    const rejected = await worker.fetch(new Request(`https://example.test${path}?url=https%3A%2F%2Fother.example%2Fimage.png&w=640&q=75`), env, ctx);
    assert.equal(rejected.status, 400);
  }
  assert.equal(assetCalls, 2);
});
