import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkerFixture} from './helpers/worker-fixture.mjs';
import {seedReviewedIdentityDocuments} from './helpers/identity-documents.mjs';

// Enlaces APJ 2027 opens and closes by date. These tests move the clock, not the configuration:
// the worker runs with its official window (23 Nov 2026 00:00 to 6 Dec 2026 23:59, Mexico City).
const realNow=Date.now;
const clock=iso=>{const at=Date.parse(iso);Date.now=()=>at;};
const before='2026-11-22T18:00:00Z',during='2026-11-25T18:00:00Z',after='2026-12-08T18:00:00Z';
const base={MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba aislada.',PRIVACY_NOTICE_VERSION:'registro-test',RATE_LIMIT_SECRET:'r'.repeat(40)};
function bucket(){const files=new Map();return{files,async put(k,v){files.set(k,new Uint8Array(v));return{};},async get(k){return files.has(k)?{body:new Response(files.get(k)).body}:null;},async delete(k){for(const id of Array.isArray(k)?k:[k])files.delete(id);}};}
async function fixture(at,env={}){clock(at);const b=bucket(),f=await createWorkerFixture({...base,BUCKET:b,...env});f.bucket=b;return f;}
const done=f=>{f.close();Date.now=realNow;};
/** Moves the clock and keeps the seeded sessions alive, as a returning visitor would. */
function advance(f,iso){clock(iso);const now=Date.now();f.db.prepare('UPDATE staff_sessions SET last_seen_at=?,expires_at=?').run(now,now+8*3600000);}
const owner='owner@example.test',ana='ana@example.test',beto='beto@example.test';
function account(f,email,name){f.seedAccount(email);const a=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get(email);f.db.prepare('UPDATE staff_accounts SET username=?,name=? WHERE id=?').run(email.split('@')[0],name??email,a.id);return a.id;}
const api=(f,email,body)=>f.call('/api/enlaces','POST',body,email);
const view=async(f,email)=>(await f.call('/api/enlaces','GET',undefined,email)).json();
const pdf=new TextEncoder().encode('%PDF-1.4\n% carta de prueba\n%%EOF');
const png=new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
const upload=(f,email,category,bytes=pdf,type='application/pdf')=>f.callRaw('/api/enlaces/documentos?category='+category,bytes,email,{'content-type':type,'x-file-name':encodeURIComponent('Archivo de prueba.pdf')});
const fields=(extra={})=>({track:'comision',commission:'gobierno',communityKind:'',communityName:'',birthDate:'2004-05-10',cityTie:'estudio',cityTieDetail:'CUDEC',motivesText:'Quiero ser Enlace porque en mi escuela nadie conoce el Cabildo. '.repeat(5),previousParticipation:'Organicé dos foros en mi escuela.',proposal:'En mi primer mes organizaría una visita al Ayuntamiento con veinte estudiantes.',publishNameOk:true,...extra});
async function start(f,email){const v=await view(f,email);const r=await api(f,email,{action:'start',consent:true,noticeToken:v.notice.token});assert.equal(r.status,201,await r.clone().text());return (await r.json()).application;}
async function submitted(f,email,extra={}){
 let app=await start(f,email);
 for(const category of ['recommendation_letter','ine_front','ine_back'])assert.equal((await upload(f,email,category)).status,201);
 const r=await api(f,email,{action:'submit',fields:fields(extra),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200,await r.clone().text());app=(await r.json()).application;
 assert.equal(app.status,'submitted');return app;
}
const main=html=>html.slice(html.indexOf('<main'),html.indexOf('</main>')).replaceAll('<!-- -->','');
const page=async(f,path,actor=null)=>{const r=await f.call(path,'GET',undefined,actor);return {status:r.status,html:r.status===200?await r.text():'',location:r.headers.get('location')};};

test('before the opening the page shows only the title and the date',async()=>{const f=await fixture(before);try{
 account(f,ana);
 const {status,html}=await page(f,'/enlaces');assert.equal(status,200);
 assert.match(main(html),/Enlaces APJ 2027/);assert.match(main(html),/Convocatoria disponible el lunes 23 de noviembre/);
 assert.doesNotMatch(main(html),/Postularme|Objeto|Modalidades|Descargar la convocatoria|Primera/);
 const home=(await page(f,'/')).html;assert.doesNotMatch(home,/href="\/enlaces"/,'no entry in the menu or the home page');
 assert.doesNotMatch(await(await f.call('/sitemap.xml','GET',undefined,null)).text(),/\/enlaces/);
 assert.equal((await f.call('/archivos/convocatoria-enlaces-apj-2027.pdf','GET',undefined,null)).status,404,'the PDF stays private');
 const v=await view(f,ana);assert.equal(v.state.phase,'before');
 const early=await api(f,ana,{action:'start',consent:true,noticeToken:v.notice.token});assert.equal(early.status,409);assert.match((await early.json()).error,/todavía no abre/);
 assert.match(main((await page(f,'/cuenta/enlaces',ana)).html),/Todavía no abre/);
 const preview=main((await page(f,'/enlaces',owner)).html);assert.match(preview,/Vista previa de administración/);assert.match(preview,/Objeto/);
}finally{done(f);}});

test('the window opens and closes at the official minute',async()=>{const f=await fixture('2026-11-23T05:59:59Z');try{
 account(f,ana);
 assert.equal((await view(f,ana)).state.phase,'before');
 advance(f,'2026-11-23T06:00:00Z');assert.equal((await view(f,ana)).state.phase,'open','00:00 in Mexico City');
 advance(f,'2026-12-07T05:59:59Z');assert.equal((await view(f,ana)).state.phase,'open','23:59 still receives');
 advance(f,'2026-12-07T06:00:00Z');assert.equal((await view(f,ana)).state.phase,'closed');
}finally{done(f);}});

test('once open the page shows the full convocatoria and leads to the application',async()=>{const f=await fixture(during);try{
 const {html}=await page(f,'/enlaces');const body=main(html);
 for(const text of ['Objeto','Modalidades','Comisiones y plazas','Requisitos y documentos','Registro','Selección','Calendario','Funciones','Reconocimientos','Toma de protesta','Disposiciones finales','Sí, protesto.','Yohualli Emiliano García Milla','Tlalnepantla de Baz, Estado de México, 23 de noviembre de 2026.'])assert.ok(body.includes(text),text);
 assert.match(body,/href="\/cuenta\/enlaces"[^>]*>Postularme/);assert.doesNotMatch(body,/convocatoria-enlaces-apj-2027\.pdf/,'no link to a PDF that has not been uploaded');
 f.db.prepare("INSERT INTO site_documents(slug,object_key,file_name,size_bytes,sha256,uploaded_at,uploaded_by) VALUES('convocatoria-enlaces-apj-2027','site-documents/convocatoria-enlaces-apj-2027/abc.pdf','Convocatoria.pdf',10,'abc',1,?)").run(owner);
 assert.match(main((await page(f,'/enlaces')).html),/href="\/archivos\/convocatoria-enlaces-apj-2027\.pdf"/);
 assert.match(body,/hasta el domingo 6 de diciembre a las 23:59 horas/);
 assert.match((await page(f,'/')).html,/href="\/enlaces"/,'entry in the menu and the home page');
 assert.match(await(await f.call('/sitemap.xml','GET',undefined,null)).text(),/\/enlaces/);
 const guest=await page(f,'/cuenta/enlaces');assert.equal(guest.status,307);assert.match(guest.location,/\/ingresar\?returnTo=%2Fcuenta%2Fenlaces/);
 const anonymous=await f.call('/api/enlaces','GET',undefined,null);assert.equal(anonymous.status,401);assert.equal(anonymous.headers.get('cache-control'),'private, no-store');
 assert.equal(guest.status,307);assert.equal((await f.call('/cuenta/enlaces','GET',undefined,null)).headers.get('cache-control'),'private, no-store');
}finally{done(f);}});

test('a person applies in one screen, gets a folio and can edit until the close',async()=>{const f=await fixture(during);try{
 const id=account(f,ana,'Ana Prueba Ruiz');
 let v=await view(f,ana);assert.equal(v.application,null);assert.equal(v.notice.ready,true);
 assert.equal((await api(f,ana,{action:'start',consent:false,noticeToken:v.notice.token})).status,400,'consent is required');
 assert.equal((await api(f,ana,{action:'start',consent:true,noticeToken:'otro'})).status,409,'the notice shown must be the current one');
 let app=await start(f,ana);assert.equal(app.status,'draft');assert.match(app.referenceCode,/^ENL27-[A-HJ-NP-Z2-9]{8}$/);
 assert.equal((await api(f,ana,{action:'start',consent:true,noticeToken:v.notice.token})).status,409,'one application per account');
 const stored=f.db.prepare('SELECT notice_version,notice_snapshot,consent_at,cycle FROM enlaces_applications WHERE account_id=?').get(id);
 assert.equal(stored.notice_version,'enlaces-2027.1');assert.equal(stored.cycle,'2027');assert.match(stored.notice_snapshot,/comité de selección/);assert.ok(stored.consent_at>0);
 // A draft saves partial answers.
 let r=await api(f,ana,{action:'save',fields:{track:'comunidad',communityKind:'universidad',communityName:'CUDEC'},expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200,await r.clone().text());app=(await r.json()).application;
 assert.equal(app.status,'draft');assert.equal(app.communityName,'CUDEC');
 assert.equal((await api(f,ana,{action:'save',fields:fields(),expectedUpdatedAt:1})).status,409,'stale tab');
 // Sending requires every answer and the three documents.
 r=await api(f,ana,{action:'submit',fields:fields(),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,400);assert.match((await r.json()).error,/carta de recomendación.*identificación oficial/);
 assert.equal((await upload(f,ana,'recommendation_letter')).status,201);assert.equal((await upload(f,ana,'ine_front',png,'image/png')).status,201);
 r=await api(f,ana,{action:'submit',fields:fields(),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,400);assert.match((await r.json()).error,/reverso de tu identificación/);
 assert.equal((await upload(f,ana,'ine_back',png,'image/png')).status,201);
 r=await api(f,ana,{action:'submit',fields:fields({motivesText:'Muy corta.'}),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,400);assert.match((await r.json()).error,/carta de motivos/);
 assert.equal((await upload(f,ana,'motivation_letter')).status,201,'the letter of motives may be a PDF');
 r=await api(f,ana,{action:'submit',fields:fields({motivesText:''}),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200,await r.clone().text());
 const sent=await r.json();app=sent.application;assert.equal(app.status,'submitted');assert.equal(sent.message,'Postulación enviada.');assert.ok(app.submittedAt);
 assert.equal(sent.documents.length,4);assert.ok(!('retentionUntil' in app),'the retention date never leaves the server');
 // Editing after sending keeps it complete.
 r=await api(f,ana,{action:'save',fields:fields({proposal:''}),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,400);
 r=await api(f,ana,{action:'submit',fields:fields({motivesText:'',proposal:'Organizaría un cafecito en mi escuela cada mes del semestre.'}),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200);
 assert.equal((await r.json()).application.status,'submitted');
 const html=main((await page(f,'/cuenta/enlaces',ana)).html);assert.match(html,/Postulación enviada/);assert.ok(html.includes(app.referenceCode),'the folio is visible in the account');
 assert.deepEqual(f.db.prepare("SELECT action FROM audit_logs WHERE entity_type='enlaces' ORDER BY created_at,rowid").all().map(row=>row.action),['enlaces.started','enlaces.submitted','enlaces.updated']);
 // Replacing a file keeps only the newest one.
 assert.equal((await upload(f,ana,'recommendation_letter')).status,201);
 assert.equal(f.db.prepare("SELECT count(*) n FROM commission_documents WHERE owner_id=? AND category='recommendation_letter'").get(id).n,1);
 assert.equal(f.bucket.files.size,4);
 // A sent application keeps its documents: they are changed or withdrawn from Mi postulación.
 const letter=f.db.prepare("SELECT id,updated_at FROM commission_documents WHERE owner_id=? AND category='recommendation_letter'").get(id);
 r=await f.call('/api/espacio/documentos/'+letter.id,'PATCH',{action:'remove',expectedUpdatedAt:letter.updated_at},ana);assert.equal(r.status,409);assert.match((await r.json()).error,/forma parte de tu postulación/);
 assert.match(main((await page(f,'/cuenta',ana)).html),/href="\/cuenta\/enlaces"/,'the account page leads back to the application');
}finally{done(f);}});

test('limits: age, files, another account and the other upload door',async()=>{const f=await fixture(during);try{
 const id=account(f,ana);account(f,beto);
 const app=await start(f,ana);
 for(const [birthDate,pattern] of [['2008-12-07',/aún no tendrás 18/],['1996-12-06',/más de 29/],['2004-02-31',/Revisa tu fecha/]]){
  const r=await api(f,ana,{action:'save',fields:fields({birthDate}),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,400,birthDate);assert.match((await r.json()).error,pattern);
 }
 for(const birthDate of ['2008-12-06','1996-12-07']){const r=await api(f,ana,{action:'save',fields:{birthDate},expectedUpdatedAt:f.db.prepare('SELECT updated_at u FROM enlaces_applications WHERE account_id=?').get(id).u});assert.equal(r.status,200,birthDate+' is 18 or 29 on the closing day');}
 assert.equal((await upload(f,ana,'recommendation_letter',new Uint8Array(6*1024*1024).fill(37))).status,413,'6 MB');
 assert.equal((await upload(f,ana,'recommendation_letter',new TextEncoder().encode('MZ ejecutable disfrazado'),'application/pdf')).status,415,'content must match');
 assert.equal((await upload(f,ana,'recommendation_letter',new TextEncoder().encode('<html>hola</html>'),'text/html')).status,415);
 assert.equal((await upload(f,ana,'motivation_letter',png,'image/png')).status,415,'the letter of motives is a PDF');
 assert.equal((await upload(f,ana,'address')).status,400,'only the documents of the convocatoria');
 assert.equal((await upload(f,beto,'recommendation_letter')).status,403,'no application, no upload');
 assert.ok([400,403].includes((await f.callRaw('/api/espacio/documentos?category=motivation_letter',pdf,ana,{'content-type':'application/pdf'})).status),'letters are not accepted through Mi comisión');
 assert.equal((await f.callRaw('/api/enlaces/documentos?category=recommendation_letter',pdf,ana,{'content-type':'application/pdf',origin:'https://evil.example'})).status,403);
 assert.equal((await upload(f,ana,'recommendation_letter')).status,201);
 const doc=f.db.prepare("SELECT id FROM commission_documents WHERE owner_id=?").get(id).id;
 assert.equal((await f.call('/api/espacio/documentos/'+doc,'GET',undefined,beto)).status,404,'another applicant cannot open it');
 assert.equal((await f.call('/api/espacio/documentos/'+doc,'GET',undefined,null)).status,401);
 assert.equal((await f.call('/api/espacio/documentos/'+doc,'GET',undefined,ana)).status,200);
 assert.equal((await f.call('/api/espacio/documentos/'+doc,'GET',undefined,owner)).status,200,'administration downloads it with its session');
 assert.equal(f.bucket.files.size,1,'rejected files leave nothing behind');
}finally{done(f);}});

test('an identification already in the account is reused',async()=>{const f=await fixture(during);try{
 const id=account(f,ana);const docs=await seedReviewedIdentityDocuments(f,id);
 const app=await start(f,ana);
 assert.deepEqual((await view(f,ana)).documents.map(d=>d.category).sort(),['ine_back','ine_front']);
 const replaced=await upload(f,ana,'ine_front',png,'image/png');assert.equal(replaced.status,409,'a reviewed identification is not replaced from here');assert.match((await replaced.json()).error,/ya fue revisada/);
 assert.equal(f.db.prepare("SELECT status FROM commission_documents WHERE id=?").get(docs.ine_front).status,'checked');
 assert.equal((await upload(f,ana,'recommendation_letter')).status,201);
 const r=await api(f,ana,{action:'submit',fields:fields(),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200,await r.clone().text());
 const retention=f.db.prepare('SELECT retention_until r FROM enlaces_applications WHERE account_id=?').get(id).r;
 assert.equal(retention,Date.parse('2026-12-07T05:59:59Z')+90*86400000,'90 days after the close');
 assert.equal(f.db.prepare('SELECT retention_until r FROM commission_documents WHERE id=?').get(docs.ine_front).r,retention,'the identification lasts as long as the application');
}finally{done(f);}});

test('after the close nothing is received, and a person can still withdraw',async()=>{const f=await fixture(during);try{
 const id=account(f,ana);account(f,beto);
 const app=await submitted(f,ana);const draft=await start(f,beto);
 advance(f,after);
 const body=main((await page(f,'/enlaces')).html);assert.match(body,/Postulaciones cerradas/);assert.doesNotMatch(body,/>Postularme</);assert.match(body,/Objeto/);
 assert.doesNotMatch((await page(f,'/')).html,/href="\/enlaces"/,'the entry leaves the menu until the results');
 for(const action of ['save','submit']){const r=await api(f,ana,{action,fields:fields(),expectedUpdatedAt:app.updatedAt});assert.equal(r.status,409,action);assert.match((await r.json()).error,/ya cerraron/);}
 assert.equal((await upload(f,ana,'recommendation_letter')).status,409);
 assert.equal((await api(f,beto,{action:'submit',fields:fields(),expectedUpdatedAt:draft.updatedAt})).status,409,'a draft cannot be sent late');
 const v=await view(f,beto);assert.equal((await api(f,'nuevo@example.test',{action:'start',consent:true,noticeToken:v.notice.token})).status,409);
 assert.match(main((await page(f,'/cuenta/enlaces',ana)).html),/Recibimos tu postulación\. Nos pondremos en contacto contigo para acordar tu entrevista/);
 assert.match(main((await page(f,'/cuenta/enlaces',beto)).html),/no se envió antes del cierre/);
 const r=await api(f,ana,{action:'withdraw',expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).application,null);
 const row=f.db.prepare('SELECT status,track,commission,community_name,motives_text,proposal,birth_date FROM enlaces_applications WHERE account_id=?').get(id);
 assert.deepEqual({...row},{status:'withdrawn',track:'',commission:'',community_name:'',motives_text:'',proposal:'',birth_date:''});
 assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents WHERE owner_id=?').get(id).n,0,'letters and identification are deleted');
 assert.equal(f.bucket.files.size,0);
}finally{done(f);}});

test('withdrawing while open lets the person start again',async()=>{const f=await fixture(during);try{
 const id=account(f,ana);const app=await submitted(f,ana);
 assert.equal((await api(f,ana,{action:'withdraw',expectedUpdatedAt:app.updatedAt})).status,200);
 const again=await start(f,ana);assert.notEqual(again.referenceCode,app.referenceCode);
 assert.equal(f.db.prepare('SELECT count(*) n FROM enlaces_applications WHERE account_id=?').get(id).n,2);
}finally{done(f);}});

test('no text of the module mentions affiliation',async()=>{const f=await fixture(during);try{
 account(f,ana);
 const pages=[main((await page(f,'/enlaces')).html),main((await page(f,'/cuenta/enlaces',ana)).html),JSON.stringify(await view(f,ana))];
 await start(f,ana);pages.push(main((await page(f,'/cuenta/enlaces',ana)).html));
 for(const text of pages)assert.doesNotMatch(text,/afilia|militan/i);
}finally{done(f);}});

// Panel de administración.
const admin=(f,body,actor=owner)=>f.call('/api/admin/enlaces','POST',body,actor);
const row=(f,email)=>f.db.prepare('SELECT e.* FROM enlaces_applications e JOIN staff_accounts a ON a.id=e.account_id WHERE a.email=? ORDER BY e.created_at DESC').get(email);
const act=async(f,email,body)=>{const r=row(f,email);return admin(f,{...body,id:r.id,expectedUpdatedAt:r.updated_at});};
const score=(f,email,values)=>act(f,email,{action:'score',...values});
const full={motives:28,proposal:22,participation:20,recommendation:18};
async function ok(response){assert.ok(response.ok,`${response.status} ${await response.clone().text()}`);return response.json();}

test('only administration reaches the panel, the list hides drafts and filters work',async()=>{const f=await fixture(during);try{
 account(f,ana,'Ana Prueba');account(f,beto,'Beto Prueba');account(f,'caro@example.test','Caro Prueba');account(f,'editor@example.test');
 f.db.prepare("INSERT INTO user_roles(email,role,created_at,created_by) VALUES('editor@example.test','editor',1,?)").run(owner);
 await submitted(f,ana);await submitted(f,beto,{track:'comunidad',commission:'',communityKind:'universidad',communityName:'CUDEC'});await start(f,'caro@example.test');
 for(const actor of [ana,'editor@example.test',null]){
  assert.equal((await f.call('/admin/enlaces','GET',undefined,actor)).status,307);
  assert.equal((await f.call('/admin/enlaces/'+row(f,ana).id,'GET',undefined,actor)).status,307);
  assert.equal((await admin(f,{action:'publish'},actor)).status,403);
  assert.equal((await f.call('/api/admin/enlaces/exportar','POST',{filters:{}},actor)).status,403);
 }
 const names=async query=>{const html=await(await f.call('/admin/enlaces'+query,'GET',undefined,owner)).text();return ['Ana Prueba','Beto Prueba','Caro Prueba'].filter(name=>html.includes(name));};
 assert.deepEqual(await names(''),['Ana Prueba','Beto Prueba'],'a draft is not listed');
 assert.deepEqual(await names('?track=comunidad'),['Beto Prueba']);assert.deepEqual(await names('?commission=gobierno'),['Ana Prueba']);
 assert.deepEqual(await names('?community=cudec'),['Beto Prueba']);assert.deepEqual(await names('?status=interview'),[]);
 const detail=await(await f.call('/admin/enlaces/'+row(f,ana).id,'GET',undefined,owner)).text();
 for(const text of ['Ana Prueba','Carta de recomendación','Organicé dos foros','Guardar puntaje','/api/espacio/documentos/'])assert.ok(detail.includes(text),text);
 assert.equal((await f.call('/admin/enlaces/'+row(f,'caro@example.test').id,'GET',undefined,owner)).status,404,'a draft has no detail page');
 assert.equal((await f.call('/api/admin/enlaces','POST',{action:'publish'},owner,{origin:'https://evil.example'})).status,403);
}finally{done(f);}});

test('one agreed score per application, with the four criteria of the convocatoria',async()=>{const f=await fixture(during);try{
 account(f,ana);await submitted(f,ana);
 for(const body of [{action:'score',...full},{action:'status',status:'in_review'},{action:'note',note:'Antes de tiempo'}]){const early=await act(f,ana,body);assert.equal(early.status,409,body.action);assert.match((await early.json()).error,/se abre al cierre/);}
 advance(f,after);
 for(const [values,pattern] of [[{...full,motives:31},/Carta de motivos va de 0 a 30/],[{...full,proposal:26},/de 0 a 25/],[{...full,participation:-1},/de 0 a 25/],[{...full,recommendation:20.5},/de 0 a 20/],[{motives:10},/de 0 a 25/]]){
  const r=await score(f,ana,values);assert.equal(r.status,400);assert.match((await r.json()).error,pattern);
 }
 assert.match((await ok(await score(f,ana,full))).message,/Total 88 de 100/);
 assert.match((await ok(await score(f,ana,{motives:30,proposal:25,participation:25,recommendation:20}))).message,/Total 100 de 100/);
 const stored=f.db.prepare('SELECT * FROM enlaces_scores').all();assert.equal(stored.length,1,'a single sheet');assert.equal(stored[0].total,100);assert.equal(stored[0].scored_by,owner);
 const stale=await admin(f,{action:'score',...full,id:row(f,ana).id,expectedUpdatedAt:1});assert.equal(stale.status,409);
 assert.equal((await ok(await act(f,ana,{action:'note',note:'  Entrevista el 8 de diciembre. Clara y puntual. '}))).message,'Nota de entrevista guardada.');
 assert.equal(row(f,ana).interview_note,'Entrevista el 8 de diciembre. Clara y puntual.');
 assert.doesNotMatch(JSON.stringify(await view(f,ana)),/Clara y puntual|"total"/,'the applicant never sees the note or the score');
 assert.deepEqual(f.db.prepare("SELECT action FROM audit_logs WHERE actor_email=? AND entity_type='enlaces' ORDER BY created_at,rowid").all(owner).map(r=>r.action),['enlaces.scored','enlaces.scored','enlaces.interview_note']);
}finally{done(f);}});

test('selection follows the places and the minimum of the convocatoria and keeps the file for the year',async()=>{const f=await fixture(during);try{
 const people=['ana','beto','caro'].map(name=>name+'@example.test');const ids=people.map(email=>account(f,email));
 for(const email of people)await submitted(f,email);
 const dora=account(f,'dora@example.test');await submitted(f,'dora@example.test',{track:'comunidad',commission:'',communityKind:'colonia',communityName:'San Javier'});
 account(f,'eva@example.test');await submitted(f,'eva@example.test',{track:'comunidad',commission:'',communityKind:'colonia',communityName:'  san   JAVIÉR '});
 account(f,'fer@example.test');await submitted(f,'fer@example.test',{track:'comunidad',commission:'',communityKind:'universidad',communityName:'San Javier'});
 advance(f,after);
 let r=await act(f,ana,{action:'status',status:'selected',seat:'titular'});assert.equal(r.status,409);assert.match((await r.json()).error,/Captura el puntaje/);
 for(const email of people)await ok(await score(f,email,full));
 await ok(await act(f,ana,{action:'status',status:'interview'}));
 r=await act(f,ana,{action:'status',status:'selected'});assert.equal(r.status,400);assert.match((await r.json()).error,/titular o como apoyo/);
 assert.match((await ok(await act(f,ana,{action:'status',status:'selected',seat:'titular'}))).message,/Seleccionada, titular/);
 r=await act(f,beto,{action:'status',status:'selected',seat:'titular'});assert.equal(r.status,409);assert.match((await r.json()).error,/ya tiene titular/);
 await ok(await act(f,beto,{action:'status',status:'selected',seat:'apoyo'}));
 for(const seat of ['titular','apoyo']){r=await act(f,'caro@example.test',{action:'status',status:'selected',seat});assert.equal(r.status,409,'a third person has no place');}
 assert.deepEqual(f.db.prepare("SELECT seat FROM enlaces_applications WHERE status='selected' ORDER BY seat").all().map(x=>x.seat),['apoyo','titular']);
 await ok(await act(f,'caro@example.test',{action:'status',status:'substitute'}));
 await ok(await score(f,'dora@example.test',{motives:20,proposal:15,participation:14,recommendation:10}));
 r=await act(f,'dora@example.test',{action:'status',status:'selected'});assert.equal(r.status,409);assert.match((await r.json()).error,/mínimo de 60 puntos\. Esta postulación tiene 59/);
 await ok(await score(f,'dora@example.test',{motives:20,proposal:15,participation:15,recommendation:10}));await ok(await act(f,'dora@example.test',{action:'status',status:'selected'}));
 // One place per university or colonia, however it is written; a university and a colonia are different places.
 for(const email of ['eva@example.test','fer@example.test'])await ok(await score(f,email,full));
 r=await act(f,'eva@example.test',{action:'status',status:'selected'});assert.equal(r.status,409);assert.match((await r.json()).error,/ya tiene su Enlace/);
 await ok(await act(f,'fer@example.test',{action:'status',status:'selected'}));
 r=await score(f,'dora@example.test',{motives:20,proposal:15,participation:14,recommendation:10});assert.equal(r.status,409,'a selected community Enlace keeps the minimum');assert.match((await r.json()).error,/mínimo de 60/);
 // The database itself refuses a second titular in the same commission.
 assert.throws(()=>f.db.prepare("UPDATE enlaces_applications SET status='selected',seat='titular' WHERE id=?").run(row(f,'caro@example.test').id),/UNIQUE/);
 // Until the results are public nothing gives the decision away: neither the status, nor the place, nor a longer retention date.
 const year=Date.parse('2028-01-17T06:00:00Z'),standard=Date.parse('2026-12-07T05:59:59Z')+90*86400000;
 for(const email of [...people,'dora@example.test'])assert.equal(row(f,email).retention_until,standard,email);
 assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents WHERE retention_until<>?').get(standard).n,0,'documents keep the ordinary date');
 const hidden=await view(f,ana);assert.equal(hidden.application.status,'in_review');assert.equal(hidden.application.seat,'','the place is hidden too');assert.doesNotMatch(JSON.stringify(hidden),/retention/i);
 advance(f,'2026-12-10T18:00:00Z');await ok(await admin(f,{action:'publish'}));
 assert.equal(row(f,ana).retention_until,year);assert.equal(row(f,'caro@example.test').retention_until,year,'substitutes are kept as well');assert.equal(row(f,'eva@example.test').retention_until,standard);
 assert.equal(f.db.prepare('SELECT min(retention_until) m FROM commission_documents WHERE owner_id=?').get(ids[0]).m,year,'documents follow the application');
 assert.equal(f.db.prepare('SELECT max(retention_until) m FROM commission_documents WHERE owner_id=(SELECT id FROM staff_accounts WHERE email=?)').get('eva@example.test').m,standard);
 await ok(await act(f,beto,{action:'status',status:'not_selected'}));
 assert.equal(row(f,beto).seat,'','the place is freed');assert.equal(row(f,'dora@example.test').seat,'','a community Enlace has no titular or apoyo');
 assert.equal(row(f,beto).retention_until,standard);assert.equal(f.db.prepare("SELECT max(retention_until) m FROM commission_documents WHERE owner_id=?").get(ids[1]).m,standard,'letters and identification go back to the ordinary date');
 await ok(await act(f,'eva@example.test',{action:'status',status:'substitute'}));assert.equal(row(f,'eva@example.test').retention_until,year);
 assert.equal((await act(f,beto,{action:'status',status:'draft'})).status,400);assert.equal((await act(f,beto,{action:'status',status:'not_selected'})).status,400,'same status');
 await ok(await admin(f,{action:'unpublish'}));
 assert.equal(row(f,ana).retention_until,standard,'withdrawing the results undoes the longer date');assert.equal(f.db.prepare("SELECT max(retention_until) m FROM commission_documents WHERE owner_id=? AND category='recommendation_letter'").get(dora).m,standard);
 assert.equal((await view(f,ana)).application.status,'in_review');assert.equal((await view(f,beto)).application.status,'in_review');
 assert.match(JSON.stringify(f.db.prepare("SELECT metadata_json FROM audit_logs WHERE action='enlaces.status' AND entity_id=? ORDER BY created_at DESC,rowid DESC").get(row(f,beto).id)),/not_selected/);
}finally{done(f);}});

test('results are published by hand after the close, with authorized names only',async()=>{const f=await fixture(during);try{
 account(f,ana,'Ana Prueba Ruiz');account(f,beto,'Beto Reservado');account(f,'caro@example.test','Caro Suplente');account(f,'dora@example.test','Dora Colonia');
 await submitted(f,ana);await submitted(f,beto,{publishNameOk:false});await submitted(f,'caro@example.test');
 await submitted(f,'dora@example.test',{track:'comunidad',commission:'',communityKind:'colonia',communityName:'San Javier'});
 account(f,'eva@example.test','Eva Suspendida');await submitted(f,'eva@example.test');
 let r=await admin(f,{action:'publish'});assert.equal(r.status,409);assert.match((await r.json()).error,/después del cierre/);
 advance(f,after);
 for(const email of [ana,beto,'caro@example.test','dora@example.test','eva@example.test'])await ok(await score(f,email,full));
 await ok(await act(f,ana,{action:'status',status:'selected',seat:'apoyo'}));await ok(await act(f,beto,{action:'status',status:'selected',seat:'titular'}));
 await ok(await act(f,'caro@example.test',{action:'status',status:'substitute'}));await ok(await act(f,'dora@example.test',{action:'status',status:'not_selected'}));
 await ok(await act(f,'eva@example.test',{action:'status',status:'substitute'}));f.db.prepare('UPDATE staff_accounts SET disabled_at=? WHERE email=?').run(Date.now(),'eva@example.test');
 assert.doesNotMatch(main((await page(f,'/enlaces')).html),/Generación 2027|Ana Prueba Ruiz/);
 r=await api(f,'dora@example.test',{action:'delete-documents'});assert.equal(r.status,409,'not before the results');
 await ok(await admin(f,{action:'publish'}));
 const body=main((await page(f,'/enlaces')).html);
 assert.match(body,/Generación 2027/);assert.match(body,/Gobierno/);assert.match(body,/<span>Apoyo<\/span>Ana Prueba Ruiz/);assert.match(body,/<span>Suplentes<\/span>Caro Suplente/);assert.doesNotMatch(body,/<span>Titular<\/span>/,'the titular did not authorize the name');
 assert.doesNotMatch(body,/Beto Reservado|Dora Colonia/,'no name without authorization, and none for people not selected');assert.doesNotMatch(body,/Eva Suspendida/,'a suspended account is not published');
 assert.match(body,/Postulaciones cerradas/);assert.match(body,/Objeto/,'the convocatoria stays visible');
 assert.match((await page(f,'/')).html,/href="\/enlaces"/,'the entry returns with the results');
 assert.equal((await view(f,ana)).application.status,'selected');assert.equal((await view(f,'caro@example.test')).application.status,'substitute');
 assert.match(main((await page(f,'/cuenta/enlaces',ana)).html),/Fuiste seleccionado como Enlace APJ 2027, apoyo de tu comisión\. Nos pondremos en contacto contigo/);
 assert.equal((await view(f,ana)).application.seat,'apoyo');
 assert.match(main((await page(f,'/cuenta/enlaces','dora@example.test')).html),/Borrar mis documentos/);
 r=await api(f,ana,{action:'withdraw',expectedUpdatedAt:row(f,ana).updated_at});assert.equal(r.status,409,'a result is not withdrawn from the account');
 // The authorization to publish the name can be taken back at any time.
 assert.match(main((await page(f,'/cuenta/enlaces',ana)).html),/Quitar la autorización para publicar mi nombre/);
 assert.equal((await api(f,beto,{action:'unpublish-name',expectedUpdatedAt:row(f,beto).updated_at})).status,409,'nothing to take back');
 assert.match((await ok(await api(f,ana,{action:'unpublish-name',expectedUpdatedAt:row(f,ana).updated_at}))).message,/no aparece en los resultados/);
 assert.doesNotMatch(main((await page(f,'/enlaces')).html),/Ana Prueba Ruiz/);assert.equal(row(f,ana).status,'selected');
 const dora=f.db.prepare('SELECT id FROM staff_accounts WHERE email=?').get('dora@example.test').id;
 await ok(await api(f,'dora@example.test',{action:'delete-documents'}));
 assert.equal(f.db.prepare('SELECT count(*) n FROM commission_documents WHERE owner_id=?').get(dora).n,0);
 await ok(await admin(f,{action:'unpublish'}));
 assert.doesNotMatch(main((await page(f,'/enlaces')).html),/Generación 2027/);assert.equal((await view(f,ana)).application.status,'in_review');
 assert.deepEqual(f.db.prepare("SELECT action FROM audit_logs WHERE action LIKE 'enlaces.results%' ORDER BY created_at,rowid").all().map(r=>r.action),['enlaces.results_published','enlaces.results_unpublished']);
}finally{done(f);}});

test('the export is a concentrate without documents or letters, and it is recorded',async()=>{const f=await fixture(during);try{
 account(f,ana,'=Ana Fórmula');account(f,beto,'Beto Prueba');
 await submitted(f,ana);await submitted(f,beto,{track:'comunidad',commission:'',communityKind:'universidad',communityName:'EBC',publishNameOk:false});
 advance(f,after);await ok(await score(f,ana,full));
 const response=await f.call('/api/admin/enlaces/exportar','POST',{filters:{}},owner);assert.equal(response.status,200,await response.clone().text());
 assert.match(response.headers.get('content-disposition'),/^attachment; filename="enlaces-apj-2027-\d{4}-\d{2}-\d{2}\.csv"$/);
 const bytes=new Uint8Array(await response.arrayBuffer());assert.deepEqual([...bytes.slice(0,3)],[0xef,0xbb,0xbf]);
 const text=new TextDecoder().decode(bytes.slice(3)),lines=text.trimEnd().split('\r\n');assert.equal(lines.length,3);
 assert.match(lines[0],/^"Folio","Nombre","Usuario","Correo","Modalidad","Comisión"/);
 assert.ok(text.includes('"\'=Ana Fórmula"'),'formulas are neutralized');assert.ok(text.includes('"Enlace de Comisión","Gobierno"'));assert.ok(text.includes('"Enviada","","28","22","20","18","88","Sí"'));assert.match(lines[0],/"Estado","Plaza","Carta de motivos \(30\)"/);
 assert.ok(text.includes('"Enlace de Comunidad","","Universidad","EBC","22"'));assert.ok(text.includes('"","","","","","No"'),'no score yet');
 assert.doesNotMatch(text,/Quiero ser Enlace|Organicé dos foros|2004-05-10|private\/commission/,'no letters, texts, birth dates or files');
 const only=await f.call('/api/admin/enlaces/exportar','POST',{filters:{track:'comunidad'}},owner);assert.equal(new TextDecoder().decode(await only.arrayBuffer()).trimEnd().split('\r\n').length,2);
 assert.deepEqual(JSON.parse(f.db.prepare("SELECT metadata_json FROM audit_logs WHERE action='enlaces.export' ORDER BY created_at DESC,rowid DESC").get().metadata_json),{filters:{track:'comunidad'},rows:1});
}finally{done(f);}});

test('a withdrawn application is closed for the panel, and expired ones are purged',async()=>{const f=await fixture(during);try{
 const id=account(f,ana);const app=await submitted(f,ana);advance(f,after);await ok(await score(f,ana,full));
 await ok(await api(f,ana,{action:'withdraw',expectedUpdatedAt:row(f,ana).updated_at}));
 assert.equal(f.db.prepare('SELECT count(*) n FROM enlaces_scores').get().n,0,'the score leaves with the application');
 const r=await admin(f,{action:'status',status:'in_review',id:app.id,expectedUpdatedAt:row(f,ana).updated_at});assert.equal(r.status,409);assert.match((await r.json()).error,/retirada/);
 advance(f,'2027-04-01T12:00:00Z');
 await f.scheduled(Date.now());
 assert.equal(f.db.prepare('SELECT count(*) n FROM enlaces_applications WHERE account_id=?').get(id).n,0);
 assert.equal(f.db.prepare("SELECT count(*) n FROM audit_logs WHERE entity_type='enlaces' AND entity_id=?").get(app.id).n,0,'the history leaves with the application');
}finally{done(f);}});

test('saving while typing never uses up the allowance to send or withdraw',async()=>{const f=await fixture(during);try{
 account(f,ana);let app=await start(f,ana);
 for(let i=0;i<70;i++){const r=await api(f,ana,{action:'save',fields:{proposal:'Borrador '+i},expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200,'save '+i);app=(await r.json()).application;}
 for(let i=0;i<59;i++)assert.equal((await api(f,ana,{action:'withdraw',expectedUpdatedAt:1})).status,409);
 assert.equal((await api(f,ana,{action:'withdraw',expectedUpdatedAt:1})).status,429,'the start counted too');
 const r=await api(f,ana,{action:'save',fields:{proposal:'Sigo escribiendo'},expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200,'saving has its own allowance');
}finally{done(f);}});

test('the PDF of the convocatoria lives only in private storage and opens with the convocatoria',async()=>{const f=await fixture(before);try{
 const key='site-documents/convocatoria-enlaces-apj-2027/abc.pdf';await f.bucket.put(key,pdf);
 f.db.prepare("INSERT INTO site_documents(slug,object_key,file_name,size_bytes,sha256,uploaded_at,uploaded_by) VALUES('convocatoria-enlaces-apj-2027',?,'Convocatoria.pdf',?,'abc',1,?)").run(key,pdf.byteLength,owner);
 const path='/archivos/convocatoria-enlaces-apj-2027.pdf';
 assert.equal((await f.call(path,'GET',undefined,null)).status,404,'private before the opening');
 const preview=await f.call(path,'GET',undefined,owner);assert.equal(preview.status,200);assert.equal(preview.headers.get('cache-control'),'private, no-store');
 assert.equal((await f.call('/documentos/convocatoria-enlaces-apj-2027.pdf','GET',undefined,null)).status,404,'there is no static copy');
 advance(f,during);
 const open=await f.call(path,'GET',undefined,null);assert.equal(open.status,200);assert.equal(open.headers.get('content-type'),'application/pdf');
 assert.match(open.headers.get('content-disposition'),/convocatoria-enlaces-apj-2027\.pdf/);
 f.db.prepare("DELETE FROM site_documents").run();
 assert.equal((await f.call(path,'GET',undefined,null)).status,404,'without the file there is no redirect to a public folder');
}finally{done(f);}});
