# Auditoría de funcionamiento y revisión de textos

Revisión del 5 de octubre de 2026 sobre la versión 28 y los cambios de esta entrega. Este documento actualiza los resultados anteriores para el registro, las cuentas y la publicación del encuentro. No certifica ausencia total de vulnerabilidades.

## Qué se encontró y corrigió

| Hallazgo comprobado | Corrección | Verificación |
| --- | --- | --- |
| Una sesión podía revocarse después de autorizar una petición de incorporación y antes de guardar | La misma operación SQL comprueba el token exacto, la cuenta activa, la versión de credenciales, la vigencia y la inactividad de la sesión | Ocho regresiones que revocan el token o deshabilitan la cuenta antes del batch, al crear, corregir, retirar y revisar. Ninguna modifica expediente ni historial |
| Una respuesta de actualización podía cambiar la versión utilizada por un borrador de corrección | La edición conserva su identificador y versión inicial. Los controles esperan a que termine de cargar el detalle | Revisión de estado cliente y pruebas existentes de conflictos de versión en el servidor |
| Una confirmación de retirada podía mantenerse al cambiar la solicitud seleccionada | La confirmación conserva identificador y versión. Se cierra al actualizar, seleccionar otra solicitud o abrir edición | Revisión del flujo cliente. No se presenta como prueba de interacción en navegador |
| Los seis pasos de coordinación podían quedar demasiado estrechos en móvil | Tres columnas, etiqueta debajo del número y ancho flexible hasta 760 px | Revisión del CSS. Pendiente comprobación visual en dispositivos |
| Tres rutas de iconos devolvían 404 en los registros de producción | Redirección al logo PNG incluido en el artefacto | Prueba de GET y HEAD para los tres alias y presencia del archivo publicado |
| El aviso de comentarios cerrados atribuía el cierre a un motivo que no siempre era cierto | Mensaje que indica únicamente que la publicación no recibe comentarios | Revisión de contenido y compilación |
| Next 16.3.5 figuraba en una alerta de seguridad | Actualización a 16.3.8 | Auditoría de dependencias de producción sin alertas conocidas |

La alerta de Next corresponde a [GHSA-vcvr-r3jv-pc5j](https://github.com/advisories/GHSA-vcvr-r3jv-pc5j). El sitio no usa la generación dinámica afectada de next/og; el hallazgo de dependencia no demuestra que el sitio haya sido explotable ni que sufriera un ataque.

## Publicación y lenguaje

La reseña «Nuestro encuentro en el Comité» conserva la fotografía original y explica el propósito y la preparación del encuentro. La atribución de la organización y los elementos de planeación proceden del contexto proporcionado por su organizador. Se distingue lo planeado de los resultados. No se añadieron cifras de asistencia, nombres de invitados presentes, intervenciones, testimonios ni acuerdos no confirmados.

Se aclararon las funciones de las comisiones, los resultados esperados y las instrucciones del registro. La toma de protesta sigue descrita como una ceremonia prevista cuya fecha e indicaciones están pendientes de confirmación. La incorporación interna no equivale a afiliación oficial al PAN ni a designación de una coordinación.

## Comprobaciones realizadas

- TypeScript y compilación de producción completados sin errores.
- 86 pruebas aprobadas sobre el Worker compilado y bases SQLite aisladas, sin fallos ni pruebas omitidas. Cubren autenticación, activación, roles, sesiones, solicitudes, publicaciones, imágenes, agenda y controles del servidor.
- `npm audit --omit=dev` devolvió cero vulnerabilidades conocidas. Su alcance son las dependencias de producción catalogadas, no una certificación de seguridad del sistema completo.
- `git diff --check` sin errores.
- Revisión de registros de producción limitada a los últimos 180 minutos. Se observaron los tres 404 de iconos; la muestra no permite afirmar que nunca haya habido otros errores.
- La foto publicada mantiene el archivo original proporcionado. No se insertaron participantes ni solicitudes ficticias en producción.

## Acceso y activación

La consulta autorizada de `staff_accounts` en producción devolvió cero cuentas. Por tanto, no se afirma que exista ya una cuenta propietaria operativa ni que se haya completado un acceso real al panel.

Se preparó un enlace privado para que la persona propietaria elija usuario y contraseña. Caduca a las 72 horas de su emisión y solo permite la primera activación. En el entorno se conserva la huella del código; el código y las credenciales no se guardan en este repositorio. La configuración nueva requiere el despliegue de esta entrega.

Después de activar su cuenta, la persona propietaria puede administrar las cuentas desde el panel. La página de acceso ordinario es `/ingresar` y el panel está en `/admin`. Cada solicitante utiliza una cuenta creada por la administración y consulta su expediente en `/participacion`.

## Límites que siguen vigentes

No hubo una comprobación visual nueva en navegador ni en dispositivos físicos. El entorno exige el control de vista previa indicado por Sites y esa herramienta no estuvo disponible; no se sustituyó por acceso automatizado a producción. Tampoco se completó una activación o solicitud real en producción. Las pruebas de acceso utilizaron cuentas aisladas.

La recepción inicial recoge estado y municipio; la entrega de INE y domicilio completo requiere un procedimiento documental posterior. No se almacenan esos documentos en campos libres. El sitio no realiza afiliación oficial ni verifica identidad civil. El tratamiento de datos y las designaciones deben seguir los procedimientos aprobados por el responsable.

Los comentarios y el contacto público conservan su configuración de producción. La revisión no activa servicios externos, cobros, correo automático ni funciones pertenecientes a otros proyectos mencionados en el historial.
