# Correcciones de la auditoría de la versión 24

## Cambios comprobados

- Las imágenes tienen una revisión persistente. El servidor rechaza formularios antiguos y carreras con otros editores sin cambiar visibilidad ni producir auditorías falsas. La migración 0009 conserva archivos, atributos y fechas existentes.
- Usuarios y contraseñas reúne delegaciones SSO y cuentas con contraseña, con búsqueda literal y páginas de 25. La consulta se comprobó con más de 200 cuentas sintéticas. Cada operación comprueba por separado las revisiones de permisos y credenciales dentro de una transacción.
- Se pueden cambiar y revocar permisos sin que exista una contraseña local. Un nuevo enlace no restaura implícitamente una revocación. La reactivación es explícita y los estados antiguos aparecen en el mismo listado.
- `/admin/recuperar` utiliza directamente el SSO verificado, aunque exista otra cookie local. El correo mostrado debe coincidir con el SSO vigente al guardar. No se toma el objetivo del correo enviado por el cliente. Sin identidad autorizada, la recuperación se rechaza.
- Buscar una portada con Enter ya no envía la publicación. Elegir una portada sí marca el borrador; escribir una búsqueda no lo modifica.
- Nuevas publicaciones, actividades, archivos y formularios de cuentas señalan cambios sin guardar. Los medios y permisos conservan juntos los valores y la revisión del borrador. Los campos se deshabilitan durante el envío.
- La navegación del panel protege enlaces, filtros, cambios de sección, recarga y salida. Cerrar sesión consulta antes de revocarla. Los recorridos de historial utilizan Navigation API cuando existe y el evento permite cancelación; no se altera el historial gestionado por Vinext.
- El menú móvil tiene altura limitada al espacio de pantalla y desplazamiento interno. Se conserva la identidad y la integración aprobada de la mascota.
- El aviso general enlaza el aviso específico aprobado y utiliza el procedimiento real configurado para atención de derechos.

## Verificación

Compilación y TypeScript correctos. Suite completa de 70 pruebas aprobadas, sin fallos, cancelaciones ni omisiones. Las diez pruebas nuevas cubren los fallos reproducidos, carreras, rollback, identidad de recuperación, listados completos, migración y ejecución de purga programada con SQLite real aislado. Se reforzó la prueba de borradores para revisiones compuestas.

La inspección nativa de producción confirmó la base DB y las tablas esperadas. La tabla site_settings no tenía una fila guardada, de modo que la recepción utiliza los valores aprobados del entorno en revisión 4. No se generaron cuentas o expedientes ficticios en producción.

## Límites que permanecen

- La revisión automática bloqueó el navegador por límite de uso. No se eludió. No hay una nueva prueba visual, táctil o GPU ni una sesión real del propietario acreditada en esta revisión.
- No se acredita todavía una ejecución remota del cron. El manejador está empaquetado y su operación completa pasa la prueba aislada. La auditoría remota consultada no contenía eventos.
- No existe una conexión que permita exportar y restaurar integralmente D1, R2 y secretos en una cuenta externa. No se presenta el respaldo del código como respaldo de esos datos.
- Solicitantes y recuperación continúan usando ChatGPT. No se migró el alojamiento fuera de Sites ni se conectó transporte de correo o WhatsApp.
- Contacto y opiniones siguen cerrados por sus controles independientes. Los plazos de cuentas, material editorial y auditoría todavía requieren quedar definidos por el responsable; no se inventó una regla de eliminación.

Estos límites no se declaran corregidos ni equivalentes a una prueba satisfactoria. No se promete inmunidad absoluta ante ataques ni ausencia de cualquier fallo futuro.

## Acceso

El equipo entra por `/admin/ingresar`. El primer acceso propietario y la recuperación utilizan `/admin/recuperar`. Las cuentas y permisos se administran en `/admin/cuenta`; las solicitudes en `/admin?section=incorporaciones`.
