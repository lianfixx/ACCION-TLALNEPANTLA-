# Registro histórico de requisitos

El estado operativo y los límites comprobados al 6 de octubre de 2026 se documentan en [Operación de las comisiones](comisiones-operacion.md). Esa revisión registra acceso con usuario y contraseña propios, recepción interna abierta y 131 pruebas aprobadas en un entorno aislado. Distingue las pruebas automatizadas de la comprobación interactiva pendiente en navegador y de la activación personal de la cuenta administrativa.

El inventario siguiente conserva la revisión del 11 de septiembre y sus notas posteriores. Sus cifras de pruebas y referencias a recepción pendiente, acceso con ChatGPT o SSO describen esas revisiones anteriores, no el estado vigente. Las limitaciones que continúan abiertas deben consultarse en el documento de operación actual. Este archivo se conserva para rastrear las peticiones y los cambios.

# Requisitos y estado de la ampliación — 11 de septiembre de 2026

Fuentes contrastadas: solicitudes de esta conversación, el documento «Plan Maestro Acción Juvenil Tlalnepantla 2026–2027» y la guía «Sistema de Registro Luma y Google Forms». Las instrucciones posteriores del titular prevalecen sobre el nombre y el enfoque de los documentos antiguos. La guía de un evento específico no se convierte en un evento vigente sin fecha, sede y enlace reales.

## Revisión posterior de afiliación y textos jurídicos

La solicitud posterior de afiliación, mapa funcional y términos se contrasta en [Investigación de afiliación](investigacion-afiliacion.md). Un enlace oficial o el expediente de contacto no equivalen a un registro de incorporación. La petición posterior aclaró que se trata de incorporación interna; esa modalidad ya está implementada. Continúa pendiente identificar al responsable real para activar la recepción. Se añadieron términos de uso y se revisó la información de privacidad sin inventar datos del operador.

## Sitio y administración

| Requisito | Implementación / estado |
|---|---|
| Nombre e identidad | Acción Política Juvenil Tlalnepantla; marca PAN oficial azul, con eliminación visual del fondo mediante filtro. No se afirma una categoría jurídica de organización sin acreditación. |
| Textos y recorrido | Frase aprobada sin dos puntos; retirados los títulos numerados objetados y la identificación como Acción Juvenil nacional. «En marcha» conduce a páginas reales. Historia nacional identificada como referencia. |
| Imágenes | Archivos locales y manejadores actuales/heredados con alternativa cuando no existe optimizador. Revisiones de carga registradas en auditoria-funcional.md. |
| Minimalismo y móviles | Tipografías conservadas, detalles bajo demanda, navegación de teclado y reglas adaptables. Revisiones anteriores a 320/390/768/1024 px; no equivalen a dispositivos físicos. |
| Scroll y cristal | Motion y CSS para portada/navegación; módulo Three.js con tres anillos de volumen, transmisión y reflejos en el diagrama. Carga al acercarse a la sección, renderizado a demanda y alternativa HTML sin WebGL. El registro añade una escena de seis nodos sincronizada con la comisión y una guía HTML de tres pasos. No es una integración con el servicio Higgsfield ni garantiza 120 Hz. |
| Agenda | D1; borradores, publicación, cancelación, fechas de Ciudad de México, sede, enlace externo de registro y calendario ICS. Sin actividades inventadas. |
| Publicaciones y medios | Crear, editar, publicar, archivar; imágenes privadas por defecto, permisos, validación de formato/tamaño y protección de portadas. Selector de portada mediante búsqueda de imágenes públicas. |
| Roles | Administrador, editor y moderador; propietario configurado en servidor administra delegaciones y ajustes. La identidad de acceso la verifica Sites. |
| Listados completos | Búsqueda preparada, filtros y páginas de 25; conteos globales independientes del listado. Agenda, publicaciones, medios, opiniones, solicitudes, incorporaciones, roles y auditoría. |
| Comisiones | Seis áreas con propósito operativo, tres funciones y entregable. Pestañas con teclado y vínculo al registro con comisión seleccionada. No se inventan titulares, convocatorias ni tomas de protesta. |
| Registro interno | Formulario de tres pasos, cuenta autenticada, consentimiento explícito, folio, expediente privado, corrección, historial y retirada. D1; sin afiliación automática al PAN ni asignación de cargos o roles. |
| Panel de incorporaciones | Búsqueda, estados, paginación, respuestas visibles en la cuenta, notas reservadas, constancia del aviso, conflictos y revocación concurrente. |
| Configuración editable | Propietario guarda responsable, domicilio, correo de privacidad, versión de aviso, conservación y redes propias en D1, con control de revisión y auditoría. Los secretos permanecen en el entorno servidor. |
| Redes | Enlaces propios configurables, publicados únicamente cuando existen valores. Los destinos institucionales se distinguen de las redes propias. Faltan los perfiles reales de la organización. |
| Solicitudes | Estado, responsable autorizado, referencia, expediente con notas internas y borradores de respuesta. Historial y entradas paginados. Un borrador guardado NO envía correo ni mensaje. |
| Moderación y conservación | Opiniones y solicitudes vencidas no aparecen ni admiten modificación; entradas del expediente se borran con su solicitud. Existe purga manual protegida y manejador programado. La ejecución periódica requiere que el proveedor configure un disparador; no se acredita una programación de producción. |
| Concurrencia | Actualizaciones con versión; borradores conservados ante refrescos, rechazo de escrituras obsoletas, aviso al cambiar sección/búsqueda/página con cambios sin guardar. Asignación a administradores verificada en la escritura. |
| Auditoría | Escritura atómica con la operación, acceso administrativo y búsqueda; no almacena cuerpos privados de notas en el registro de cambios. |

## Lo que aún requiere intervención o una decisión real

- **Recepción pública**: contacto y comentarios siguen cerrados. Faltan datos reales del responsable, domicilio, correo de privacidad, versión aprobada del aviso y plazos de conservación. Contacto requiere además las claves y configuración de Turnstile. La configuración incluye ahora la apertura del registro interno cuando se completen responsable, régimen, derechos, aviso, conservación y consentimiento directo. No requiere modificar código. Contacto y opiniones conservan su activación independiente.
- **Redes y agenda reales**: hacen falta enlaces/perfiles, actividades y registros autorizados. No se completan con cuentas supuestas ni eventos demostrativos.
- **Envíos**: contacto guarda borradores. Las incorporaciones permiten respuestas visibles en la cuenta de su titular; no hay proveedor de correo/transporte conectado. No se enviaron mensajes a terceros durante las pruebas.
- **Independencia de alojamiento/autenticación**: continúa Sites, Worker, D1, R2 e inicio de sesión con ChatGPT. No se ha migrado a una cuenta propia de Cloudflare/Vercel ni sustituido el proveedor de identidad. El código está versionado; eso no constituye una migración terminada.
- **Respaldo y restauración**: no hay un proceso de backup y restauración integral de D1, R2 y configuración operado y probado en una cuenta externa. No se presenta exportar código como respaldo de los datos.
- **Registro de eventos**: la agenda admite un enlace real de Luma u otro registro. No se creó una cuenta, evento, integración de asistentes, check-in QR ni lista de espera para un evento inexistente.
- **Proyecto musical**: Spotify, donaciones, contrataciones de Vicente Diablo, cobros Stripe, lema de Oaxaca y sus variantes de idioma/tema corresponden al otro proyecto descrito en el historial. No se incorporaron a esta organización política ni se declaran cumplidos en este sitio.

## Verificación de esta ampliación

Resultado actualizado: 50 pruebas aprobadas. Las ocho nuevas pruebas del Worker comprueban el registro interno, consentimiento, aislamiento de cuentas, revisión y aceptación, corrección, aviso cambiado, retirada con recepción cerrada, revocación concurrente, historial y purga. La auditoría específica está en [Comisiones y registro interno](auditoria-comisiones-registro.md). La suite ejecuta el Worker compilado con SQLite aislado. Comprueba persistencia de ajustes, permisos de propietario, conflicto de revisión, uso público de la configuración, 107 publicaciones consultables, métricas globales, escape literal de búsqueda, expediente con 107 entradas, retención y revocación del responsable entre lectura y escritura. Las pruebas preexistentes cubren agenda, publicaciones, portadas, moderación, imágenes, límites y cabeceras.

El navegador de revisión tiene WebGL deshabilitado. Se comprobó que el diagrama permanece visible y funcional, pero no se pudo validar visualmente el renderizado WebGL. No se forzó otra configuración del navegador. Tampoco se completó una sesión real autenticada en producción ni un envío de contacto; las identidades de las pruebas están limitadas al proceso local de pruebas, no a una ruta de suplantación desplegada.
