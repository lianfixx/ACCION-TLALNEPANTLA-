# Revisión final de formularios y paneles

Revisión focalizada del 9 de octubre de 2026. Se contrastaron los componentes y sus solicitudes con las validaciones del servidor. Este registro describe cambios de código; la compilación, las pruebas funcionales y la comprobación en navegador corresponden a la validación integrada de la entrega.

## Correcciones

- **Registro en móvil.** La cabecera de la comisión conservaba una columna de 90 píxeles de una composición anterior, aunque el mapa ya se ocultaba en pantallas pequeñas. Se eliminó esa restricción en el diseño móvil y se permitió que el nombre ocupe otra línea. Los pasos conservan su desplazamiento horizontal.
- **Solicitud aceptada y acceso al equipo.** La ficha administrativa afirmaba que faltaba habilitar el acceso incluso después de hacerlo. Ahora dirige al equipo de la comisión correspondiente para consultar su estado real. La ficha del participante remite al avance en Mi comisión.
- **Documentos antes del paso PAN.** Se incorporó `personalDocumentsReady`, calculado por el servidor sobre los tres documentos personales vigentes más recientes y revisados. El formulario PAN solo recibe archivos o folios cuando también existe una comisión activa. Si faltan documentos o revisión, se indica qué apartado abrir. No se alteran por ello las actividades ni el seguimiento PAN que ya exista.
- **Avance del perfil.** Una solicitud activa permite mostrar “Datos recibidos”. La mera existencia de un rol ya no se presenta como un perfil recién recibido; se identifica como registro previo.
- **Revisión PAN.** Al seleccionar la comprobación, el navegador exige tanto el archivo como la fuente de revisión. Ambos pueden omitirse al pedir una aclaración. Si no existe un comprobante apto, no se ofrece confirmar. El servidor conserva la validación final.
- **Impresión y conservación.** La vista de impresión aclara que el PDF contiene el formato. Los archivos adjuntos deben descargarse aparte y la conversación se consulta en la actividad. Esta indicación queda fuera de la impresión y no modifica plazos.

## Recorridos para la comprobación integrada

| Recorrido | Resultado esperado |
|---|---|
| Comisiones, participar e ingresar o crear cuenta | Conservar la comisión elegida. |
| Colaboración y coordinación | Tres pasos para colaboración; seis para coordinación, con tres propuestas. |
| Enviar solicitud y abrir Documentos personales | Recibir INE por ambos lados y domicilio, con su revisión identificada. |
| Aceptar solicitud e intentar habilitar sin los tres revisados | Explicar el requisito y conservar los datos del formulario. |
| Revisar los tres, habilitar equipo y abrir PAN | Mostrar las instrucciones y la carga del comprobante como último paso. |
| Guardar folio o acuse | Mantener el trámite pendiente; no marcar afiliación comprobada. |
| Confirmar PAN sin fuente o archivo seleccionado | Llevar a completar el campo correspondiente antes de enviar. |
| Retirar o sustituir documentos personales con una comisión activa | Dirigir a su revisión antes de una nueva carga PAN; conservar actividades y seguimiento anteriores. |
| Reporte o entrega de comisión | Abrir el formato para imprimir y descargar cada adjunto autorizado. |

## Alcance de los archivos

La vista `/mi-comision/documento/{id}` incluye los campos del evento, consulta, reporte o entrega, su estado y sus enlaces a archivos. Las descargas privadas conservan los controles de acceso y los plazos del expediente. Guardar la página como PDF no incorpora los bytes de sus adjuntos ni el historial de conversación. El archivo de la comisión continúa disponible durante el plazo vigente y puede consultarlo el siguiente equipo con acceso activo.

No se añadieron secciones públicas, flechas decorativas, integraciones externas, verificación de correo ni cambios de identidad visual.
