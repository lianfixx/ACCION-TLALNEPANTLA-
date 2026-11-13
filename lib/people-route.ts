import { currentAuthorizedUser } from './authz';
import { membershipJson } from './membership';
import { consumeRateLimit } from './rate-limit';
import { getRuntimeEnv } from './runtime-env';
import { jsonBodyErrorResponse, matchesExpectedAccount, readJsonBody, requestHasJsonContentType, requestIsSameOrigin } from './security';

export const peopleError = (error: string, status = 400) => membershipJson({ error }, { status });

/** Same origin, JSON, a bounded body, the account that opened the page and the administrator role. */
export async function openPeopleRequest(request: Request, maxBytes: number, scope: string, limit: number) {
  if (!requestIsSameOrigin(request)) return { response: peopleError('No pudimos comprobar el origen de la solicitud.', 403) };
  if (!requestHasJsonContentType(request)) return { response: peopleError('No pudimos leer los datos enviados.', 415) };
  const actor = await currentAuthorizedUser();
  if (actor && !matchesExpectedAccount(request, actor.accountId)) return { response: peopleError('La sesión cambió a otra cuenta. Vuelve a entrar con la cuenta que abrió esta página.', 412) };
  if (!actor || actor.role !== 'admin') return { response: peopleError('Acceso no autorizado.', 403) };
  let body: Record<string, unknown>;
  try { body = await readJsonBody(request, maxBytes); } catch (error) { return { response: jsonBodyErrorResponse(error) }; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { response: peopleError('Revisa los datos enviados.') };
  if (!getRuntimeEnv().RATE_LIMIT_SECRET) return { response: peopleError('Falta configurar la protección de envíos del sitio.', 503) };
  if (!await consumeRateLimit(scope, actor.accountId, limit, 10 * 60_000)) return { response: peopleError('Has hecho muchos cambios seguidos. Espera unos minutos.', 429) };
  return { actor, body };
}
