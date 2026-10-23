# Revisión de retratos y acceso del equipo

12 de septiembre de 2026

## Cambios realizados

Las cuatro tarjetas recuperan su acabado blanco anterior. El fondo hueso se aplica dentro de cada fotografía. Los archivos originales se conservan y las versiones editadas se sirven como imágenes WebP locales. Los retratos se editaron con generación de imagen para sustituir el fondo, por lo que no son originales fotográficos sin intervención.

Se muestran centrados los nombres completos de Víctor Hugo Sondón Saavedra, Laura Angélica Rojas Hernández, Marko Antonio Cortés Mendoza y Felipe de Jesús Calderón Hinojosa. Se conservan las referencias y descripciones existentes.

La navegación de escritorio y el menú móvil incluyen «Acceso al equipo». El panel permite revisar incorporaciones, consultar su historial, responder, añadir notas internas y cambiar su estado según los permisos de cada cuenta. La aceptación interna no realiza la afiliación oficial al PAN.

Los textos de ayuda, validación y confirmación revisados usan instrucciones directas. Se quitaron los dos puntos de la prosa modificada. Se preservan los signos que forman parte de direcciones web, formatos técnicos y registros históricos de consentimiento.

## Primer acceso

1. Abre `/admin/ingresar`.
2. Despliega «Primer acceso o recuperar contraseña» y elige «Continuar con ChatGPT» con la cuenta propietaria autorizada.
3. En «Usuarios y contraseñas», elige una contraseña de entre 15 y 128 caracteres y guárdala. El correo mostrado será tu usuario.
4. En adelante puedes entrar con ese correo y contraseña.
5. Desde «Cuentas del equipo» crea los accesos necesarios y asigna sus permisos. Cada persona recibe un enlace privado para elegir su propia contraseña. Debes compartirlo tú por un medio privado. El sistema no envía correos.

Los enlaces duran 24 horas y solo se pueden utilizar una vez. Generar un nuevo enlace invalida la contraseña y las sesiones anteriores. Cambiar permisos o revocar una cuenta también cierra sus sesiones. La cuenta propietaria conserva la recuperación mediante su identidad autorizada de ChatGPT.

No se crearon contraseñas provisionales ni cuentas de producción durante esta revisión. El primer acceso real del propietario sigue pendiente. El inicio de sesión de solicitantes sigue utilizando ChatGPT.

## Seguridad y comprobaciones

Las contraseñas se guardan mediante scrypt con sal aleatoria, nunca como texto legible. Los tokens de sesión y activación también se almacenan como hashes. Las cookies son Secure, HttpOnly y SameSite Lax. Las sesiones vencen a las ocho horas o tras treinta minutos de inactividad. Hay límites de intentos, comprobación de origen, permisos en servidor, revocación de sesiones y registro de cambios.

Se añadió una migración para cuentas y sesiones. No se modificaron migraciones anteriores. Los cambios de credenciales y su auditoría comparten una transacción. La versión de credenciales impide reactivar sesiones antiguas tras un cambio de permisos. Si los permisos cambian durante una activación, el enlace queda disponible para reintentar.

Se verificaron compilación de producción, tipos y migraciones. Las 55 pruebas de la suite terminaron correctamente, sin casos omitidos. La suite usa el Worker compilado y bases SQLite aisladas. Cubre acceso y cierre de sesión, permisos, invitaciones, recuperación, revocación, expiración, conflictos simultáneos, fallos transaccionales, incorporación, seguimiento, agenda, contenido y controles de seguridad. Estos ensayos no equivalen a una sesión administrativa iniciada en producción.

Se inspeccionaron visualmente la portada y el acceso en el navegador disponible. Las cuatro imágenes cargan, los nombres quedan centrados y no hay desbordamiento horizontal en el tamaño comprobado. Se revisaron las reglas adaptables del nuevo acceso y sus controles táctiles. El navegador de revisión no permite cambiar el tamaño de pantalla ni tiene WebGL habilitado, por lo que no se afirma una prueba visual en dispositivos físicos o de renderizado 3D en esta entrega.

## Recepción pendiente de apertura

La recepción sigue cerrada. El panel muestra los requisitos pendientes y permite a la cuenta propietaria completar la configuración. No se marcaron como aprobados el aviso ni su procedimiento.

Se mantienen los datos proporcionados por el propietario para preparar el aviso

- Partido Acción Nacional como responsable
- Domicilio del Comité Directivo Municipal previamente configurado
- `socios@millabogados.com` como contacto indicado
- Conservación de solicitudes durante 90 días
- Solicitudes directas de personas de 18 años cumplidos o más

La instrucción anterior pidió omitir el fundamento y el domicilio de la Unidad de Transparencia. El artículo 21 de la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados exige esos elementos en el aviso integral. Un aviso breve puede remitir al integral, pero no sustituye su contenido obligatorio. No se ha interpretado el desarrollo técnico como una aprobación del aviso o de la competencia de una oficina concreta.

### Propuesta para revisión del PAN

**Fundamento propuesto**

Los artículos 2, incisos a), c) e i); 15, numeral 2, incisos a) y c); y 84, incisos c), e) y o), de los Estatutos del Partido Acción Nacional contemplan sus actividades de formación y organización, la atención electrónica a simpatizantes y las atribuciones municipales para integrar comisiones, aprobar actividades y establecer mecanismos de comunicación. Este registro se limita a recibir y dar seguimiento a solicitudes internas. No realiza el procedimiento de afiliación previsto en el artículo 9.

Esta referencia general requiere confirmar que el Comité ha autorizado la operación concreta del registro y a las personas que lo administrarán.

**Unidad de Transparencia propuesta**

La documentación publicada por el PAN Estado de México sitúa su Unidad de Transparencia en Boulevard Toluca número 03, Fraccionamiento Industrial Naucalpan, Naucalpan de Juárez, Estado de México, C.P. 53370. Es un domicilio estatal, distinto del domicilio municipal del responsable. El PAN debe confirmar que esta Unidad atenderá el registro y cómo coordinará las solicitudes recibidas en el correo indicado por el propietario.

**Procedimiento propuesto**

Puedes solicitar acceso, rectificación, cancelación u oposición ante la Unidad de Transparencia competente. Indica tu nombre, un medio para recibir notificaciones, lo que solicitas y, si lo tienes, el folio del expediente. Deberás acreditar tu identidad y, en su caso, la representación. La respuesta se emitirá en un máximo de veinte días hábiles, prorrogables una sola vez hasta por diez días mediante justificación y aviso. Si procede, el derecho se hará efectivo dentro de los quince días hábiles siguientes a la notificación.

Antes de abrir, corresponde confirmar la Unidad y el canal efectivos, incorporar el texto definitivo, asignar la versión del aviso y aprobarlo en la configuración. Los consentimientos anteriores conservan su texto y versión originales.

## Referencias verificadas

- [Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados](https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf), artículos 11, 12, 21, 22 y 43 a 46
- [Estatutos del PAN publicados por el INE en 2026](https://ine.mx/wp-content/uploads/2026/05/INE-DEPPP-Estatutos-PAN-INECG176-2026.pdf)
- [Aviso integral de expedientes de transparencia del PAN Estado de México](https://panedomex.org/wp-content/uploads/2025/06/Aviso-de-Privacidad-Integral-para-Expedientes-de-solicitudes-de-acceso-a-la-informacion-Transparencia.pdf)
- [Transparencia y protección de datos del PAN Estado de México](https://panedomex.org/nuestra-organizacion/transparencia-proteccion-datos/)
- [Reglamento de transparencia del PAN](https://ine.mx/wp-content/uploads/2021/03/deppp-reg-transparencia-PAN.pdf)
- [OWASP sobre almacenamiento de contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Biblioteca noble-hashes](https://github.com/paulmillr/noble-hashes)
- [Diario de Debates de la Cámara de Diputados con el nombre de Marko Antonio Cortés Mendoza](https://cronica.diputados.gob.mx/Debates/63/3er/1P/Ord/oct/01L63A3P120.html)
- [Congreso de España sobre Felipe de Jesús Calderón Hinojosa](https://www.congreso.es/en/cem/visitmexico2008)
