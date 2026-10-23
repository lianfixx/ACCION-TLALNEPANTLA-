import { noStoreJson } from './security';

/** Never include exception messages, request bodies, email addresses or tokens. */
export function accountFailure(operation: string, stage: string, message = 'No pudimos completar la operación. Inténtalo de nuevo. Si continúa, comparte esta referencia con administración.') {
  const requestId = crypto.randomUUID();
  console.error(JSON.stringify({ event: 'account_operation_failed', requestId, operation, stage }));
  return noStoreJson({ error: message, requestId }, { status: 503 });
}

export function accountJsonRequired(request: Request) {
  if (request.headers.get('accept')?.includes('text/html')) {
    return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>No se enviaron tus datos</title><main><h1>No se enviaron tus datos</h1><p>Este formulario necesita JavaScript. Actívalo y vuelve a abrir la página para intentarlo. Tus datos no se guardaron.</p><a href="/ingresar">Volver al acceso</a></main></html>', { status: 415, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  }
  return noStoreJson({ error: 'No pudimos leer los datos enviados. Recarga la página y comprueba que JavaScript esté habilitado.' }, { status: 415 });
}
