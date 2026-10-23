import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {eq,sql} from 'drizzle-orm';
import {adminWriteCondition} from '@/lib/admin-write-guard';
import { getDb } from "@/db";
import { auditLogs, media, mediaUploads } from "@/db/schema";
import { canPublish, currentAuthorizedUser } from "@/lib/authz";
import { cleanText, imageBytesMatchMime, fileSignatureMime, readBodyBytes, jsonBodyErrorResponse, noStoreJson, requestIsSameOrigin } from "@/lib/security";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { normalizeRasterImage } from "@/lib/media-security";
import { consumeRateLimit } from "@/lib/rate-limit";

const ALLOWED = new Map<"image/jpeg" | "image/png" | "image/webp", "jpg" | "png" | "webp">([["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canPublish(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  const runtime = getRuntimeEnv();
  if (!runtime.BUCKET || !runtime.IMAGES || !runtime.DB || !runtime.RATE_LIMIT_SECRET || runtime.RATE_LIMIT_SECRET.length < 32) return noStoreJson({ error: "La carga segura de imágenes no está disponible." }, { status: 503 });
  // Apply quotas before reading or transforming bytes. A valid editor session
  // must not permit unbounded expensive requests, including malformed uploads.
  try {
    for (const [scope, identity, limit, windowMs] of [
      ["editorial-media-hour", actor.accountId, 30, 3_600_000],
      ["editorial-media-day", "site", 200, 86_400_000],
    ] as const) {
      if (!await consumeRateLimit(scope, identity, limit, windowMs)) {
        const retryAfter = Math.max(1, Math.ceil((windowMs - Date.now() % windowMs) / 1000));
        return noStoreJson({error:"Se alcanzó el límite temporal de imágenes. Espera antes de subir otra; puedes seguir trabajando con las que ya están guardadas."},{status:429,headers:{"Retry-After":String(retryAfter)}});
      }
    }
  } catch {
    return noStoreJson({error:"No pudimos comprobar el límite de carga. Inténtalo de nuevo en unos minutos."},{status:503});
  }
  let form: FormData;
  try { const bytes=await readBodyBytes(request,MAX_BYTES+512_000);form=await new Response(bytes,{headers:{"Content-Type":request.headers.get("content-type")!}}).formData(); }
  catch(error) { return jsonBodyErrorResponse(error); }
  const file = form.get("file");
  const altText = cleanText(form.get("altText"), 240);
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_BYTES) {
    return noStoreJson({ error: "Usa JPG, PNG o WebP de hasta 8 MB." }, { status: 400 });
  }
  if (altText.length < 8) return noStoreJson({ error: "Describe la imagen para accesibilidad." }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType=(file.type===''||file.type==='application/octet-stream'?fileSignatureMime(bytes):file.type) as 'image/jpeg'|'image/png'|'image/webp';
  if (!ALLOWED.has(mimeType)||!imageBytesMatchMime(bytes, mimeType)) return noStoreJson({ error: "El contenido del archivo no coincide con un formato de imagen permitido." }, { status: 400 });
  let normalized: Awaited<ReturnType<typeof normalizeRasterImage>>;
  try {
    normalized = await normalizeRasterImage(bytes, mimeType, runtime.IMAGES, MAX_BYTES);
  } catch {
    return noStoreJson({ error: "La imagen no pudo procesarse de forma segura. Verifica el archivo, sus dimensiones y vuelve a intentarlo." }, { status: 400 });
  }
  const id = crypto.randomUUID();
  const objectKey = `publicaciones/${new Date().getUTCFullYear()}/${id}.${ALLOWED.get(mimeType)}`;
  const db = getDb(), guard=adminWriteCondition(actor,["admin","editor"]);
  let tracked = false;
  async function discardUpload() {
    await runtime.BUCKET!.delete(objectKey);
    await db.delete(mediaUploads).where(eq(mediaUploads.id,id));
  }
  try {
    // Track the object before sending bytes so failed compensation is retried.
    const [pending] = await db.insert(mediaUploads).select(sql`SELECT ${id},${objectKey},${Date.now()+3_600_000} WHERE ${guard}`).returning({id:mediaUploads.id});
    if(!pending)return noStoreJson({error:"Tu acceso cambió durante la carga. La imagen no se guardó."},{status:409});
    tracked = true;
    await runtime.BUCKET.put(objectKey, normalized.bytes, { httpMetadata: { contentType: mimeType, cacheControl: "private, no-store" } });
    const now = Date.now();
    const [created] = await db.batch([
      db.insert(media).select(sql`SELECT ${id},${objectKey},${cleanText(file.name,180)},${mimeType},${normalized.bytes.byteLength},${altText},'private',${actor.email},${now},${now} WHERE ${guard} AND EXISTS (SELECT 1 FROM media_uploads WHERE id=${id} AND expires_at>${now})`).returning(),
      db.insert(auditLogs).select(sql`SELECT ${crypto.randomUUID()},${actor.email},'media.upload','media',${id},${JSON.stringify({mimeType,originalSizeBytes:file.size,normalizedSizeBytes:normalized.bytes.byteLength,width:normalized.width,height:normalized.height,metadataPolicy:mimeType==="image/jpeg"?"discard-except-copyright":"discard-all",initialVisibility:"private"})},${now} WHERE changes()>0`),
      db.delete(mediaUploads).where(sql`${mediaUploads.id}=${id} AND EXISTS (SELECT 1 FROM media WHERE id=${id})`),
    ]);
    const record = created[0];
    if(!record){await discardUpload().catch(()=>undefined);return noStoreJson({error:"Tu acceso cambió durante la carga. La imagen no se guardó."},{status:409});}
    return noStoreJson({ media: record }, { status: 201 });
  } catch {
    if (tracked) await discardUpload().catch(() => undefined);
    return noStoreJson({ error: "No fue posible almacenar la imagen." }, { status: 500 });
  }
}
