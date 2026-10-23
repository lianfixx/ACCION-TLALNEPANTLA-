import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {adminWriteCondition} from '@/lib/admin-write-guard';
import {publishedPosts} from "@/lib/public-posts";
import {isEditorialPhoto,editorialPosts} from "@/lib/editorial-post";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, media, posts } from "@/db/schema";
import { canPublish, currentAuthorizedUser } from "@/lib/authz";
import { cleanText, jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin, slugify } from "@/lib/security";

const MAX_JSON_BYTES = 80_000;

export async function GET() {
 const result=await publishedPosts(50);
 return noStoreJson({posts:result.items,...(result.unavailable?{setupPending:true}:{})});
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canPublish(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });

  let payload: Record<string, unknown>;
  try {
    payload = await readJsonBody<Record<string, unknown>>(request, MAX_JSON_BYTES);
  }
  catch (error) { return jsonBodyErrorResponse(error); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });

  const title = cleanText(payload.title, 140);
  const excerpt = cleanText(payload.excerpt, 320);
  const body = cleanText(payload.body, 12000);
  const requestedSlug = cleanText(payload.slug, 90);
  const slug = slugify(requestedSlug || title);
  if(editorialPosts.some(post=>post.slug===slug))return noStoreJson({error:"Esta publicación ya está disponible en el panel. Ábrela para editarla."},{status:409});
  const status = payload.status === "published" ? "published" : "draft";
  const coverMediaId = cleanText(payload.coverMediaId, 80) || null;
  if (title.length < 5 || excerpt.length < 20 || body.length < 40 || !slug) {
    return noStoreJson({ error: "Completa título, resumen y contenido con información suficiente." }, { status: 400 });
  }

  const now = Date.now();
  const id = crypto.randomUUID();
  try {
    const db = getDb();
    if (coverMediaId && !isEditorialPhoto(coverMediaId)) {
      const [cover] = await db.select({ id: media.id, visibility: media.visibility }).from(media).where(eq(media.id, coverMediaId)).limit(1);
      if (!cover || (status === "published" && cover.visibility !== "public")) {
        return noStoreJson({ error: "La imagen de portada debe existir y estar aprobada antes de publicar." }, { status: 400 });
      }
    }
    const coverCondition = status === "published" && coverMediaId && !isEditorialPhoto(coverMediaId)
      ? sql`EXISTS (SELECT 1 FROM ${media} WHERE ${media.id} = ${coverMediaId} AND ${media.visibility} = 'public')`
      : sql`1 = 1`;
    const [created] = await db.batch([
      db.insert(posts).select(sql`
        SELECT ${id}, ${slug}, ${title}, ${excerpt}, ${body}, ${coverMediaId}, ${status}, ${actor.email}, ${now}, ${now}, ${status === "published" ? now : null}
        WHERE ${coverCondition} AND ${adminWriteCondition(actor,["admin","editor"])}
      `).returning(),
      db.insert(auditLogs).select(sql`
        SELECT ${crypto.randomUUID()}, ${actor.email}, ${`post.${status}`}, ${"post"}, ${id}, ${JSON.stringify({ changedFields: ["title", "slug", "excerpt", "body", "coverMediaId", "status"], toStatus: status })}, ${now}
        WHERE changes() > 0
      `),
    ]);
    const post = created[0];
    if (!post) return noStoreJson({ error: "La portada cambió en otra sesión. Revisa su visibilidad antes de publicar.", code: "edit_conflict" }, { status: 409 });
    return noStoreJson({ post }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && /unique/i.test(error.message) ? "Ese identificador ya está en uso." : "No fue posible guardar la publicación.";
    return noStoreJson({ error: message }, { status: 500 });
  }
}
