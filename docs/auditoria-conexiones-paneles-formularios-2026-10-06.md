# Auditoría de conexiones, paneles y formularios

Revisión del 6 de octubre de 2026 sobre la versión 35 y las correcciones que la suceden.

## Alcance y evidencia

Se revisó el recorrido desde el formulario hasta el servidor, la base de datos y los archivos. Los ensayos ejecutan el servicio compilado con cuentas ficticias, SQLite aislado y almacenamiento simulado. Se comprueban respuestas, datos persistidos e historial de auditoría, incluidos errores y operaciones simultáneas. No se crearon cuentas ni documentos ficticios en producción.

La base publicada responde a las herramientas de inspección y contiene las 20 tablas previstas. La lectura de esta revisión encontró cero cuentas y ningún ajuste local en `site_settings`; por tanto, siguen aplicando los valores de producción de la revisión de entorno 8. La recepción interna está configurada como abierta. El contacto general y las opiniones públicas permanecen desactivados. No hay claves de Turnstile configuradas para abrir el contacto general.

No se encontró un recurso de navegador compatible con la vista previa requerida. No se presenta esta revisión como una prueba interactiva de escritorio, móvil o tableta. Tampoco se interpreta una consulta de base de datos como una prueba de carga real en R2.

## Fallas corregidas

| Recorrido | Falla encontrada | Corrección |
| --- | --- | --- |
| Crear cuenta | Cien envíos vacíos podían agotar el cupo global de altas, incluso sin crear una cuenta | El cupo global se reserva junto con el alta efectiva. Los errores no descuentan altas y se mantienen los límites por red e identificador |
| Contraseña y sesión | Un formulario abierto bajo una cuenta podía actuar sobre otra después de cambiar de sesión en una pestaña distinta | La pantalla envía su cuenta esperada y el servidor la comprueba antes de actuar |
| Publicaciones | La API permitía omitir la versión y sobrescribir cambios recientes | La revisión es obligatoria. También se comprueba que una portada seleccionada exista |
| Moderación | Dos decisiones simultáneas podían sobrescribirse y generar un historial incoherente | La versión se comprueba al recibir y al guardar la decisión. Una petición obsoleta no escribe una aprobación ni su auditoría |
| Incorporación | Una corrección quedaba atrapada en un conflicto tras cambiar el expediente desde administración | Se conserva el borrador y se ofrece revisar la versión actual antes de continuar |
| Equipo | Una cuenta desactivada podía asignarse a una comisión o nombrarse coordinadora | La cuenta debe seguir activa al consultar y al guardar la asignación |
| Conversación de actividades | Los mensajes anteriores a los últimos cien quedaban inaccesibles en el panel | La consulta y la pantalla permiten recorrer páginas del historial |
| Expediente de contacto | Si una nota se guardaba y fallaba la consulta posterior, la pantalla reemplazaba la confirmación por un error y no ofrecía actualizar | Se separan el resultado del guardado y el error de consulta. Siempre hay una acción para volver a cargar el expediente |

## Conexiones revisadas

| Área | Conexión y control |
| --- | --- |
| Cuentas | Activación, usuario y contraseña propios, sesiones, revocación, recuperación administrativa y permisos |
| Solicitud interna | Formulario personal, folio, revisión administrativa, respuesta visible, notas reservadas y correcciones con versión |
| Comisiones | Incorporación aceptada, asignación de equipo, coordinación, actividades, autorizaciones, espacios y relevo |
| Documentos | Permisos del titular y administración, límites, firma del formato, metadatos en base, objeto privado y limpieza compensatoria |
| Afiliación PAN | App externa, acuse o comprobante, seguimiento interno, revisión humana vinculada al archivo y retiro o vencimiento |
| Editorial | Publicaciones, agenda, imágenes, privacidad, moderación y controles frente a cambios simultáneos |
| Administración | Configuración, asignación de responsables, historial y permisos comprobados de nuevo al escribir |
| Conservación | Vencimiento, inaccesibilidad inmediata, depuración y reintento de eliminación de archivos |

La app del PAN no está sincronizada automáticamente. El sitio no expide una afiliación oficial ni garantiza la autenticidad de un documento. Las reservas de espacios solo consideran los eventos registrados aquí y el nombre del lugar indicado.

## Verificación final

- Comprobación de tipos, análisis de código y compilación de producción completados sin errores.
- 143 pruebas aprobadas, cero fallos, cero omitidas. Doce regresiones nuevas cubren las fallas de registro, cuenta esperada, publicaciones, moderación, asignación, paginación y correcciones de solicitudes.
- Las pruebas ejecutan el servicio compilado, comprueban la persistencia y provocan carreras y fallos de escritura. Se mantiene la cobertura de documentos, afiliación, permisos, caducidad y eliminación compensatoria.
- La recuperación visual de la corrección de solicitudes y del expediente se revisó en el flujo de sus componentes. La conversación se separó para que cambiar de página no desmonte los formularios de revisión, reasignación o documentos. Una segunda revisión del cambio confirmó esa separación. Esto no sustituye la comprobación interactiva en navegador.

Pruebas nuevas en `tests/auth-audit-regressions.test.mjs`, `tests/admin-editorial-concurrency.test.mjs` y `tests/commission-recovery.test.mjs`.

## Pendientes de puesta en uso

1. La persona propietaria debe activar su cuenta con el enlace privado entregado y elegir usuario y contraseña. El acceso posterior es `/ingresar` y la administración de cuentas está en `/admin/cuenta`.
2. Completar una prueba interactiva autorizada en la publicación, incluidos móvil, tableta, carga y descarga reales. La ausencia de errores recientes en los registros no acredita ese recorrido.
3. Mantener diferenciados los canales. Las incorporaciones están habilitadas; el contacto general requiere sus claves de verificación y activación propia.

No se amplían los plazos de conservación ni se modifican políticas de recepción por suposición. Esta auditoría no equivale a una certificación de seguridad ni garantiza ausencia absoluta de fallas.
