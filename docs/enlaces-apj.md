# Enlaces APJ 2027 en el sitio

Construido el 16 de noviembre de 2026 a partir de la petición «Apartado Enlaces APJ 2027» de Emi (15-nov-2026). Sustituye al módulo del 12-nov-2026, que recibía la postulación dentro de la solicitud de comisión.

## Fechas

La convocatoria se abre y se cierra sola, por fecha, sin tocar el sitio.

| Momento | Hora de Ciudad de México | UTC |
|---|---|---|
| Apertura | lunes 23-nov-2026, 00:00 | 2026-11-23T06:00:00Z |
| Cierre | domingo 6-dic-2026, 23:59 | 2026-12-07T05:59:59Z |

Están en `lib/enlaces.ts`. Las variables de servidor `ENLACES_2027_OPENS_AT` y `ENLACES_2027_CLOSES_AT` existen solo para ensayar; en producción no se definen.

## Qué ve cada quien

- **`/enlaces`**. Antes de abrir, solo el título y «Convocatoria disponible el lunes 23 de noviembre» (administración ve la página completa como vista previa). Abierta, la convocatoria íntegra, el PDF y «Postularme». Cerrada, «Postulaciones cerradas». Con resultados, el bloque «Generación 2027» con los nombres autorizados.
- **Menú y portada**. La entrada «Enlaces APJ 2027» aparece solo con la convocatoria abierta o con resultados publicados. El sitemap la incluye desde la apertura.
- **`/cuenta/enlaces`** (con sesión). Aviso y consentimiento, formulario en una pantalla con guardado automático, documentos, envío con folio `ENL27-…`, edición hasta el cierre y retiro. Quien no tiene sesión pasa por `/ingresar` o `/crear-cuenta?destino=enlaces` y vuelve aquí.
- **`/admin/enlaces`** (solo administración). Lista con filtros, detalle con documentos, puntaje, estado, nota de entrevista, publicación de resultados y exportación.

## Reglas que aplica el servidor

- De 18 a 29 años cumplidos el día del cierre, contados con la fecha de nacimiento.
- Una postulación viva por cuenta. Quien retira la suya puede empezar otra mientras esté abierta.
- Para enviar hacen falta todas las respuestas, la carta de motivos (texto de al menos 200 caracteres o PDF), la carta de recomendación y la identificación (frente y reverso, o un PDF con ambos lados). Si la cuenta ya tiene su INE en Mi comisión, se reutiliza.
- Archivos PDF, JPG o PNG de hasta 5 MB, comprobados por contenido. La carta de motivos en archivo solo en PDF.
- Fuera de la ventana no se aceptan envíos, cambios ni archivos. Retirar la postulación sigue disponible.
- Puntaje único por postulación con los cuatro criterios de la convocatoria (30, 25, 25, 20). Lo captura administración (decisión de Emi: el comité delibera y él registra el puntaje acordado).
- Para marcar «Seleccionada» hace falta puntaje; en Comunidad, un mínimo de 60. Hay dos plazas por comisión y una por universidad o colonia. «Suplente» no tiene límite.
- La persona ve «Seleccionada», «Suplente» o «No seleccionada» solo cuando se publican los resultados. Antes ve «En revisión».
- Los resultados se publican a mano desde el panel, después del cierre, y solo muestran nombres de personas seleccionadas o suplentes que lo autorizaron, con nombre completo.

## Datos y conservación

- Tablas `enlaces_applications` y `enlaces_scores` (migración `0017_enlaces_2027`). Las cartas y la identificación viven en `commission_documents` con las categorías `motivation_letter`, `recommendation_letter`, `ine_front` e `ine_back`, en el almacenamiento privado.
- Cada postulación guarda el aviso aceptado (`enlaces-2027.1`) y la fecha del consentimiento. El aviso no menciona afiliación.
- Conservación: 90 días después del cierre (7-mar-2027). Seleccionadas y suplentes, hasta el 17-ene-2028. Al retirar una postulación se borran sus respuestas y sus cartas; quien no resulta seleccionado puede borrar sus documentos desde su cuenta cuando hay resultados.
- El borrado diario y el borrado de una cuenta incluyen las postulaciones.
- Cada acción queda en `audit_logs` con `entity_type='enlaces'`.

## PDF de la convocatoria

El PDF oficial no está en el repositorio (el repositorio es público y la convocatoria se publica el 23 de noviembre). Se guarda solo en el almacenamiento privado, se entrega por `/archivos/convocatoria-enlaces-apj-2027.pdf` y queda oculto al público hasta la apertura. Se sube o se reemplaza en Administración › Contenido del sitio › Documentos PDF.

## Límites

- El texto de la convocatoria está en `lib/enlaces-convocatoria.ts`. Cambiar las bases o las fechas requiere cambiar el código.
- El sitio no avisa por correo el horario de la entrevista ni el resultado. Administración puede escribir desde Personas.
- No se distingue titular y apoyo dentro de las dos personas seleccionadas de una comisión.
- El módulo se probó con datos sintéticos y reloj simulado. No acredita el funcionamiento en producción.
