import { currentAuthorizedUser, canPublish } from "@/lib/authz";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { noStoreJson,matchesExpectedAccount } from "@/lib/security";
export async function GET(request: Request) {
  const actor=await currentAuthorizedUser();if(actor&&!matchesExpectedAccount(request,actor.accountId))return noStoreJson({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});if(!actor||!canPublish(actor.role))return noStoreJson({error:"Acceso no autorizado."},{status:403});
  const url=new URL(request.url),q=(url.searchParams.get('q')??'').slice(0,120),id=(url.searchParams.get('id')??'').slice(0,80);
  try {const db=getRuntimeEnv().DB!;const results=id?await db.prepare("SELECT id,file_name AS fileName,alt_text AS altText,visibility FROM media WHERE id=? LIMIT 1").bind(id).all():await db.prepare("SELECT id,file_name AS fileName,alt_text AS altText,visibility FROM media WHERE visibility='public' AND (file_name LIKE ? ESCAPE '\\' OR alt_text LIKE ? ESCAPE '\\') ORDER BY created_at DESC,id DESC LIMIT 25").bind(...Array(2).fill(`%${q.replace(/[\\%_]/g,'\\$&')}%`)).all();return noStoreJson({items:results.results});}catch{return noStoreJson({error:"No fue posible buscar las imágenes."},{status:503});}
}
