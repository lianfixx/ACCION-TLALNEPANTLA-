import { accountFailure, accountJsonRequired } from '@/lib/account-feedback';
import { confirmRegistrationEmail, registrationServices, sendRegistrationConfirmation, verifyRegistrationChallenge, RegistrationServiceError } from '@/lib/registration-verification';
import { consumeRateLimit, requestNetworkIdentity } from '@/lib/rate-limit';
import { getRuntimeEnv } from '@/lib/runtime-env';
import { cleanEmail, noStoreJson, requestIsSameOrigin, requestHasJsonContentType, readJsonBody, jsonBodyErrorResponse } from '@/lib/security';

const error = (message: string, status = 400) => noStoreJson({ error: message }, { status });
export async function POST(request: Request) {
  if (!requestHasJsonContentType(request)) return accountJsonRequired(request);
  if (!requestIsSameOrigin(request)) return error('No pudimos comprobar el origen de la solicitud.', 403);
  let input: Record<string, unknown>;
  try { input = await readJsonBody(request, 4000); } catch (e) { return jsonBodyErrorResponse(e); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return error('Revisa el formulario.');
  const env = getRuntimeEnv();
  if (!env.DB || !env.RATE_LIMIT_SECRET) return accountFailure('email-confirmation', 'configuration');
  try {
    const identity = requestNetworkIdentity(request) || 'unknown-network';
    if (!await consumeRateLimit('email-confirmation-network', identity, 30, 10 * 60_000)) return error('Espera unos minutos antes de volver a intentarlo.', 429);
    if (input.action === 'confirm') {
      if (typeof input.token !== 'string' || !/^[a-f0-9]{64}$/.test(input.token)) return error('Abre el enlace completo del correo.');
      const redirect = await confirmRegistrationEmail(input.token);
      return redirect ? noStoreJson({ message: 'Tu correo quedó confirmado. Ahora entra con tu usuario y contraseña.', redirect })
        : error('El enlace ya se utilizó, venció o fue sustituido. Intenta entrar o solicita otro correo.', 410);
    }
    if (input.action !== 'resend') return error('Esta operación no está disponible.');
    if (!registrationServices().ready) return error('El envío de correos aún no está disponible. Inténtalo más tarde.', 503);
    const email = cleanEmail(input.email);
    if (!email) return error('Escribe el correo de tu cuenta.');
    if (!await verifyRegistrationChallenge(input['cf-turnstile-response'], requestNetworkIdentity(request))) return error('Completa de nuevo la verificación antiabuso.');
    if (!await consumeRateLimit('email-resend-address', email, 3, 60 * 60_000)) return error('Se alcanzó el límite de reenvíos. Espera una hora y revisa también correo no deseado.', 429);
    const account = await env.DB.prepare(`SELECT a.id,v.return_to FROM staff_accounts a LEFT JOIN staff_email_verifications v ON v.account_id=a.id
      WHERE a.email=? AND a.email_verification_required=1 AND a.email_verified_at IS NULL AND a.disabled_at IS NULL`).bind(email).first<{id:string;return_to:string|null}>();
    if (account) await sendRegistrationConfirmation(account.id, account.return_to || '/participacion#registro');
    return noStoreJson({ message: 'Si hay una cuenta pendiente para ese correo, recibirás un enlace nuevo. Revisa también correo no deseado. Si ya confirmaste tu correo, entra con tu usuario.' });
  } catch (e) { return accountFailure('email-confirmation', e instanceof RegistrationServiceError ? e.stage : 'verification'); }
}
