// Personal documents are checked by administration before the final PAN step.
// Only the latest available document in each required category can satisfy it.
export function personalDocumentsGuard(accountId:string,now=Date.now()){
 return {
  sql:"(SELECT count(DISTINCT identity_doc.category) FROM commission_documents identity_doc WHERE identity_doc.owner_id=? AND identity_doc.item_id IS NULL AND identity_doc.category IN ('ine_front','ine_back','address') AND identity_doc.status='checked' AND identity_doc.retention_until>? AND NOT EXISTS (SELECT 1 FROM commission_documents newer_identity WHERE newer_identity.owner_id=identity_doc.owner_id AND newer_identity.item_id IS NULL AND newer_identity.category=identity_doc.category AND newer_identity.status IN ('received','checked','changes') AND newer_identity.retention_until>? AND (newer_identity.created_at>identity_doc.created_at OR (newer_identity.created_at=identity_doc.created_at AND newer_identity.id>identity_doc.id))))=3",
  values:[accountId,now,now],
 };
}
