import {editorialPosts} from "./editorial-post";
import {availableEditorialPosts} from "./public-posts";
import { getRuntimeEnv } from "@/lib/runtime-env";
import type { PanelData } from "@/lib/admin-types";

export type AdminSection = "resumen" | "agenda" | "configuracion" | "publicaciones" | "medios" | "opiniones" | "solicitudes" | "incorporaciones" | "roles" | "auditoria";
export type AdminQuery = { section: AdminSection; q: string; state: string; page: number };
const sections = ["resumen", "agenda", "configuracion", "publicaciones", "medios", "opiniones", "solicitudes", "incorporaciones", "roles", "auditoria"];
export function parseAdminQuery(params: Record<string, string | string[] | undefined>): AdminQuery {
  const single = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const page = Number(single("page"));
  return { section: (sections.includes(single("section")) ? single("section") : "resumen") as AdminSection, q: single("q").trim().slice(0,120), state: single("state").slice(0,30), page: Number.isSafeInteger(page) && page >= 1 ? Math.min(page,1_000_000) : 1 };
}

const spec = {
  publicaciones: { table: "posts p", columns: "p.id,p.slug,p.title,p.excerpt,p.body,p.cover_media_id AS coverMediaId,p.status,p.created_at AS createdAt,p.updated_at AS updatedAt,p.published_at AS publishedAt", search: ["p.title","p.slug","p.excerpt"], order: "p.updated_at DESC,p.id DESC", status: "p.status", filters: [["draft","Borrador"],["published","Publicado"],["archived","Archivado"]] },
  medios: { table: "media m", columns: "m.id,m.file_name AS fileName,m.mime_type AS mimeType,m.size_bytes AS sizeBytes,m.alt_text AS altText,m.visibility,m.created_at AS createdAt,m.updated_at AS updatedAt,(SELECT count(*) FROM posts p WHERE p.cover_media_id=m.id AND p.status='published') AS usedByPublishedPosts", search: ["m.file_name","m.alt_text"], order: "m.created_at DESC,m.id DESC", status: "m.visibility", filters: [["private","Privada"],["public","Pública"]] },
  opiniones: { table: "comments c INNER JOIN posts p ON p.id=c.post_id", columns: "c.id,c.post_id AS postId,p.title AS postTitle,c.author_name AS authorName,c.body,c.status,c.created_at AS createdAt,c.retention_until AS retentionUntil,c.moderated_at AS moderatedAt", search: ["c.author_name","c.body","p.title"], order: "c.created_at DESC,c.id DESC", status: "c.status", filters: [["pending","Pendiente"],["approved","Aprobada"],["rejected","Rechazada"]] },
  solicitudes: { table: "contact_requests r", columns: "r.id,r.kind,r.name,r.email,r.phone,r.institution,r.message,r.details_json AS detailsJson,r.reference_code AS referenceCode,r.status,r.assigned_to AS assignedTo,r.created_at AS createdAt,coalesce(r.updated_at,r.created_at) AS updatedAt,r.retention_until AS retentionUntil", search: ["r.reference_code","r.name","r.email","r.message"], order: "r.created_at DESC,r.id DESC", status: "r.status", filters: [["new","Nueva"],["in_review","En revisión"],["closed","Cerrada"]] },
  incorporaciones: { table: "membership_applications r", columns: "r.id,r.owner_email AS ownerEmail,r.name,r.commission,r.note,r.profile_json AS profileJson,r.reference_code AS referenceCode,r.status,r.notice_version AS noticeVersion,r.consent_at AS consentAt,r.created_at AS createdAt,r.updated_at AS updatedAt,r.retention_until AS retentionUntil", search: ["r.reference_code","r.name","r.owner_email","r.commission"], order: "r.created_at DESC,r.id DESC", status: "r.status", filters: [["submitted","Recibida"],["in_review","En revisión"],["accepted","Incorporación registrada"],["closed","Cerrada"],["withdrawn","Retirada"]] },
  roles: { table: "user_roles r", columns: "r.email,r.role,r.created_at AS createdAt,r.updated_at AS updatedAt,r.revoked_at AS revokedAt", search: ["r.email"], order: "r.created_at DESC,r.email DESC", status: "r.role", filters: [["admin","Administrador"],["editor","Editor"],["moderator","Moderador"]] },
  auditoria: { table: "audit_logs a", columns: "a.id,a.actor_email AS actorEmail,a.action,a.entity_type AS entityType,a.entity_id AS entityId,a.metadata_json AS metadataJson,a.created_at AS createdAt", search: ["a.actor_email","a.action","a.entity_id"], order: "a.created_at DESC,a.id DESC", status: "a.entity_type", filters: [["post","Publicaciones"],["media","Imágenes"],["activity","Agenda"],["contact_request","Solicitudes"],["settings","Configuración"]] },
  agenda: { table: "activities a", columns: "a.id,a.title,a.description,a.location,a.starts_at AS startsAt,a.ends_at AS endsAt,a.registration_url AS registrationUrl,a.status,a.created_at AS createdAt,a.updated_at AS updatedAt", search: ["a.title","a.location","a.description"], order: "a.starts_at DESC,a.id DESC", status: "a.status", filters: [["draft","Borrador"],["published","Publicada"],["cancelled","Cancelada"]] },
} as const;

export async function adminCollection(query: AdminQuery, allowed: boolean) {
  const empty = { rows: [] as unknown[], total: 0, page: 1, pages: 1, filters: [] as Array<{ value: string; label: string }> };
  if (!allowed || !(query.section in spec)) return empty;
  const s = spec[query.section as keyof typeof spec], db = getRuntimeEnv().DB!;
  const clauses: string[] = [], args: (string | number)[] = [];
  let table:string=s.table;
  if(query.section==='publicaciones'){
    table="(SELECT id,slug,title,excerpt,body,cover_media_id,status,created_at,updated_at,published_at FROM posts"+editorialPosts.map(post=>{
      args.push(post.id,post.slug,post.title,post.excerpt,post.body,post.coverMediaId,post.status,post.createdAt,post.updatedAt,post.publishedAt,post.id,post.slug);
      return " UNION ALL SELECT ?,?,?,?,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM posts WHERE id=? OR slug=?)";
    }).join('')+") p";
  }
  if (query.section === "solicitudes" || query.section === "incorporaciones" || query.section === "opiniones") { clauses.push(`${query.section === "opiniones" ? "c" : "r"}.retention_until > ?`); args.push(Date.now()); }
  if (query.q) { clauses.push(`(${s.search.map(column => `${column} LIKE ? ESCAPE '\\'`).join(" OR ")})`); const term = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`; args.push(...s.search.map(() => term)); }
  if (s.filters.some(([value]) => value === query.state)) { clauses.push(`${s.status} = ?`); args.push(query.state); }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  const total = (await db.prepare(`SELECT count(*) AS total FROM ${table}${where}`).bind(...args).first<{total:number}>())?.total ?? 0;
  const pages = Math.max(1,Math.ceil(total / 25)), page = Math.min(query.page,pages);
  const rows = await db.prepare(`SELECT ${s.columns} FROM ${table}${where} ORDER BY ${s.order} LIMIT 25 OFFSET ?`).bind(...args,(page-1)*25).all();
  return { rows: rows.results, total, page, pages, filters: s.filters.map(([value,label]) => ({ value, label })) };
}

export async function adminMetrics(permissions: PanelData["permissions"]): Promise<PanelData["metrics"]> {
  const db = getRuntimeEnv().DB!;
  const count = async (sql: string, ...args: number[]) => Number((await db.prepare(sql).bind(...args).first<{n:number}>())?.n ?? 0);
  return {
    activities: permissions.content ? await count("SELECT count(*) n FROM activities WHERE status='published' AND ends_at >= ?",Date.now()) : 0,
    publishedPosts: permissions.content ? await count("SELECT count(*) n FROM posts WHERE status='published'") + (await availableEditorialPosts()).length : 0,
    otherPosts: permissions.content ? await count("SELECT count(*) n FROM posts WHERE status <> 'published'") : 0,
    pendingComments: permissions.moderation ? await count("SELECT count(*) n FROM comments WHERE status='pending' AND retention_until > ?",Date.now()) : 0,
    openRequests: permissions.requests ? await count("SELECT count(*) n FROM contact_requests WHERE status <> 'closed' AND retention_until > ?",Date.now()) : 0,
    openMemberships: permissions.requests ? await count("SELECT count(*) n FROM membership_applications WHERE status IN ('submitted','in_review') AND retention_until > ?",Date.now()) : 0,
    media: permissions.content ? await count("SELECT count(*) n FROM media") : 0,
    privateMedia: permissions.content ? await count("SELECT count(*) n FROM media WHERE visibility='private'") : 0,
  };
}
