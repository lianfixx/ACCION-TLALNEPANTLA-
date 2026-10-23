# Auditoría de Acción Política Juvenil Tlalnepantla

Cierre técnico del 9 de octubre de 2026 UTC, 8 de octubre en Ciudad de México. Se revisó el código que sucede a la versión 42. Este informe distingue las funciones construidas, las pruebas realizadas y los pasos que todavía requieren intervención real.

## Resultado comprobado

La compilación, TypeScript, ESLint y las 161 pruebas automatizadas terminaron correctamente. La revisión de dependencias de producción no reportó vulnerabilidades conocidas. Esto no equivale a una garantía de ausencia de ataques.

Se ejecutó además el servicio compilado en workerd con D1 y R2 locales. Se completaron registro con contraseña, solicitud, revisión administrativa, incorporación a comisión, entrega y revisión del comprobante PAN y autorización de un evento. Se restauraron 21 tablas, 31 filas sintéticas y cuatro archivos en una instancia nueva. Las sesiones anteriores quedaron invalidadas; los nuevos accesos y los documentos recuperados funcionaron. La comprobación de claves foráneas no arrojó incidencias.

El ensayo es reproducible con `node scripts/audit-storage-local.mjs`, después de `npm run build`. Solo utiliza datos ficticios. Sus rutas de exportación y restauración pertenecen al envoltorio de prueba y no se incluyen en el servicio publicado. No constituye un respaldo ni una restauración de infraestructura de producción.

## Fallas encontradas y corregidas

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| Una pestaña podía recibir información de otra cuenta tras cambiar la sesión | Se vincularon las consultas de incorporación, documentos, actividades y seguimiento con la cuenta que abrió la página. Una sesión diferente recibe un rechazo y se retiran los resultados incompatibles | Pruebas de rechazo 412 y lectura correcta con la cuenta original |
| Un comentario podía atribuirse a otra cuenta o guardarse después de revocar la sesión | El formulario transmite su cuenta esperada; la escritura comprueba sesión y publicación dentro de la operación de base de datos | Se ensayaron cambio de cuenta, revocación y retiro de publicación; no se guardaron comentarios indebidos |
| Las imágenes podían entregarse después de revocar permisos mientras respondía el almacenamiento | Se vuelven a comprobar sesión, rol y visibilidad antes de entregar los bytes | Revocación de sesión, rol y visibilidad pública bloqueadas; descarga autorizada conservada |
| Una carga editorial fallida podía dejar un objeto sin seguimiento | Se registra la carga antes de enviar bytes. La compensación fallida permanece pendiente para la depuración programada | Fallos simulados de base y almacenamiento; reintento posterior elimina el objeto y conserva las imágenes válidas |
| La depuración solo procesaba el primer lote de 200 documentos | Ahora avanza por identificador en varios lotes, sin que un objeto fallido detenga los siguientes. Cada ejecución tiene un presupuesto de 20 segundos para documentos y conserva pendientes para reintento | 205 documentos vencidos, un fallo temporal y eliminación posterior del restante |
| Fechas imposibles podían guardarse y romper la presentación | Se validan fechas de calendario y límites representables antes de guardar | Rechazo de 30 de febrero y marcas temporales fuera de rango; aceptación del 29 de febrero de un año bisiesto |
| Al pasar del acceso a crear cuenta se perdía la comisión elegida | El enlace conserva la comisión validada | Comprobación de HTML y del enlace en navegador |

La migración nueva solo añade la tabla de seguimiento de cargas editoriales y sus índices. No modifica ni elimina expedientes existentes.

## Cumplimiento de los últimos encargos

| Petición | Estado y alcance |
|---|---|
| Comisiones separadas, instrucciones claras y documentos | Seis guías específicas, consulta desplegable, responsabilidades, autorizaciones, reporte mensual y entrega. Se conservaron diseño y contenido |
| Registro, usuario, contraseña, perfil y seguimiento | Implementado y probado con cuentas sintéticas; el registro distingue colaboración y coordinación con tres proyectos |
| INE, domicilio y evidencias | Archivos privados con controles de propietario, comisión y administración, formatos y límites de tamaño. Las identificaciones no se comparten con la coordinación |
| Afiliación PAN como último paso | Se habilita después de confirmar la comisión. La persona realiza el trámite fuera del sitio y entrega el comprobante. Un folio o acuse no completa la revisión |
| Contraparte administrativa | Solicitudes, documentos, equipo, afiliación, actividades, espacio y archivo probados. Las revocaciones y cambios concurrentes rechazan operaciones obsoletas |
| Reportes, documentos y siguiente equipo | Flujos implementados, conservación limitada e historial. No se presentan como nombramientos, constancias o actos oficiales firmados |
| Auditoría de conexiones y almacenamiento | Pruebas del Worker, SQL y R2 local, fallos transaccionales, permisos y recuperación. Se verificó lectura de la base desplegada |
| Velocidad sin quitar contenido | Se conservaron los recursos y optimizaciones existentes. Esta revisión no acredita una nueva mejora porcentual, puntuación Lighthouse ni Core Web Vitals medidos en producción |
| Seguridad | Controles de acceso, sesión, origen, validación, límites, concurrencia y archivos comprobados. No se afirma protección frente a todos los ataques |
| Documentos oficiales del Comité | Las bases y anexos siguen preparados para aprobación. El sistema no puede sustituir el acuerdo, las firmas ni la intervención del órgano competente |

## Revisión visual realizada

Se revisaron en navegador la portada, la guía de Gobierno, el acceso al registro y la pantalla de usuario y contraseña. La guía abre la comisión enlazada y el acceso conserva la selección. No se observó desbordamiento horizontal en el ancho de escritorio de 1348 píxeles revisado.

El entorno de vista previa no tiene la configuración ni los datos de producción. Allí la recepción aparece cerrada y Actualidad informa que no pudo consultar la base; esos mensajes no prueban un fallo del sitio publicado. Las páginas con datos se comprobaron también mediante el Worker con base aislada. La navegación local HTTP produjo una limitación de Web Crypto del framework que recurrió a la navegación completa; no se reprodujo esa condición como incidente de producción HTTPS.

No se completó una prueba visual autenticada de los paneles con credenciales reales, ni una emulación visual independiente de móvil y tableta. La herramienta de navegador disponible no expone ajuste de viewport. Esos puntos quedan expresamente sin certificar.

## Lo que requiere cierre real

- La base de producción todavía no contiene cuentas. Se renovó la activación inicial de la cuenta propietaria conservando el correo y los permisos ya configurados. La persona propietaria debe elegir usuario y contraseña en el enlace privado de un solo uso. La renovación no crea una cuenta ni prueba su inicio de sesión en producción.
- Después de esa activación, falta una prueba de aceptación real de administración y participante en producción, con datos de prueba identificados y autorización para su retiro.
- Los documentos del Comité requieren su revisión y aprobación institucional. No se han inventado firmas, acuerdos ni nombramientos.
- No se ha ensayado un respaldo y una restauración de la infraestructura Cloudflare de producción. La prueba local acredita integridad lógica y recuperación de archivos, no ese procedimiento operativo.
- Contacto general y comentarios siguen desactivados en la configuración publicada. El registro de incorporación sí está habilitado. No se modificó esa decisión ni se activó un canal sin su configuración necesaria.
- No hay verificación automática contra el padrón del PAN, comprobación externa de identidad, verificación de correo, MFA ni análisis antivirus de los archivos. Los controles existentes no se presentan como esas funciones.
- La revisión de dependencias de desarrollo anterior dejó un aviso de la cadena `braces` sin actualización compatible aplicada. El resultado de cero hallazgos de esta entrega corresponde exclusivamente a dependencias de producción.

## Fuentes y comprobación externa

Se contrastaron los destinos oficiales de afiliación con el portal del PAN y la ficha de su aplicación Android. El sitio mantiene el trámite externo y la revisión documental interna como pasos distintos. No se creó una integración con la app ni con el Registro Nacional de Militantes.

- https://pan.org.mx/
- https://afiliacion.pan.org.mx/
- https://play.google.com/store/apps/details?id=org.pan.partidoAccionNacional&hl=es_MX

Este cierre no se describe como cumplimiento absoluto. Las correcciones comprobadas están listas para publicarse; los pasos personales, institucionales y de infraestructura indicados arriba siguen pendientes.
