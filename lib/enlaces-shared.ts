import { isCommission } from "./commissions";

/** Enlaces APJ 2027. Shared by the form, the panel and the server; no server-only imports here. */
export const enlacesCycle = "2027";
export const enlacesNoticeVersion = "enlaces-2027.1";

export const enlacesTracks = { comision: "Enlace de Comisión", comunidad: "Enlace de Comunidad" } as const;
export type EnlacesTrack = keyof typeof enlacesTracks;
export const communityKinds = { universidad: "Universidad", colonia: "Colonia" } as const;
export type CommunityKind = keyof typeof communityKinds;
export const enlacesUniversities = ["CUDEC", "EBC", "ITTLA", "FES Iztacala", "UNITEC", "Tec CEM", "CBTis 227"] as const;
export const cityTies = { vivo: "Vivo en Tlalnepantla", estudio: "Estudio en Tlalnepantla", trabajo: "Trabajo en Tlalnepantla" } as const;
export type CityTie = keyof typeof cityTies;

export const enlacesStatuses = {
  draft: "Borrador",
  submitted: "Enviada",
  in_review: "En revisión",
  interview: "Entrevista",
  selected: "Seleccionada",
  substitute: "Suplente",
  not_selected: "No seleccionada",
  withdrawn: "Retirada",
} as const;
export type EnlacesStatus = keyof typeof enlacesStatuses;
/** Statuses the applicant may still edit while the window is open. */
export const editableStatuses: readonly EnlacesStatus[] = ["draft", "submitted"];
/** Statuses that count as a received application for the committee. */
export const receivedStatuses: readonly EnlacesStatus[] = ["submitted", "in_review", "interview", "selected", "substitute", "not_selected"];

/** Each commission has two places. */
export const enlacesSeats = { titular: "Titular", apoyo: "Apoyo" } as const;
export type EnlacesSeat = keyof typeof enlacesSeats;

export const scoreCriteria = [
  { key: "motives", label: "Carta de motivos", max: 30 },
  { key: "proposal", label: "Propuesta para su comisión o comunidad", max: 25 },
  { key: "participation", label: "Participación previa en su escuela o colonia", max: 25 },
  { key: "recommendation", label: "Carta de recomendación", max: 20 },
] as const;
export type ScoreKey = typeof scoreCriteria[number]["key"];
export const communityMinimumScore = 60;

export const enlacesLimits = { motives: 3500, participation: 600, proposal: 1200, tieDetail: 160, communityName: 120, interviewNote: 2000 } as const;
export const enlacesDocumentCategories = { motivation_letter: "Carta de motivos", recommendation_letter: "Carta de recomendación", ine_front: "Identificación oficial, frente", ine_back: "Identificación oficial, reverso" } as const;
export type EnlacesDocumentCategory = keyof typeof enlacesDocumentCategories;
export const isEnlacesDocumentCategory = (value: string): value is EnlacesDocumentCategory => Object.hasOwn(enlacesDocumentCategories, value);

export const enlacesConsent = "Tengo de 18 a 29 años y presento esta postulación por mí. Autorizo el uso de mis datos, mis cartas y mi identificación oficial para el proceso de selección de Enlaces APJ 2027 y, si resulto seleccionado, para la operación del programa. Sé que esta información puede revelar una vinculación política.";
export const enlacesPublishConsent = "Autorizo que mi nombre completo se publique en los resultados si resulto seleccionado o suplente.";

export type EnlacesFields = {
  track: EnlacesTrack | "";
  commission: string;
  communityKind: CommunityKind | "";
  communityName: string;
  birthDate: string;
  cityTie: CityTie | "";
  cityTieDetail: string;
  motivesText: string;
  previousParticipation: string;
  proposal: string;
  publishNameOk: boolean;
};

export type EnlacesApplication = EnlacesFields & {
  id: string;
  status: EnlacesStatus;
  seat: EnlacesSeat | "";
  referenceCode: string;
  submittedAt: number | null;
  createdAt: number;
  updatedAt: number;
  retentionUntil: number;
};

export type EnlacesPhase = "before" | "open" | "closed" | "results";

/** Completed years on a calendar date. Both arguments are YYYY-MM-DD. */
export function ageOn(birthDate: string, reference: string) {
  const [by, bm, bd] = birthDate.split("-").map(Number), [ry, rm, rd] = reference.split("-").map(Number);
  return ry - by - (rm < bm || (rm === bm && rd < bd) ? 1 : 0);
}
export function validDate(value: string) {
  return /^(19|20)\d{2}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + "T00:00:00Z")) && new Date(value + "T00:00:00Z").toISOString().slice(0, 10) === value;
}

const text = (value: unknown, max: number, label: string) => {
  const clean = typeof value === "string" ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim() : "";
  if (clean.length > max) throw new Error(`${label} admite hasta ${max} caracteres.`);
  return clean;
};

/**
 * Reads the form. A draft only checks formats and lengths; a complete application also requires every field.
 * `ageReference` is the closing date in Mexico City (YYYY-MM-DD). The letter of motives may arrive as a file,
 * so its text is required by the caller, not here.
 */
export function parseEnlacesFields(input: Record<string, unknown>, complete: boolean, ageReference: string): EnlacesFields {
  const track = input.track === "comision" || input.track === "comunidad" ? input.track : "";
  if (complete && !track) throw new Error("Elige si te postulas a una comisión o a una comunidad.");
  let commission = "", communityKind: CommunityKind | "" = "", communityName = "";
  if (track === "comision") {
    commission = isCommission(input.commission) ? input.commission : "";
    if (complete && !commission) throw new Error("Elige la comisión a la que te postulas.");
  }
  if (track === "comunidad") {
    communityKind = input.communityKind === "universidad" || input.communityKind === "colonia" ? input.communityKind : "";
    if (complete && !communityKind) throw new Error("Elige si representas a una universidad o a una colonia.");
    communityName = text(input.communityName, enlacesLimits.communityName, communityKind === "colonia" ? "La colonia" : "La universidad").replace(/\s+/g, " ");
    if (complete && communityName.length < 2) throw new Error(communityKind === "colonia" ? "Escribe el nombre de tu colonia." : "Elige o escribe tu universidad.");
  }
  const birthDate = typeof input.birthDate === "string" ? input.birthDate.trim() : "";
  if (birthDate && !validDate(birthDate)) throw new Error("Revisa tu fecha de nacimiento.");
  if (complete && !birthDate) throw new Error("Escribe tu fecha de nacimiento.");
  if (birthDate) {
    const age = ageOn(birthDate, ageReference);
    if (age < 18) throw new Error("La convocatoria es para personas de 18 a 29 años cumplidos al cierre. Para esa fecha aún no tendrás 18.");
    if (age > 29) throw new Error("La convocatoria es para personas de 18 a 29 años cumplidos al cierre. Para esa fecha tendrás más de 29.");
  }
  const cityTie = input.cityTie === "vivo" || input.cityTie === "estudio" || input.cityTie === "trabajo" ? input.cityTie : "";
  if (complete && !cityTie) throw new Error("Indica tu vínculo con Tlalnepantla.");
  const cityTieDetail = text(input.cityTieDetail, enlacesLimits.tieDetail, "El detalle de tu vínculo").replace(/\s+/g, " ");
  if (complete && cityTieDetail.length < 2) throw new Error("Escribe la colonia, la escuela o el lugar de trabajo que te vincula con Tlalnepantla.");
  const motivesText = text(input.motivesText, enlacesLimits.motives, "La carta de motivos");
  const previousParticipation = text(input.previousParticipation, enlacesLimits.participation, "La participación previa");
  if (complete && previousParticipation.length < 10) throw new Error("Cuenta en unas líneas tu participación previa en tu escuela o colonia.");
  const proposal = text(input.proposal, enlacesLimits.proposal, "La propuesta");
  if (complete && proposal.length < 20) throw new Error("Escribe tu propuesta para tu comisión o comunidad.");
  return { track, commission, communityKind, communityName, birthDate, cityTie, cityTieDetail, motivesText, previousParticipation, proposal, publishNameOk: input.publishNameOk === true };
}

/** Scores are whole numbers within each criterion's maximum. */
export function parseEnlacesScore(input: Record<string, unknown>) {
  const values = {} as Record<ScoreKey, number>;
  for (const criterion of scoreCriteria) {
    const value = Number(input[criterion.key]);
    if (!Number.isInteger(value) || value < 0 || value > criterion.max) throw new Error(`${criterion.label} va de 0 a ${criterion.max} puntos, sin decimales.`);
    values[criterion.key] = value;
  }
  return { ...values, total: scoreCriteria.reduce((sum, criterion) => sum + values[criterion.key], 0) };
}

export const enlacesDate = (value: number, withTime = false) => new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "long", ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}) }).format(value).replace(",", "");
