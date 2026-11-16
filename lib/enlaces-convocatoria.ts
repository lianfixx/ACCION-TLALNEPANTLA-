/**
 * Texto íntegro de la convocatoria Enlaces APJ 2027, tal como lo entregó Emi el 15 de noviembre de 2026.
 * Es un documento formal: no se corrige ni se resume aquí. Un cambio de bases se hace con Emi y se anota en CHANGELOG.md.
 */
export type ConvocatoriaBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: Array<{ lead?: string; text: string }> }
  | { type: "label"; text: string }
  | { type: "table"; head: string[]; rows: string[][]; numeric?: number; total?: string[] }
  | { type: "oath"; lines: string[] };

export type ConvocatoriaBase = { id: string; ordinal: string; title: string; blocks: ConvocatoriaBlock[] };

export const convocatoriaTitle = "Enlaces APJ 2027";
export const convocatoriaIntro = "Acción Política Juvenil Tlalnepantla convoca a las y los jóvenes del municipio a integrar la generación 2027 de Enlaces APJ, el equipo que será nombrado ante el Comité Directivo Municipal del Partido Acción Nacional en Tlalnepantla de Baz para sostener el trabajo de la organización durante un año, conforme a las siguientes";
export const convocatoriaPlace = "Tlalnepantla de Baz, Estado de México, 23 de noviembre de 2026.";
export const convocatoriaSignature = { name: "Yohualli Emiliano García Milla", organization: "Acción Política Juvenil Tlalnepantla" };

export const convocatoriaBases: ConvocatoriaBase[] = [
  { id: "objeto", ordinal: "Primera", title: "Objeto", blocks: [
    { type: "p", text: "Enlaces APJ es el equipo que sostiene el trabajo de Acción Política Juvenil Tlalnepantla durante un año. Lo integran jóvenes del municipio seleccionados por esta convocatoria y nombrados ante el Comité Directivo Municipal, con tareas, plazos y resultados que se publican en el sitio. Ser Enlace no es un título sino una responsabilidad, y a cambio cada Enlace tiene lugar asegurado en las actividades de La ruta, formación durante el año, constancia al cierre y la experiencia de haber organizado algo real para su municipio." },
  ] },
  { id: "modalidades", ordinal: "Segunda", title: "Modalidades", blocks: [
    { type: "p", text: "Al postularte eliges una de las dos modalidades. Ambas comparten convocatoria, documentos, calendario y toma de protesta." },
    { type: "list", items: [
      { lead: "Enlace de Comisión.", text: "Son doce, titular y apoyo en cada una de las seis comisiones del sitio, y operan las actividades de La ruta durante el año. Requiere unas cuatro horas a la semana." },
      { lead: "Enlace de Comunidad.", text: "Uno por universidad y uno por colonia, sin número fijo. Son la puerta de Acción Política Juvenil en su escuela o en su barrio, difunden las convocatorias, traen propuestas y organizan al menos una actividad al año en su comunidad. Requiere unas dos horas a la semana." },
    ] },
  ] },
  { id: "comisiones", ordinal: "Tercera", title: "Comisiones y plazas", blocks: [
    { type: "table", head: ["Comisión", "Plazas", "Su papel en 2027"], rows: [
      ["Gobierno", "Titular y apoyo", "Visitas al Ayuntamiento y al INE, Escuela Parlamentaria y Parlamento Juvenil"],
      ["Administración", "Titular y apoyo", "Registros, permisos, apoyos en especie y seguimiento de cada evento"],
      ["Comunicación", "Titular y apoyo", "Flyers, redes, fotografía con permiso y Voces 360"],
      ["Cultura", "Titular y apoyo", "Posada Juvenil, Navidad en el hospital y el show de magia en Tlalnepantla"],
      ["Tecnología e IA", "Titular y apoyo", "Sitio, formularios, registros en Luma y códigos QR probados"],
      ["Mujeres al frente", "Titular y apoyo", "Paridad en cada convocatoria y espacios seguros en cada evento"],
    ] },
    { type: "p", text: "Los Enlaces de Comunidad se postulan por su universidad, CUDEC, EBC, ITTLA, FES Iztacala, UNITEC, Tec CEM o CBTis 227, o por la colonia donde viven." },
  ] },
  { id: "requisitos", ordinal: "Cuarta", title: "Requisitos y documentos", blocks: [
    { type: "list", items: [
      { text: "Tener de 18 a 29 años cumplidos al cierre de la convocatoria." },
      { text: "Vivir, estudiar o trabajar en Tlalnepantla de Baz y, en la modalidad de Comunidad, pertenecer a la universidad o colonia que representas." },
      { text: "Contar con cuenta en acciontlalnepantla.site." },
      { text: "Disponer del tiempo que pide la modalidad elegida." },
    ] },
    { type: "label", text: "Documentos" },
    { type: "list", items: [
      { text: "Carta de motivos de una cuartilla, con la comisión o comunidad que eliges, qué harías en tu primer mes y qué te gustaría que Tlalnepantla tuviera en un año que hoy no tiene." },
      { text: "Carta de recomendación de una persona docente, empleadora o líder de tu comunidad, que diga por qué confía en ti para esto." },
      { text: "Identificación oficial para acreditar edad y domicilio, que solo ve el comité de selección." },
    ] },
  ] },
  { id: "registro", ordinal: "Quinta", title: "Registro", blocks: [
    { type: "p", text: "La postulación se hace únicamente en acciontlalnepantla.site. Entra con tu cuenta, abre Enlaces APJ 2027, elige Comisión o Comunidad y sube tus tres documentos antes del domingo 6 de diciembre a las 23:59 horas. El sitio te entrega un folio con el que consultas el estado de tu postulación." },
  ] },
  { id: "seleccion", ordinal: "Sexta", title: "Selección", blocks: [
    { type: "p", text: "Evalúan tres personas, la coordinación general y dos integrantes que designe el Comité Directivo Municipal. Cada candidatura recibe hasta cien puntos conforme a la siguiente tabla." },
    { type: "table", head: ["Criterio", "Puntos"], numeric: 1, rows: [
      ["Carta de motivos", "30"],
      ["Propuesta para su comisión o comunidad", "25"],
      ["Participación previa en su escuela o colonia", "25"],
      ["Carta de recomendación", "20"],
    ], total: ["Total", "100"] },
    { type: "p", text: "En Comisión quedan las dos candidaturas con mayor puntaje por comisión y en Comunidad la de mayor puntaje por universidad o colonia, con un mínimo de sesenta puntos. En caso de empate decide la entrevista. Se busca equilibrio entre mujeres y hombres y se publica una lista de suplentes." },
  ] },
  { id: "calendario", ordinal: "Séptima", title: "Calendario", blocks: [
    { type: "table", head: ["Fecha", "Etapa"], rows: [
      ["Lunes 23 de noviembre de 2026", "Publicación de la convocatoria"],
      ["Domingo 6 de diciembre, 23:59 horas", "Cierre de postulaciones"],
      ["7, 8 y 9 de diciembre", "Entrevistas de diez minutos, en línea"],
      ["Jueves 10 de diciembre", "Resultados y confirmación en 48 horas"],
      ["Jueves 17 de diciembre", "Toma de protesta ante el Comité Directivo Municipal"],
      ["17 de diciembre de 2026 al 17 de diciembre de 2027", "Periodo del encargo"],
    ] },
  ] },
  { id: "funciones", ordinal: "Octava", title: "Funciones", blocks: [
    { type: "label", text: "Enlace de Comisión" },
    { type: "list", items: [
      { text: "Entrega el plan de trabajo de su comisión en el primer mes y reporta cada mes, con evidencias." },
      { text: "Participa en al menos tres actividades de La ruta y organiza una actividad propia por semestre con el Formato de Evento." },
      { text: "Asiste a las tres sesiones de seguimiento del año, en marzo, julio y noviembre, y presenta en la de cierre qué hizo su comisión y qué deja listo para la siguiente generación." },
      { text: "Entrega el reporte final, responde el cuestionario de salida y acompaña la convocatoria 2028." },
    ] },
    { type: "label", text: "Enlace de Comunidad" },
    { type: "list", items: [
      { text: "Difunde cada convocatoria en su universidad o colonia y guarda las evidencias." },
      { text: "Organiza al menos una actividad al año en su comunidad, un cafecito, un foro o una visita, con el Formato de Evento y el apoyo de las comisiones." },
      { text: "Reporta cada dos meses, asiste a las tres sesiones de seguimiento y entrega el reporte final." },
      { text: "Puede postularse a una comisión en la siguiente convocatoria con su trabajo como respaldo." },
    ] },
    { type: "p", text: "Dos reportes seguidos sin entregar y sin aviso liberan la plaza para el suplente. Nadie pierde su lugar sin recibir antes un aviso y una semana para ponerse al corriente." },
  ] },
  { id: "reconocimientos", ordinal: "Novena", title: "Reconocimientos", blocks: [
    { type: "list", items: [
      { text: "Nombramiento del Comité Directivo Municipal, toma de protesta y credencial de Enlace." },
      { text: "Lugar asegurado en la Escuela Parlamentaria, la visita al INE y el Parlamento Juvenil del Estado de México." },
      { text: "Formación durante el año en liderazgo, comunicación política, oratoria y redes." },
      { text: "Constancia de participación al cierre del año y carta de recomendación firmada por la Presidencia del Comité para quien cumpla el encargo completo." },
      { text: "Perfil público en el sitio, con su permiso, y voz en Voces 360." },
      { text: "Acompañamiento de la coordinación general y acceso a formatos, plantillas y aliados." },
    ] },
  ] },
  { id: "protesta", ordinal: "Décima", title: "Toma de protesta", blocks: [
    { type: "p", text: "El jueves 17 de diciembre de 2026, en sesión del Comité Directivo Municipal, los Enlaces rinden protesta con el texto que el Comité apruebe y reciben su nombramiento." },
    { type: "oath", lines: [
      "¿Protestan desempeñar con responsabilidad, honestidad y respeto el encargo de Enlace de Acción Política Juvenil Tlalnepantla, trabajar por las y los jóvenes del municipio y rendir cuentas de su trabajo?",
      "Sí, protesto.",
      "Si así lo hicieren, que las y los jóvenes de Tlalnepantla se los reconozcan, y si no, que se los demanden.",
    ] },
  ] },
  { id: "disposiciones", ordinal: "Décima primera", title: "Disposiciones finales", blocks: [
    { type: "p", text: "Acción Política Juvenil Tlalnepantla usa los datos de las postulaciones para este proceso y para la operación del programa. Las cartas y la identificación las ve únicamente el comité de selección, y quien no resulte seleccionado puede pedir que se borren sus documentos. Lo no previsto en esta convocatoria lo resuelve el comité de selección y sus decisiones son definitivas. Los resultados, los nombramientos y los reportes de cada Enlace se publican en acciontlalnepantla.site." },
  ] },
];
