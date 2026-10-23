# Responsive y conversación — 11 de septiembre de 2026

## Cambios de esta entrega

- Las pestañas horizontales de comisiones dejan de heredar el ancho completo de escritorio.
- Tipografía móvil fluida, sin el salto de 72 a 48 px en el corte de 760/761 px.
- Tablet mantiene tres tarjetas de navegación con columnas que pueden encogerse. Los iconos vuelven a ser visibles también en móvil.
- Hasta 1024 px se eliminan las transformaciones de perspectiva que solapaban las tarjetas apiladas. Se conserva el revelado vertical suave y el diseño de vidrio.
- Mejor distribución del formulario, pasos, títulos y campos del panel; refuerzo contra textos largos y mínimos intrínsecos de los grids.
- Conversación de ejemplo con aparición de burbujas completas, indicador de escritura, pausa, vista completa y repetición. Se conservan todas las preguntas y respuestas aprobadas.
- La secuencia se detiene al cerrar el desplegable, ocultar la pestaña o salir de pantalla. Respeta movimiento reducido y cancela temporizadores y observadores al desmontarse.
- Las respuestas reservan su altura final; no hay desplazamiento automático. El contenido está presente en el HTML sin JavaScript y no se anuncia como una conversación real en directo.

## Referencias y decisiones

Se consultaron fuentes primarias de implementación y accesibilidad:

- [Motion: accesibilidad](https://motion.dev/docs/react-accessibility): adaptar efectos a la preferencia de movimiento reducido.
- [Motion: animación de layout](https://motion.dev/docs/react-layout-animations): evitar deformación de texto. Aquí se anima solo opacidad y un desplazamiento de 6 px mediante CSS; no hace falta añadir dependencias.
- [web.dev: optimización de CLS](https://web.dev/articles/optimize-cls): reservar geometría para las respuestas.
- [W3C: ARIA23](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA23.html): distingue el anuncio de mensajes nuevos en un chat. Esta FAQ guionizada conserva semántica de artículos y no emplea un log en vivo.

También se leyeron las discusiones originales de [burbujas CSS](https://stackoverflow.com/questions/66472149/css-bubble-chat-slide-up-animation) y [puntos de escritura](https://stackoverflow.com/questions/56212616/css-wave-animation-for-chat-messages) como referencias de patrones visuales. No se copió código de esos hilos. Los tiempos concretos son una decisión de diseño.

Las búsquedas en X y Reddit no permitieron verificar publicaciones pertinentes. No se atribuyen conclusiones a esas plataformas ni se afirma una investigación exhaustiva.

## Comprobación y límites

- TypeScript sin errores y prueba existente de preferencias de movimiento actualizada al corte de 1024 px, aprobada.
- Comprobación funcional en la vista previa: inicio de secuencia, pausa estable entre lecturas, repetición, vista completa y altura constante de las cuatro parejas.
- Revisión de escritorio a 1348 px: sin desbordamiento horizontal del documento; sin imágenes visibles rotas.
- Revisión estática de los cortes de 320 a 1024 px. El navegador disponible no expone cambio de viewport. El intento de revisar en un marco de ancho fijo fue bloqueado; no se cambiaron las protecciones del sitio. El archivo auxiliar se eliminó.
- No se afirma una prueba visual en teléfonos/tabletas físicos, Safari móvil o GPU WebGL. No se modificaron los flujos de autenticación ni se probaron nuevas solicitudes reales.

## Recepción pendiente

La configuración de producción no contiene una fila de `site_settings`. No hay datos del responsable ni aprobación del aviso. La recepción continúa cerrada.

Datos que debe aportar el responsable:

1. Nombre legal del operador y si actúa como particular/asociación o como el partido.
2. Domicilio que se publicará en el aviso.
3. Correo de privacidad y persona o área que atenderá solicitudes sobre los datos.
4. Plazo de conservación. El sistema admite de 1 a 365 días; ese rango es una restricción de la implementación, no un plazo legal prescrito.
5. Si opera el partido, fundamento de sus atribuciones y dirección de su Unidad de Transparencia.

Con esos datos se puede completar el procedimiento de derechos y la versión del aviso para revisión del responsable. La activación requiere aprobar ese aviso y el alcance de consentimiento directo para mayores de edad. No equivale a una afiliación oficial al PAN. El contacto general es una recepción separada y tiene su propia configuración.
