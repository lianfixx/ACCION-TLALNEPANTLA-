# Revisión del pedido de comisiones

6 de octubre de 2026. Revisión del texto citado por la persona propietaria, contrastado con páginas, formularios, API, base de datos y documentos de apoyo.

## Resultado

El espacio de trabajo está construido y conectado. La revisión inicial corrigió la desconexión entre carga y seguimiento. La revisión adicional detectó que aún se podía confirmar sin vincular un comprobante, que retirarlo no invalidaba la revisión y que un expediente podía afirmar que tenía documento después de vencer el archivo. Se corrigieron estos tres puntos y se separó el comprobante de afiliación del acuse de un trámite pendiente. La conservación para futuras generaciones tiene un límite que sigue pendiente de definir; la activación personal y la prueba interactiva de producción no se sustituyen con pruebas automatizadas.

## Requisitos contrastados

| Pedido | Implementación comprobada | Alcance y límite |
| --- | --- | --- |
| Eliminar las flechas decorativas | No aparecen los caracteres de flecha pedidos en el código de las páginas, componentes, estilos o texto extraído de las guías | Los nombres de teclas de navegación no son iconos visibles |
| Explicar y separar las comisiones | `/comisiones` presenta seis áreas con propósito, tareas, entregables, coordinación, autorizaciones y guías PDF independientes | Los formularios comparten una base y muestran las instrucciones de la comisión elegida |
| Usuario, contraseña y estatus | `/crear-cuenta`, `/ingresar`, `/participacion` y `/mi-comision` conectan cuenta, solicitud, folio y respuestas | El registro es interno. No acredita por sí solo afiliación oficial ni verifica automáticamente la identidad |
| INE, domicilio y documentos | Mi expediente permite adjuntar INE por ambos lados, comprobante y documento de afiliación en almacenamiento privado | Es un segundo paso con consentimiento propio. El sistema no obliga a completar los tres documentos antes de que administración acepte una solicitud |
| Evidencias, consultas y autorizaciones | Las actividades tienen documentos, conversación, versiones y cambios de estado revisados en servidor | Solo acceden las personas autorizadas; los borradores no se comparten con el equipo |
| Formato de Evento y espacios | Formulario, PDF de apoyo, vista imprimible, horario y confirmación administrativa | Detecta traslapes del mismo nombre de lugar dentro del sistema. No reconoce nombres alternativos de una sala ni consulta calendarios externos del Comité |
| Equipo por comisión | Administración asigna coordinación y accesos; coordinación añade personas con incorporación aceptada | Añadir a un equipo no afilia a otra persona al PAN ni entrega su INE al coordinador |
| Afiliación oficial por la app | Instrucciones compartidas, enlaces a la app y portal, acuse o folio de trámite, comprobante de afiliación y apartado Afiliación PAN del panel | El trámite y la comprobación siguen siendo externos y personales. No existe una API de sincronización implementada con el PAN |
| Documento de afiliación identificado en el panel | La carga recibida crea o actualiza el seguimiento y lo deja en revisión, sin otro envío obligatorio | La comprobación se vincula a un archivo de esa persona. Un documento nuevo exige revisión; retirar, corregir o vencer el comprobante utilizado impide seguir presentándolo como comprobado |
| Reporte mensual | Formulario por mes con resultados, equipo, recursos y siguientes tareas, más revisión y documentos | Los resultados los declara el equipo y los revisa administración |
| Entrega a la siguiente generación | Formato de entrega, archivo compartido y cambio de responsable con historial | Cumplimiento parcial. Actividades, reportes y entregas vencen a los 365 días desde su creación; transferirlos no reinicia ese plazo. La vista imprimible no empaqueta sus anexos |
| Panel administrativo por comisión | `/admin/comisiones` separa Actividades, Expedientes, Equipo, Afiliación PAN y Archivo, con filtro de comisión | Requiere una cuenta administrativa activa; no basta con registrarse como integrante |
| Bienvenida más natural | Se eliminan el salto de línea impuesto, la cursiva parcial, las columnas y el listado separado de perfiles | Se conserva el sentido del texto aprobado, sin una sección nueva |
| Sin contenido adicional no pedido | Se contrastaron las secciones con las instrucciones visibles y se preservaron las aprobadas | Se aclara el cierre del contacto general para no confundirlo con el registro de incorporaciones |

## Correcciones del seguimiento PAN

Antes, el documento se guardaba, pero la persona tenía que pulsar otro botón para que apareciera el seguimiento en el panel. Si ya existía una confirmación, adjuntar un documento distinto no la invalidaba.

Ahora la recepción del archivo y el cambio de seguimiento se escriben en la misma transacción de base de datos. Una carga fallida o una sesión revocada no crea una revisión exitosa. El almacenamiento del archivo conserva su limpieza compensatoria porque base y almacenamiento no constituyen una transacción distribuida. La pantalla vuelve a consultar el seguimiento después de subirlo. El folio puede enviarse por separado cuando exista. Un documento nuevo tampoco puede durar más que el plazo vigente de su seguimiento; la fecha de vencimiento se muestra en el expediente.

## Verificación

Los resultados de compilación, análisis y pruebas de esta entrega se registran en [Operación de las comisiones](comisiones-operacion.md). Se utilizaron cuentas, bases SQLite y almacenamiento aislados para reproducir los casos, sin crear afiliaciones ni expedientes ficticios en producción.

La consulta de producción realizada a las 22:34 UTC del 6 de octubre devolvió las 20 tablas previstas y ninguna cuenta en `staff_accounts`. La consulta de errores de las tres horas anteriores no devolvió eventos. Ninguna de esas consultas demuestra por sí sola que una persona haya completado el recorrido.

Las siete guías y formatos tienen dos páginas y texto extraíble. La comprobación interactiva de navegador sigue pendiente porque no estaba disponible la herramienta de vista previa requerida por Sites. La revisión de código y las respuestas HTML no acreditan por sí solas la experiencia visual en móvil o tableta.

## Pendientes para declarar el servicio probado en uso

1. La persona propietaria debe completar su activación con el enlace privado entregado y elegir su usuario y contraseña. Después accede por `/ingresar` y gestiona cuentas en `/admin/cuenta`.
2. Completar una prueba interactiva del registro, carga, revisión y consulta con cuentas autorizadas en la publicación, incluidos móvil y tableta.
3. Definir con el responsable cómo conservar la memoria institucional más allá de 365 días. No se amplió por suposición la conservación de documentos personales, afiliaciones o evidencias.

## Enlaces oficiales comprobados

- El sitio oficial `https://pan.org.mx/` enlaza el portal `https://afiliacion.pan.org.mx/`.
- Se localizaron las fichas del PAN en Google Play y App Store enlazadas por el sitio. La descripción de App Store incluye la opción de afiliación.
- La consulta de lectura del portal de afiliación agotó el tiempo de respuesta. No se presenta como una prueba de funcionamiento ni como evidencia de caída del servicio. No se inició ningún trámite oficial.


## Revisión adicional del comprobante PAN

Se añadieron controles que la auditoría anterior no había acreditado. La compilación, comprobación de tipos, análisis de código y 131 pruebas automatizadas finalizaron sin fallos; siete regresiones nuevas cubren los casos de este apartado. Un administrador no puede confirmar con un folio, un acuse, una INE, un archivo de otra persona ni un comprobante vencido o pendiente de corrección. La decisión conserva el identificador del documento específico. No se automatiza su autenticidad ni se confunde el registro interno con una resolución del PAN.

La página Participa ahora enlaza directamente la pestaña de carga, conservando el destino al iniciar sesión. El texto explica qué presentar y qué hacer si la solicitud ante el PAN todavía está pendiente. La pantalla administrativa exige elegir el comprobante revisado, además de registrar la fuente y la respuesta.

Se verificaron las fichas de la app en App Store y Google Play. La descripción oficial de App Store incluye Quiero afiliarme, pero no permite afirmar que todas las personas reciban un archivo PDF con un nombre o diseño determinado. Los resultados de búsqueda del reglamento y de RNM fueron localizados, pero sus enlaces directos devolvieron errores; no se presentaron como normativa vigente íntegramente verificada ni se inventó un formato oficial. El documento solicitado en el sitio se define por su contenido y procedencia, no por un nombre supuesto.
