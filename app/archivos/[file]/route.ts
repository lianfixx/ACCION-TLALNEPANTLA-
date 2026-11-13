import { getRuntimeEnv } from "@/lib/runtime-env";
import { isSiteDocumentSlug, staticDocumentHref, type SiteDocumentRow } from "@/lib/site-documents";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Documento no encontrado.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

/** Serves the replacement uploaded from the panel, or redirects to the original in public/documentos. */
async function serve(request: Request, context: { params: Promise<{ file: string }> }, head: boolean) {
  const slug = /^([a-z0-9-]+)\.pdf$/.exec((await context.params).file)?.[1];
  if (!isSiteDocumentSlug(slug)) return notFound();
  const original = () => new Response(null, { status: 302, headers: { Location: new URL(staticDocumentHref(slug), request.url).href, "Cache-Control": "public, max-age=60" } });
  const { DB, BUCKET } = getRuntimeEnv();
  if (!DB || !BUCKET) return original();
  try {
    const row = await DB.prepare("SELECT slug, object_key, file_name, size_bytes, sha256, uploaded_at, uploaded_by FROM site_documents WHERE slug = ?").bind(slug).first<SiteDocumentRow>();
    if (!row) return original();
    const object = await BUCKET.get(row.object_key);
    if (!object) return original();
    const headers = {
      "Content-Type": "application/pdf",
      "Content-Length": String(row.size_bytes),
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Cache-Control": "public, max-age=60",
      "ETag": `"${row.sha256}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    };
    if (head) { await object.body.cancel().catch(() => undefined); return new Response(null, { headers }); }
    return new Response(object.body, { headers });
  } catch {
    return original();
  }
}

export function GET(request: Request, context: { params: Promise<{ file: string }> }) { return serve(request, context, false); }
export function HEAD(request: Request, context: { params: Promise<{ file: string }> }) { return serve(request, context, true); }
