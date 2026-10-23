# Afiliación, privacidad y experiencia de registro

## Actualización posterior: modalidad resuelta

El titular aclaró que requiere incorporación interna a Acción Política Juvenil, seguida eventualmente de un trámite oficial distinto ante PAN. Se implementaron registro, seguimiento personal, revisión administrativa y aviso específico. La recepción se mantiene cerrada hasta completar los datos reales del responsable en Configuración. Véase [auditoría del registro](auditoria-comisiones-registro.md). Las secciones que siguen documentan la investigación histórica previa a esa aclaración, no el estado actual del desarrollo.

## Resultado de la revisión anterior

El sitio publicado en la versión 15 dispone de contacto, gestión editorial y expedientes internos. No tiene un registro de incorporación ni un trámite propio que produzca militancia oficial. El diagrama Three.js de la portada representa conceptos; no es un mapa del procedimiento de afiliación. Tampoco existía una página de términos de uso.

La palabra «afiliación» requiere definir el efecto del registro antes de desarrollar la base de datos y sus estados. La condición institucional del operador determina también el régimen de privacidad. Una declaración visual o un logotipo no acreditan esa condición.

## Afiliación institucional

El artículo 9 de los estatutos del PAN prevé medios electrónicos aprobados por el Comité Ejecutivo Nacional y verificación del Registro Nacional de Militantes. El alta en otra base de datos no acredita por sí misma militancia. PAN y RNM enlazan a su portal oficial; no se encontró documentación pública de una API utilizable. Esa búsqueda no demuestra que no exista una integración privada. [Estatutos PAN, archivo vigente enlazado por INE, mayo de 2026, arts. 8–10](https://ine.mx/wp-content/uploads/2026/05/INE-DEPPP-Estatutos-PAN-INECG176-2026.pdf), [PAN](https://pan.org.mx/), [RNM](https://rnm.mx/).

La afiliación partidista corresponde a ciudadanía mexicana y debe ser individual y voluntaria. La participación en actividades de menores no equivale a afiliación. [Ley General de Partidos Políticos, arts. 2–4](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPP.pdf), [Constitución, art. 34](https://www.diputados.gob.mx/LeyesBiblio/pdf/CPEUM.pdf).

## Privacidad y términos

Si la base se administra por una persona o asociación privada, debe analizarse la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Los datos que revelen opiniones políticas son sensibles. Su tratamiento exige el consentimiento expreso y escrito o la excepción aplicable; una casilla anónima no sustituye automáticamente la firma o el mecanismo de autenticación requerido. El aviso debe identificar al responsable, domicilio, finalidades, datos, atención de derechos y cambios. [LFPDPPP, texto vigente, arts. 2, 7–8 y 14–16](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf).

Si el responsable es el partido, debe analizarse la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados. El aviso requiere, además, el fundamento del tratamiento y la atención institucional correspondiente. La Unidad de Transparencia y la autoridad competente no se sustituyen por datos de una iniciativa independiente. [LGPDPPSO, texto vigente, arts. 3, 14–15 y 20–21](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf).

Ambos textos consultados indican expedición el 20 de marzo de 2025 y reforma el 14 de noviembre de 2025. No se emplearon formularios antiguos como prueba de vigencia.

La revisión del código permitió concretar los términos en el uso real de agenda, publicaciones, cuentas, permisos, solicitudes, moderación y enlaces. Se evitó atribuir carácter oficial a una referencia interna, prometer respuestas automáticas, ampliar derechos de autor sin acuerdo o incluir una exención absoluta de responsabilidad. La información de privacidad distingue ahora los formularios públicos cerrados del tratamiento técnico y administrativo que sí existe. El aviso integral sigue requiriendo identificar al responsable real y su régimen; esa información no puede suplirse con redacción.

## Investigación de interfaz

| Fuente | Qué se comprobó | Aplicación al sistema |
|---|---|---|
| [W3C/WAI, Multi-page Forms](https://www.w3.org/WAI/tutorials/forms/multi-page/) | Guía y ejemplos de pasos, progreso y revisión. | Pasos con títulos comprensibles, vuelta atrás conservando datos y etapa actual visible. Una representación 3D no sustituye los controles HTML. |
| [W3C/WAI, User Notification](https://www.w3.org/WAI/tutorials/forms/notifications/) | Guía de errores y confirmaciones. | Errores junto al campo, resumen con enlaces, foco y aviso accesible; acuse solo después del guardado confirmado. |
| [OWASP, HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) | Apartados de almacenamiento y datos sensibles. | No conservar afiliación ni datos personales en localStorage. El borrador temporal puede mantenerse en memoria; una recuperación persistente necesitaría almacenamiento privado y conservación definida. |
| [Motion, useReducedMotion](https://motion.dev/docs/react-use-reduced-motion) | Documentación oficial del hook. | Mantener Motion instalado y respetar la preferencia del sistema sin hacer depender de una animación el acceso a un campo. |
| [Three.js, Mugen87, Fans blowing up, high CPU usage?, 7 de junio de 2020](https://discourse.threejs.org/t/fans-blowing-up-high-cpu-usage/15949/2) | Respuesta original del autor. | Renderizar cuando cambie la escena y detener el bucle en reposo. Es una recomendación técnica; no certifica FPS ni rendimiento móvil. |
| [Reddit, r/UXDesign, Accessibility](https://www.reddit.com/r/UXDesign/comments/17gp3fw/accessibility/) | Publicación y respuestas de varios participantes. | Incorporar teclado, foco y alternativas a gestos desde el diseño. Los testimonios no sustituyen una norma o prueba de accesibilidad. |
| [Jhey Tompkins, Glass with CSS + SVG](https://www.linkedin.com/posts/jheytompkins_webdev-webdesign-css-activity-7339099850627571712-eb5A) | Publicación original del autor y conversación visible. No se inspeccionó su código desde ese enlace. | Referencia visual para cristal. Los comentarios sobre Safari no prueban compatibilidad; el efecto necesita alternativa legible. |

Se buscaron publicaciones de X sobre Liquid Glass, WebGL, accesibilidad y Jhey. No se obtuvo un post completo con URL verificable en esta revisión. Los fragmentos y pantallas de acceso no se presentan como lectura íntegra, ni la publicación del autor en LinkedIn se describe como acceso a X.

React, Motion y Three.js ya instalados cubren el diseño propuesto. No se identificó una función pendiente que justificara añadir otra librería solo por su nombre.

## Diseño del procedimiento pendiente de definir

Inferencia de diseño, no función ya implementada: un mapa de etapas puede acompañar identificación, revisión y constancia; los controles y mensajes seguirían en HTML. Una escena decorativa tendría alternativa sin WebGL, movimiento reducido y renderizado a demanda. La vista administrativa mostraría estados sustentados en actuaciones reales, con permisos, historial y conflictos de edición.

No se ha decidido si «mapa» representa etapas o geografía. No se publicarán ubicaciones personales como recurso decorativo. Si se necesita una vista territorial, habrá que definir su finalidad y el nivel de información permitido antes de incorporar datos.

Para verificar un registro se necesitan, al menos, pruebas de permisos, doble envío, retorno entre pasos, corrección de errores, sesión vencida, consentimiento, correspondencia entre acuse y base de datos, conservación y cambio concurrente en el panel. La batería de la versión 15 no acredita esas funciones inexistentes.

## Trazabilidad de peticiones

| Petición visible | Evidencia / estado |
|---|---|
| «redacta la privacidad, los términos» | Nueva página /terminos y revisión de /privacidad. No se declara un aviso integral completo sin operador y régimen definidos. |
| «un sistema donde puedan afiliarse» | Faltante confirmado. Es necesario aclarar incorporación local frente a militancia oficial antes de definir el registro. |
| «un mapa 3D, Liquid Glass» | Efectos existentes en portada; no hay mapa funcional de afiliación. El diseño del procedimiento depende de la aclaración anterior. |
| «el panel que sirva» | Versión 15 probada para agenda, publicaciones, permisos y solicitudes. Un módulo de incorporación todavía no existe. |
| «recupera todos los prompts maestros ... palabra por palabra» | Disponibles esta conversación, Plan Maestro y resultados de recuperación contextual. No se recuperó una transcripción íntegra adicional de todos los prompts; no se certifica una revisión literal de material no disponible. |
| «sin alucinar sin ponerle más ... preguntas siempre primero» | Registrado en AGENTS.md para futuras intervenciones del proyecto. No se afirma modificación de la memoria global de ChatGPT. |

Fuentes consultadas el 11 de septiembre de 2026. Los enlaces técnicos son documentación viva o testimonios con el alcance indicado. Este documento no acredita autorización institucional, una integración del RNM ni el despliegue del sistema de afiliación.


## Verificación de los cambios jurídicos

Se revisaron las afirmaciones contra el código y las fuentes. Se comprobó en navegador la ruta de términos, el enlace a privacidad y la presentación de privacidad. Se corrigió la disposición de secciones con varios párrafos, que los colocaba indebidamente en la columna del título. La revisión no incluye dispositivos físicos. La batería existente de 42 pruebas y la comprobación de tipos terminaron sin errores; no acreditan el registro de afiliación, que sigue pendiente de definir. No se enviaron solicitudes reales ni se habilitaron canales.
