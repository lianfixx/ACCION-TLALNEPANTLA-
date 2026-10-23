import {publishedPosts} from "@/lib/public-posts";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[character]!);
}

export async function GET() {
  const {items:activities}=await publishedPosts(500);
  const urls = [
    { loc: `${SITE_URL}/`, priority: "1.0" },
    { loc: `${SITE_URL}/comisiones`, priority: "0.8" },
    { loc: `${SITE_URL}/participacion`, priority: "0.8" },
    { loc: `${SITE_URL}/agenda`, priority: "0.8" },
    { loc: `${SITE_URL}/actualidad`, priority: "0.7" },
    ...activities.map((post) => ({ loc: `${SITE_URL}/actualidad/${encodeURIComponent(post.slug)}`, priority: "0.6", lastmod: new Date(post.updatedAt).toISOString() })),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((item) => `  <url><loc>${escapeXml(item.loc)}</loc>${"lastmod" in item ? `<lastmod>${item.lastmod}</lastmod>` : ""}<priority>${item.priority}</priority></url>`).join("\n")}\n</urlset>\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, stale-while-revalidate=3600",
    },
  });
}
