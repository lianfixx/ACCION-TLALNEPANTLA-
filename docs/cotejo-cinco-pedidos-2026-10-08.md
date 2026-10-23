# Cotejo de los cinco mensajes anteriores

Revisión del 8 de octubre de 2026. Se tomaron los cinco mensajes de trabajo anteriores a la petición actual. Los dos mensajes «lo hiciste?» se refieren a publicar el cambio de domicilio con el Lic. Sondón y se agrupan en una misma comprobación.

| Solicitud | Comprobación | Límite pendiente |
|---|---|---|
| Publicación del cambio de domicilio, dos mensajes de seguimiento | Publicación e imagen incorporadas al código, artefacto, Actualidad, API, sitemap y panel. Ruta /actualidad/cambio-de-domicilio-con-victor-hugo-sondon. Las lecturas de producción confirman que no hay una edición en posts que la suprima. | No se hizo una navegación interactiva a producción. |
| Claridad en comisiones, formularios y PAN | Seis comisiones separadas, guías, formulario progresivo, tres proyectos solo para coordinación y separación de documentos personales y PAN. Se corrigió en términos la etiqueta antigua «Incorporación registrada» por «Solicitud aceptada». | Comprensión por personas nuevas y uso móvil deben comprobarse con navegación y ensayo de usuarios. |
| Afiliación al PAN al final y comprobante obligatorio | Interfaz y servidor exigen comisión activa. Folio y acuse no completan el paso; exige un comprobante vigente y revisión administrativa. La revocación durante una carga impide guardarla. | No hay confirmación automática de correo ni sincronización con RNM. La revisión de INE/domicilio es humana y no es una condición automática de tres archivos checked para habilitar comisión. |
| Auditoría visual, velocidad y seguridad sin quitar contenido | 153 pruebas automatizadas aprobadas. Imágenes sin pérdida, originales conservados, consultas independientes paralelas, formularios ligados a su cuenta, optimizador restringido y parches de dependencias. | No hay medición real de Core Web Vitals ni auditoría interactiva por tamaños, prueba de penetración externa, antivirus integrado o ensayo de restauración de D1 y R2. |
| Documentos reutilizables con alcance institucional | Seis guías y formato, base de 14 páginas con 41 campos editables y anexos anuales. Documentos renderizados e inspeccionados. Enlace de la base desde el panel. | Son proyectos para aprobación. El acuerdo, adscripción, personas facultadas y firmas reales siguen pendientes. |

La matriz reúne cinco mensajes en cuatro encargos porque dos son seguimientos de la misma publicación; el último encargo se desglosa en dos filas por su alcance técnico y documental.

## Hallazgo adicional corregido

La carga de imágenes editoriales validaba tamaño y formato, pero una sesión de editor no tenía límite de frecuencia. Se añadieron controles antes de leer y normalizar archivos — 30 intentos por hora por cuenta y 200 al día para el sitio. La respuesta 429 incluye Retry-After. Si la verificación del límite falla, se responde 503 sin procesar ni almacenar el archivo. Se probaron el límite individual, la disponibilidad para otra cuenta, la cuota compartida y el fallo de almacenamiento del contador. No se impuso una cuota acumulada permanente que bloqueara archivos existentes.

También se ajustaron mensajes de habilitación de comisiones. Administración acepta la solicitud; un coordinador autorizado puede añadir a una persona ya aceptada en su comisión. No se le atribuyen facultades para asignar coordinaciones, revocar accesos o consultar documentos personales ajenos.

## Evidencia de esta revisión

- Compilación, TypeScript y ESLint sin errores.
- 153 pruebas aprobadas, cero fallidas u omitidas, con Worker compilado, SQLite aislado y almacenamiento simulado. No equivalen a 153 ensayos en infraestructura publicada.
- La base de producción responde y muestra sus 20 tablas. Lectura de posts sin filas — las dos publicaciones originales se sirven desde la fuente editorial, sin inventar un autor en base de datos.
- La consulta de errores de producción de los últimos 60 minutos devolvió cero eventos. Es una observación del intervalo consultado, no una garantía de ausencia de fallos.
- Los resultados de dependencias del mismo día siguen siendo cero avisos en producción y ocho avisos transitivos de braces en herramientas de desarrollo, sin parche publicado en la revisión anterior. No se cambiaron dependencias en esta entrega.

## Complementos y herramientas

Codex Security aparece disponible, sin instalar. Puede aportar escaneos e investigación de seguridad, pero hace falta conectarlo y confirmar su acceso al repositorio del Site. GitHub y TinyFish figuran instalados. No se añadió un complemento ni se enviaron expedientes o código a otro servicio.

La guía de Sites exige control-browser para la inspección del sitio en el entorno de vista previa. Esa capacidad no está disponible y no apareció un complemento exacto que la habilite en las búsquedas. TinyFish instalado no acredita compatibilidad con ese flujo. No se cambió a un navegador alternativo.

Para cerrar las pruebas de interfaz se requieren navegador compatible, recorridos por móvil/tableta/escritorio, teclado y cuentas de ensayo; Playwright y axe permiten automatizar parte de esa revisión. Lighthouse ayuda a medir rendimiento y accesibilidad. Instalar un paquete sin poder ejecutar el navegador no se presenta como auditoría terminada.

Referencias de herramientas

- https://playwright.dev/docs/emulation
- https://playwright.dev/docs/accessibility-testing
- https://developer.chrome.com/docs/lighthouse/overview
