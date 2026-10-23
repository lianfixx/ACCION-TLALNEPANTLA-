import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {adminWriteCondition} from '@/lib/admin-write-guard';
import {editorialPosts,isEditorialPhoto} from "@/lib/editorial-post";
import {publishedPost,availableEditorialPost} from "@/lib/public-posts";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLogs, media, posts } from "@/db/schema";
import { canPublish, currentAuthorizedUser } from "@/lib/authz";
import { cleanText, jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin, slugify } from "@/lib/security";

const MAX_JSON_BYTES = 80_000;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
 const {id}=await context.params;
 const result=await publishedPost(id,"id");
 if(result.unavailable)return noStoreJson({error:"Contenido aún no disponible."},{status:503});
 return result.item?noStoreJson({post:result.item}):noStoreJson({error:"Publicación no encontrada."},{status:404});
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canPublish(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  const { id } = await context.params;
  let payload: Record<string, unknown>;
  try {
    payload = await readJsonBody<Record<string, unknown>>(request, MAX_JSON_BYTES);
  }
  catch (error) { return jsonBodyErrorResponse(error); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });

  const status = ["draft", "published", "archived"].includes(String(payload.status)) ? String(payload.status) as "draft" | "published" | "archived" : undefined;
  const title = payload.title === undefined ? undefined : cleanText(payload.title, 140);
  const slug = payload.slug === undefined ? undefined : slugify(cleanText(payload.slug, 90));
  if(editorialPosts.some(post=>post.slug===slug&&post.id!==id))return noStoreJson({error:"Ese identificador pertenece a otra publicación. Elige otro."},{status:409});
  const excerpt = payload.excerpt === undefined ? undefined : cleanText(payload.excerpt, 320);
  const body = payload.body === undefined ? undefined : cleanText(payload.body, 12000);
  const coverMediaId = payload.coverMediaId === undefined ? undefined : cleanText(payload.coverMediaId, 80) || null;
  const expectedUpdatedAt = Number(payload.expectedUpdatedAt);
  if (!["number", "string"].includes(typeof payload.expectedUpdatedAt) || String(payload.expectedUpdatedAt).trim() === "" || !Number.isSafeInteger(expectedUpdatedAt) || expectedUpdatedAt < 0) {
    return noStoreJson({ error: "Actualiza la publicación antes de guardar los cambios." }, { status: 400 });
  }
  if ((title !== undefined && title.length < 5) || (slug !== undefined && !slug) || (excerpt !== undefined && excerpt.length < 20) || (body !== undefined && body.length < 40)) {
    return noStoreJson({ error: "El contenido no cumple las longitudes mínimas." }, { status: 400 });
  }
  try {
    const db = getDb();
    const [stored] = await db.select({ id: posts.id, status: posts.status, coverMediaId: posts.coverMediaId, publishedAt: posts.publishedAt, updatedAt: posts.updatedAt }).from(posts).where(eq(posts.id, id)).limit(1);
    const source = !stored && editorialPosts.some(post=>post.id===id) ? await availableEditorialPost(id) : null;
    const current = stored ?? source;
    if (!current) return noStoreJson({ error: "Publicación no encontrada." }, { status: 404 });
    if (current.updatedAt !== expectedUpdatedAt) return noStoreJson({ error: "La publicación cambió en otra sesión. Actualiza el panel antes de guardar.", code: "edit_conflict" }, { status: 409 });
    const finalStatus = status ?? current.status;
    const finalCoverMediaId = coverMediaId === undefined ? current.coverMediaId : coverMediaId;
    const validateCover = finalCoverMediaId && !isEditorialPhoto(finalCoverMediaId) && (coverMediaId !== undefined || finalStatus === "published");
    if (validateCover) {
      const [cover] = await db.select({ id: media.id, visibility: media.visibility }).from(media).where(eq(media.id, finalCoverMediaId!)).limit(1);
      if (!cover || (finalStatus === "published" && cover.visibility !== "public")) return noStoreJson({ error: "La portada debe existir y ser pública antes de publicar." }, { status: 400 });
    }
    const now = Math.max(Date.now(), current.updatedAt + 1);
    const publishedAt = finalStatus === "published" ? (current.publishedAt ?? now) : null;
    const changes = { ...(title === undefined ? {} : { title }), ...(slug === undefined ? {} : { slug }), ...(excerpt === undefined ? {} : { excerpt }), ...(body === undefined ? {} : { body }), ...(coverMediaId === undefined ? {} : { coverMediaId }), ...(status === undefined ? {} : { status, publishedAt }), updatedAt: now };
    const changedFields = Object.keys(changes).filter((field) => field !== "updatedAt");
    const auditInsert = db.insert(auditLogs).select(sql`
      SELECT ${crypto.randomUUID()}, ${actor.email}, ${"post.update"}, ${"post"}, ${id}, ${JSON.stringify({ changedFields, fromStatus: current.status, toStatus: finalStatus })}, ${now}
      WHERE changes() > 0
    `);
    const coverCondition = validateCover
      ? sql`EXISTS (SELECT 1 FROM ${media} WHERE ${media.id} = ${finalCoverMediaId} ${finalStatus === "published" ? sql`AND ${media.visibility} = 'public'` : sql``})`
      : undefined;
    const write = source ? db.insert(posts).select(sql`
      SELECT ${source.id}, ${slug??source.slug}, ${title??source.title}, ${excerpt??source.excerpt}, ${body??source.body}, ${finalCoverMediaId}, ${finalStatus}, ${actor.email}, ${source.createdAt}, ${now}, ${publishedAt}
      WHERE NOT EXISTS (SELECT 1 FROM ${posts} WHERE ${posts.id}=${source.id} OR ${posts.slug}=${source.slug}) AND ${coverCondition??sql`1=1`} AND ${adminWriteCondition(actor,["admin","editor"])}
    `).returning() : db.update(posts).set(changes).where(and(eq(posts.id,id),eq(posts.updatedAt,current.updatedAt),coverCondition,adminWriteCondition(actor,["admin","editor"]))).returning();
    const [updated] = await db.batch([
      write,
      auditInsert,
    ]);
    const post = updated[0];
    if (!post) return noStoreJson({ error: "La publicación o su portada cambió en otra sesión. Actualiza el panel antes de guardar.", code: "edit_conflict" }, { status: 409 });
    return noStoreJson({ post });
  } catch {
    return noStoreJson({ error: "No fue posible actualizar la publicación." }, { status: 500 });
  }
}
