import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { media } from "@/db/schema";
import { canPublish, currentAuthorizedUser } from "@/lib/authz";
import { matchesExpectedAccount, noStoreJson } from "@/lib/security";
import { adminWriteCondition } from "@/lib/admin-write-guard";
import { getRuntimeEnv } from "@/lib/runtime-env";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await currentAuthorizedUser();
  if (!actor || !canPublish(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  if (!matchesExpectedAccount(_request, actor.accountId)) return noStoreJson({error:"La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario."},{status:412});
  const { id } = await context.params;
  try {
    const [record] = await getDb().select({ objectKey: media.objectKey, mimeType: media.mimeType }).from(media).where(eq(media.id, id)).limit(1);
    if (!record) return noStoreJson({ error: "Imagen no encontrada." }, { status: 404 });
    const object = await getRuntimeEnv().BUCKET?.get(record.objectKey);
    if (!object) return noStoreJson({ error: "Imagen no encontrada." }, { status: 404 });
    const [current] = await getDb().select({ id: media.id }).from(media).where(and(eq(media.id,id),eq(media.objectKey,record.objectKey),adminWriteCondition(actor,["admin","editor"]))).limit(1);
    if (!current) { await object.body.cancel().catch(()=>undefined); return noStoreJson({error:"Imagen no encontrada."},{status:404}); }
    return new Response(object.body, { headers: { "Content-Type": record.mimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": "inline" } });
  } catch {
    return noStoreJson({ error: "Imagen no disponible." }, { status: 503 });
  }
}
