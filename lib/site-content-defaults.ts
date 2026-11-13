import { commissions as baseCommissions, type CommissionId } from "./commissions";
import { cleanText } from "./security";

/**
 * Editable public text. The values below are the texts that were fixed in the code;
 * the panel stores replacements in D1 (site_content) and a missing row means "use these".
 * This module is pure so client components can share types, defaults and limits.
 */

export const commissionIds = baseCommissions.map(c => c.id) as CommissionId[];
export const processStepKeys = ["cuenta", "solicitud", "documentos", "comision", "afiliacion"] as const;
export type ProcessStepKey = typeof processStepKeys[number];

export type CommissionContent = { id: CommissionId; name: string; purpose: string; tasks: string[]; result: string };
export type ProcessStep = { key: ProcessStepKey; title: string; hint: string };

export type TextSpec = { type: "text"; label: string; max: number; min?: number; rows?: number; help?: string };
export type NumberSpec = { type: "number"; label: string; min: number; max: number; suffix?: string };
export type RecordSpec = { type: "record"; fields: Record<string, TextSpec | NumberSpec> };
export type ListSpec = { type: "list"; label: string; item: TextSpec | RecordSpec; minItems: number; maxItems: number; addLabel: string; help?: string };
export type GroupSpec = { type: "group"; label: string; keys: readonly string[]; field: TextSpec | RecordSpec; keyLabel: "commission" | "step"; help?: string };
export type OrderSpec = { type: "order"; label: string; help?: string };
export type FieldSpec = TextSpec | NumberSpec | ListSpec | GroupSpec | OrderSpec;

export type ContentTab = "comisiones" | "enlaces" | "portada";
export type BlockDef = {
  key: string;
  tab: ContentTab;
  title: string;
  page: string;
  pageLabel: string;
  fields: Record<string, FieldSpec>;
  check?: (value: Record<string, unknown>) => string | null;
};

const text = (label: string, max: number, extra: Partial<TextSpec> = {}): TextSpec => ({ type: "text", label, max, ...extra });
const optional = (label: string, max: number, extra: Partial<TextSpec> = {}): TextSpec => text(label, max, { min: 0, ...extra });
const heading = (eyebrow = true) => ({
  ...(eyebrow ? { eyebrow: text("Antetítulo", 80) } : {}),
  title: text("Título", 90, { rows: 2, help: "Un salto de línea aquí también aparece en la página." }),
  emphasis: optional("Final destacado del título", 90, { help: "Se muestra en otro estilo después del título. Puede quedar vacío." }),
});

const commissionFields: Record<string, FieldSpec> = {
  name: text("Nombre", 60, { min: 2 }),
  purpose: text("Propósito", 240, { rows: 2 }),
  tasks: { type: "list", label: "Tareas", item: text("Tarea", 240, { rows: 2 }), minItems: 1, maxItems: 8, addLabel: "Agregar tarea" },
  result: text("Resultado esperado", 280, { rows: 2 }),
};

export const contentBlocks: BlockDef[] = [
  { key: "commissions.order", tab: "comisiones", title: "Orden de las comisiones", page: "/comisiones", pageLabel: "Comisiones, portada y registro", fields: { order: { type: "order", label: "Orden", help: "Este orden se usa en la portada, en /comisiones y en el registro." } } },
  ...baseCommissions.map((c): BlockDef => ({ key: `commission.${c.id}`, tab: "comisiones", title: c.name, page: `/comisiones#${c.id}`, pageLabel: "Comisiones, portada y registro", fields: commissionFields })),
  { key: "comisiones.header", tab: "comisiones", title: "Encabezado de /comisiones", page: "/comisiones", pageLabel: "/comisiones", fields: { ...heading(), lead: text("Texto de entrada", 300, { rows: 2 }), stepsTitle: text("Título de los pasos", 80) } },
  { key: "enlaces.header", tab: "enlaces", title: "Encabezado", page: "/enlaces", pageLabel: "/enlaces", fields: { ...heading(), lead: text("Texto de entrada", 400, { rows: 3 }) } },
  { key: "enlaces.requirements", tab: "enlaces", title: "Requisitos", page: "/enlaces#bases", pageLabel: "/enlaces", fields: { ...heading(), intro: text("Explicación", 400, { rows: 3 }), items: { type: "list", label: "Requisitos", item: text("Requisito", 240, { rows: 2 }), minItems: 1, maxItems: 12, addLabel: "Agregar requisito" } } },
  { key: "enlaces.seats", tab: "enlaces", title: "Plazas por comisión", page: "/enlaces", pageLabel: "/enlaces", fields: { ...heading(), roles: { type: "group", label: "Qué hace cada plaza", keys: commissionIds, keyLabel: "commission", field: text("Descripción", 200, { rows: 2 }), help: "El nombre de cada comisión sale de la pestaña Comisiones." } } },
  { key: "enlaces.calendar", tab: "enlaces", title: "Calendario", page: "/enlaces", pageLabel: "/enlaces", fields: { title: text("Título", 90, { rows: 2 }), emphasis: optional("Final destacado del título", 90), items: { type: "list", label: "Fechas", item: { type: "record", fields: { when: text("Fecha", 60), what: text("Qué pasa", 160) } }, minItems: 1, maxItems: 12, addLabel: "Agregar fecha" } } },
  {
    key: "enlaces.selection", tab: "enlaces", title: "Criterios de selección", page: "/enlaces", pageLabel: "/enlaces",
    fields: { eyebrow: text("Antetítulo", 80), criteria: { type: "list", label: "Criterios", item: { type: "record", fields: { label: text("Criterio", 120), percent: { type: "number", label: "Porcentaje", min: 1, max: 100, suffix: "%" } } }, minItems: 1, maxItems: 8, addLabel: "Agregar criterio", help: "Los porcentajes deben sumar 100." }, note: text("Nota", 500, { rows: 3 }) },
    check: value => {
      const total = (value.criteria as Array<{ percent: number }>).reduce((sum, item) => sum + item.percent, 0);
      return total === 100 ? null : `Los porcentajes suman ${total}. Deben sumar 100.`;
    },
  },
  { key: "enlaces.duties", tab: "enlaces", title: "Compromisos durante el año", page: "/enlaces", pageLabel: "/enlaces", fields: { eyebrow: text("Antetítulo", 80), items: { type: "list", label: "Compromisos", item: text("Compromiso", 240, { rows: 2 }), minItems: 1, maxItems: 12, addLabel: "Agregar compromiso" }, note: text("Nota", 500, { rows: 3 }) } },
  { key: "enlaces.apply", tab: "enlaces", title: "Cierre de la convocatoria", page: "/enlaces#postular", pageLabel: "/enlaces", fields: { title: text("Título", 90, { rows: 2 }), emphasis: optional("Final destacado del título", 90), note: text("Nota final", 500, { rows: 3 }) } },
  { key: "home.hero", tab: "portada", title: "Portada · inicio", page: "/", pageLabel: "Portada", fields: heading() },
  { key: "home.welcome", tab: "portada", title: "Portada · bienvenida", page: "/#comunidad", pageLabel: "Portada", fields: { title: text("Título", 120), text: text("Texto", 500, { rows: 3 }) } },
  { key: "home.history", tab: "portada", title: "Portada · personas y antecedentes", page: "/#identidad", pageLabel: "Portada", fields: { ...heading(false), text: text("Texto", 200, { rows: 2 }) } },
  { key: "home.commissions", tab: "portada", title: "Portada · comisiones", page: "/#programas", pageLabel: "Portada", fields: { ...heading(), text: text("Texto", 200, { rows: 2 }) } },
  { key: "home.combination", tab: "portada", title: "Portada · la combinación que importa", page: "/#programas", pageLabel: "Portada", fields: heading() },
  { key: "home.team", tab: "portada", title: "Portada · quién hace qué", page: "/#equipo", pageLabel: "Portada", fields: { name: text("Nombre", 120), role: text("Qué hace", 200), note: text("Nota", 500, { rows: 3 }) } },
  { key: "participacion.intro", tab: "portada", title: "Participa · introducción", page: "/participacion", pageLabel: "/participacion", fields: { ...heading(), lead: text("Texto antes de los pasos", 200, { rows: 2 }) } },
  { key: "process.steps", tab: "portada", title: "Los cinco pasos del proceso", page: "/comisiones", pageLabel: "/comisiones, /participacion y Mi comisión", fields: { steps: { type: "group", label: "Pasos", keys: processStepKeys, keyLabel: "step", field: { type: "record", fields: { title: text("Título", 60), hint: text("Explicación", 160, { rows: 2 }) } } } } },
];

export const contentBlockKeys = contentBlocks.map(block => block.key);
export const blockByKey = new Map(contentBlocks.map(block => [block.key, block]));

const byId = Object.fromEntries(baseCommissions.map(c => [c.id, c])) as Record<CommissionId, typeof baseCommissions[number]>;

export const contentDefaults: Record<string, Record<string, unknown>> = {
  "commissions.order": { order: [...commissionIds] },
  ...Object.fromEntries(commissionIds.map(id => [`commission.${id}`, { name: byId[id].name, purpose: byId[id].purpose, tasks: [...byId[id].tasks], result: byId[id].result }])),
  "comisiones.header": { eyebrow: "Acción Política Juvenil Tlalnepantla", title: "Elige tu", emphasis: "comisión.", lead: "Seis equipos con tareas concretas. Elige uno y súmate.", stepsTitle: "Cómo te sumas" },
  "enlaces.header": { eyebrow: "Convocatoria 2026–2027", title: "Enlaces APJ.", emphasis: "Doce lugares para mover Tlalnepantla.", lead: "Dos jóvenes por comisión, un año de trabajo con actividades, evidencias y un reporte final. Son el equipo que sostiene La ruta." },
  "enlaces.requirements": {
    eyebrow: "Quién puede postularse", title: "Lo que necesitas", emphasis: "antes de empezar.",
    intro: "No se pide afiliación al PAN. La afiliación es un paso distinto y voluntario que el sitio deja al final del registro.",
    items: [
      "Tener de 18 a 29 años.",
      "Vivir, estudiar o trabajar en Tlalnepantla de Baz.",
      "Crear tu cuenta y enviar tu solicitud a la comisión que elijas.",
      "Carta de motivos de una cuartilla: por qué esa comisión y qué harías en tu primer mes.",
      "Carta de recomendación de un docente, empleador o líder comunitario.",
      "Disponibilidad aproximada de cuatro horas por semana.",
    ],
  },
  "enlaces.seats": {
    eyebrow: "Plazas", title: "Una persona titular y una de apoyo", emphasis: "por comisión.",
    roles: {
      gobierno: "Visita al Ayuntamiento, Escuela Parlamentaria y Parlamento Juvenil.",
      administracion: "Registros, listas, permisos y seguimiento de cada evento.",
      comunicacion: "Carteles, redes, fotografía con permiso y Voces 360.",
      cultura: "Posada Juvenil y Navidad en el hospital.",
      tecnologia: "Sitio, formularios, registros y códigos QR probados.",
      mujeres: "Paridad en la convocatoria y espacios seguros en cada evento.",
    },
  },
  "enlaces.calendar": {
    title: "Del registro", emphasis: "a la toma de protesta.",
    items: [
      { when: "16 de noviembre", what: "Se publica la convocatoria" },
      { when: "30 de noviembre", what: "Cierran postulaciones a las 23:59" },
      { when: "1 al 4 de diciembre", what: "Entrevistas de 10 minutos, en línea" },
      { when: "7 de diciembre", what: "Resultados" },
      { when: "10 de diciembre", what: "Toma de protesta, si el Comité la aprueba" },
    ],
  },
  "enlaces.selection": {
    eyebrow: "Cómo se selecciona",
    criteria: [
      { label: "Carta de motivos", percent: 30 },
      { label: "Propuesta para el primer mes", percent: 25 },
      { label: "Participación previa en tu escuela o comunidad", percent: 25 },
      { label: "Carta de recomendación", percent: 20 },
    ],
    note: "Evalúan tres personas: la coordinación general y dos integrantes que designe el Comité. Se busca equilibrio entre mujeres y hombres y entre escuelas, con una lista de suplentes.",
  },
  "enlaces.duties": {
    eyebrow: "Durante el año",
    items: [
      "Plan de trabajo de tu comisión en el primer mes.",
      "Reporte mensual en Mi comisión.",
      "Participar en al menos tres eventos de La ruta.",
      "Organizar un evento propio por semestre con el Formato APJ-F01.",
      "Difundir convocatorias y guardar evidencias.",
      "Reporte final y cuestionario de salida.",
    ],
    note: "Dos reportes mensuales seguidos sin entregar, sin aviso, liberan la plaza para la persona suplente.",
  },
  "enlaces.apply": { title: "Postúlate", emphasis: "en tres pasos.", note: "Recibir tu solicitud no significa que fue aceptada. Te avisamos el resultado en tu cuenta. Postularte no te afilia a ningún partido." },
  "home.hero": { eyebrow: "Tlalnepantla, Estado de México", title: "Tu talento puede", emphasis: "mover Tlalnepantla." },
  "home.welcome": { title: "Ven como eres. Crece con los demás.", text: "Estudies en un bachillerato técnico o en una universidad pública o privada, tengas un trabajo u oficio o apenas estés encontrando tu camino, aquí puedes aportar. Para unirte a una comisión necesitas 18 años cumplidos." },
  "home.history": { title: "Personas y", emphasis: "antecedentes.", text: "Archivo de Acción Juvenil." },
  "home.commissions": { eyebrow: "Comisiones", title: "El trabajo,", emphasis: "bien definido.", text: "Seis áreas de trabajo.\nConsulta sus funciones y responsabilidades." },
  "home.combination": { eyebrow: "La combinación que importa", title: "Algo que aprendes.\nAlguien que conoces.", emphasis: "Una idea que avanza." },
  "home.team": { name: "Yohualli Emiliano García Milla", role: "Impulsa esta etapa del proyecto.", note: "Cada comisión tendrá dos Enlaces APJ, elegidos por convocatoria. Sus nombres aparecerán aquí cuando el Comité los designe." },
  "participacion.intro": { eyebrow: "Acción Política Juvenil Tlalnepantla", title: "Únete a", emphasis: "una comisión.", lead: "Para personas de 18 años en adelante. Así funciona:" },
  "process.steps": {
    steps: {
      cuenta: { title: "Crea tu cuenta", hint: "Usuario, contraseña y correo confirmado." },
      solicitud: { title: "Envía tu solicitud", hint: "Tus datos, tu comisión y tu disponibilidad." },
      documentos: { title: "Sube tus documentos", hint: "INE por ambos lados y comprobante de domicilio." },
      comision: { title: "Te confirmamos", hint: "Administración revisa y te habilita en tu comisión." },
      afiliacion: { title: "Afiliación al PAN", hint: "Voluntaria. Si decides afiliarte, lo haces en la app del PAN." },
    },
  },
};

export const defaultProcessSteps: ProcessStep[] = processStepKeys.map(key => ({ key, ...(contentDefaults["process.steps"].steps as Record<ProcessStepKey, { title: string; hint: string }>)[key] }));
export const defaultCommissions: CommissionContent[] = commissionIds.map(id => ({ id, ...(contentDefaults[`commission.${id}`] as Omit<CommissionContent, "id">) }));

export class ContentValidationError extends Error {}
const fail = (message: string): never => { throw new ContentValidationError(message); };
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function parseText(spec: TextSpec, input: unknown, where: string) {
  if (typeof input !== "string") fail(`Revisa «${where}».`);
  const raw = input as string;
  if (raw.length > spec.max + 20) fail(`«${where}» admite hasta ${spec.max} caracteres.`);
  const multiline = Boolean(spec.rows);
  const normalized = multiline ? raw.replace(/\r\n?/g, "\n").split("\n").map(line => line.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{2,}/g, "\n") : raw.replace(/\s+/g, " ");
  const value = cleanText(normalized, spec.max + 1);
  if (value.length > spec.max) fail(`«${where}» admite hasta ${spec.max} caracteres.`);
  if (value.length < (spec.min ?? 1)) fail(spec.min === undefined || spec.min === 1 ? `Escribe «${where}».` : `«${where}» necesita al menos ${spec.min} caracteres.`);
  return value;
}

function parseField(spec: FieldSpec | RecordSpec, input: unknown, where: string): unknown {
  switch (spec.type) {
    case "text": return parseText(spec, input, where);
    case "number": {
      if (typeof input !== "number" || !Number.isInteger(input) || input < spec.min || input > spec.max) fail(`«${where}» debe ser un número entero de ${spec.min} a ${spec.max}.`);
      return input;
    }
    case "record": {
      if (!isObject(input)) fail(`Revisa «${where}».`);
      const data = input as Record<string, unknown>;
      if (Object.keys(data).some(key => !Object.hasOwn(spec.fields, key))) fail(`Revisa «${where}».`);
      return Object.fromEntries(Object.entries(spec.fields).map(([key, field]) => [key, parseField(field, data[key], `${where} · ${field.label}`)]));
    }
    case "list": {
      if (!Array.isArray(input)) fail(`Revisa «${spec.label}».`);
      const items = input as unknown[];
      if (items.length < spec.minItems) fail(`«${spec.label}» necesita al menos ${spec.minItems} ${spec.minItems === 1 ? "elemento" : "elementos"}.`);
      if (items.length > spec.maxItems) fail(`«${spec.label}» admite hasta ${spec.maxItems} elementos.`);
      return items.map((item, index) => parseField(spec.item, item, `${spec.label} ${index + 1}`));
    }
    case "group": {
      if (!isObject(input)) fail(`Revisa «${spec.label}».`);
      const data = input as Record<string, unknown>;
      if (Object.keys(data).length !== spec.keys.length || spec.keys.some(key => !Object.hasOwn(data, key))) fail(`Revisa «${spec.label}».`);
      return Object.fromEntries(spec.keys.map(key => [key, parseField(spec.field, data[key], `${spec.label} · ${key}`)]));
    }
    case "order": {
      if (!Array.isArray(input) || input.length !== commissionIds.length || new Set(input).size !== commissionIds.length || input.some(id => !commissionIds.includes(id as CommissionId))) fail("El orden debe incluir las seis comisiones una sola vez.");
      return [...(input as CommissionId[])];
    }
  }
}

/** Strict validation: exact field names, types, lengths and list sizes. Throws ContentValidationError. */
export function parseContentBlock(key: string, input: unknown): Record<string, unknown> {
  const block = blockByKey.get(key);
  if (!block) fail("Ese bloque no existe.");
  if (!isObject(input)) fail("El contenido no es válido.");
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(name => !Object.hasOwn(block!.fields, name))) fail("El contenido tiene campos que no corresponden a este bloque.");
  const value = Object.fromEntries(Object.entries(block!.fields).map(([name, spec]) => [name, parseField(spec, data[name], spec.label)]));
  const problem = block!.check?.(value);
  if (problem) fail(problem);
  return value;
}
