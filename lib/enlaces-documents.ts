import { getRuntimeEnv } from "./runtime-env";
import type { EnlacesDocumentCategory } from "./enlaces-shared";

export type EnlacesDocument = { id: string; category: EnlacesDocumentCategory; name: string; mime: string; size: number; status: string; createdAt: number };
const live = "d.item_id IS NULL AND d.status IN ('received','checked','changes') AND d.retention_until>?";

/** The newest live file of each kind. Identification already delivered in Mi comisión counts too. */
export async function enlacesDocuments(accountId: string) {
  const rows = (await getRuntimeEnv().DB!.prepare(`SELECT d.id,d.category,d.name,d.mime,d.size,d.status,d.created_at AS createdAt FROM commission_documents d WHERE d.owner_id=? AND d.category IN ('motivation_letter','recommendation_letter','ine_front','ine_back') AND ${live} ORDER BY d.created_at DESC,d.id DESC`).bind(accountId, Date.now()).all<EnlacesDocument>()).results;
  const latest = new Map<string, EnlacesDocument>();
  for (const row of rows) if (!latest.has(row.category)) latest.set(row.category, row);
  return [...latest.values()];
}

/** What the application still needs before it can be sent. An identification in PDF may hold both sides. */
export function missingEnlacesDocuments(documents: EnlacesDocument[], motivesText: string) {
  const has = (category: EnlacesDocumentCategory) => documents.some(document => document.category === category);
  const front = documents.find(document => document.category === "ine_front");
  const missing: string[] = [];
  if (motivesText.trim().length < 200 && !has("motivation_letter")) missing.push("tu carta de motivos, escrita aquí (al menos 200 caracteres) o en PDF");
  if (!has("recommendation_letter")) missing.push("tu carta de recomendación");
  if (!front) missing.push("tu identificación oficial");
  else if (front.mime !== "application/pdf" && !has("ine_back")) missing.push("el reverso de tu identificación");
  return missing;
}

/**
 * Removes the letters of an application and, when the account has no registration that needs it,
 * the identification as well. The rows are hidden at once; a row is deleted only after its file is gone,
 * and the daily purge retries whatever could not be deleted here.
 */
export async function removeEnlacesDocuments(accountId: string, email: string) {
  const env = getRuntimeEnv(), db = env.DB!, now = Date.now();
  const keepsIdentity = Boolean(await db.prepare("SELECT 1 WHERE EXISTS (SELECT 1 FROM membership_applications WHERE owner_email=? AND status IN ('submitted','in_review','accepted') AND retention_until>?) OR EXISTS (SELECT 1 FROM commission_members WHERE account_id=? AND active=1)").bind(email, now, accountId).first());
  const categories = keepsIdentity ? ["motivation_letter", "recommendation_letter"] : ["motivation_letter", "recommendation_letter", "ine_front", "ine_back"];
  const marks = categories.map(() => "?").join(",");
  await db.prepare(`UPDATE commission_documents SET status='removed',retention_until=? WHERE owner_id=? AND item_id IS NULL AND category IN (${marks})`).bind(now, accountId, ...categories).run();
  const files = (await db.prepare(`SELECT id,object_key AS objectKey FROM commission_documents WHERE owner_id=? AND item_id IS NULL AND category IN (${marks})`).bind(accountId, ...categories).all<{ id: string; objectKey: string }>()).results;
  let failed = 0;
  for (const file of files) {
    try { await env.BUCKET!.delete(file.objectKey); await db.prepare("DELETE FROM commission_documents WHERE id=? AND owner_id=?").bind(file.id, accountId).run(); }
    catch { failed++; }
  }
  return { removed: files.length - failed, failed };
}
