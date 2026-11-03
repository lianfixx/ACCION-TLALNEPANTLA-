# Acción Política Juvenil Tlalnepantla

Sitio público y administración editorial. Portada, agenda, publicaciones, imágenes, opiniones moderadas y seguimiento de solicitudes. Código React/Vinext con Worker, Cloudflare D1 y R2 a través de Sites.

## Estado comprobable

- [Correcciones de la auditoría y límites de verificación](docs/correcciones-auditoria-2026-09-12.md).
- [Requisitos actuales y pendientes reales](docs/requisitos-activos.md).
- [Auditoría de la versión anterior](docs/auditoria-funcional.md).
- [Investigación y decisiones de movimiento](docs/motion-research.md).

El nombre, la marca PAN azul, los textos simplificados y «En marcha» sustituyen las variantes objetadas. Las imágenes son locales. Se conservan Source Sans 3 y Source Serif 4. La historia de la organización nacional se identifica como referencia, sin atribuir a la plataforma una categoría jurídica no documentada.

## Administración

`/admin/ingresar` y `/ingresar` utilizan usuario y contraseña. El propietario activa su primera cuenta mediante un enlace privado de un solo uso y administra las cuentas del equipo desde `/admin/cuenta`. Cuando la recepción interna está habilitada, `/crear-cuenta` permite a personas mayores de edad abrir una cuenta de participación para enviar su solicitud y consultar el seguimiento; no concede permisos administrativos ni verifica por sí misma el correo declarado. Los permisos de administrador, editor y moderador se conceden por separado. El propietario confirma su contraseña al crear, restablecer, revocar o cambiar permisos. Las sesiones anteriores quedan invalidadas al restablecer credenciales o modificar permisos. No existe acceso por un proveedor de identidad externo. Consulta [la operación de las comisiones](docs/comisiones-operacion.md) y [la operación de cuentas](docs/cuentas-propias.md). Los ajustes legales y las redes propias se guardan en D1 desde Configuración. No se guardan secretos en esos campos.

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

## Movimiento e identidad visual

La portada vigente utiliza la imagen aprobada del cacomixtle mediante `HeroMascot`, con una entrada breve sin bucle y desactivada cuando se solicita movimiento reducido. No requiere WebGL ni sustituye el logotipo institucional. La implementación tridimensional anterior se conserva únicamente como antecedente técnico y no se importa desde la portada actual. Consulta [la identidad del cacomixtle](docs/mascota-cacomixtle.md).

Las reglas adaptables y de accesibilidad están implementadas, pero una compilación o una inspección estática no sustituyen la prueba interactiva en teléfonos y tabletas reales.

## Skill integral

La memoria operativa para producir y auditar eventos, formatos, flyers, presentaciones, sitio, podcast, datos y formularios está en [`skills/accion-tlalnepantla/`](skills/accion-tlalnepantla/). La skill conserva la identidad vigente, separa antecedentes históricos y exige distinguir propuesta, autorización, confirmación, publicación y resultado comprobado.
