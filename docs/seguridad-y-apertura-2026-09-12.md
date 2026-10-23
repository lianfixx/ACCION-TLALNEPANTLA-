# Seguridad y apertura del registro

## Autorización y alcance

El propietario confirmó en esta conversación la Unidad de Transparencia del PAN Estado de México, el fundamento propuesto y la apertura del registro. La versión aprobada del aviso es `registro-2026-09-12.2`. Sus valores están en `registro-aprobado-2026-09-12.json`.

La apertura conserva las solicitudes directas de personas de 18 años cumplidos o más, el plazo de conservación de 90 días y el carácter interno del registro. No ejecuta la afiliación oficial al PAN.

Las opciones aprobadas se configuran en el entorno publicado. La migración 0008 actualiza esas mismas doce claves si existe una configuración guardada en la base de datos. Conserva las demás opciones y los consentimientos históricos. Incrementa la versión de configuración para rechazar formularios administrativos abiertos antes del cambio y registra la operación. Si la configuración restante es inválida, el registro permanece cerrado.

## Protección implementada

- HTTPS, cookies Secure, HttpOnly y SameSite Lax, caducidad de sesión y revocación en servidor
- Contraseñas derivadas con scrypt y sal aleatoria, sin almacenar contraseñas legibles
- Invitaciones privadas de un solo uso con caducidad de 24 horas
- Permisos verificados en servidor y solicitudes accesibles únicamente a su titular o a administración
- Consultas SQL con parámetros y representación de entradas como texto, sin interpretar HTML
- Comprobación del origen, formato JSON y tamaño real del cuerpo en las mutaciones
- Límites de intentos por cuenta y red y límites de envío del formulario
- Política CSP con nonce, bloqueo de marcos externos y formularios restringidos al mismo origen
- Respuestas privadas sin caché y sin envío de la dirección de procedencia a otros sitios

La revisión detectó que contraseñas demasiado largas podían consumir rápidamente el cupo de una cuenta. Ahora se rechazan antes de consumir ese cupo. También se retiró el uso de X-Forwarded-For como identidad de red, porque ese encabezado no debe permitir eludir los límites.

La entrada pública de hosting redirigía HTTP a HTTPS durante la comprobación. El Worker añade una defensa adicional y rechaza formularios enviados por HTTP, sin reenviar sus datos mediante una redirección. La página de acceso muestra el dominio que debe comprobarse antes de escribir una contraseña.

## Dependencias y pruebas

Se actualizaron Next.js a 16.3.5, el complemento de Cloudflare a 1.54.8 y Wrangler a 4.131.1, junto con las dependencias transitivas afectadas por los avisos encontrados. Se mantuvo Drizzle y se aplicó una sustitución limitada de su dependencia esbuild obsoleta. La revisión de npm, incluyendo herramientas de desarrollo, terminó sin vulnerabilidades conocidas reportadas.

Las 60 pruebas automáticas terminaron correctamente. Usan el Worker de producción compilado y bases SQLite aisladas. Cubren contraseñas y cookies reales del sistema, invitaciones, recuperación, revocación, permisos, concurrencia, envíos, seguimiento, retirada, conservación, migraciones y rechazos de solicitudes malformadas o de otro origen.

Se añadió un recorrido completo con el régimen del partido. Una persona presenta su solicitud con identidad SSO de prueba, administración inicia sesión con contraseña, registra respuesta y nota interna, acepta internamente la solicitud y la persona la retira. La nota interna no aparece en su seguimiento y la aceptación no concede permisos de administración.

El mantenimiento automático eliminó la copia temporal antes de publicarse. El proyecto se recuperó desde su repositorio y se restauraron las correcciones. Las comprobaciones se repitieron sobre la copia recuperada.

## Límites de la revisión

La revisión automática bloqueó el navegador por un límite de uso de la cuenta. No se obtuvo una nueva comprobación visual ni una sesión administrativa real en producción. Las pruebas aisladas no sustituyen ese primer acceso del propietario. No se generaron contraseñas de producción ni se usaron identidades falsas para acceder al sitio publicado.

Ninguna web puede garantizar inmunidad ante ataques. Los controles del dominio no impiden que otra persona cree una copia fraudulenta en otro dominio. No se añadió un segundo factor propio ni se configuraron reglas WAF personalizadas externas. Los límites por cuenta pueden producir una espera temporal si alguien los agota; la cuenta propietaria conserva su recuperación mediante la identidad autorizada.

La purga diaria está incluida en la configuración y en el Worker. Las pruebas verifican su función y la eliminación en cascada, pero no acreditan todavía una ejecución programada real del hosting. El panel también conserva la operación manual autorizada de purga.

## Acceso al panel

1. Abre `/admin/ingresar` desde el dominio publicado.
2. Para el primer acceso, despliega «Primer acceso o recuperar contraseña» y elige «Continuar con ChatGPT» usando la cuenta propietaria autorizada.
3. En «Usuarios y contraseñas», crea y guarda tu contraseña. El correo que aparece será tu usuario.
4. En adelante, entra con ese correo y contraseña.
5. En «Cuentas del equipo», añade a cada persona y elige sus permisos. Para revisar incorporaciones necesita «Incorporaciones y administración general».
6. Comparte personalmente su enlace privado de activación. Cada integrante elegirá su propia contraseña. El sistema no envía ese enlace por correo.
7. Consulta y responde las solicitudes en «Incorporaciones».

Las personas solicitantes continúan iniciando sesión con ChatGPT. Las contraseñas locales corresponden al personal del panel.

## Referencias

- [OWASP sobre autenticación](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP sobre prevención de solicitudes entre sitios](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Aviso de seguridad de Next.js para servidores Windows](https://github.com/advisories/GHSA-p293-qw3h-jr36)
- [Aviso de seguridad sobre optimización de imágenes de Next.js](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)
- [Aviso de seguridad de sharp y libheif](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c)
- [Aviso del mantenedor de esbuild](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99)
- [Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf)

Los detalles de la investigación jurídica se conservan en `auditoria-acceso-retratos.md`. Su apartado sobre recepción pendiente describe la situación anterior a esta autorización.
