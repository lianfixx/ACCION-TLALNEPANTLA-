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
 assert.match(body,/href="\/cuenta\/enlaces"[^>]*>Postularme/);assert.match(body,/href="\/archivos\/convocatoria-enlaces-apj-2027\.pdf"/);
 assert.match(body,/hasta el domingo 6 de diciembre a las 23:59 horas/);
 assert.match((await page(f,'/')).html,/href="\/enlaces"/,'entry in the menu and the home page');
 assert.match(await(await f.call('/sitemap.xml','GET',undefined,null)).text(),/\/enlaces/);
 const guest=await page(f,'/cuenta/enlaces');assert.equal(guest.status,307);assert.match(guest.location,/\/ingresar\?returnTo=%2Fcuenta%2Fenlaces/);
 assert.equal((await f.call('/api/enlaces','GET',undefined,null)).status,401);
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
 assert.equal(sent.documents.length,4);
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
 assert.match(main((await page(f,'/cuenta/enlaces',ana)).html),/Recibimos tu postulación/);
 assert.match(main((await page(f,'/cuenta/enlaces',beto)).html),/no se envió antes del cierre/);
 const r=await api(f,ana,{action:'withdraw',expectedUpdatedAt:app.updatedAt});assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).application,null);
 const row=f.db.prepare('SELECT status,motives_text,proposal,birth_date FROM enlaces_applications WHERE account_id=?').get(id);
 assert.deepEqual({...row},{status:'withdrawn',motives_text:'',proposal:'',birth_date:''});
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
