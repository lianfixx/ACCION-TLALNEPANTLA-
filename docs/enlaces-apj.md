# Enlaces APJ en el sitio

Implementado el 12 de noviembre de 2026 a partir de «La ruta · Plan maestro y Formatos de Evento» (5-nov-2026). Diseño de referencia: lienzo «APJ · Enlaces APJ (diseño)» en Claude Design.

## Qué hace

- `/enlaces` presenta la convocatoria: requisitos, plazas por comisión, calendario, criterios de selección, compromisos y pasos para postularse.
- En la solicitud aparece la casilla «Quiero ser Enlace APJ de esta comisión». Al marcarla se pide, obligatorio, «Qué harías en tu primer mes» (20 a 700 caracteres), que es el criterio «Propuesta para el primer mes» de la selección. Desde el 13-nov-2026 sustituye a la antigua opción «Me interesa coordinar» con tres propuestas.
- En Mi comisión, quien se postuló ve «Cartas de Enlaces APJ» y entrega la carta de motivos y la de recomendación (PDF, JPG o PNG, hasta 5 MB). Se guardan como documentos privados del expediente, con el aviso y la conservación de la solicitud.
- Administración revisa las cartas en Comisiones › Enlaces APJ con el mismo flujo de documentos: «Archivo revisado» o «Pedir corrección», con respuesta para la persona.
- El perfil de la solicitud muestra «Postulación a Enlaces APJ».

Revisar una carta no acepta la postulación. La selección, las entrevistas y los resultados se registran fuera de este módulo.

## Cómo se abre y se cierra

En Administración › Configuración › Convocatoria Enlaces APJ:

1. Escribir el acuerdo del Comité que aprobó las bases: órgano, fecha y referencia. Ese texto aparece al final de `/enlaces`.
2. Marcar «Publicar la convocatoria» y guardar. Requiere el registro interno abierto.

Mientras está cerrada, `/enlaces` responde 404 al público y muestra una vista previa marcada como no publicada a las cuentas de administración. Tampoco se aceptan postulaciones nuevas ni cartas. Cerrarla después del 30 de noviembre detiene la entrega de cartas; lo recibido se conserva para revisión durante el plazo del aviso.

## Límites

- El texto de la convocatoria y las fechas del calendario están en `app/enlaces/page.tsx`. Si el Comité aprueba otras bases o fechas, hay que cambiar ese archivo.
- El sitio no comprueba el rango de 18 a 29 años ni la residencia en Tlalnepantla: el registro solo declara mayoría de edad. Lo revisan las personas evaluadoras.
- No hay cierre automático por fecha: se cierra desde Configuración.
- La prueba se hizo con datos sintéticos y en vista local. No acredita la publicación ni el funcionamiento en producción.

## Verificación del 12-nov-2026

`npm run typecheck`, `npm run lint` y `npm test`: 192 pruebas aprobadas, 5 de ellas nuevas en `tests/enlaces.test.mjs` (página oculta sin acuerdo, vista previa solo para administración, postulación rechazada con la convocatoria cerrada, cartas solo de postulantes y solo con la convocatoria abierta, configuración que exige acuerdo y registro abierto). Revisión visual de `/enlaces` en Chromium a 1280 px y en iPhone 13 emulado, sin desbordes ni errores de página.
