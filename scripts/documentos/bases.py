# Contenido de public/documentos/bases-y-anexos.pdf.
# Cada bloque es una tupla; el tipo está en la primera posición (ver build-documentos.py).
# Las reglas de fondo vienen de la versión anterior de las bases (9-oct-2026), de
# docs/comisiones-operacion.md y de la decisión de Emi del 13-nov-2026 sobre Enlaces APJ.
# No agregues acuerdos, firmas, nombres, cargos ni fechas de aprobación: van en blanco.

TITULO = 'Bases de operación de las comisiones'
ESTADO = 'Versión vigente del 13 de noviembre de 2026.'

PORTADA = [
    ('p', 'Estas bases dicen qué hace cada comisión, cómo se incorpora una persona y cómo se proponen, '
          'autorizan y documentan las actividades. Sirven para que cada equipo sepa qué puede hacer y para '
          'que el siguiente encuentre el trabajo en orden.'),
    ('p', 'La base se conserva mientras siga siendo útil. Los anexos se llenan en cada periodo con responsables, '
          'proyectos, calendario y accesos. El Anexo F registra el acuerdo de aprobación cuando exista.'),
]

LINK = '<a href="{url}" color="#0043a1">{texto}</a>'

CUERPO = [
    ('h1', 'Alcance y funciones'),
    ('h2', 'Quiénes participan'),
    ('p', 'Pueden registrarse personas con 18 años cumplidos que actúan por sí mismas y participan por decisión '
          'propia. Al registrarse eligen una comisión y explican su interés, su disponibilidad y el apoyo que pueden '
          'dar. No se exige pertenecer a una universidad determinada.'),
    ('h2', 'Coordinación de cada comisión'),
    ('p', 'La coordinación se integra por la convocatoria Enlaces APJ: dos jóvenes por comisión, una persona '
          'titular y una de apoyo. Quien se postula lo indica en su solicitud y entrega una carta de motivos y una '
          'carta de recomendación. Las bases de la convocatoria, su calendario y la forma de evaluar las aprueba '
          'el Comité por separado.'),
    ('h2', 'Quién hace qué'),
    ('tabla', ['Función', 'Qué le corresponde'], [
        ('Comité Directivo Municipal', 'Aprueba estas bases y conserva las atribuciones institucionales que le correspondan.'),
        ('Personas facultadas', 'Revisan solicitudes o documentos y deciden sobre actividades y recursos dentro de sus facultades. Se anotan en el Anexo B.'),
        ('Administración del portal', 'Mantiene cuentas, permisos, expedientes y seguimiento conforme a lo autorizado.'),
        ('Coordinación de comisión', 'Organiza las tareas y los pendientes del equipo. Pide las decisiones que no le corresponden.'),
        ('Integrantes', 'Proponen, realizan las tareas autorizadas, atienden observaciones y presentan evidencias.'),
    ], [1.25, 3]),
    ('h2', 'Acceso según la función'),
    ('p', 'Cada persona usa su propia cuenta. La coordinación no tiene acceso a identificaciones, domicilios ni '
          'comprobantes de afiliación del equipo. Pertenecer a la comisión de Administración no habilita el panel '
          'administrativo; ese permiso se concede por separado. Cuando cambian las funciones, se revisan los permisos.'),

    ('h1', 'Funciones de cada comisión'),
    ('p', 'Cada comisión tiene además una guía de dos páginas con su primer mes, lo que debe confirmar, con quién '
          'se coordina y qué deja al relevo.'),
    ('tabla', ['Comisión', 'Funciones'], [
        ('Gobierno', 'Organiza foros, parlamentos y modelos de Naciones Unidas. Acuerda tema y objetivo, prepara el '
                     'programa, reparte la operación del encuentro y gestiona las invitaciones institucionales. Antes '
                     'de anunciar confirma con el Comité invitaciones, sede, presupuesto y permisos. Conserva programa, '
                     'asistencia total, acuerdos, gastos y compromisos pendientes.'),
        ('Administración', 'Organiza el registro interno y da seguimiento a solicitudes y autorizaciones. Revisa la '
                           'información asignada, identifica lo que debe aclararse y mantiene cada pendiente con '
                           'responsable y fecha de revisión. Prepara la revisión de eventos y registra la decisión de '
                           'quien tiene atribuciones para autorizar. El acceso a expedientes personales se concede '
                           'expresamente y por separado.'),
        ('Comunicación', 'Prepara carteles, textos y cobertura de las actividades. Trabaja con datos confirmados, '
                         'acuerda fechas de publicación y revisa nombres, horarios, sede y logotipos con el área '
                         'responsable. Comprueba los permisos de fotografías y testimonios antes de usarlos y cuida que '
                         'los materiales se lean bien en el celular. Los accesos a redes se transfieren con el '
                         'administrador de cada servicio.'),
        ('Cultura', 'Prepara encuentros y actividades culturales en Tlalnepantla: propósito, participantes, programa, '
                    'montaje y presupuesto. Confirma horarios, recursos y colaboradores antes de anunciar nombres o '
                    'comprometer pagos. Cuando usa obras, música, materiales o instalaciones de terceros, identifica la '
                    'autorización necesaria y quién la tramita.'),
        ('Tecnología e IA', 'Mantiene las herramientas digitales del equipo y propone mejoras para problemas concretos. '
                            'Prueba cada solución antes de modificar el servicio en uso. Los cambios de acceso, '
                            'tratamiento de datos, servicios de pago o publicación se validan con administración. Las '
                            'pruebas usan información ficticia o autorizada, y los documentos personales no se cargan '
                            'en servicios de IA sin autorización.'),
        ('Mujeres al frente', 'Organiza encuentros y documenta trayectorias de mujeres de Acción Nacional con '
                              'autorización de sus protagonistas. Confirma invitaciones, espacio y recursos, y pide '
                              'permiso para imágenes y testimonios. Puede canalizar solicitudes de orientación, pero no '
                              'sustituye a la Secretaría de las Mujeres ni a los órganos facultados para atender '
                              'procedimientos.'),
    ], [1.05, 4]),

    ('h1', 'Incorporación y afiliación'),
    ('h2', 'Cuenta y solicitud'),
    ('p', 'Cada persona crea su usuario y contraseña, completa su solicitud y elige una comisión. Consulta el folio, '
          'el estado y las respuestas desde su cuenta. Quien quiera coordinar se postula a Enlaces APJ desde la '
          'misma solicitud.'),
    ('h2', 'Documentos personales'),
    ('p', 'Después de la solicitud, la persona entrega su INE por ambos lados y un comprobante de domicilio en '
          'Documentos personales, con un aviso y un consentimiento propios. Puede ocultar consumos, saldos y números '
          'de cuenta del comprobante, y debe evitar datos de otras personas. Solo la persona y la administración '
          'autorizada pueden ver estos documentos.'),
    ('h2', 'Confirmación de la comisión'),
    ('p', 'Para confirmar o restablecer la comisión, administración revisa la solicitud aceptada, la INE por ambos '
          'lados y el comprobante de domicilio vigentes. Aceptar la solicitud no basta para habilitar el equipo. '
          'Esta revisión es interna y no verifica la identidad ante fuentes externas.'),
    ('h2', 'Afiliación al PAN, último paso y voluntario'),
    ('p', 'La afiliación es personal, libre y voluntaria, y no se pide para participar. Es el último paso del '
          'registro: se abre cuando la comisión está activa y los tres documentos vigentes están revisados. La '
          'persona hace el trámite en la app oficial con sus propias credenciales y regresa a Afiliación PAN para '
          'subir el comprobante; si ya está afiliada, lo entrega sin repetir el trámite. El paso se completa cuando '
          'administración revisa el comprobante. Nadie debe pedir la contraseña de la app oficial ni afiliar a otra '
          'persona en su nombre.'),
    ('p', 'Si después falta, vence o requiere corrección un documento personal, el paso de afiliación queda '
          'pendiente; la comisión ya activa conserva sus actividades. El Comité define el alcance de este paso y '
          'cómo se atienden los trámites pendientes.'),
    ('tabla', ['Lo que se entrega', 'Qué permite registrar'], [
        ('Folio o acuse del trámite', 'Que hay un trámite en curso. No completa el paso.'),
        ('Comprobante de afiliación', 'Administración revisa emisor, titular y alcance, y registra cómo lo comprobó.'),
        ('Comprobante de quien ya está afiliado', 'Su situación, sin pedirle que repita el trámite.'),
    ], [1.5, 3]),
    ('nota', 'Se aceptan PDF, JPG y PNG de hasta 5 MB. Si el comprobante se retira, vence o requiere corrección, deja '
             'de mostrarse como comprobado, sin que eso declare una baja ante el PAN.'),

    ('h1', 'Actividades y sus estados'),
    ('h2', 'Proponer'),
    ('p', 'Toda actividad empieza con el Formato de evento (APJ-F01), en papel o en Mi comisión › Actividades. Reúne '
          'objetivo, público, responsables, sede, horarios, programa, recursos, presupuesto, permisos y la forma de '
          'medir el resultado. Si no requiere dinero, se indica. El borrador puede trabajarse antes de enviarlo; la '
          'respuesta dice qué se autoriza, qué falta ajustar o por qué no procede. Para una decisión puntual que no '
          'es un evento se usa Consulta o autorización, en la misma sección.'),
    ('h2', 'Estados'),
    ('tabla', ['Estado', 'Qué significa'], [
        ('Borrador', 'La propuesta se prepara; aún no se envía a revisión.'),
        ('En revisión', 'Se está valorando. No se anuncia.'),
        ('Con ajustes', 'Requiere correcciones. No se anuncia hasta que se autorice.'),
        ('Autorizado', 'Hay una decisión registrada. Revisa quién la emitió y su alcance.'),
        ('No autorizado', 'No puede realizarse en los términos presentados.'),
        ('Terminado', 'Se registró el cierre con sus evidencias.'),
        ('En archivo', 'Queda guardado para consulta del equipo durante su plazo.'),
    ], [1, 3.4]),
    ('h2', 'Espacios y recursos'),
    ('p', 'Pedir una sede o elegir una fecha no es reservarla: la confirmación del espacio se registra aparte. '
          'Cualquier cambio de fecha, lugar, costo o condiciones se somete a revisión antes de anunciarse. Compras, '
          'contrataciones y aportaciones requieren a las personas facultadas, y cada apoyo de transporte, alimentos o '
          'materiales se incluye solo si forma parte de la actividad.'),
    ('h2', 'Evidencias y reporte mensual'),
    ('p', 'Al terminar se registra qué se hizo, qué resultado tuvo y qué compromisos siguen abiertos, con materiales '
          'y acuerdos adjuntos a la actividad. Las evidencias no llevan identificaciones ni datos sensibles. Cada '
          'comisión entrega un reporte mensual breve con lo realizado, los recursos usados, los resultados y los '
          'pendientes (Anexo D). Los errores y las cancelaciones se registran tal como ocurrieron.'),

    ('h1', 'Privacidad y conservación'),
    ('h2', 'Qué datos se piden y cuándo'),
    ('p', 'La solicitud inicial recibe nombre, contacto, residencia general, comisión y disponibilidad. Los '
          'documentos de identidad, domicilio y afiliación se entregan después, en el espacio privado, y solo los '
          'ven la persona y la administración autorizada. Se pide lo necesario para cada revisión, sin copias ni '
          'datos excesivos.'),
    ('h2', 'Consentimiento'),
    ('p', 'La participación y la afiliación política pueden revelar datos sensibles. Su tratamiento requiere '
          'consentimiento expreso y por escrito, mediante firma o un mecanismo de autenticación admisible, salvo una '
          'excepción legal aplicable. El portal guarda el aviso, el texto aceptado y la fecha; el consentimiento del '
          'expediente es independiente del registro. Aceptar un aviso no permite publicar perfiles, imágenes o '
          'testimonios ni usar los datos para otros fines.'),
    ('h2', 'Responsable y derechos'),
    ('p', 'El aviso de privacidad vigente identifica al responsable, su domicilio y el canal para solicitar acceso, '
          'rectificación, cancelación u oposición. El Anexo B registra la versión del aviso, el área que atiende esas '
          'solicitudes y el instrumento que respalda la operación por terceros. El aviso integral y el simplificado '
          'deben coincidir con el tratamiento real.'),
    ('h2', 'Plazos de conservación en el portal'),
    ('tabla', ['Información', 'Plazo'], [
        ('Solicitud inicial e historial', '90 días desde la recepción. Corregir o revisar no reinicia el plazo.'),
        ('Documentos personales y seguimiento de afiliación', 'Hasta 90 días. Si están ligados a la solicitud inicial, vencen antes si vence ésta.'),
        ('Actividades, evidencias y reportes', 'Hasta 365 días desde la creación de cada registro.'),
        ('Cuenta y constancia de consentimiento', 'La cuenta, mientras se use; el consentimiento, mientras exista la cuenta. La cancelación se tramita por el canal de privacidad.'),
    ], [1.6, 3]),
    ('p', 'Al vencer, se bloquean la consulta y la descarga. La eliminación física ocurre después, en la depuración '
          'diaria, que reintenta si falla el almacenamiento. Administración comprueba que se ejecute.'),

    ('h1', 'Continuidad'),
    ('h2', 'Entrega de comisión'),
    ('p', 'La coordinación prepara la entrega al terminar su periodo y antes de que venza el primer material que '
          'deba entregarse. Reúne programas, materiales editables, resultados, acuerdos y pendientes (Anexo E), con '
          'versión, ubicación, responsable y fecha de revisión de cada archivo. Antes de entregar se retiran '
          'identificaciones, domicilios, comprobantes de afiliación, contraseñas y datos de asistentes que no hagan '
          'falta. Las cuentas oficiales se transfieren con su administrador por un canal privado.'),
    ('p', 'El archivo de la comisión en el portal dura 365 días. Para conservar materiales útiles después, el Comité '
          'designa un repositorio institucional, una persona custodia, quién accede y por cuánto tiempo. Quien recibe '
          'comprueba que puede abrir los archivos y lo anota.'),
    ('h2', 'Accesos y respaldos'),
    ('p', 'Administración revisa los permisos cada vez que cambia el equipo y retira los que ya no correspondan. Los '
          'respaldos se guardan en el medio autorizado, con acceso restringido y plazo propio, y su restauración se '
          'prueba antes de depender de ellos. El documento de seguridad reúne el inventario de datos y sistemas, '
          'funciones, riesgos, medidas pendientes, revisión periódica y capacitación, e incluye al operador del portal '
          'y a sus proveedores de infraestructura, con las condiciones para devolver o eliminar datos al terminar el '
          'servicio.'),
    ('h2', 'Incidencias'),
    ('p', 'Ante una pérdida o un acceso indebido, avisa a la persona designada en el Anexo B, limita el acceso '
          'afectado, conserva la evidencia y registra lo ocurrido. El responsable determina el alcance, corrige y hace '
          'las notificaciones que procedan a las personas afectadas y a la autoridad.'),
    ('h2', 'Cambios a estas bases'),
    ('p', 'La base se modifica por acuerdo del Comité; cada versión dice qué cambia y desde cuándo aplica. Los anexos '
          'se renuevan en cada periodo. Un cambio de formato no amplía facultades, finalidades ni plazos de '
          'conservación.'),

    ('h1', 'Alcance y referencias'),
    ('h2', 'Lo que estas bases no hacen'),
    ('lista', [
        'Registrarse, ser aceptado o coordinar no es un nombramiento ni da representación del Comité, remuneración '
        'o relación laboral. Las bases no prometen cargos, empleos, becas, pagos ni certificaciones.',
        'Una solicitud no autoriza un evento, no reserva un espacio ni compromete recursos del Comité. Eso solo lo '
        'hace la decisión registrada de una persona facultada.',
        'Un permiso en el portal no amplía las facultades institucionales de quien lo recibe.',
        'La cuenta no verifica la identidad civil ni el correo; la revisión de documentos es interna, y una casilla '
        'de aceptación no equivale a firma electrónica avanzada.',
        'El portal no afilia, no expide constancias de afiliación ni sustituye al Registro Nacional de Militantes. '
        'Un folio, un acuse o una constancia de evento no prueban militancia.',
        'Los plazos de conservación son operativos del portal, no plazos legales del trámite de afiliación. Su '
        'fundamento y cualquier bloqueo legal se documentan aparte.',
        'El reporte mensual es una regla operativa propuesta, no una obligación estatutaria individual.',
        'La entrega de comisión apoya la entrega del Comité saliente, pero no la sustituye.',
    ]),
    ('h2', 'Referencias'),
    ('p', '<b>Estatutos del PAN.</b> El artículo 84, incisos c, e, g, l y o, sustenta las funciones municipales de '
          'integrar comisiones, aprobar programas, auxiliar al Registro Nacional de Militantes, formar y comunicar. '
          'Los artículos 8, 9 y 60 distinguen la afiliación personal y la competencia de ese Registro. El artículo 14 '
          'prevé grupos homogéneos con registro propio; esa calidad no se atribuye a APJ sin su respaldo. El artículo '
          '83, numeral 11, regula la entrega del Comité saliente. '
          + LINK.format(url='https://ine.mx/wp-content/uploads/2026/05/INE-DEPPP-Estatutos-PAN-INECG176-2026.pdf',
                        texto='Estatutos publicados por el INE con la resolución INE/CG176/2026') + '.'),
    ('p', '<b>Sesión del Consejo General del INE del 24 de septiembre de 2026.</b> Aprobó por unanimidad la '
          'resolución del punto 6, requirió ajustes a los artículos 44 y 130 y condicionó la validez definitiva de las '
          'modificaciones a su ratificación en la siguiente Asamblea Nacional Extraordinaria. Al adoptar estas bases '
          'debe comprobarse el texto aplicable. '
          + LINK.format(url='https://ine.mx/sesion-ordinaria-del-consejo-general-24-de-septiembre-de-2026/',
                        texto='Resolución y anexos') + ' · '
          + LINK.format(url='https://centralelectoral.ine.mx/2026/09/24/version-estenografica-de-la-sesion-ordinaria-del-consejo-general-del-ine-24-de-septiembre-de-2026/',
                        texto='versión estenográfica') + '.'),
    ('p', '<b>Reglamento de los Órganos Estatales y Municipales</b>, aprobado el 6 de marzo de 2019. Los artículos '
          '105 a 108 y 110 dan reglas de sesión, actas, archivo, programas y seguimiento, en lo compatible con los '
          'Estatutos aplicables. '
          + LINK.format(url='https://almacenamientopan.blob.core.windows.net/pdfs/documentos/KdGNTa9cQp2YdgFbt2bSVCArfs7ZiA.pdf',
                        texto='Texto publicado por el PAN') + '.'),
    ('p', '<b>Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados</b>, con la reforma '
          'publicada el 14 de noviembre de 2025: datos sensibles y consentimiento (artículos 7 y 14 a 16); '
          'facultades, finalidad y proporcionalidad (10 a 12 y 19); conservación (17 y 18); avisos (20 a 22); '
          'seguridad (25 a 36); encargados y cómputo en la nube (52 a 58). '
          + LINK.format(url='https://www.diputados.gob.mx/LeyesBiblio/pdf/LGPDPPSO.pdf',
                        texto='Texto vigente en la Cámara de Diputados') + '.'),
    ('nota', 'Referencias revisadas al 9 de octubre de 2026.'),
]

COMISIONES = ['Gobierno', 'Administración', 'Comunicación', 'Cultura', 'Tecnología e IA', 'Mujeres al frente']

ANEXOS = [
    ('anexo', 'Anexo A', 'Plan del periodo'),
    ('p', 'Llénalo al inicio de cada periodo. Las metas deben corresponder a recursos y responsables confirmados.'),
    ('campos', [('Periodo', 2), ('Versión de las bases', 2)]),
    ('campos', [('Responsable de seguimiento', 3), ('Canal autorizado', 2)]),
    ('renglones', 'Prioridad del periodo', 2, 'Qué problema concreto quiere resolver el equipo.'),
    ('formtabla', 'Coordinaciones', ['Comisión', 'Titular', 'Apoyo', 'Canal de trabajo'], [1.5, 1.6, 1.6, 1.6], COMISIONES),
    ('formtabla', 'Proyectos del periodo', ['Proyecto y comisión', 'Resultado y cómo se comprobará', 'Fecha', 'Recursos'], [2, 2.3, 0.9, 1.5], 6),
    ('renglones', 'Revisión del periodo y asuntos que requieren acuerdo', 3, 'Qué se revisará, quién participa y qué decisiones siguen pendientes.'),

    ('anexo', 'Anexo B', 'Decisiones y accesos del periodo'),
    ('p', 'Anota quién revisa y quién decide cada asunto. Si una función no está asignada, déjala pendiente. Los '
          'permisos del portal se ajustan a esta relación. Las identificaciones, domicilios y comprobantes de '
          'afiliación solo los consultan su titular y la administración autorizada.'),
    ('campos', [('Periodo', 2), ('Versión del aviso de privacidad', 2.4), ('Acuerdo de referencia', 2.4)]),
    ('formtabla', None, ['Asunto', 'Revisa o prepara', 'Autoriza o decide'], [2, 2, 2], [
        'Solicitudes de incorporación', 'Documentos personales', 'Seguimiento de afiliación',
        'Postulaciones a Enlaces APJ', 'Actividades y publicaciones', 'Confirmación de espacios',
        'Presupuesto y recursos', 'Altas y bajas de permisos', 'Derechos ARCO y privacidad', 'Incidentes de datos']),
    ('renglones', 'Acceso adicional autorizado', 2, 'Información, finalidad, persona, duración e instrumento que lo respalda.'),
    ('campos', [('Quién comunica los cambios y verifica el retiro de accesos', 3), ('Fecha de revisión', 1.3)]),
    ('recuadro', 'Anexo C · Formato de evento',
     'Cada actividad se propone con el Formato de evento APJ-F01, que se descarga en Mi comisión › Actividades o se '
     'llena ahí mismo. Incluye programa, recursos, presupuesto, lista previa, decisión del Comité y cierre, por lo que '
     'no se repite en estas bases.'),

    ('anexo', 'Anexo D', 'Reporte mensual y consultas'),
    ('p', 'El reporte resume lo útil para continuar. En el portal se entrega en Mi comisión › Actividades › Reporte '
          'mensual. No incluyas datos personales de asistentes.'),
    ('campos', [('Comisión', 3), ('Mes', 1.6), ('Quién lo prepara', 3)]),
    ('renglones', 'Lo realizado', 2, 'Actividades, reuniones y tareas del mes.'),
    ('renglones', 'Recursos usados', 2, 'Dinero, materiales y apoyos, con su origen.'),
    ('renglones', 'Resultados', 2, 'Asistencia total, acuerdos, publicaciones o cambios, según la comisión.'),
    ('renglones', 'Pendientes', 2, 'Qué sigue, quién lo hará y para cuándo.'),
    ('h2', 'Consulta o autorización'),
    ('p', 'Para una decisión concreta que no es un evento. En el portal: Mi comisión › Actividades › Consulta o autorización.'),
    ('renglones', 'Qué necesitas confirmar o autorizar', 2, None),
    ('renglones', 'Qué debe saber quien responde', 2, None),
    ('campos', [('Para cuándo necesitas respuesta', 2), ('Quién responde', 2), ('Fecha de respuesta', 1.5)]),
    ('renglones', 'Respuesta', 1, None),

    ('anexo', 'Anexo E', 'Entrega de comisión'),
    ('campos', [('Comisión', 2), ('Periodo que se entrega', 2)]),
    ('campos', [('Quién entrega', 2), ('Quién recibe', 2), ('Fecha', 1.2)]),
    ('renglones', 'Proyectos terminados y dónde consultar sus resultados', 2, None),
    ('renglones', 'Pendientes, responsables y fechas', 3, None),
    ('renglones', 'Lo que el siguiente equipo necesita saber', 3, None),
    ('renglones', 'Materiales, espacios y cuentas por entregar', 2,
     'Quién administra cada acceso y cómo se tramita el cambio. Sin contraseñas ni expedientes personales.'),
    ('formtabla', 'Control de archivos', ['Material y versión', 'Ubicación', 'Vence', 'Custodio y revisión'], [2.2, 2, 1, 2], 4),
    ('renglones', 'Observaciones de quien recibe', 2, None),
    ('nota', 'Antes de que venza el archivo, quien recibe comprueba que puede abrir los materiales depurados y anota el '
             'repositorio institucional y el plazo autorizado. El relevo no reinicia los 365 días del portal.'),

    ('anexo', 'Anexo F', 'Registro de acuerdos'),
    ('p', 'Se llena con el acta cuando el Comité respalde estas bases o sus cambios en sesión.'),
    ('formtabla', None, ['Dato del acuerdo', 'Por completar'], [2.2, 4], [
        'Adscripción de Acción Política Juvenil Tlalnepantla', 'Órgano, fecha y lugar de la sesión',
        'Número de sesión y punto del orden del día', 'Quórum y sentido de la votación',
        'Documentos y versiones aprobados', 'Condiciones y fecha de aplicación',
        'Responsables de ejecución y custodia']),
    ('h2', 'Lo que el acuerdo puede respaldar'),
    ('lista', [
        'Esta base y sus anexos A a F, con la adscripción, funciones y condiciones que consten en el acta.',
        'Las personas facultadas para revisar solicitudes, autorizar actividades y administrar accesos, dentro de '
        'las atribuciones de cada cargo.',
        'El alcance del último paso de afiliación, las funciones a las que aplica y la atención de trámites '
        'pendientes, respetando que afiliarse es una decisión personal y que la competencia es del Registro Nacional '
        'de Militantes.',
        'El responsable del tratamiento de datos, los avisos e instrumentos aplicables, y la justificación de los '
        'documentos que se piden y sus plazos.',
        'El repositorio y la persona custodia de los materiales que deban conservarse después de cada periodo.',
        'Las guías de las seis comisiones y el Formato de evento APJ-F01.',
    ]),
    ('firmas', ['Nombre, cargo y firma de quien preside', 'Nombre, cargo y firma de quien da constancia del acuerdo']),
    ('nota', 'La constancia o copia del acta se guarda junto con la versión a la que se refiere.'),
]
