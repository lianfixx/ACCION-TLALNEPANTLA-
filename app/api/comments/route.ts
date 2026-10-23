import { getRuntimeEnv } from "@/lib/runtime-env";
import { sessionWriteGuard } from "@/lib/session-write-guard";
import { and, asc, eq, gt } from "drizzle-orm";
import { getStaffIdentity } from "@/lib/staff-auth";
import { getDb } from "@/db";
import { comments, posts } from "@/db/schema";
import { consumeRateLimit } from "@/lib/rate-limit";
import { dataChannelConfiguration } from "@/lib/privacy-config";
import { assertDeclaredBodyWithinLimit, cleanText, matchesExpectedAccount, jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";

const MAX_JSON_BYTES = 5_000;

export async function GET(request: Request) {
  const postId = cleanText(new URL(request.url).searchParams.get("postId"), 80);
  if (!postId) return noStoreJson({ error: "Falta la publicación." }, { status: 400 });
  try {
    const rows = await getDb().select({ id: comments.id, authorName: comments.authorName, body: comments.body, createdAt: comments.createdAt })
      .from(comments)
      .innerJoin(posts, and(eq(comments.postId, posts.id), eq(posts.status, "published")))
      .where(and(eq(comments.postId, postId), eq(comments.status, "approved"), gt(comments.retentionUntil, Date.now())))
      .orderBy(asc(comments.createdAt))
      .limit(100);
    return noStoreJson({ comments: rows });
  } catch {
    return noStoreJson({ comments: [], setupPending: true });
  }
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  try { assertDeclaredBodyWithinLimit(request, MAX_JSON_BYTES); }
  catch (error) { return jsonBodyErrorResponse(error); }
  let payload: Record<string, unknown>;
  try {
    payload = await readJsonBody<Record<string, unknown>>(request, MAX_JSON_BYTES);
  }
  catch (error) { return jsonBodyErrorResponse(error); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({error:"Revisa la opinión antes de enviarla."},{status:400});
  const { enabled, retentionDays, settings } = await dataChannelConfiguration("comments");
  if (!enabled) {
    return noStoreJson({ error: "Las opiniones todavía no están habilitadas. Falta validar aviso y conservación." }, { status: 503 });
  }
  const user = await getStaffIdentity();
  if (!user) return noStoreJson({ error: "Inicia sesión para opinar." }, { status: 401 });
  if (!matchesExpectedAccount(request,user.accountId)) return noStoreJson({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!(await consumeRateLimit("comment-10m", user.email.toLowerCase(), 5, 10 * 60 * 1000))) {
    return noStoreJson({ error: "Alcanzaste el límite temporal de opiniones. Intenta más tarde." }, { status: 429 });
  }
  if (!(await consumeRateLimit("comment-24h", user.email.toLowerCase(), 20, 24 * 60 * 60 * 1000))) {
    return noStoreJson({ error: "Alcanzaste el límite diario de opiniones. Podrás participar de nuevo al comenzar la siguiente ventana." }, { status: 429 });
  }
  const postId = cleanText(payload.postId, 80);
  const body = cleanText(payload.body, 1200);
  const authorName = cleanText(payload.publicName, 80) || "Participante";
  const consent = payload.consent === true;
  if (!postId || body.length < 3 || !consent) return noStoreJson({ error: "Escribe una opinión válida y confirma el aviso." }, { status: 400 });
  try {
    const db = getDb();
    const [post] = await db.select({ id: posts.id }).from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published"))).limit(1);
    if (!post) return noStoreJson({ error: "Publicación no encontrada." }, { status: 404 });
    const now = Date.now();
    const id = crypto.randomUUID(), guard = sessionWriteGuard(user,now);
    const [created] = await getRuntimeEnv().DB!.batch([
      getRuntimeEnv().DB!.prepare("INSERT INTO comments(id,post_id,author_email,author_name,body,status,notice_version,consent_at,retention_until,created_at) SELECT ?,?,?,?,?,'pending',?,?,?,? WHERE "+guard.sql+" AND EXISTS (SELECT 1 FROM posts WHERE id=? AND status='published')")
        .bind(id,postId,user.email.toLowerCase(),authorName,body,settings.PRIVACY_NOTICE_VERSION!,now,now+retentionDays*86_400_000,now,...guard.values,postId),
    ]);
    if (!created.meta.changes) return noStoreJson({error:"La sesión o la publicación cambió. Revisa la página antes de enviar otra vez."},{status:409});
    const comment = {id,status:"pending"};
    return noStoreJson({ comment, message: "Tu opinión quedó pendiente de moderación." }, { status: 201 });
  } catch {
    return noStoreJson({ error: "No fue posible recibir la opinión." }, { status: 500 });
  }
}
