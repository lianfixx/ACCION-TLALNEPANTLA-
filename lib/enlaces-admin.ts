import { commissionName, isCommission } from "./commissions";
import { enlacesColumns, readEnlacesRow } from "./enlaces";
import { cityTies, communityKinds, enlacesCycle, enlacesStatuses, enlacesTracks, ageOn, type EnlacesApplication, type EnlacesStatus } from "./enlaces-shared";
import type { EnlacesDocument } from "./enlaces-documents";
import { csvCell } from "./people";
import { getRuntimeEnv } from "./runtime-env";
import { cleanText } from "./security";

export type EnlacesFilters = { track: string; commission: string; community: string; status: string };
export const emptyEnlacesFilters: EnlacesFilters = { track: "", commission: "", community: "", status: "" };
/** Drafts are not listed: nobody has sent them yet. */
export const listedStatuses = Object.keys(enlacesStatuses).filter(status => status !== "draft") as EnlacesStatus[];

export function parseEnlacesFilters(input: Record<string, unknown>): EnlacesFilters {
  const value = (key: string) => typeof input[key] === "string" ? input[key] as string : "";
  return {
    track: value("track") === "comision" || value("track") === "comunidad" ? value("track") : "",
    commission: isCommission(value("commission")) ? value("commission") : "",
    community: cleanText(value("community"), 120),
    status: (listedStatuses as string[]).includes(value("status")) ? value("status") : "",
  };
}
export const enlacesSearchParams = (filters: EnlacesFilters, page = 1) => new URLSearchParams([...Object.entries(filters).filter(([, value]) => value), ...(page > 1 ? [["page", String(page)]] : [])]).toString();

export type EnlacesListRow = EnlacesApplication & { accountId: string; name: string; username: string | null; email: string; total: number | null; motives: number | null; proposalScore: number | null; participation: number | null; recommendation: number | null };
type Raw = Omit<EnlacesListRow, "publishNameOk"> & { publishNameOk: number };

function query(filters: EnlacesFilters) {
  const clauses = ["e.cycle=?", "e.status<>'draft'", "e.retention_until>?"], values: unknown[] = [enlacesCycle, Date.now()];
  if (filters.track) { clauses.push("e.track=?"); values.push(filters.track); }
  if (filters.commission) { clauses.push("e.commission=?"); values.push(filters.commission); }
  if (filters.community) { clauses.push("e.community_name=? COLLATE NOCASE"); values.push(filters.community); }
  if (filters.status) { clauses.push("e.status=?"); values.push(filters.status); }
  return { sql: `SELECT ${enlacesColumns},e.account_id AS accountId,a.name,a.username,a.email,s.total,s.motives,s.proposal AS proposalScore,s.participation,s.recommendation FROM enlaces_applications e JOIN staff_accounts a ON a.id=e.account_id LEFT JOIN enlaces_scores s ON s.application_id=e.id WHERE ${clauses.join(" AND ")}`, values };
}

export async function listEnlaces(filters: EnlacesFilters, requestedPage: number) {
  const db = getRuntimeEnv().DB!, q = query(filters);
  const total = Number((await db.prepare(`SELECT count(*) AS n FROM (${q.sql})`).bind(...q.values).first<{ n: number }>())?.n ?? 0);
  const pages = Math.max(1, Math.ceil(total / 30)), page = Math.min(Math.max(1, requestedPage), pages);
  // Highest score first within each place, so the ranking of the convocatoria is visible at a glance.
  const rows = (await db.prepare(`${q.sql} ORDER BY e.track,e.commission,e.community_name COLLATE NOCASE,s.total DESC,e.submitted_at LIMIT 30 OFFSET ?`).bind(...q.values, (page - 1) * 30).all<Raw>()).results.map(readEnlacesRow) as EnlacesListRow[];
  return { rows, total, page, pages };
}
export async function allEnlaces(filters: EnlacesFilters, limit: number) {
  const q = query(filters);
  return (await getRuntimeEnv().DB!.prepare(`${q.sql} ORDER BY e.track,e.commission,e.community_name COLLATE NOCASE,s.total DESC,e.submitted_at LIMIT ?`).bind(...q.values, limit).all<Raw>()).results.map(readEnlacesRow) as EnlacesListRow[];
}

export async function enlacesCounts() {
  const rows = (await getRuntimeEnv().DB!.prepare("SELECT status,count(*) AS n FROM enlaces_applications WHERE cycle=? AND retention_until>? GROUP BY status").bind(enlacesCycle, Date.now()).all<{ status: EnlacesStatus; n: number }>()).results;
  return Object.fromEntries(rows.map(row => [row.status, Number(row.n)])) as Partial<Record<EnlacesStatus, number>>;
}
export async function enlacesCommunities() {
  return (await getRuntimeEnv().DB!.prepare("SELECT DISTINCT community_name AS name FROM enlaces_applications WHERE cycle=? AND track='comunidad' AND status<>'draft' AND community_name<>'' ORDER BY community_name COLLATE NOCASE LIMIT 200").bind(enlacesCycle).all<{ name: string }>()).results.map(row => row.name);
}

export type EnlacesScoreRow = { motives: number; proposal: number; participation: number; recommendation: number; total: number; scoredBy: string; scoredAt: number };
export type EnlacesAudit = { action: string; actorEmail: string; createdAt: number; metadata: string | null };
export type EnlacesRecord = { application: EnlacesListRow & { interviewNote: string; consentAt: number; noticeVersion: string }; score: EnlacesScoreRow | null; documents: EnlacesDocument[]; audit: EnlacesAudit[] };

export async function enlacesRecord(id: string): Promise<EnlacesRecord | null> {
  const db = getRuntimeEnv().DB!, now = Date.now();
  const row = await db.prepare(`SELECT ${enlacesColumns},e.account_id AS accountId,e.interview_note AS interviewNote,e.consent_at AS consentAt,e.notice_version AS noticeVersion,a.name,a.username,a.email,s.total,s.motives,s.proposal AS proposalScore,s.participation,s.recommendation FROM enlaces_applications e JOIN staff_accounts a ON a.id=e.account_id LEFT JOIN enlaces_scores s ON s.application_id=e.id WHERE e.id=? AND e.cycle=? AND e.status<>'draft' AND e.retention_until>?`).bind(id, enlacesCycle, now).first<Raw & { interviewNote: string; consentAt: number; noticeVersion: string }>();
  if (!row) return null;
  const [score, documents, audit] = await Promise.all([
    db.prepare("SELECT motives,proposal,participation,recommendation,total,scored_by AS scoredBy,updated_at AS scoredAt FROM enlaces_scores WHERE application_id=?").bind(id).first<EnlacesScoreRow>(),
    db.prepare("SELECT d.id,d.category,d.name,d.mime,d.size,d.status,d.created_at AS createdAt FROM commission_documents d WHERE d.owner_id=? AND d.item_id IS NULL AND d.category IN ('motivation_letter','recommendation_letter','ine_front','ine_back') AND d.status IN ('received','checked','changes') AND d.retention_until>? ORDER BY d.category,d.created_at DESC").bind(row.accountId, now).all<EnlacesDocument>(),
    db.prepare("SELECT action,actor_email AS actorEmail,created_at AS createdAt,metadata_json AS metadata FROM audit_logs WHERE entity_type='enlaces' AND entity_id=? ORDER BY created_at DESC,rowid DESC LIMIT 40").bind(id).all<EnlacesAudit>(),
  ]);
  const latest = new Map<string, EnlacesDocument>();
  for (const document of documents.results) if (!latest.has(document.category)) latest.set(document.category, document);
  return { application: readEnlacesRow(row) as EnlacesRecord["application"], score: score ?? null, documents: [...latest.values()], audit: audit.results };
}

const day = (value: number | null) => value ? new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).format(value) : "";
/** The concentrate for the committee: one row per application, without letters, texts or identification. */
export function enlacesCsv(rows: EnlacesListRow[], ageReference: string) {
  const header = ["Folio", "Nombre", "Usuario", "Correo", "Modalidad", "Comisión", "Comunidad", "Nombre de la comunidad", "Edad al cierre", "Vínculo con Tlalnepantla", "Estado", "Carta de motivos (30)", "Propuesta (25)", "Participación previa (25)", "Carta de recomendación (20)", "Total (100)", "Autoriza publicar su nombre", "Enviada"];
  const lines = rows.map(row => [row.referenceCode, row.name, row.username ?? "", row.email, row.track ? enlacesTracks[row.track] : "", row.commission ? commissionName(row.commission) : "", row.communityKind ? communityKinds[row.communityKind] : "", row.communityName,
    row.birthDate ? ageOn(row.birthDate, ageReference) : "", row.cityTie ? `${cityTies[row.cityTie]}${row.cityTieDetail ? " · " + row.cityTieDetail : ""}` : "", enlacesStatuses[row.status] ?? row.status,
    row.motives ?? "", row.proposalScore ?? "", row.participation ?? "", row.recommendation ?? "", row.total ?? "",
    row.publishNameOk ? "Sí" : "No", day(row.submittedAt)]);
  return "﻿" + [header, ...lines].map(line => line.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
