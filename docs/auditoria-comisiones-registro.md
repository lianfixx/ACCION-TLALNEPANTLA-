# Comisiones y registro interno

Revisión del 11 de septiembre de 2026. Amplía la auditoría anterior; no certifica que todos los proyectos mezclados en los prompts históricos estén terminados.

## Alcance ejecutado

- «Experiencias» se sustituye por seis comisiones: Gobierno, Administración, Comunicación, Cultura, Tecnología e IA y Mujeres al frente. Se presentan funciones administrativas, sin mensajes de captación dirigidos a CUDEC ni a grupos demográficos.
- Cada comisión muestra propósito, funciones y trabajo a cargo. Comparte catálogo con el registro, evitando nombres diferentes entre portada y expediente.
- Se conservan Nuestra forma de hacer equipo, Equipo y responsabilidades, las referencias nacionales y las preguntas aprobadas. Las preguntas tienen presentación de conversación, sin simular un servicio de WhatsApp.
- Coordinaciones, convocatoria, perfiles y toma de protesta quedan para cuando existan designaciones y datos reales. No se atribuye a Víctor Hugo Sondón una participación no confirmada.

## Procedimiento implementado

`/participacion` incluye tres pasos: datos, comisión y revisión. Nombre, correo de la cuenta, comisión y nota opcional; no recoge escuela, INE, CURP ni domicilio particular. Borrador en memoria, sin persistencia en localStorage. La sesión puede iniciarse antes de completar datos. La cuenta acredita control de acceso, no identidad civil.

La recepción requiere datos jurídicos reales, conservación, aceptación del aviso y confirmación del procedimiento de consentimiento directo en Configuración. La mayoría de edad se declara, no se verifica. El trámite mediante representante necesita un procedimiento específico aún no habilitado; no se afirma una exclusión de menores de la organización.

El servidor genera folio, fechas y estado, registra consentimiento autenticado, declaración y contenido íntegro del aviso. Solo admite una solicitud activa por cuenta. La repetición de un envío devuelve la solicitud activa sin sobrescribirla.

El titular consulta el estado y las respuestas, revisa el aviso que aceptó, corrige mientras el expediente admite cambios y retira su solicitud activa. El cierre de recepción no bloquea consulta ni retirada. Un aviso cambiado impide incorporar datos nuevos bajo la prueba anterior. No se amplía la conservación por una corrección.

En `/admin?section=incorporaciones`, administración busca, filtra y pagina solicitudes; revisa antes de aceptar, responde dentro del expediente y agrega notas privadas. Cerrar requiere respuesta explicativa. Las solicitudes retiradas o cerradas no se reabren. Aceptar no otorga rol administrativo, coordinación ni militancia en el PAN. No hay envío de estas respuestas por email o WhatsApp.

## Datos y seguridad

- Nuevas tablas D1 `membership_applications` y `membership_events`, con migración y borrado en cascada.
- API propia filtra por correo autenticado y caducidad; responde 404 ante un expediente ajeno.
- Permiso administrativo separado; editores y moderadores no tienen acceso. La escritura comprueba que la delegación siga vigente dentro de la operación.
- JSON acotado, origen y tipo de contenido comprobados, catálogo validado y límites por cuenta. Correcciones idénticas no crean historial.
- Actualizaciones con versión; historial ligado atómicamente al cambio. No se copian datos de estos expedientes al registro general de auditoría, que carece de ese mismo plazo de conservación.
- Respuestas personales y páginas autenticadas tienen `private, no-store`. El historial utiliza páginas de 50 entradas.
- Los registros vencidos desaparecen de consultas y operaciones, y se eliminan con sus eventos mediante la purga. Existe un manejador programado, pero no se ha verificado un disparador periódico de producción. La purga protegida está disponible en el panel.

## Interfaz y movimiento

Mapa conceptual de seis nodos, ligado a la comisión; guía de pasos con controles HTML. Three.js se carga al aproximarse a la sección, renderiza a demanda y dispone recursos al desmontarse. Respeta movimiento, datos y transparencia reducidos y contraste alto. SVG permanece como alternativa sin WebGL. No usa geolocalización ni publica puntos de personas.

Reglas adaptables para móvil y tableta; las comisiones usan pestañas horizontales en pantallas pequeñas y el registro coloca la guía compacta sobre los campos. Los botones de seguimiento permiten salto de línea; correos y notas largos se ajustan. El formulario requiere JavaScript.

En navegador de vista previa se verificaron selección de comisión, pasos, revisión, vuelta atrás conservando campos, recepción deshabilitada, desplegables y presentación de conversación. Las ocho imágenes de portada, trayectorias y referencias cargaron al abrir su sección. No hubo desbordamiento horizontal en la ventana revisada. Se corrigió la interferencia del CSS legal con el formulario.

El navegador disponible no permite validar aquí el renderizado acelerado WebGL ni una batería real de dispositivos físicos. Se verificó su alternativa SVG; no se asegura un rendimiento de 120 Hz ni equivalencia con el servicio Higgsfield.

## Pruebas y límites de la entrega

50 pruebas aprobadas sobre el Worker compilado y SQLite aislado, incluidas ocho nuevas de incorporación. Cubren consentimiento, identidad del servidor, duplicados, configuración antigua, aislamiento de cuentas, roles, revisión, respuestas/notas, constancia, correcciones, cambios de aviso, retirada, revocación y escritura concurrentes, paginación y conservación. También siguen pasando los módulos previos de agenda, contenidos, imágenes, solicitudes y seguridad.

No se insertaron personas ficticias en la base publicada. Las identidades de prueba existen únicamente en la prueba local. No se completó una sesión real de solicitante o administrador en producción. La apertura depende de completar la identidad y régimen del responsable, su domicilio, medio y procedimiento de derechos, versión aprobada y plazo en el panel; no se inventaron esos datos.

La plataforma continúa alojada en Sites con infraestructura Cloudflare e identidad de ChatGPT. No se ha realizado una migración a cuentas propias ni una integración de afiliación oficial PAN. Fotografías específicas de comisiones y perfiles podrán sustituirse cuando existan materiales autorizados; no se presentan imágenes de archivo como integrantes del equipo local.

## Fuentes jurídicas y técnicas

La investigación anterior de X, Reddit, foros, WAI, Motion y Three.js se conserva en [investigacion-afiliacion.md](investigacion-afiliacion.md) y [motion-research.md](motion-research.md), con sus límites de acceso. No se afirma haber leído publicaciones de X que no fueron accesibles.

Se verificaron nuevamente las normas oficiales vigentes para definir configuración y prueba del consentimiento:

- [LFPDPPP](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf), arts. 8, 12 y 15–16: consentimiento sensible, proporcionalidad y aviso cuando opera un particular.
- [LGPDPPSO](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf), arts. 14–15 y 19–22: consentimiento, representación y aviso cuando opera un sujeto obligado.
- [Código Civil Federal](https://www.diputados.gob.mx/LeyesBiblio/pdf/CCF.pdf), art. 646: referencia de mayoría de edad para el procedimiento directo, no regla de admisión de la organización.
- [Estatutos PAN 2026](https://ine.mx/wp-content/uploads/2026/05/INE-DEPPP-Estatutos-PAN-INECG176-2026.pdf), art. 9: medios autorizados y verificación del Registro Nacional de Militantes.

El contenido del aviso debe ser confirmado por el responsable real. La revisión técnica y documental no acredita por sí misma representación institucional ni una autorización legal del PAN.
