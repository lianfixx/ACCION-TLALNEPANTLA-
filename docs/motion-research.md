# Movimiento, cristal y rendimiento

La revisión inicial siguiente es histórica. La ampliación Three.js al final de este documento sustituye únicamente el controlador visual del diagrama; se mantienen los criterios de navegación, accesibilidad y scroll nativo.

## Revisión inicial — hasta la versión 14

La página de Acción Política Juvenil Tlalnepantla conserva su identidad y estructura: información, agenda, publicaciones y acceso a administración. Los efectos acompañan esas funciones. El desplazamiento sigue siendo nativo y los destinos son enlaces HTML. La recepción de solicitudes y los comentarios permanecen pendientes de activación por decisión del titular.

La implementación utiliza Motion 13.1.1, ya instalado, y transformaciones CSS. No incorpora otro motor de scroll, WebGL, lentes de refracción ni servicios externos. Esta elección responde al tamaño de la escena: una fotografía, un diagrama y tres superficies de navegación. No es una afirmación de superioridad universal de una librería.

## Evidencia técnica

### Desplazamiento y composición

Motion puede asociar una animación a la posición real del scroll y utilizar ScrollTimeline cuando el navegador y la animación lo permiten. Su documentación diferencia este comportamiento de iniciar una transición al entrar en pantalla; también documenta una función de cancelación. El seguimiento del objetivo utiliza su posición de layout, sin incorporar sus transformaciones visuales. [1]

Para esta página se mantienen transform y opacity como propiedades animadas. Motion y web.dev las identifican como opciones favorables para la composición. Los cambios de tamaño, espaciado o posición que alteran el layout requieren más trabajo; crear capas indiscriminadamente también consume recursos. No se añadieron reglas will-change globales. Estas guías orientan la arquitectura, pero no garantizan una tasa de cuadros en todos los dispositivos. [2][3]

El diagrama «La combinación que importa» ahora se entrega completo desde el servidor. El controlador de movimiento anima sus elementos con transformaciones completas. Se retiró de ese componente el seguimiento mediante estado de React y MotionValues. El texto central no depende de una animación de entrada para hacerse visible.

### Preferencias y tamaños cambiantes

MediaQueryList emite change cuando cambia la condición consultada. Leer matches únicamente durante el montaje deja sin atender cambios posteriores, por ejemplo al girar una tableta o modificar el tamaño de una ventana. [4]

El controlador escucha tres condiciones: movimiento reducido, ancho de hasta 1000 píxeles y disponibilidad de un puntero preciso con hover. Antes de reconstruir los efectos, cancela el grupo anterior y restaura sus estilos. Al salir de la página retira los listeners. La inclinación con cursor se limita a escritorio y deja de actuar cuando se utiliza el foco visible del teclado.

El trabajo del puntero se agrupa en una actualización por frame solicitado. La medición utiliza el contenedor estable, no la superficie que se está inclinando. Esto evita que la transformación visual modifique la referencia geométrica de la siguiente actualización. No hay un bucle permanente cuando el puntero está quieto.

### Cristal y legibilidad

WebKit describe backdrop-filter como una operación sobre el contenido posterior, seguida de filtrado y composición. Aunque puede aprovechar el hardware, requiere pasadas adicionales de renderizado. Su explicación de 2015 sirve para entender el mecanismo; no se utiliza como medición de un iPhone actual. [5]

La alternativa móvil conserva bordes y superficies claras, con un desenfoque menor: 8 píxeles en cabecera y portal, y 10 en las superficies sobre fotografías. Es un presupuesto de diseño adoptado para esta página, no un umbral universal publicado por WebKit. No se anima el radio del desenfoque.

Cuando el navegador comunica preferencia por menor transparencia o mayor contraste, las superficies pasan a un fondo opaco. Si no reconoce backdrop-filter, el portal conserva un fondo sólido legible. La preferencia de transparencia tiene soporte variable y se trata como mejora progresiva. [6]

## Casos publicados por desarrolladores

Los siguientes testimonios documentan experiencias de sus autores. No son benchmarks comparables, auditorías de conformidad ni pruebas de que un defecto histórico siga presente en las versiones actuales.

| Publicación | Evidencia y límite | Aplicación a esta página |
|---|---|---|
| dimonb19a, r/css: Liquid glass in CSS needs a fallback ladder. [7] | Explica su propia implementación de cristal y las diferencias al combinar CSS con filtros SVG. Reconoce que la detección sintáctica no garantiza el resultado visual y que retiró lentes en superficies grandes. Se leyó la publicación y las respuestas relevantes, incluidas las objeciones. La página muestra una fecha relativa; no se afirma una fecha absoluta. | Mantener un fondo legible como base; no introducir desplazamiento SVG sobre las tarjetas ni condicionar el acceso a que se dibuje una lente. |
| Saphkey, r/firefox: Inefficient rendering of backdrop-filter blur on Android. [8] | Describe tirones en barras fijas de YouTube móvil y publica el CSS con el que retiró el blur. Declara una mejora, sin trazas ni modelo de dispositivo. No probó Chrome personalmente. | Reducir el radio del filtro en la cabecera móvil y evitar aumentar la cantidad de superficies desenfocadas. |
| r/webdev: Mobile taps not working on 3D transformed card. [9] | El texto accesible informa que una ventana estrecha de escritorio no reproducía el fallo observado en teléfonos. No contiene una causa ni una solución confirmada. El autor aparece eliminado en la lectura final. | Distinguir revisión responsive de prueba táctil en hardware. Conservar enlaces nativos y no permitir que las capas decorativas intercepten el puntero. |
| Trayja_Peter, r/webdev: I made a 3D editor that models in pure CSS+HTML. [10] | El creador explica que cada pieza del modelo es un elemento HTML y reconoce límites severos de rendimiento en Safari para su editor. Se leyó su explicación y aclaraciones; no todos los comentarios del hilo. Es una escena mucho más compleja que este sitio. | Mantener una escena pequeña. CSS 3D no elimina por sí solo los costes de renderizado. |

El registro WebKit 79136 documenta un problema histórico de hit testing con perspectiva y figura resuelto. Justifica comprobar los elementos interactivos después de transformar una superficie; no permite describirlo como un fallo vigente de Safari. [11]

## Referencia de X y acceso incompleto

El resultado indexado de Jhey Tompkins enlaza un experimento sobre scroll y perspectiva 3D. La apertura directa del post devolvió un error. No se verificaron el video, el código vinculado, sus respuestas ni el funcionamiento móvil; por ello no se usa como evidencia técnica. [12]

El antiguo hilo de Webflow sobre perspectiva y backdrop blur redirige actualmente a una página general en la comprobación final. Se excluye de las conclusiones verificadas. Estas limitaciones impiden describir la cobertura de X y foros como una lectura exhaustiva publicación por publicación.

## Cambios y comprobación

| Cambio | Comprobación realizada |
|---|---|
| Preferencias de movimiento como estado vivo | Prueba automatizada con cinco ciclos de cambio de tamaño, movimiento reducido y tipo de puntero. Cada grupo anterior se destruye antes de crear el siguiente; al cerrar no permanecen listeners. |
| Diagrama visible desde el servidor | Renderizado HTML con los cuatro textos presentes. En navegador, los textos permanecen opacos y las matrices cambian al desplazar. |
| Animaciones agrupadas | La compilación anterior generaba 698029 bytes de JavaScript; la posterior, 628102. Con gzip individual por archivo, 220318 frente a 197229 bytes. Son totales de archivos JS del artefacto, no la transferencia inicial de una ruta ni una medición de velocidad de carga. |
| Fondo alternativo y blur móvil limitado | Reglas específicas para pantallas de hasta 1000 píxeles y preferencias de accesibilidad; se mantiene la geometría responsive previamente comprobada. |
| Integridad del sistema | La batería de pruebas existente sigue cubriendo agenda, permisos, datos persistentes, validación y rutas de imágenes. No se activaron contacto ni comentarios. |

La reducción de JavaScript es aproximadamente del 10 % sin compresión y del 10,5 % con la medición gzip indicada. No se declara una mejora equivalente de FPS o de tiempo de carga. La verificación no incluye un dispositivo físico iOS/Android, un ciclo autenticado de producción ni una certificación de 120 Hz.

## Fuentes

Consultadas el 11 de septiembre de 2026. Las fuentes sin fecha absoluta comprobada se identifican expresamente; las guías vivas pueden cambiar después de esta revisión.

1. Motion. [scroll](https://motion.dev/docs/scroll). Documentación oficial, fecha de publicación no indicada.
2. Motion. [Animation performance](https://motion.dev/docs/performance). Documentación oficial, fecha de publicación no indicada.
3. web.dev. [How to create high-performance CSS animations](https://web.dev/articles/animations-guide). Actualización indicada: 6 de octubre de 2020.
4. MDN. [MediaQueryList: change event](https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event). Referencia de API.
5. Brent Fulgham, WebKit. [Introducing Backdrop Filters](https://webkit.org/blog/3632/introducing-backdrop-filters/). 10 de agosto de 2015.
6. MDN. [prefers-reduced-transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency). Referencia CSS.
7. dimonb19a, Reddit/r/css. [Liquid glass in CSS needs a fallback ladder](https://www.reddit.com/r/css/comments/1u5kwvx/liquid_glass_in_css_needs_a_fallback_ladder/). Fecha relativa visible; fecha absoluta no comprobada.
8. Saphkey, Reddit/r/firefox. [Inefficient rendering of backdrop-filter blur on Android](https://www.reddit.com/r/firefox/comments/1glopvl/inefficient_rendering_of_backdropfilter_blur_on/). 7 de noviembre de 2024, según el enlace fechado de Reddit; el encabezado utiliza antigüedad relativa.
9. Reddit/r/webdev, autor eliminado en la lectura final. [Mobile taps not working on 3D transformed card](https://www.reddit.com/r/webdev/comments/1oc9qjk/help_mobile_taps_not_working_on_3d_transformed/). Fecha absoluta no comprobada.
10. Trayja_Peter, Reddit/r/webdev. [I made a 3D editor that models in pure CSS+HTML](https://www.reddit.com/r/webdev/comments/13nc54m/i_made_a_3d_editor_that_models_in_pure_csshtml/). Fecha absoluta no comprobada.
11. WebKit Bugzilla. [79136: Hit testing may be incorrect with perspective transforms](https://bugs.webkit.org/show_bug.cgi?id=79136). Registro histórico, estado resuelto.
12. Jhey Tompkins, X. [Experimento de scroll y perspectiva](https://x.com/jh3yy/status/1783654366110502952). Solo fragmento indexado; contenido completo no accesible. No sustenta conclusiones de compatibilidad o rendimiento.

[1]: https://motion.dev/docs/scroll
[2]: https://motion.dev/docs/performance
[3]: https://web.dev/articles/animations-guide
[4]: https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList/change_event
[5]: https://webkit.org/blog/3632/introducing-backdrop-filters/
[6]: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency
[7]: https://www.reddit.com/r/css/comments/1u5kwvx/liquid_glass_in_css_needs_a_fallback_ladder/
[8]: https://www.reddit.com/r/firefox/comments/1glopvl/inefficient_rendering_of_backdropfilter_blur_on/
[9]: https://www.reddit.com/r/webdev/comments/1oc9qjk/help_mobile_taps_not_working_on_3d_transformed/
[10]: https://www.reddit.com/r/webdev/comments/13nc54m/i_made_a_3d_editor_that_models_in_pure_csshtml/
[11]: https://bugs.webkit.org/show_bug.cgi?id=79136
[12]: https://x.com/jh3yy/status/1783654366110502952

Resultado de cierre: typecheck y compilación correctos; 25 pruebas automatizadas aprobadas. En la revisión visual, los centros de los tres enlaces 3D identificaron el destino correcto y la activación con teclado abrió la agenda.


## Ampliación del diagrama con Three.js

Se instalaron versiones exactas `three@0.186.0` y `@types/three@0.186.0`, comprobadas en los registros oficiales. El módulo se carga por importación dinámica al acercarse al diagrama. No forma parte del arranque de su HTML ni oculta etiquetas mientras carga.

La escena reúne tres [TorusGeometry](https://threejs.org/docs/pages/TorusGeometry.html), una [cámara ortográfica](https://threejs.org/docs/pages/OrthographicCamera.html) alineada al diagrama y [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) con transmisión. [RoomEnvironment](https://threejs.org/docs/pages/RoomEnvironment.html) y [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html) producen los reflejos. Son geometrías y movimiento definidos en el código del sitio, no un video ni una conexión a Higgsfield.

El ángulo depende del desplazamiento nativo. Se sigue el criterio de [renderizar a demanda](https://threejs.org/manual/en/rendering-on-demand.html): no hay un bucle permanente en reposo; se suspende fuera de pantalla y con el documento oculto. La densidad máxima es 1.25 en anchuras de hasta 1000 px y 1.5 en mayores. Se usa media resolución para transmisión y se liberan geometría, material, mapa y renderer al desmontar. Estos límites son decisiones de implementación, no mediciones de rendimiento.

Se comprueba disponibilidad de WebGL2 antes de construir [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html). Si no hay contexto, se conserva el diagrama HTML/CSS y no se repite el intento continuamente. Menor movimiento, transparencia reducida y mayor contraste omiten la capa WebGL.

El navegador de revisión informa GL_VENDOR y GL_RENDERER deshabilitados. La alternativa visible se verificó; la calidad visual de transmisión/reflejos y el rendimiento real GPU no se certificaron. Sigue pendiente la validación en hardware compatible, incluido iOS/Android. Las cifras de tamaño de JavaScript de la revisión inicial no describen esta nueva versión: el motor añade un chunk diferido.
