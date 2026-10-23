# Auditoría de seguridad, rendimiento y documentos

Revisión del 8 de octubre de 2026 sobre la versión 39 publicada y los cambios que integran la siguiente entrega. No constituye certificación de invulnerabilidad ni aprobación institucional de documentos.

## Correcciones verificadas

- Un formulario administrativo abierto como A podía enviarse con la sesión B iniciada en otra pestaña. Se reprodujo en una base aislada. Todos los formularios administrativos afectados adjuntan ahora la identidad con que fueron abiertos; los endpoints comprueban esa identidad antes de guardar. Las consultas privadas de expedientes e imágenes también rechazan la cuenta equivocada. Una actualización de la página con otra cuenta remonta el límite de sesión y descarta el formulario de la identidad anterior.
- El optimizador de imágenes limita las transformaciones a imágenes locales públicas, 15 tamaños previstos y tres calidades. Rechaza direcciones externas, APIs privadas, extensiones no previstas, segmentos de recorrido y parámetros arbitrarios del archivo fuente. Ninguna imagen existente pierde funcionalidad.
- Se actualizaron los parches de fast-uri, source-map-js, sharp, undici en Miniflare y brace-expansion en las dos ramas de minimatch. Se conservaron versiones directas y arquitectura; no se ejecutó npm audit fix --force.
- Las consultas independientes de participación, privacidad y publicaciones se ejecutan en paralelo. La primera portada de Actualidad carga con prioridad. Se corrigieron el desplazamiento bajo encabezado fijo y la casilla que heredaba relleno de los campos de texto.

## Imágenes y preservación

Se conservan íntegros los originales de ambos anuncios, el contenido, tipografía, mascota, animaciones y funciones. Hay versiones WebP sin pérdida de 500, 768 y 1000 píxeles más el original de 1254. Sus píxeles coinciden exactamente con la imagen remuestreada mediante Lanczos. El navegador selecciona según espacio y densidad; las medidas declaradas descuentan el relleno de la tarjeta.

| Versión | Bytes conjuntos | Reducción frente al original |
|---|---:|---:|
| Original | 3533758 | — |
| 500 px | 557416 | 84,23 % |
| 768 px | 1339076 | 62,11 % |
| 1000 px | 2281694 | 35,43 % |

Son mediciones de archivos. No equivalen a Core Web Vitals ni a una medición de red en celulares.

## Verificación técnica

- 151 pruebas automatizadas aprobadas, cero fallidas, sobre el Worker compilado y bases aisladas.
- Compilación ESM, validación del artefacto, TypeScript y ESLint satisfactorios.
- Base publicada consultada con operación de lectura. Enlace DB disponible y 20 tablas de aplicación enumeradas. No se insertaron personas ficticias ni se ejecutaron ataques de carga sobre producción.
- npm audit inicial reportó 16 avisos altos. Tras los parches reporta ocho, todos asociados a braces en la cadena de desarrollo. npm audit --omit=dev reporta cero avisos.
- El aviso GHSA-vfj7-8cjw-p6xm afecta braces hasta 3.0.3, sin versión corregida publicada al cierre. No se encuentra en dependencias de producción ni en el Worker. No se reciben globs del visitante para esa herramienta. Se conserva la compilación aislada, acotada y con configuración revisada. Pendiente aplicar parche oficial cuando exista.
- No se acredita auditoría física de Cloudflare, prueba de penetración externa ni prueba de restauración. Las cargas privadas no incorporan antivirus; los controles de tamaño, tipo, autorización, descarga y CSP no se presentan como sustituto de él.

## Documentos

Las seis guías y el formato de evento fueron actualizados con versión, periodo, acuerdo y condición de proyecto para aprobación. Se renderizaron y revisaron sus 14 páginas. La base permanente editable y su PDF incluyen 14 páginas, seis comisiones, anexos anuales, matriz de permisos, evento, reporte, relevo y registro de aprobación. Se ofrece en el panel administrativo como documento para aprobación.

Los términos distinguen permisos informáticos y facultades institucionales. El aviso general describe correctamente la cookie propia de sesión. No se cambiaron datos legales configurados, consentimientos ya recibidos, aprobaciones de avisos registradas por el usuario ni variables de entorno.

Los datos institucionales previamente configurados constan en registro-aprobado-2026-09-12.json. Su presencia no demuestra el acuerdo real del Comité ni sustituye los instrumentos necesarios con la Unidad de Transparencia y proveedores. Para adopción oficial deben completarse acuerdo, fecha, adscripción, personas facultadas y firmas; también ratificar avisos, conservación, canal de atención e instrumentos aplicables. No se inventaron nombramientos, actas ni firmas.

## Límite visual pendiente

La capacidad control-browser exigida por la guía de Sites no está disponible. No se utilizó una ruta alternativa de automatización del navegador ni se visitó la URL publicada mediante un navegador del agente. La revisión de la web cubre código de presentación y HTML generado; no acredita inspección interactiva a distintos tamaños. Los PDF sí se renderizaron e inspeccionaron página por página. La infraestructura de vista previa no disponible no impide publicar las correcciones verificadas.

## Fuentes principales

- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/nodejs/undici/releases/tag/v7.29.1
- https://github.com/lovell/sharp/releases/tag/v0.35.5
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf
- https://almacenamientopan.blob.core.windows.net/pdfs/documentos/KdGNTa9cQp2YdgFbt2bSVCArfs7ZiA.pdf
- https://repositoriodocumental.ine.mx/xmlui/bitstream/handle/123456789/190295/CGor202609-24-rp-6-a1.pdf

La investigación complementaria de interfaces consultó X, Reddit y documentación técnica con acceso limitado; no se presenta como exhaustiva. Las decisiones de seguridad y jurídicas se apoyan en fuentes primarias y en pruebas reproducibles del proyecto.
