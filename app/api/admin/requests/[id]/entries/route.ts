import {matchesExpectedAccount,noStoreJson as accountMismatchResponse} from "@/lib/security";
import {adminWriteGuard} from '@/lib/admin-write-guard';
import { currentAuthorizedUser, canHandleRequests } from "@/lib/authz";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { contactReadIsCurrent } from "@/lib/membership-read";
import { cleanText, jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from "@/lib/security";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canHandleRequests(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  const { id } = await params;
  try {
    const db = getRuntimeEnv().DB!;
    const exists = await db.prepare("SELECT id FROM contact_requests WHERE id = ? AND retention_until > ?").bind(id, Date.now()).first();
    if (!exists) return noStoreJson({ error: "Solicitud no disponible." }, { status: 404 });
    const counts = await db.prepare("SELECT (SELECT count(*) FROM request_entries WHERE request_id = ?) AS entryTotal, (SELECT count(*) FROM audit_logs WHERE entity_type = 'contact_request' AND entity_id = ?) AS historyTotal").bind(id,id).first<{entryTotal:number;historyTotal:number}>();
    const entryTotal=counts?.entryTotal??0, historyTotal=counts?.historyTotal??0;
    const requested=Number(new URL(request.url).searchParams.get('page'));
    const pages=Math.max(1,Math.ceil(Math.max(entryTotal,historyTotal)/25)),page=Number.isSafeInteger(requested)&&requested>0?Math.min(requested,pages):1;
    const entries = await db.prepare("SELECT id,kind,body,actor_email AS actorEmail,created_at AS createdAt FROM request_entries WHERE request_id = ? ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?").bind(id,(page-1)*25).all();
    const history = await db.prepare("SELECT id,action,actor_email AS actorEmail,created_at AS createdAt FROM audit_logs WHERE entity_type = 'contact_request' AND entity_id = ? ORDER BY created_at DESC,id DESC LIMIT 25 OFFSET ?").bind(id,(page-1)*25).all();
    if (!await contactReadIsCurrent(actor, id)) return noStoreJson({error:"La solicitud o tu acceso ya no está disponible."},{status:403});
    return noStoreJson({ entries: entries.results, history: history.results, pagination:{page,pages,entryTotal,historyTotal} });
  } catch { return noStoreJson({ error: "No fue posible cargar el expediente." }, { status: 503 }); }
}

export async function POST(request: Request, { params }: Context) {
  if (!requestIsSameOrigin(request)) return noStoreJson({ error: "Origen no permitido." }, { status: 403 });
  if (!requestHasJsonContentType(request)) return noStoreJson({ error: "Tipo de contenido no permitido." }, { status: 415 });
  const actor = await currentAuthorizedUser();
  if(actor&&!matchesExpectedAccount(request,actor.accountId))return accountMismatchResponse({error:"La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió este formulario."},{status:412});
  if (!actor || !canHandleRequests(actor.role)) return noStoreJson({ error: "Acceso no autorizado." }, { status: 403 });
  let payload: { kind?: unknown; body?: unknown };
  try { payload = await readJsonBody(request, 20_000); } catch (error) { return jsonBodyErrorResponse(error); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || !["note", "response_draft"].includes(String(payload.kind))) return noStoreJson({ error: "Entrada inválida." }, { status: 400 });
  const body = cleanText(payload.body, 4_000);
  if (body.length < 3) return noStoreJson({ error: "Escribe la nota o el borrador de respuesta." }, { status: 400 });
  const { id } = await params;
  try {
    const db = getRuntimeEnv().DB!, now = Date.now(), entryId = crypto.randomUUID(), guard=adminWriteGuard(actor,["admin"]);
    const [result] = await db.batch([
      db.prepare("INSERT INTO request_entries (id,request_id,kind,body,actor_email,created_at) SELECT ?,id,?,?,?,? FROM contact_requests WHERE id = ? AND retention_until > ? AND "+guard.sql).bind(entryId, payload.kind, body, actor.email, now, id, now,...guard.values),
      db.prepare("INSERT INTO audit_logs (id,actor_email,action,entity_type,entity_id,metadata_json,created_at) SELECT ?,?,'request.entry','contact_request',?,?,? WHERE changes() > 0").bind(crypto.randomUUID(), actor.email, id, JSON.stringify({ kind: payload.kind }), now),
    ]);
    if (!result.meta.changes) return noStoreJson({ error: "La solicitud ya no está disponible." }, { status: 404 });
    return noStoreJson({ message: payload.kind === "response_draft" ? "Borrador guardado. No se ha enviado." : "Nota guardada." }, { status: 201 });
  } catch { return noStoreJson({ error: "No fue posible guardar la entrada." }, { status: 503 }); }
}
