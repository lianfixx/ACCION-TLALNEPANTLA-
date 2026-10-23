# Operación de las comisiones

Actualizado el 8 de octubre de 2026.

## Accesos

- `/crear-cuenta` permite el registro personal de mayores de edad cuando está abierta la recepción interna. Reserva los correos administrativos, las cuentas existentes y los expedientes anteriores. Crear una cuenta no concede permisos de gestión ni verifica el correo declarado.
- `/mi-comision` comienza en Mi registro y Documentos personales. Al confirmar y habilitar la comisión aparecen Actividades, Mi equipo, Archivo y, al final, Afiliación PAN. Cada apartado puede abrirse directamente con `?tab=` y se conserva al recargar o volver atrás. La primera solicitud se completa en `/participacion`.
- `/admin/comisiones` requiere el permiso administrativo vigente. Los usuarios y las contraseñas se gestionan en `/admin/cuenta`.
- La recuperación de contraseña la realiza administración tras comprobar a la persona solicitante. No hay correo automático de recuperación.

## Incorporación y trabajo

1. La persona crea su cuenta y completa la solicitud interna. Conserva su folio y consulta las respuestas desde su cuenta.
2. Presenta documentos personales en Documentos personales tras aceptar el aviso específico. El consentimiento del registro inicial no se reutiliza para esa carga.
3. Administración revisa el perfil y los documentos, acepta la incorporación y habilita el acceso en Equipo. El botón Habilitar acceso al equipo abre directamente la comisión seleccionada. Esta habilitación abre el último paso de afiliación. La coordinación se asigna expresamente.
4. Los miembros activos pueden preparar eventos, consultas, reportes mensuales y entregas. Los borradores se reservan a su autor y administración; lo enviado se comparte con la comisión.
5. Administración responde, solicita ajustes o autoriza. Autorizar un evento exige confirmar el espacio y evita una segunda autorización que se traslape en ese mismo lugar dentro del sistema. Esa comprobación no consulta reservas realizadas fuera del sitio.
6. Las evidencias y respuestas permanecen junto a la actividad. La persona responsable registra su terminación y administración revisa el archivo.
7. Un nuevo equipo activo puede consultar el trabajo compartido de su comisión durante el plazo de conservación. Administración puede cambiar el responsable de un pendiente a otro integrante activo; el motivo y las personas del relevo quedan en la conversación. La entrega nunca incluye por defecto los documentos personales.

## Afiliación oficial

1. La afiliación es el último paso del registro. La cuenta debe tener una comisión habilitada; una solicitud enviada o aceptada sin acceso al equipo todavía no permite entregar documentos PAN ni registrar folios. El sistema comprueba esta condición en las escrituras y durante la carga de archivos. La revisión del perfil y documentos antes de habilitar la comisión corresponde a administración.
2. Con la comisión confirmada, la persona abre Afiliación PAN. Realiza el trámite en la app oficial desde Quiero afiliarme y vuelve para subir el comprobante. Si ya está afiliada, entrega su comprobante sin repetir el trámite. El sistema admite PDF, JPG o PNG de hasta 5 MB, incluido una foto legible del papel. El apartado secundario Mi trámite sigue en proceso permite guardar un folio o acuse mientras espera; eso no completa el último paso.
3. La carga aparece directamente en el panel de administración. Se distinguen Comprobante de afiliación PAN y Acuse del trámite PAN. El folio se puede guardar sin documento como seguimiento pendiente.
4. Administración abre el archivo, revisa su contenido y, para indicar Afiliación comprobada, elige el comprobante concreto, registra cómo lo comprobó y deja una respuesta. El servidor exige una comisión activa y que el archivo pertenezca a esa persona, corresponda a un comprobante de afiliación, siga disponible y no tenga una corrección pendiente. La comprobación de su contenido es humana. Ese resultado completa el último paso en Mi registro.
5. La persona ve el resultado, la respuesta, el archivo utilizado y el vencimiento del seguimiento. Un archivo nuevo exige revisión de nuevo. Si se retira o se pide corregir el comprobante utilizado, se invalida la comprobación y cambia la versión del expediente. Si vence o ya no está en la base, la consulta deja de mostrar Afiliación comprobada sin esperar a la depuración diaria.

Un acuse, un folio, la INE o una constancia de asistencia no bastan para marcar la afiliación como comprobada. Los comprobantes solo son consultables por su titular y administración, no por el resto de la comisión. La categoría que selecciona la persona no acredita autenticidad por sí sola.

Estas decisiones pertenecen al seguimiento interno. La página no emite constancias de afiliación, no afilia a otra persona y no declara una baja del PAN cuando se retira un archivo. No existe integración automática con la app o el Registro Nacional de Militantes; no se solicitan claves de esas plataformas ni se envían datos a ellas. La incorporación a una comisión y la revisión de afiliación siguen siendo procedimientos separados.

El folio y el plazo vigentes no se amplían por subir archivos. Los documentos nuevos se limitan al plazo de seguimiento vigente y, cuando corresponda, al vencimiento de la solicitud interna. La pantalla cuenta los archivos realmente vigentes, identifica el comprobante revisado y muestra el plazo del seguimiento; no afirma que exista un archivo cuando solo hay un folio.

## Documentos y conservación

- Los documentos personales se almacenan en un espacio privado separado de los medios editoriales. Solo su titular y administración pueden abrirlos.
- Las evidencias de actividades se comparten con los miembros activos de la comisión. Una coordinación no recibe acceso a identificaciones o domicilios del equipo.
- Se admiten PDF, JPG y PNG de hasta 5 MB. Se limita la frecuencia y hay un máximo de 60 archivos por cuenta. Se verifica el tamaño realmente recibido y la firma del formato. No se ofrece un servicio de análisis antivirus.
- Documentos personales y seguimiento de afiliación se conservan hasta 90 días. Un documento ligado a una solicitud inicial vence antes si vence la solicitud. Actividades y evidencias vencen a los 365 días desde su creación. El sistema muestra la fecha correspondiente.
- Estos plazos son decisiones operativas, no afirmaciones sobre los plazos legales del expediente oficial del PAN.
- La depuración diaria ya configurada elimina los archivos y conserva sus claves para reintentar cuando falle el almacenamiento. Lo vencido deja de ser accesible aunque su eliminación física esté pendiente. No se borra la clave antes del objeto.
- Las personas pueden retirar sus documentos. Para derechos ARCO se utiliza el canal y procedimiento del aviso vigente. La conservación institucional fuera de estos plazos requiere una decisión del responsable; descargar un reporte no modifica esa obligación.

## Documentos de apoyo

Hay seis guías, una por comisión, y un Formato de Evento en `public/documentos`. Cada actividad también tiene una vista privada imprimible para guardarla como PDF. Los documentos se generan mediante `scripts/build-commission-guides.py`.

## Correcciones de la auditoría

- La compilación usa el entorno Cloudflare configurado y elimina la salida anterior antes de construir. Así, las pruebas y la publicación no pueden reutilizar por accidente una entrada antigua del servicio.
- El navegador no puede fijar fechas futuras para ampliar la conservación. Las fechas se calculan en el servidor.
- Una coordinación no puede recuperar accesos retirados por administración.
- El cambio de responsable comprueba los permisos dentro de la escritura. Una petición ya iniciada por el responsable anterior no puede añadir mensajes o archivos a un borrador que ya no le pertenece.
- El consentimiento se compara con el aviso exacto aceptado, aunque existan versiones históricas con el mismo nombre.
- Cerrar nuevas incorporaciones no detiene el trabajo del equipo existente. Un aviso incompleto o una configuración que no pueda leerse sí impiden nuevos envíos.
- Las respuestas tardías de otra comisión no reemplazan el contenido seleccionado. Los formularios conservan su versión de edición mientras se actualizan otros registros.
- Los eventos utilizan la hora de Ciudad de México. Los borradores sin fechas muestran que siguen pendientes.
- La comisión elegida se conserva al crear una cuenta. Un integrante activo no recibe instrucciones para incorporarse de nuevo cuando vence su solicitud inicial.
- La primera activación distingue entre un usuario ocupado y un enlace vencido.

## Correcciones adicionales de formularios

- Un borrador de evento admite solo la fecha de inicio. Para enviarlo a revisión siguen siendo obligatorios el lugar y las dos fechas. Un presupuesto de cero ya no se rechaza.
- Los límites de tamaño permiten los textos admitidos por los formularios, incluidos acentos y otros caracteres Unicode. Se mantiene un límite de bytes verificado mientras llega la petición.
- El registro desde un mismo wifi admite grupos de personas. Conserva límites por red, sitio, correo y usuario, además del límite de cálculo de contraseñas.
- Los patrones HTML de usuario son válidos en navegadores actuales. El enlace para entrar con una cuenta existente conserva la comisión elegida.
- Ante un conflicto de edición se consulta la versión actual y se ofrece descartar el borrador de forma explícita. Un fallo temporal de consulta conserva el formulario y bloquea sus escrituras hasta recuperar la información.
- Si vence la sesión al enviar una solicitud, se puede entrar en otra pestaña y volver sin perder las respuestas. La cuenta debe ser la misma. El servidor rechaza datos de un formulario identificado con otra cuenta; los documentos y las operaciones de comisión tienen esa misma comprobación.
- Los archivos con formato válido se reconocen por su firma cuando el dispositivo no proporciona su tipo. Las imágenes editoriales aceptan peticiones sin Content-Length, verificando el tamaño real recibido. Su tratamiento seguro y privacidad inicial se mantienen.
- Publicaciones, agenda, imágenes, moderación, notas y configuración vuelven a comprobar la sesión y el permiso dentro de la escritura. Una revocación durante la operación impide guardar y no genera una auditoría de éxito. Una imagen cuyo registro se rechaza se retira del almacenamiento.
- La depuración manual comprueba el permiso vigente en cada operación. La limpieza programada conserva su ejecución propia. La base y el almacenamiento de objetos no constituyen una transacción distribuida; los archivos vencidos permanecen inaccesibles y se reintenta su borrado si el almacenamiento falla.

## Verificación de esta entrega

- Comprobación de tipos, análisis de código y compilación del servicio completados sin errores.
- 149 pruebas aprobadas en un entorno aislado con SQLite y el servicio compilado desde una salida limpia. Esta revisión recorre la creación de cuenta, solicitud, documentos, confirmación de comisión, acuse pendiente y comprobante revisado. Comprueba además la revocación de acceso durante folios, cargas y revisiones. La suite conserva las pruebas de registro, contraseña, consentimiento, actividades, reportes, relevo y permisos administrativos.
- Las páginas estáticas públicas y privadas y las diez secciones del panel devuelven HTML válido con sus archivos JavaScript y CSS presentes. Las rutas dinámicas se prueban con expedientes y actividades aislados. Esta comprobación no equivale a probar la interacción de los formularios en un navegador.
- Los ensayos de carga usan almacenamiento e imágenes simulados. Acreditan el tratamiento de la petición, permisos, metadatos y limpieza en el código compilado; no constituyen una carga humana de un documento real en producción.
- La base publicada tiene las 20 tablas esperadas. La configuración mantiene abierta la recepción, consentimiento directo y conservación inicial de 90 días. La consulta de errores recientes no devolvió eventos; por sí sola no acredita uso satisfactorio.
- Las siete guías y formatos PDF tienen dos páginas, texto extraíble y rutas locales en el sitio. Se inspeccionaron visualmente las catorce páginas después de actualizar las instrucciones y los nombres de los apartados.
- Las pruebas no crearon cuentas ni expedientes ficticios en producción y no realizaron trámites ante el PAN.
- No se pudo realizar la comprobación visual interactiva en navegador porque la herramienta de vista previa requerida no estaba disponible. Las reglas de adaptación a móvil y tableta están implementadas; queda esa comprobación visual de uso.
- Ninguna prueba acredita seguridad absoluta. No se afirma una auditoría externa de penetración, verificación documental automática o sincronización con la app del PAN.

## Activación pendiente

La consulta de producción del 8 de octubre de 2026 encontró cero cuentas en `staff_accounts`. No se crearon usuarios ficticios para alterar ese resultado. Se renovó el enlace privado de activación para entregarlo a la persona propietaria, que debe elegir usuario y contraseña y completar Guardar y entrar. El acceso posterior es `/ingresar` y la gestión de cuentas está en `/admin/cuenta`.

Las pruebas de activación se hicieron con claves aisladas de prueba. No sustituyen este paso personal ni prueban un inicio de sesión humano en producción. La cuenta propietaria no tiene recuperación automática por correo. La validación visual interactiva de móvil y tableta sigue pendiente porque no estaba disponible la herramienta exigida por el flujo de vista previa.

## Auditoría de conexiones y formularios

El detalle de los ocho problemas corregidos, las conexiones revisadas y los límites de comprobación está en [Auditoría de conexiones, paneles y formularios](auditoria-conexiones-paneles-formularios-2026-10-06.md). La conversación de actividades ahora permite recorrer todo el historial. El cupo global de registro cuenta altas efectivas, las operaciones de cuenta comprueban la identidad de la pantalla y los conflictos requieren revisar la versión vigente antes de reenviar. La lectura de producción también confirmó que el contacto general y las opiniones públicas siguen desactivados, independientemente de las incorporaciones internas.

La guía de claridad del 8 de octubre está en `auditoria-claridad-comisiones-2026-10-08.md`. La aceptación de la solicitud se muestra como Solicitud aceptada y no se confunde con la habilitación del equipo. INE y domicilio tienen su propia cola; acuses y comprobantes PAN se consultan únicamente en Afiliación PAN. Guardar un folio idéntico no reinicia una revisión ya confirmada.

El ajuste posterior convierte la afiliación PAN en el último paso, después de habilitar la comisión. Mi registro muestra el avance y requiere un comprobante revisado para completar ese paso. Retirar, corregir o vencer ese comprobante vuelve a dejarlo pendiente sin borrar la cuenta ni el perfil. El detalle está en `afiliacion-ultimo-paso-2026-10-08.md`.
