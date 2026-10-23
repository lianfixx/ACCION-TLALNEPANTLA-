# Acción Política Juvenil Tlalnepantla

Sitio público y administración editorial. Portada, agenda, publicaciones, imágenes, opiniones moderadas y seguimiento de solicitudes. Código React/Vinext con Worker, Cloudflare D1 y R2 a través de Sites.

## Estado comprobable

- [Correcciones de la auditoría y límites de verificación](docs/correcciones-auditoria-2026-09-12.md).
- [Requisitos actuales y pendientes reales](docs/requisitos-activos.md).
- [Auditoría de la versión anterior](docs/auditoria-funcional.md).
- [Investigación y decisiones de movimiento](docs/motion-research.md).

El nombre, la marca PAN azul, los textos simplificados y «En marcha» sustituyen las variantes objetadas. Las imágenes son locales. Se conservan Source Sans 3 y Source Serif 4. La historia de la organización nacional se identifica como referencia, sin atribuir a la plataforma una categoría jurídica no documentada.

## Administración

La actualización de registro y sus requisitos de activación están documentados en [Registro, activación y confirmación de correo](docs/registro-confirmacion-correo.md). Las nuevas cuentas públicas requieren Turnstile y confirmación mediante Resend antes de iniciar sesión. Su activación real depende de configurar y validar los proveedores en el mismo Site; las pruebas locales no acreditan entrega de correo en producción.

`/admin/ingresar` y `/ingresar` utilizan usuario y contraseña. El propietario activa su primera cuenta mediante un enlace privado de un solo uso y crea las demás desde `/admin/cuenta`. Una cuenta de participación consulta únicamente su solicitud; los permisos de administrador, editor y moderador se conceden por separado. El propietario confirma su contraseña al crear, restablecer, revocar o cambiar permisos. Las sesiones anteriores quedan invalidadas al restablecer credenciales o modificar permisos. El registro público de participantes requiere el aviso habilitado, Turnstile y confirmación de correo mediante Resend; no utiliza un proveedor de identidad externo. Consulta [la operación de cuentas](docs/cuentas-propias.md). Los ajustes legales y las redes propias se guardan en D1 desde Configuración. No se guardan secretos en esos campos.

Agenda, publicaciones, medios, opiniones, solicitudes, roles y auditoría ofrecen búsqueda, filtros y paginación. El resumen calcula conteos globales. Las solicitudes tienen responsable, estado, notas, borradores de respuesta e historial. Los borradores no envían mensajes. Los formularios con versión rechazan sobrescrituras de otra sesión.

Contacto y comentarios públicos siguen desactivados. Guardar ajustes no los activa. `lib/privacy-config.ts` comprueba los datos y requisitos del canal. Turnstile y los controles de activación se configuran en el entorno del servidor. La agenda puede enlazar un registro externo real y exporta ICS.

## Datos y despliegue

`db/schema.ts` define el esquema; `drizzle/` conserva migraciones incrementales. La migración 0005 añade ajustes y entradas de expedientes; no reescribe tablas existentes. `.openai/hosting.json` vincula el proyecto y sus bindings D1/R2. No contiene credenciales.

El Worker ofrece un manejador programado para purga y un endpoint manual administrativo. El disparador diario está empaquetado; falta acreditar su ejecución real por el proveedor. Un respaldo completo debe incluir D1, objetos R2 y configuración, con restauración comprobada; no se ha implementado ese proceso externo. El alojamiento conserva Sites. La autenticación de la aplicación utiliza sus propias cuentas.

## Desarrollo y verificación

Node >=22.13.0; Linux con `flock`, `curl` y GNU `timeout`. El lockfile fija las dependencias. Los scripts usan rutas temporales y de caché del proyecto.

- `npm run install:ci`: instalación acotada del lockfile.
- `npm run dev`: vista de desarrollo.
- `npm run typecheck` y `npm run lint`: comprobación estática.
- `npm test`: compilación, validación del artefacto y pruebas.
- `npm run db:generate`: migraciones tras cambiar el esquema.
- `npm run start`: servidor del artefacto compilado.

Las pruebas de integración usan SQLite en memoria e identidades sintéticas dentro del proceso de prueba. No hay rutas de prueba autenticadas ni registros ficticios en producción. Una prueba local no acredita un inicio de sesión real ni una carga real en R2 de producción.

## Movimiento

Motion controla las transformaciones CSS de la portada y la navegación. Three.js 0.186.0 se importa dinámicamente cerca del diagrama: tres anillos, cámara ortográfica, transmisión y entorno de reflejos. El renderizado se detiene cuando la escena no cambia o no se ve; la densidad de píxeles se limita. El HTML permanece completo si WebGL falla o las preferencias requieren menos movimiento/transparencia. No se promete una frecuencia de 120 Hz.

El navegador disponible tiene WebGL deshabilitado, por lo que la alternativa HTML está comprobada y el aspecto del renderizado WebGL queda por validar en un dispositivo compatible.
