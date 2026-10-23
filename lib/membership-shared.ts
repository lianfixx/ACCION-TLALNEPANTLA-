import { isCommission } from "./commissions";
import { cleanText } from "./security";
import { parseMembershipProfile } from "./membership-profile";

export const membershipStatuses = { submitted: "Recibida", in_review: "En revisión", accepted: "Solicitud aceptada", closed: "Cerrada", withdrawn: "Retirada" } as const;
export type MembershipStatus = keyof typeof membershipStatuses;
export const membershipConsent = "Solicito mi incorporación interna a Acción Política Juvenil Tlalnepantla y consiento expresamente el tratamiento de mi nombre, correo, entidad y municipio, comisión, disponibilidad y de la información que decida aportar sobre mi actividad, experiencia y propuestas de trabajo. Se usarán para revisar mi solicitud y comunicar el seguimiento dentro de mi cuenta. Entiendo que pueden revelar una vinculación política. He leído el aviso del registro. Este consentimiento no autoriza mi afiliación al PAN, un nombramiento, la publicación de mis datos ni su entrega para una afiliación posterior.";
export type MembershipApplication = { id: string; ownerEmail: string; name: string; commission: string; note: string; profileJson?:string; referenceCode: string; status: MembershipStatus; noticeVersion: string; consentAt: number; createdAt: number; updatedAt: number; retentionUntil: number };
export type MembershipEvent = { id: string; kind: string; body: string; createdAt: number; actorType: string; actorEmail?: string };
export type MembershipNotice = { controller: string; address: string; email: string; version: string; regime: string; legalBasis: string; rightsProcedure: string; retentionDays: number; audience: string };
export function parseMembershipFields(input: Record<string, unknown>) {
  if (typeof input.name !== "string" || input.name.length > 120 || cleanText(input.name,120).length < 2) throw new Error("Escribe tu nombre, de 2 a 120 caracteres.");
  if (!isCommission(input.commission)) throw new Error("Selecciona una de las seis comisiones.");
  if (input.note !== undefined && (typeof input.note !== "string" || input.note.length > 600)) throw new Error("La nota puede tener hasta 600 caracteres.");
  return { name: cleanText(input.name,120), commission: input.commission, note: cleanText(input.note,600), profileJson:JSON.stringify(parseMembershipProfile(input.profile)) };
}
export function canChangeMembershipStatus(from: MembershipStatus, to: MembershipStatus) {
  const allowed: Record<MembershipStatus, readonly MembershipStatus[]> = { submitted: ["submitted","in_review","closed"], in_review: ["in_review","accepted","closed"], accepted: ["accepted","closed"], closed: [], withdrawn: [] };
  return allowed[from]?.includes(to) ?? false;
}
