# Cierre de auditoría — 9 de octubre de 2026

Se contrastó la publicación 43 con las instrucciones de Emi y se integraron las correcciones de registro, documentos y comisiones que aún estaban pendientes de publicación. Esta revisión conserva contenido, identidad, audiencia y funciones. No modifica expedientes de producción ni crea cuentas reales.

## Correcciones comprobadas

- **Orden de incorporación.** Para habilitar inicialmente una comisión se exige solicitud aceptada y los tres documentos personales vigentes y revisados: INE frente, INE reverso y domicilio. El último documento de cada categoría determina su estado. La afiliación PAN solo recibe folio o archivos cuando los documentos están revisados y existe comisión activa. La condición se comprueba al guardar y al terminar cargas.
- **Comprobante PAN.** Folio y acuse mantienen un seguimiento pendiente. Completar el paso requiere comprobante específico, vigente, de la persona y revisión administrativa vinculada al archivo. La revisión del contenido es humana; el sitio no consulta el padrón ni realiza el trámite en la app del PAN.
- **Permisos durante consultas y cargas.** Se vuelven a comprobar sesión, cuenta habilitada, permisos, propietario y vigencia antes de devolver datos o finalizar operaciones. Se cerraron lecturas de solicitudes, historiales, panel administrativo e impresión que entregaban datos si se retiraba el permiso mientras cargaban. La revisión integrada también protege las lecturas de comisión, metadatos de archivos y vencimientos durante cargas.
- **Claridad.** El perfil, los documentos personales y el último paso PAN muestran su estado y siguiente acción. La ficha administrativa ya no afirma que falta habilitar un equipo después de hacerlo. Se corrigió una columna de ancho fijo en el registro móvil y se aclaró qué incluye la impresión de un formato.
- **Carga pública.** En una publicación, comentarios, cuenta y configuración se consultan en paralelo. Se conservan textos, imágenes y funciones. Las variantes de 500 px ya existentes para dos carteles suman 557,416 bytes frente a 3,533,758 de los originales; estos últimos se conservan. No se atribuye esa reducción al peso total de una página ni a mediciones de producción.
- **Documentos.** Se incorporaron las guías versión 1.1 y las bases con anexos para aprobación. Las instrucciones de los PDF coinciden con las pantallas. No se añadieron firmas, acuerdos, nombramientos ni una aprobación institucional inexistente.

## Evidencia de validación integrada

| Comprobación | Resultado |
|---|---|
| Compilación limpia y artefacto Worker | Aprobados |
| TypeScript y ESLint | Aprobados |
| Suite funcional completa | 179 aprobadas, 0 fallidas, 0 omitidas |
| Nuevas regresiones de lecturas privadas | 7 pruebas con 21 cambios de acceso, vigencia y propiedad; los casos de filtración fallaron contra el Worker anterior |
| Dependencias de producción, `npm audit --omit=dev` | 0 avisos conocidos en esta consulta |
| Recorrido D1/R2 aislado | Registro, solicitud, revisión de tres documentos, comisión, comprobante PAN, evento y espacio aprobados |
| Restauración en instancia aislada nueva | 21 tablas, 34 filas sintéticas, 4 archivos; sesiones previas invalidadas, nuevos accesos y claves foráneas correctos |
| Integración de trabajo previo | 29 archivos comparados por SHA-256; se excluyó el adaptador temporal de navegador |

La prueba de restauración se reproduce con `node scripts/audit-storage-local.mjs`, tras compilar. Su envoltorio de exportación/restauración solo existe en la prueba y no se publica. SHA-256 del Worker validado: `1cf0cbd61b82ae6f93950654c340d36eedbb61d197b0ba128e122cbdaf36ecb1`.

## Revisión de navegador

Se inspeccionaron en la vista local la portada, las seis comisiones y sus desplegables, el paso de Gobierno al registro conservando la selección, la solicitud recibida de una cuenta ficticia, el avance de incorporación, los documentos personales y su validación sin archivo. La cuenta participante no obtuvo acceso al panel administrativo. El aspecto observado en escritorio fue legible y sin defectos materiales en estas vistas.

La revisión utilizó la vista local con datos ficticios, no la publicación. No se completó una emulación independiente de móvil/tableta ni un recorrido visual de todas las pantallas administrativas. Las reglas adaptables y sus correcciones de código no sustituyen esa comprobación. Tampoco se dispone de una medición Lighthouse/Core Web Vitals en producción. El ensayo de consultas paralelas con latencia artificial comprobó solapamiento de las tres lecturas; no mide la experiencia de una conexión real.

## Pasos que requieren intervención real

1. **Primera cuenta.** La consulta de producción no encontró cuentas. El propietario debe completar el enlace privado de activación, elegir usuario y contraseña y realizar la primera operación real. El registro no verifica automáticamente el correo ni la identidad.
2. **Adopción del Comité.** La base y anexos están listos para revisión y aprobación. Faltan acuerdo, órgano y fecha, adscripción de APJ, personas facultadas y firmas; también el respaldo del tratamiento de datos, sus operadores y el alcance institucional de la afiliación solicitada. El documento editable contiene campos para resolverlos.
3. **Continuidad superior al plazo.** El relevo funciona dentro del plazo de conservación de 365 días de actividades y reportes. No es archivo permanente. La impresión guarda el formato, no los bytes de adjuntos ni todo el historial. Deben designarse repositorio, custodio y plazo institucional antes de conservar materiales fuera del sistema.
4. **Aceptación operativa.** Quedan la comprobación en dispositivos y la operación completa de participante y administración en producción tras la activación. La restauración local no certifica una restauración de infraestructura de producción.

Contacto general y comentarios permanecen cerrados según su configuración; el registro interno sigue habilitado. No se ofrecen como canales abiertos. No se afirma seguridad frente a todos los ataques, MFA, verificación automática de documentos ni antivirus. El resultado de dependencias corresponde al alcance de producción, no a todas las herramientas de desarrollo.

Este informe acredita las correcciones y pruebas enumeradas; no convierte pendientes personales o institucionales en resultados completados.
