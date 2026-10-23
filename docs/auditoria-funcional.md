# Auditoría funcional — versión 14 · 11 de septiembre de 2026

Este documento registra la versión 14. La ampliación posterior, con Three.js, configuración editable y expedientes, se documenta en [Requisitos actuales](requisitos-activos.md).

Se contrastaron las peticiones aplicables a Acción Política Juvenil Tlalnepantla con el código, la vista de prueba y el estado de producción. Los requisitos de Vicente Diablo pertenecen al proyecto musical y no se presentan aquí como funciones implementadas. Solicitudes y comentarios continúan pendientes por decisión del titular.

## Resultado y correcciones

| Área | Resultado |
|---|---|
| Identidad | Nombre Acción Política Juvenil Tlalnepantla y marca PAN azul. La historia y fotografías nacionales están identificadas como referencias de Acción Juvenil. |
| Textos y estructura | Frase «Estudies…» sin dos puntos; retirados los encabezados numerados objetados y la identificación de esta plataforma como Acción Juvenil nacional. El recorrido se sustituyó por enlaces a agenda, propuestas y publicaciones. |
| Imágenes | Fotografías visibles cargadas en navegador, incluidas las que se muestran al cambiar pestañas o abrir referencias. Rutas locales incluidas en el artefacto y pruebas de sus manejadores. |
| Movimiento | Transformaciones CSS 3D vinculadas al scroll, inclinación por puntero y superficies con desenfoque. Preferencias de movimiento, transparencia y contraste atendidas. Investigación y límites en motion-research.md. |
| Navegación | Inicio, pestañas por clic y teclado, desplegable de referencias, agenda, Actualidad, Participación y Privacidad comprobados. Panel redirige al inicio de sesión. |
| Agenda | Creación, edición, borradores, publicación, cancelación, conflictos y calendario ICS probados con Worker compilado y SQLite aislado. Corregido el orden de actividades anteriores. |
| Publicaciones | Corregido error 500 al editar. Crear, publicar, editar, archivar y permisos comprobados con ejecución del Worker. |
| Concurrencia | Borradores conservan los datos y la versión con que empezaron; un refresco no les entrega el token de otra revisión. Formularios de publicaciones, solicitudes y agenda comparten esta protección. Cuatro intercalaciones verifican que publicar y privatizar una portada no dejen imágenes privadas en notas visibles. |
| Seguimiento y moderación | Corregidos errores 500 en actualizaciones y su auditoría; probados con registros sintéticos. Esto no activa la recepción pública. |
| Errores y presentación | Cargas fallidas se distinguen de listas vacías y registros inexistentes. Tarjeta sin portada utiliza todo el ancho. Títulos, cuerpos y lugares largos se ajustan sin ensanchar agenda ni publicaciones. |
| Enlaces | Sustituidos el PDF reglamentario y el enlace de afiliación que devolvían 404; actualizada Normatividad. Corregida la fuente mal asociada a 1989 y limitado ese texto a lo documentado. |

## Evidencia

- 36 pruebas automatizadas aprobadas. Incluyen pruebas conductuales nuevas, comprobaciones de renderizado, migraciones y controles de seguridad; no todas equivalen a interacción de navegador.
- Comprobación de tipos, lint, compilación y validación del artefacto.
- Vista de escritorio interactiva y 16 composiciones HTML estáticas de inicio, índice, detalle y agenda con marcos de 320, 390, 768 y 1024 px. El área útil se reduce por la barra de desplazamiento del navegador. Sin desbordamiento de documento; las pestañas móviles conservan su desplazamiento interno previsto.
- Producción: tablas de publicaciones y actividades consultadas, ambas vacías. No se añadieron registros ficticios. Sin eventos de error devueltos por la consulta del registro de las últimas 24 horas al iniciar esta revisión.

## Pendientes y límites

- Solicitudes y comentarios públicos siguen desactivados. La configuración del responsable, aviso, conservación y verificación antiabuso queda pendiente como se acordó.
- No se completó una sesión autenticada con la cuenta real en producción ni una carga real a R2/Images. La ruta de autenticación corresponde al servicio de hosting y no está servida por la vista local. Las pruebas del Worker usan identidades y almacenamiento sintéticos aislados.
- Una comprobación visual adicional del componente de edición fue rechazada por la política de URL del navegador de pruebas. No se intentó eludirla. Su modelo de conservación de revisión sí se comprobó automáticamente; no se declara ese recorrido visual como aprobado.
- No se probó hardware físico iOS/Android ni se certificaron 120 Hz. La implementación utiliza CSS 3D y Motion; no un motor Three.js ni una integración Higgsfield.
- El sitio continúa alojado en Sites y su autenticación utiliza ChatGPT. No se ha realizado una migración independiente a una cuenta externa de Cloudflare/Vercel. No hay selector de idioma ni de tema en este proyecto.
- El nuevo destino de afiliación está enlazado por PAN, pero su apertura directa agotó el tiempo de comprobación. Varios perfiles y artículos externos tampoco permitieron una comprobación completa; no se certifica la disponibilidad de terceros. El comunicado histórico de 2025 conserva atribución sin permalink verificado.

## Referencias corregidas

- [Normatividad oficial](https://accionjuvenil.com/normatividad) y [Reglamento de Acción Juvenil](https://accionjuvenil.com/docs/normatividad/2-REGLAMENTO-AJ.pdf), PDF accesible de 57 páginas.
- [PAN](https://pan.org.mx/) enlaza a [Afiliación PAN](https://afiliacion.pan.org.mx/welcome); destino oficial, acceso final no comprobado.
- [Manual de formación de liderazgos juveniles](https://es.slideshare.net/slideshow/lderes-juveniles-1/9394330), página 22. Documento atribuido a la Secretaría Nacional y alojado por un tercero; apoya elección y relevo de 1989.
