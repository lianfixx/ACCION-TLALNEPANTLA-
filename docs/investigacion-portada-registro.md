# Portada tridimensional y configuración del registro

## Diseño e implementación

La portada conserva el título «Tu talento puede mover Tlalnepantla» y los dos accesos existentes. Se retiran el párrafo secundario y la fotografía con el texto superpuesto «Lo que nos mueve / Encontrarnos. / Prepararnos. Hacer.». La composición se apoya en tipografía, espacio en blanco y una pieza abstracta azul. No representa un monumento, emblema oficial ni actividad real. Los retratos del archivo histórico conservan sus fotografías y se distinguen con superficies color hueso `#f3efe7`.

La pieza se construye a partir de un perfil Bézier asimétrico extruido y biselado, definido en el código del proyecto. Dos mallas comparten geometría: una superficie esmaltada azul y una segunda superficie de vidrio. No se incorpora un modelo externo, un video ni una textura descargada. La geometría tiene 2.748 triángulos; sus coordenadas y normales fueron comprobadas y permanecen dentro del volumen previsto por la cámara.

El motor Three.js ya forma parte del proyecto. Añadir React Three Fiber solo para esta pieza duplicaría mecanismos que pueden resolverse con el motor existente. El módulo de la escena se importa cuando el elemento se aproxima a la vista, después de que la composición vectorial inicial pueda mostrarse. React documenta el uso de importación diferida para separar el código que no es necesario en la primera presentación; aquí se aplica directamente en el efecto que monta el motor. [React, carga diferida](https://react.dev/reference/react/lazy).

## Movimiento y coste de dibujo

El movimiento depende del desplazamiento, del puntero de ratón y del botón «Girar». La cámara no reemplaza ni mueve los elementos de navegación. En dispositivos compactos se reduce la amplitud ligada al desplazamiento; el gesto vertical sigue perteneciendo al navegador. El control de giro es un botón nativo, utilizable con teclado y toque.

La escena dibuja mientras cambia una posición o termina de asentarse. Al alcanzar su objetivo deja de solicitar cuadros; también se detiene fuera de pantalla y cuando la pestaña queda oculta. Este patrón coincide con la invalidación bajo demanda descrita en la [discusión 1701 de React Three Fiber](https://github.com/pmndrs/react-three-fiber/discussions/1701). La [documentación de hooks del mismo proyecto](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/hooks.mdx) recomienda evitar actualizaciones de estado React dentro del bucle de dibujo. La implementación usa referencias mutables y amortiguación dependiente del tiempo.

El vidrio físico tiene un coste adicional. El [foro de Three.js sobre rendimiento de MeshPhysicalMaterial](https://discourse.threejs.org/t/adding-meshphysicalmatreial-to-create-a-glass-like-semi-transparent-material-drops-the-the-performance/29073) y la [discusión sobre transmission y draw calls](https://discourse.threejs.org/t/draw-call-and-triangles-amount-increases-when-having-a-physical-material-with-transmission/46663) permiten identificar ese coste, aunque sus cifras concretas corresponden a escenas y dispositivos distintos. La [discusión sobre objetos detrás del vidrio](https://discourse.threejs.org/t/objects-with-transmission-not-showing-objects-behind/47113) desaconseja suponer que apilar transparencias produce una composición física correcta.

Para esta escena se limita la densidad de píxeles a 1,25 en pantallas compactas y 1,5 en escritorio. El búfer de transmisión utiliza escalas de 0,35 y 0,5, respectivamente. Son decisiones de implementación, no mediciones de velocidad. No se emplean sombras dinámicas ni postprocesado. La [documentación de WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) confirma que reducir `transmissionResolutionScale` abarata ese pase y ofrece compilación previa de programas. En esta escena pequeña se utiliza `compile` una vez: evita que el sondeo asíncrono siga pendiente tras perder el contexto o sustituir un montaje. La escena libera geometría, materiales, mapa ambiental, observadores y listeners cuando se desmonta, y conserva el respaldo visual ante errores de dibujo.

En una [discusión original de Reddit sobre optimización de Three.js](https://www.reddit.com/r/threejs/comments/1fnr61p/is_there_a_way_to_reduce_lagoptimize_performance/), Edan Kwan describe decisiones de su propio proyecto: pocos materiales y mallas, sombras precalculadas y efectos elegidos con cuidado. Ese testimonio resulta útil como experiencia directa, pero no demuestra una tasa de cuadros para este sitio.

## Respaldo y accesibilidad

La portada contiene una representación SVG del mismo perfil desde el HTML inicial. Si WebGL no está disponible o se solicita menor movimiento, transparencia o consumo de datos, se conserva esa representación. No se bloquean el título ni los enlaces mientras carga el motor. La preferencia de movimiento reducido elimina las transiciones; no hay animación continua de fondo. El criterio concuerda con la [documentación de accesibilidad de Motion](https://motion.dev/docs/react-accessibility).

La altura de la ilustración se reserva con proporciones CSS. El cambio de SVG a lienzo ocupa la misma superficie y evita desplazar el contenido. La [guía de estabilidad visual de web.dev](https://web.dev/articles/optimize-cls) explica por qué reservar geometría resulta preferible a insertar contenido tardío sin espacio asignado.

El nuevo diseño mantiene dos columnas en escritorio y tableta; en móvil se apilan el texto y la pieza. Los tamaños del título, el ancho del gráfico y los espacios cambian de forma contenida. No se ha establecido una promesa de 120 Hz ni de rendimiento idéntico entre dispositivos.

## Fuentes de X y alcance de la evidencia

El [post de @artfclnoodles sobre interacción de cursor](https://x.com/artfclnoodles/status/2034294395864756304) apareció indexado, pero su apertura directa devolvió 403. Otra publicación de @0xca0a aparece embebida en el foro de Three.js citado. Esas referencias permiten localizar ideas, pero no constituyen una verificación directa de sus videos o implementación. Las decisiones técnicas se sustentan en documentación oficial, discusiones accesibles y el código propio. No se presenta la búsqueda como una revisión exhaustiva de X.

## Responsable y domicilio

La configuración identifica al **Partido Acción Nacional** como operador del registro, conforme a la instrucción recibida. El correo operativo de privacidad es **socios@millabogados.com**. Su designación no lo convierte por sí misma en el correo institucional de la Unidad de Transparencia.

El domicilio configurado es **Calle Metepec 33, colonia La Romana, Tlalnepantla de Baz, Estado de México, C.P. 54030**. La [convocatoria municipal de Acción Juvenil 2026](https://accionjuvenil.com/docs/estrados/TLALNEPANTLA%20PUB.pdf), página 6, identifica expresamente allí las instalaciones del CDM. El [directorio del PAN Estado de México](https://panedomex.org/portfolio/municipio-tlanepantla-de-baz/) aporta el código postal.

La conservación se fija en **90 días desde la recepción**, como plazo operativo para tramitar estas solicitudes internas sin mantenerlas indefinidamente. No es un plazo legal impuesto ni una garantía de suficiencia para todas las obligaciones del partido. La declaración de mayoría de edad y el consentimiento directo están confirmados; la autenticación del sitio no verifica documentalmente la edad.

## Aviso integral y recepción

La [Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf), reformada el 14 de noviembre de 2025, exige en su artículo 21 el fundamento del tratamiento y el domicilio de la Unidad de Transparencia. El artículo 22 permite un aviso simplificado que enlace al integral. La brevedad del formulario no justifica suprimir esos datos del documento completo.

El [marco normativo del IEEM](https://www.ieem.org.mx/transparencia2/fraccionI.php), actualizado el 9 de septiembre de 2026, mantiene la referencia a la ley estatal de 2017. Sus artículos 31 a 33 contemplan contenido integral y modalidad simplificada. El [aviso integral de afiliación PAN Edomex](https://panedomex.org/wp-content/uploads/2025/06/Aviso-de-Privacidad-Integral-de-Datos-Personales-de-la-Secretaria-de-Afiliacion-Afiliacion.pdf) publica como domicilio de su Unidad de Transparencia Boulevard Toluca 03, Fraccionamiento Industrial Naucalpan, Naucalpan de Juárez, Estado de México, C.P. 53370. Ese aviso es una fuente institucional; no sustituye el aviso específico de este registro interno.

Los datos de fundamento y Unidad de Transparencia no se han añadido a la configuración ni se muestran como campos vacíos en el aviso. La recepción continúa cerrada y el documento indica que está pendiente de completar. La solución disponible es conservar una explicación breve junto al formulario y colocar los requisitos completos únicamente en el aviso integral enlazado. Antes de abrir la recepción deberán quedar completos y aprobados el aviso y el procedimiento operativo de atención de derechos. Este registro no tramita ni acredita afiliación oficial al PAN.

## Comprobación técnica

TypeScript y compilación de producción completados. Pasaron 19 pruebas relevantes de renderizado y registro, incluido el bloqueo del canal con aviso incompleto. La revisión del navegador confirma eliminación del texto solicitado, disponibilidad del giro, retratos cargados con fondo hueso y ausencia de desbordamiento horizontal en escritorio. La geometría tiene coordenadas finitas, normales unitarias y dimensiones compatibles con la cámara. Una revisión adicional corrigió la propiedad del atributo de montaje y eliminó la espera asíncrona que podía sobrevivir a una pérdida de contexto.

El navegador de revisión no dispone de WebGL; se comprobó el respaldo SVG y sus controles. La apariencia de la escena acelerada y su rendimiento en dispositivos físicos no se han medido. La revisión de los cortes móviles se limita al código; no se atribuyen capturas de escritorio a una emulación de teléfono. Una prueba aislada comprueba que el registro partidario permanece cerrado si faltan los campos obligatorios, incluso cuando se solicita su activación.

## Referencias

Fuentes técnicas: documentación de [Three.js](https://threejs.org/docs/pages/WebGLRenderer.html), [React](https://react.dev/reference/react/lazy), [Motion](https://motion.dev/docs/react-accessibility) y [web.dev](https://web.dev/articles/optimize-cls); discusiones de GitHub, Reddit y Three.js enlazadas junto a cada hallazgo.

Fuentes institucionales y normativas: [Cámara de Diputados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf), [IEEM](https://www.ieem.org.mx/transparencia2/fraccionI.php), [PAN Estado de México](https://panedomex.org/nuestra-organizacion/transparencia-proteccion-datos/) y convocatoria municipal enlazada. Consulta y configuración realizadas el 11 de septiembre de 2026.
