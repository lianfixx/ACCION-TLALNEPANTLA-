import assert from 'node:assert/strict';

// Explicit setup for scenarios that start after personal-document review.
// Full onboarding tests must upload and review through the HTTP endpoints.
export async function seedReviewedIdentityDocuments(f,accountId){
 assert.ok(f.db.prepare('SELECT id FROM staff_accounts WHERE id=?').get(accountId));
 f.seedAccount('owner@example.test');
 const reviewer=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get('owner@example.test').id;
 const createdAt=Date.now()-10000,retentionUntil=Date.now()+90*86400000;
 const bytes=new TextEncoder().encode('%PDF-1.4\n% Synthetic identity fixture\n%%EOF');
 const insert=f.db.prepare("INSERT INTO commission_documents(id,owner_id,category,object_key,name,mime,size,status,review_note,reviewed_by,notice_snapshot,created_at,updated_at,retention_until) VALUES(?,?,?,?,?,'application/pdf',?,'checked','Revisión sintética previa',?,'fixture-reviewed-identity',?,?,?)");
 const documents={};
 for(const category of ['ine_front','ine_back','address']){
  const id=crypto.randomUUID(),key='private/commission/'+id;
  insert.run(id,accountId,category,key,category+'-fixture.pdf',bytes.byteLength,reviewer,createdAt,createdAt,retentionUntil);
  if(f.bucket)await f.bucket.put(key,bytes);
  documents[category]=id;
 }
 return documents;
}

export async function reviewIdentityDocument(f,id){
 const document=f.db.prepare('SELECT * FROM commission_documents WHERE id=?').get(id);
 assert.ok(document);
 assert.ok(['ine_front','ine_back','address'].includes(document.category));
 const response=await f.call('/api/espacio/documentos/'+id,'PATCH',{action:'review',status:'checked',note:'Documento revisado en prueba aislada',expectedUpdatedAt:document.updated_at});
 assert.equal(response.status,200,await response.clone().text());
 assert.equal(f.db.prepare('SELECT status FROM commission_documents WHERE id=?').get(id).status,'checked');
}
