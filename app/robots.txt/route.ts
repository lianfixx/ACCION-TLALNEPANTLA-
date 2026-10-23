import { SITE_URL } from "@/lib/site";

export function GET() {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /ingresar",
    "Disallow: /cuenta",
    "Disallow: /mi-comision",
    "Disallow: /crear-cuenta",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
