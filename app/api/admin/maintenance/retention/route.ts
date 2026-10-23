import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import { canManageRoles, currentAuthorizedUser } from "@/lib/authz";
import { jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";
import { purgeExpiredData,PurgeAuthorizationError } from "@/lib/retention";

const MAX_JSON_BYTES = 1_000;

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canManageRoles(actor.email)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  let payload: { confirmation?: unknown };
  try {
    payload = await readJsonBody<{ confirmation?: unknown }>(request, MAX_JSON_BYTES);
  } catch (error) {
    return jsonBodyErrorResponse(error);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return noStoreJson({ error: "Solicitud inválida." }, { status: 400 });
  if (payload.confirmation !== "PURGAR_VENCIDOS") return noStoreJson({ error: "Confirmación explícita requerida." }, { status: 400 });
  try {
    const result = await purgeExpiredData(actor.email, "manual",Date.now(),actor);
    return noStoreJson({ ok: true, cutoff: result.cutoff });
  } catch(error) {
    if(error instanceof PurgeAuthorizationError)return noStoreJson({error:"Tu acceso cambió. Vuelve a entrar antes de continuar."},{status:409});
    return noStoreJson({ error: "No fue posible ejecutar la conservación." }, { status: 500 });
  }
}
