/** The eight downloadable PDFs. The static originals stay in public/documentos; replacements live in R2. */
export const siteDocumentList = [
  { slug: "guia-gobierno", label: "Guía de Gobierno" },
  { slug: "guia-administracion", label: "Guía de Administración" },
  { slug: "guia-comunicacion", label: "Guía de Comunicación" },
  { slug: "guia-cultura", label: "Guía de Cultura" },
  { slug: "guia-tecnologia", label: "Guía de Tecnología e IA" },
  { slug: "guia-mujeres", label: "Guía de Mujeres al frente" },
  { slug: "formato-evento", label: "Formato de evento APJ-F01" },
  { slug: "bases-y-anexos-para-aprobacion", label: "Bases y anexos para aprobación" },
] as const;

export type SiteDocumentSlug = typeof siteDocumentList[number]["slug"];
export const SITE_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;

export const isSiteDocumentSlug = (value: unknown): value is SiteDocumentSlug => typeof value === "string" && siteDocumentList.some(item => item.slug === value);
/** Public URL served by app/archivos/[file]: R2 version when one exists, otherwise the static original. */
export const siteDocumentHref = (slug: SiteDocumentSlug) => `/archivos/${slug}.pdf`;
export const staticDocumentHref = (slug: SiteDocumentSlug) => `/documentos/${slug}.pdf`;
export const commissionGuideHref = (commission: string) => isSiteDocumentSlug(`guia-${commission}`) ? siteDocumentHref(`guia-${commission}` as SiteDocumentSlug) : "/comisiones";

export type SiteDocumentRow = { slug: SiteDocumentSlug; object_key: string; file_name: string; size_bytes: number; sha256: string; uploaded_at: number; uploaded_by: string };
