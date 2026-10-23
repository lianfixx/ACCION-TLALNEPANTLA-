# Comisiones, registro y memoria del encuentro

Actualización solicitada el 5 de octubre de 2026.

## Cambios realizados

- Se retira el diagrama de nodos señalado en la captura. La portada conserva fichas breves y enlaza a una guía de comisiones.
- La guía explica tareas, entregables, ejemplos, autorizaciones, participación, futuras designaciones y ceremonia dentro del Comité. No atribuye a una solicitud los efectos de una afiliación ni de un nombramiento.
- Se distinguen colaboración e interés en coordinación. Solo la segunda requiere experiencia y tres propuestas. Cada propuesta ocupa un paso y pide nombre, idea, primera acción, recursos, plazo aproximado y resultado.
- El registro inicial incorpora entidad, municipio, disponibilidad y actividad opcional. Requiere una cuenta propia entregada por administración. No incorpora copias de INE, CURP ni domicilio completo.
- La revisión documental se plantea como fase posterior en el Comité, cuando se definan los requisitos del trámite. La captura digital de esos documentos no se implementó ni debe darse por concluida.
- El perfil y las propuestas se guardan en el expediente, se consultan desde la cuenta titular y desde el panel autorizado. Los expedientes anteriores mantienen su aviso y consentimiento originales.
- El nuevo aviso se conserva íntegro con cada consentimiento. El cambio de aviso impide agregar datos nuevos a un expediente antiguo sin seguir el procedimiento indicado.
- Se publica una memoria fotográfica breve con la imagen original aportada. No se asignan nombres, asistencia real, horario ni resultados no verificados. Los documentos históricos contenían horarios incompatibles; la fecha mostrada corresponde a la publicación, no al encuentro.

## Publicación y administración

La primera edición vive en el código como contenido editorial expresamente solicitado. También aparece en la búsqueda, paginación y métricas del panel. El primer cambio autenticado la registra en la base de datos de forma atómica. Los siguientes cambios utilizan el flujo editorial normal.

El ID y el identificador de URL inicial están reservados. Archivar, convertir a borrador o renombrar la publicación no hace reaparecer la edición original. La fotografía original puede quitarse o sustituirse desde el selector de portada. Las lecturas públicas no escriben registros ni crean usuarios.

## Verificación

- Compilación de producción y comprobación de TypeScript satisfactorias.
- La ejecución general inicial pasó 74 de 76 pruebas. Dos expectativas de conteo se ajustaron porque ahora existe una publicación editorial real.
- La ejecución posterior de las áreas afectadas pasó 44 de 44 pruebas, incluida una prueba adicional de reserva de URL. Se verificaron autorización, titularidad, consentimiento, límite de cuerpos, proyectos condicionales, preservación de expedientes, concurrencia, archivado y rutas públicas.
- La migración 0011 añade una columna con valor vacío a los registros previos; una prueba verifica que no modifica su consentimiento.
- Se revisaron reglas adaptables, estructura HTML, enlaces y tipos. No se realizó inspección visual en navegador ni una interacción manual en dispositivos físicos. La herramienta control-browser requerida por el perfil de vista previa no estaba disponible.
- Las pruebas de cuentas y solicitudes usan bases temporales. No se crearon usuarios, contraseñas ni solicitudes de prueba en producción.
- La configuración de producción consultada mantiene el registro habilitado, conservación de 90 días y los datos institucionales previamente aprobados. No se modificaron secretos ni permisos.

## Fuentes de diseño y alcance de la investigación

Se leyeron las recomendaciones de formularios multietapa de W3C y revisión de respuestas de GOV.UK. Se aplicaron agrupación de campos, progreso visible, conservación de lo escrito entre pasos, etiquetas persistentes y acciones para volver a corregir.

- https://www.w3.org/WAI/tutorials/forms/multi-page/
- https://design-system.service.gov.uk/patterns/check-answers/
- https://design-system.service.gov.uk/patterns/question-pages/

Se consultó el contenido recuperable de un hilo de Reddit sobre accesibilidad de formularios como contraste de experiencia, no como fundamento técnico.

- https://www.reddit.com/r/accessibility/comments/16sjnqb/any_solid_guidelines_when_it_comes_to_forms_and/

Se revisó la legislación vigente de datos personales para el criterio de finalidad y minimización. La verificación técnica no sustituye la validación institucional del responsable.

- https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf

No se afirma una investigación exhaustiva de X, Reddit o foros. Esta actualización utiliza las dependencias ya instaladas; no se incorporan bibliotecas sin una función necesaria.
