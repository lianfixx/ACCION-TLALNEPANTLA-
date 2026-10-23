# Registro, activación y confirmación de correo

Esta corrección se preparó a partir del paquete v45. No se desplegó en el Site ni se consultaron sus secretos o datos actuales.

## Defectos reproducidos

En Chromium, usando el Worker compilado, su CSP y datos sintéticos:

- Sin JavaScript, los formularios de acceso y registro hacían GET e incluían campos de contraseña en la URL. Ahora declaran POST y una acción explícita. El servidor rechaza el formato HTML con una página de ayuda, sin reflejar los datos ni crear cuentas.
- La activación retiraba el fragmento y conservaba el código solo en memoria; al recargar quedaba bloqueada. Ahora se conserva durante un máximo de 30 minutos en `sessionStorage`, limitado a la pestaña. Se retira de la dirección después de guardarlo y se elimina tras éxito o rechazo definitivo. Si el navegador impide usar ese almacenamiento, se conserva el fragmento para poder recargar. Nunca se usa query string, localStorage ni logs para el código.
- Se distinguen errores de código, usuario y longitud de contraseña. Los fallos internos generan una referencia correlacionable y registran únicamente operación, etapa e identificador; no se imprimen excepciones, cuerpos, correos, contraseñas o tokens.

Esto no establece cuál fue la causa de las respuestas 400/401 observadas anteriormente en producción. En la copia local no se reprodujo un bloqueo de hidratación por CSP.

## Comportamiento nuevo

1. El registro requiere la configuración legal existente, Resend y Turnstile. Si falta alguno, permanece cerrado.
2. Turnstile se comprueba en servidor con acción `signup` y hostname esperado. Se conservan límites de red, identificador y creación; un fallo del proveedor no permite continuar.
3. La cuenta se crea sin sesión, con confirmación de correo obligatoria. Se envía un enlace de un solo uso que vence en 24 horas. La base solo conserva su hash, ligado a cuenta, correo y versión de credenciales.
4. El enlace abre `/confirmar-correo#codigo=…`. La verificación requiere pulsar el botón y hacer POST; una previsualización de correo o petición GET no consume el token. Confirmar no inicia sesión: todavía se exige la contraseña.
5. Reenviar requiere Turnstile, limita cada dirección a tres intentos por hora e invalida el enlace anterior. Si Resend falla después de crear la cuenta, esta queda pendiente y puede recuperarse mediante reenvío.
6. La actualización conserva el acceso de las cuentas anteriores y las creadas por administración. Sus correos **no** se marcan como verificados. Las nuevas cuentas públicas no pueden acceder mediante sesiones sembradas, caducadas o anteriores a la confirmación.

La confirmación de correo no acredita identidad civil, mayoría de edad, aceptación de una solicitud, revisión documental, permiso de comisión ni afiliación. El aviso informa del envío mediante Resend y la comprobación mediante Cloudflare; el responsable debe revisar versión, información y condiciones aplicables antes de abrir recepción real.

## Configuración real pendiente

Configurar estos valores en los bindings del Worker del mismo proyecto de Sites. Las variables del proceso local de Codex no se convierten automáticamente en bindings de producción.

| Variable | Requisito |
| --- | --- |
| `RESEND_API_KEY` | Clave de envío restringida al dominio necesario; guardarla como secreto. |
| `REGISTRATION_EMAIL_FROM` | Dirección real de un dominio verificado en Resend. No se inventó un remitente. |
| `REGISTRATION_PUBLIC_ORIGIN` | Origen HTTPS canónico; para el dominio indicado: `https://acciontlalnepantla.site`. Sin ruta, credenciales ni parámetros. |
| `REGISTRATION_TURNSTILE_SITE_KEY` | Clave pública de un widget Turnstile autorizado para el dominio. |
| `REGISTRATION_TURNSTILE_SECRET_KEY` | Secreto del mismo widget, guardado como secreto. |
| `REGISTRATION_TURNSTILE_HOSTNAME` | Hostname exacto esperado en Siteverify; para ese dominio: `acciontlalnepantla.site`. |

No reutilizar automáticamente el widget de contacto: su acción sigue siendo `contact`; el registro y reenvío usan `signup`. No activar dominios adicionales por suposición.

Resend requiere verificar los registros DNS del dominio remitente. Desactivar seguimiento de enlaces para los mensajes de confirmación: el enlace lleva el código en el fragmento, que debe conservarse íntegro. El registro no debe abrirse con claves de prueba. Dominios de salida usados: `api.resend.com` y `challenges.cloudflare.com`.

Referencias de las integraciones: [Resend Send Email](https://resend.com/docs/api-reference/emails/send-email), [verificación de dominio](https://resend.com/docs/dashboard/domains/introduction), [Cloudflare Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Migración y comprobación

Antes de ejecutar esta versión, aplicar `drizzle/0015_email_confirmation.sql`. Añade una tabla de tokens y dos columnas a cuentas; no modifica las migraciones anteriores ni declara verificados los correos antiguos. Preparar el respaldo y comprobar la migración mediante el procedimiento real del Site antes de publicar.

En el entorno cloud, inicializar las variables indicadas en las instrucciones de arranque guardadas y ejecutar:

```bash
./node_modules/.bin/tsc --noEmit --incremental false
./node_modules/.bin/eslint . --ignore-pattern dist --ignore-pattern .next
npm test
node scripts/audit-storage-local.mjs
PLAYWRIGHT_MODULE=/workspace/apj-browser/node_modules/playwright-core/index.mjs CHROMIUM_PATH=/usr/bin/chromium node tests/browser/account-access.mjs
```

La prueba de navegador usa `playwright-core` instalado fuera del checkout y Chromium. También puede usarse una instalación local disponible, indicando su módulo y ejecutable. Las pruebas del Worker y D1/R2 usan proveedores externos simulados: ejercitan los handlers, contraseñas, estados, sesiones, migraciones y permisos reales, sin enviar correos ni resolver captchas reales.

Antes de desplegar: comprobar la fuente actual del Site, revisar diferencias desde v45, configurar remitente y widget, validar el aviso y ejecutar un envío real autorizado. No se dispone aquí de las herramientas de Sites para recuperar o publicar la fuente canónica.

## Resultado local del 23 de octubre de 2026

Compilación y validación del Worker, TypeScript y ESLint aprobados. Las 187 pruebas ejecutadas pasaron, sin fallidas ni omitidas. El auditor de D1/R2 aplicó 87 sentencias de migración en 22 tablas y comprobó el recorrido completo, cuatro objetos privados y restauración con nuevas sesiones.

Chromium comprobó activación después de recarga y doble envío, registro con viewport móvil, caducidad/reintento del widget simulado, confirmación por enlace en la misma pestaña y después de recarga, acceso posterior con contraseña, rechazo seguro de formularios sin JavaScript y recuperación con sessionStorage bloqueado. No se observaron errores de página ni violaciones de CSP en esos recorridos.

Resend y Turnstile se simularon en la frontera de red de las pruebas. No se envió correo real, no se validó un widget real y no se modificó producción. La API de GitHub devolvió Forbidden al intentar preparar la PR; el acceso Git permite conservar la corrección en una rama revisable.
