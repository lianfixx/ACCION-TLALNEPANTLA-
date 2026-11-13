# Panel de administración

Implementado el 13-nov-2026 a pedido de Emi: un solo panel para controlar el sitio y a las personas registradas. Solo lo usan las cuentas con rol de administración. Todas las secciones comparten el mismo encabezado: Panel, Personas, Comisiones y expedientes, Contenido del sitio y Usuarios y contraseñas.

## Personas (`/admin/personas`)

- Lista de cuentas registradas con búsqueda (nombre, usuario, correo) y filtros por comisión, estado de la solicitud, documentos, afiliación, cuenta suspendida y etiqueta. La cuenta propietaria no aparece.
- Ficha única por persona: solicitud (estado, perfil, historial y respuesta), documentos personales y cartas de Enlaces con su revisión, comisión, afiliación PAN, etiquetas, notas internas, correos enviados, historial de acciones y datos de la cuenta.
- Acciones de cuenta:
  - Suspender cierra sus sesiones e impide entrar; reactivar lo revierte.
  - Reenviar confirmación manda otra vez el correo de confirmación, hasta 3 veces por hora.
  - Cambiar datos corrige nombre, usuario y comisión; la comisión se cambia en la solicitud vigente.
  - «Seleccionado como Enlace APJ» (decisión de Emi, 13-nov-2026): conserva 13 meses la solicitud, los documentos personales y las cartas de quien se postuló, y se lo avisa en su seguimiento. Se hace una sola vez.
  - Borrar cuenta y datos pide escribir el usuario exacto. Primero suspende la cuenta, después borra los archivos en R2 y al final elimina las filas de la persona. Las menciones en registros de otras personas se sustituyen por una referencia que no se puede rastrear hasta ella. Si falla el borrado de algún archivo, se detiene y lo informa.
- Ninguna acción aplica a la cuenta propietaria. Las cuentas con permisos de panel solo las cambia la propietaria.
- Exportar a Excel: CSV con BOM de la lista filtrada (nombre, usuario, correo, comisión, estados, conteo de documentos, etiquetas y fechas), sin documentos. Las celdas que una hoja de cálculo ejecutaría como fórmula llevan apóstrofo. Cada descarga queda en `audit_logs` (`people.export`).
- Correos: texto plano a una persona o al grupo filtrado, hasta 100 por envío, con confirmación previa del grupo exacto. Solo a cuentas activas con el correo confirmado y una solicitud enviada desde que se publicó el aviso del panel (13-nov-2026); la exportación y las etiquetas siguen la misma condición del aviso. Se envían con Resend desde `REGISTRATION_EMAIL_FROM` y queda una fila por destinatario en `outbound_emails`. Sin Resend configurado no se envía nada.

## Contenido del sitio (`/admin/contenido`)

- Comisiones: orden, y por cada una nombre, propósito, tareas y resultado; encabezado de `/comisiones`. Los identificadores no cambian y no se agregan ni quitan comisiones.
- Enlaces APJ: encabezado, requisitos, plazas, calendario, criterios (deben sumar 100), compromisos y notas.
- Portada y textos: bloques de la portada, introducción de Participa y los 5 pasos del proceso.
- Documentos PDF: subir una versión nueva de cada uno de los 8 o volver al original. Los enlaces del sitio usan `/archivos/<nombre>.pdf`, que entrega la versión subida desde R2 o redirige al archivo de `public/documentos/`.
- Cada bloque se guarda por separado, avisa si otra sesión lo cambió (no se pierde lo escrito) y tiene «Volver al texto original». Todo cambio queda en `audit_logs`.

Lo que sigue fijo en el código: los identificadores de las comisiones, los pasos de postulación de Enlaces, la línea de tiempo y trayectorias de la portada, y las descripciones para buscadores.

## Datos

Migración `0016_panel_crm`: `site_content`, `site_documents`, `person_notes`, `person_tags` y `outbound_emails`. El aviso del registro (versión `-panel-2026-11-13`) informa de los correos, las notas y etiquetas, las listas descargables y el borrado definitivo.

## Verificación del 13-nov-2026

`npm run typecheck`, `npm run lint` y `npm test` aprobados (211 pruebas, 17 nuevas en `tests/site-content.test.mjs` y `tests/people-crm.test.mjs`). Revisión en Chromium con datos sintéticos a 1280 px y 390 px del panel, la lista, la ficha, contenido, comisiones y usuarios, sin desbordes ni errores de página. No acredita el funcionamiento publicado.
