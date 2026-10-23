# Cacomixtle de Tlalnepantla

## Integración vigente

A petición del propietario, la mascota se integra ahora como fondo de la sección «Tu talento puede mover Tlalnepantla». Se conserva la imagen aprobada, sin visor, botón de giro ni bloque separado en móvil. Su contenedor mide 520 px de ancho en escritorio, 420 px en tabletas y 340 px en móvil, limitado por la altura del inicio. La imagen tiene transparencia visual y un degradado lateral para acompañar el texto. No intercepta pulsaciones. Mantiene una entrada de 550 ms sin bucle y desactivada con movimiento reducido. `app/HeroMascot.tsx` es un componente de servidor y no carga la escena WebGL.

La descripción del visor 3D que sigue documenta la implementación anterior. Sus fuentes se conservan como antecedente y no se importan desde la portada.

Identidad visual incorporada el 12 de septiembre de 2026 por petición de Emi. Sustituye la pieza abstracta de la portada. Es una creación para este sitio; no se presenta como símbolo oficial del municipio ni del partido.

## Identidad anterior recuperada

Se recuperó la conversación del 18 de agosto de 2026 sobre el prompt maestro y se leyó completo el archivo **Mascota_Accion_Juvenil_Identidad_Maestra.md**. El original se conserva sin modificaciones.

Se mantienen la expresión serena, los ojos ovalados azul cobalto con pequeños reflejos claros, la sonrisa discreta, las extremidades redondeadas, las formas suaves y el carácter cercano. La petición actual autoriza cambiar de especie. Las branquias y la paleta coral/lila pertenecían al ajolote y no se trasladan a esta identidad.

## Nueva identidad

- Especie de referencia: cacomixtle (*Bassariscus astutus*).
- Silueta: orejas altas de puntas suaves, cabeza amplia, cuerpo compacto y cola larga con anillos anchos. La cola asciende a la izquierda del personaje, a la derecha del observador en la vista frontal.
- Rostro: ojos cobalto, nariz pequeña, sonrisa cerrada. Marcas claras junto a los ojos y dos detalles azules exteriores; sin antifaz completo de mapache.
- Colores del modelo: hueso `#f1eee5`, azul claro `#b6cce0`, cobalto `#193f7d` y azul profundo `#102950`.
- Material: acabado suave, satinado, con brillo contenido en los ojos. Sin contornos negros gruesos ni tipografía sobre el cuerpo.
- Detalle local: pequeño relieve escalonado inspirado en Tenayuca. Es una interpretación gráfica original, no una reproducción arqueológica ni una afirmación de relación histórica entre el animal y el templo.
- Vínculo con Acción Nacional: azul y blanco, en convivencia con el logotipo institucional que ya aparece en la cabecera. No sustituye el emblema del PAN.

No se asignó nombre propio ni se inventó una biografía. No se afirma que la especie sea exclusiva de Tlalnepantla.

## Referencias contrastadas

1. [La Sierra de Guadalupe, una fuente de biodiversidad en la Cuenca de México — Ciencia, Academia Mexicana de Ciencias, volumen 76, número 4, 2025](https://www.revistaciencia.amc.edu.mx/images/revista/76_4/PDF/08_76_4_1611_SierraGuadalupe.Pdf). La página impresa 42 sitúa la sierra en municipios que incluyen Tlalnepantla; la 46 incluye *Bassariscus astutus* y la 47 muestra una fotografía obtenida con cámara trampa. Es el fundamento local para elegir la especie.
2. [Tenayuca — Lugares INAH](https://lugares.inah.gob.mx/es/node/4465). Referencia del conjunto arquitectónico y sus cuerpos escalonados. El relieve de la mascota es una simplificación propia.
3. [Dispersión de semillas por Bassariscus astutus — Revista Mexicana de Biodiversidad, UNAM](https://revista.ib.unam.mx/index.php/bio/article/view/5351). Contexto biológico complementario; no se utilizó como prueba de ubicación en Tlalnepantla.
4. [BufferGeometryUtils — Three.js](https://threejs.org/docs/pages/module-BufferGeometryUtils.html) y [TubeGeometry — Three.js](https://threejs.org/docs/pages/TubeGeometry.html). Referencias primarias para combinar geometrías y construir curvas tridimensionales.

Se reutilizaron los criterios de rendimiento ya investigados para la portada en GitHub, Reddit y el foro de Three.js. La consulta anterior de X estuvo limitada al contenido indexado; el acceso directo devolvió 403. No se presenta como lectura exhaustiva de publicaciones ni de vídeos.

## Archivos e interacción

- `public/images/mascot/cacomixtle-tlalnepantla.webp`: imagen de referencia generada para esta petición; 1254 × 1254 px, transparencia, 140,044 bytes. La conversión a WebP conserva el diseño y reduce la descarga desde el PNG de 1,146,837 bytes.
- `lib/mascot-model.ts`: modelo original construido con geometría real, volumen completo y materiales Three.js. No es una imagen pegada a un plano. La geometría estiliza la referencia; no es una digitalización idéntica de su textura.
- `lib/hero-scene.ts`: movimiento leve según puntero/desplazamiento y giro de un cuarto de vuelta por pulsación. Renderizado a demanda, pausa fuera de pantalla y con pestaña oculta, resolución adaptada y liberación de recursos.
- `app/HeroSculpture.tsx`: imagen inmediata y control de giro. Si falta WebGL, falla el contexto o el usuario prefiere reducir movimiento/datos/transparencia, se conserva la imagen. En esa versión el botón cambia su inclinación; no muestra ángulos posteriores inexistentes de la imagen.

La composición de la portada, su texto y sus enlaces se conservan. Esta entrega no activa ni modifica la recepción de solicitudes ni el aviso de privacidad pendiente.

## Auditoría de esta entrega

- Geometría: 23,308 triángulos, tres mallas y tres llamadas de dibujo; coordenadas y normales finitas.
- Se detectó y corrigió la orientación de las caras de la cola. Una segunda revisión confirmó que sus normales apuntan hacia fuera.
- Se comprobó el encuadre durante una vuelta completa. Extensión conservadora máxima de 1.703 en X y 2.245 en Y, dentro de los mínimos de cámara de 2.05 y 2.28.
- Se inspeccionó una proyección de la geometría calculada por CPU para revisar silueta y posición de los rasgos. Esa imagen no equivale a una prueba de materiales con GPU.
- En navegador, la imagen cargó con sus dimensiones originales, no hubo desbordamiento horizontal en el ancho disponible de 1363 px y el botón de 44 px cambió de pose al pulsarlo.
- TypeScript y compilación de producción completados. Pasaron las diez pruebas existentes de HTML y rutas, incluida la comprobación de que todas las imágenes renderizadas existen en el artefacto publicable. Ninguna imagen rota en la página inspeccionada.
- El navegador de revisión no dispone de WebGL ni cambio de tamaño del viewport. Por tanto, no se afirma una comprobación visual con GPU ni una prueba real en teléfonos/tabletas. Se conservaron las reglas responsivas existentes, el espacio reservado para el control y las preferencias de accesibilidad.
