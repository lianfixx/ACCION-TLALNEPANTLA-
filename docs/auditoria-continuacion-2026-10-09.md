# Continuación de la auditoría

Revisión sobre la versión 41 publicada. Esta entrega refuerza la descarga privada sin cambiar contenido, diseño, permisos previstos ni variables de producción.

## Hallazgo reproducido y corrección

Un documento privado se autorizaba antes de esperar la respuesta de R2. Si durante esa espera se revocaba la sesión o el permiso de administración, la respuesta aún podía entregar el archivo. Se reprodujeron ambos casos contra el Worker anterior, con respuestas 200 donde correspondía negar el acceso.

La consulta de documentos comprueba ahora en una misma lectura la sesión vigente, la versión de credenciales, la cuenta habilitada, la conservación del documento y el acceso actual a su actividad. Las descargas repiten esa comprobación después de recibir el objeto de R2 y antes de entregar la respuesta. Si el acceso cambió, cancelan el cuerpo del objeto y devuelven una respuesta genérica 404, sin contenido del archivo. La comprobación no recupera bytes que ya se hayan entregado en una descarga anterior.

Se ensayaron ocho cambios durante la espera de R2

- Revocación de sesión, cambio de contraseña y deshabilitación de cuenta.
- Vencimiento y retirada del documento.
- Revocación del permiso de administración o del acceso a la comisión.
- Reasignación de una actividad en borrador a otra persona.

Los ensayos de acceso autorizado, correcciones, cargas, revisiones y retiro de documentos existentes siguen aprobados.

## Validación de esta entrega

- 155 pruebas automatizadas aprobadas, cero fallidas, canceladas u omitidas. Ejecutadas sobre el Worker compilado, SQLite aislado y R2 simulado.
- Compilación, validación del artefacto, TypeScript y ESLint satisfactorios.
- Consulta nueva de npm audit --omit=dev con cero avisos. Las dependencias no se modificaron en esta entrega; el análisis anterior de herramientas de desarrollo conserva su alcance y fecha.
- Consulta de errores de producción de los últimos 180 minutos sin eventos. Esa observación no sustituye recorridos completos en producción.
- No se modificaron expedientes reales, cuentas, roles, secretos, declaraciones de almacenamiento ni estructura de la base.

## Alcance pendiente

Se mantiene el cotejo de los cinco pedidos del documento anterior. Afiliación es el último paso tras habilitar la comisión; un folio o acuse no completan el trámite y se exige comprobante vigente con revisión administrativa. La revisión de los documentos personales sigue a cargo de administración; no hay verificación automática de identidad ni de correo, ni conexión automática con el Registro Nacional de Militantes.

Codex Security sigue disponible y sin conectar. Su conexión no acredita por sí sola que pueda analizar el repositorio del Site. No se envió código ni documentación personal a otro servicio.

La capacidad control-browser sigue ausente. La guía de Sites para este entorno exige esa capacidad y dice «If it is unavailable, do not improvise another browser-control path». No se sustituyó ese flujo por TinyFish, CUA o un navegador no autorizado por la guía. Quedan pendientes la inspección interactiva por tamaños, las mediciones de navegador y un recorrido completo con cuentas de ensayo en la infraestructura publicada.

También siguen pendientes un ensayo de restauración de D1 y R2, una prueba de penetración externa y cualquier servicio de análisis antivirus. Los documentos institucionales permanecen como proyectos para aprobación hasta recibir acuerdo, adscripción y firmas reales del Comité.
