# Auditoría de comisiones, formularios y afiliación

Revisión del 8 de octubre de 2026.

## Problema y resultado

La solicitud interna, la entrega de documentos y el seguimiento de afiliación aparecían mezclados. La aceptación de una solicitud podía interpretarse como acceso al equipo. El comprobante PAN se mostraba en dos apartados y el formulario seleccionaba por defecto que la afiliación ya estaba concluida.

Se separaron estos recorridos y sus permisos. La página de Comisiones reúne las seis opciones en una lista desplegable, con tareas, resultados esperados, guía y entrada directa a la solicitud de esa comisión. La propuesta de tres proyectos solo se pide cuando la persona quiere coordinar.

## Cambios comprobados

- El formulario confirma la mayoría de edad al comenzar. Sus pasos se llaman Tus datos, Tu comisión y Revisar y enviar; las propuestas aparecen solo para coordinación. Una propuesta repetida lleva a la respuesta que debe corregirse.
- Mi solicitud presenta el folio y el resultado. Solicitud aceptada no significa que la cuenta ya pueda gestionar actividades. Administración habilita ese acceso en Equipo con la comisión elegida.
- Documentos personales reúne INE por ambos lados y comprobante de domicilio. Afiliación PAN reúne únicamente acuses y comprobantes de ese trámite. Una coordinación no puede consultar los documentos privados de su equipo.
- El formulario PAN exige elegir qué se recibió. El acuse sirve para seguimiento pendiente; el comprobante debe acreditar una afiliación ya confirmada por el partido. No se presupone que la app entregue siempre un PDF con un nombre concreto.
- Adjuntar un documento lo envía a revisión sin un segundo envío. El folio es opcional. Guardar exactamente el mismo folio vigente no reinicia una afiliación comprobada; una versión desactualizada devuelve un conflicto.
- Los enlaces a los apartados sobreviven al inicio de sesión, la recarga y el historial del navegador. Las pestañas y los filtros admiten únicamente valores previstos.
- Los formularios evitan envíos duplicados mientras se guarda. Un borrador de actividad pide un título de al menos cuatro caracteres antes de enviarlo al servidor.
- En pantallas pequeñas, las pestañas, las columnas de documentos y los campos de equipo se reorganizan; el mapa decorativo del registro deja espacio al formulario. Estas reglas requieren todavía comprobación visual interactiva en dispositivos.
- Se actualizaron las seis guías de comisión y el Formato de Evento. Se revisaron visualmente las catorce páginas renderizadas y su texto extraíble.

## Verificación técnica

La comprobación de tipos y la compilación del servicio pasaron. Las 148 pruebas funcionales terminaron sin fallos, omisiones ni cancelaciones. Utilizan el Worker compilado, SQLite aislado y almacenamiento simulado. Incluyen cuentas, contraseñas, consentimiento, solicitudes, documentos, revisión administrativa, actividades, reportes, entrega al siguiente equipo y revocación de permisos.

Las regresiones nuevas comprueban la separación de colas y la privacidad entre cuentas, la conservación de la revisión ante un folio idéntico y los enlaces directos a los seis apartados. No se cambiaron tablas ni migraciones.

La lectura de producción encontró las veinte tablas esperadas, cero cuentas y ningún registro de auditoría. La recepción interna sigue configurada como abierta. Se renovaron únicamente el código de activación de propietario y su vencimiento, como secretos de ejecución. La cuenta administrativa sigue pendiente de que su titular elija usuario y contraseña. No se incluyen claves ni enlaces de activación en este documento.

## Fuentes y alcance de investigación

- PAN, [sitio oficial](https://pan.org.mx/) y [Registro Nacional de Militantes](https://rnm.mx/), para comprobar los enlaces institucionales.
- [App oficial en Apple](https://apps.apple.com/mx/app/partido-accion-nacional/id6749108433) y la ficha oficial de Google Play del desarrollador CEN PAN, para verificar la opción Quiero afiliarme y el origen de las aplicaciones.
- [GOV.UK, páginas de preguntas](https://design-system.service.gov.uk/patterns/question-pages/) y [controles de selección](https://design-system.service.gov.uk/components/radios/), para ordenar las preguntas y evitar respuestas sensibles preseleccionadas.
- [Discusión pública de GOV.UK en GitHub](https://github.com/alphagov/govuk-design-system/issues/1988), sobre problemas de contenido condicional.
- Se consultaron resultados indexados de X y Reddit relacionados con formularios progresivos y contenido desplegable. No fue posible leer íntegramente los hilos seleccionados. No se presenta esa búsqueda como una revisión exhaustiva ni como fundamento principal.

Las mejoras utilizan las herramientas existentes del proyecto. No se añadieron dependencias sin una necesidad funcional.

## Límites y puesta en marcha

La revisión administrativa del comprobante es humana. El sitio no inicia ni resuelve el trámite oficial, no emite constancias y no se sincroniza con la app PAN. El registro interno y la afiliación oficial permanecen separados.

Las pruebas no crearon cuentas, solicitudes ni documentos ficticios en producción. No prueban una carga humana contra el almacenamiento publicado, el recorrido completo dentro de la app PAN ni una sesión administrativa real. La herramienta de navegador exigida por el flujo de vista previa no estaba disponible; no se afirma una auditoría visual interactiva completa.

La puesta en marcha requiere que la persona propietaria active su cuenta con el enlace privado, entre al panel y acompañe un primer caso real autorizado. Ninguna prueba acredita seguridad absoluta ni sustituye una auditoría externa de penetración.
