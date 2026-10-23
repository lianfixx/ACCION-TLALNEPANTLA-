// Chromium regression against the compiled Worker. Only external providers are mocked.
// PLAYWRIGHT_MODULE may point to an externally installed playwright-core module.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createWorkerFixture} from '../helpers/worker-fixture.mjs';
import {ownerConfig,ownerPassword} from '../helpers/owner-account.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const config={...ownerConfig,MEMBERSHIP_ENABLED:'1',MEMBERSHIP_RETENTION_DAYS:'90',MEMBERSHIP_NOTICE_APPROVED:'1',MEMBERSHIP_DIRECT_CONSENT:'1',DATA_CONTROLLER_REGIME:'private',DATA_CONTROLLER_NAME:'Responsable de prueba',DATA_CONTROLLER_ADDRESS:'Domicilio de prueba',ARCO_EMAIL:'privacy@example.test',RIGHTS_PROCEDURE:'Procedimiento de prueba.',PRIVACY_NOTICE_VERSION:'registro-test'};
const f=await createWorkerFixture(config);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const traffic=[],errors=[];
const providerScript=`window.turnstile={render(element,options){window.__testChallenge=options;setTimeout(()=>options.callback('isolated-challenge'),0);return 'isolated-widget';},remove(){},reset(){window.__testChallenge.callback('isolated-challenge');}};`;
async function context(options={}){
 const context=await browser.newContext(options);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin==='https://challenges.cloudflare.com')return route.fulfill({status:200,contentType:'text/javascript',body:providerScript});
  if(url.origin!=='https://example.test')throw new Error('Unexpected external browser request');
  assert.equal(url.searchParams.has('password'),false,'password must never enter the URL');assert.equal(url.searchParams.has('token'),false);assert.equal(url.searchParams.has('codigo'),false);assert.equal(url.hash,'');
  traffic.push({method:request.method(),path:url.pathname});
  if(url.pathname.startsWith('/_next/')||url.pathname.startsWith('/images/')){
   const file=resolve(root,'dist/client','.'+decodeURIComponent(url.pathname));assert.ok(file.startsWith(root+'/dist/client/'));
   try{return route.fulfill({status:200,contentType:({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp'})[extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{return route.fulfill({status:404,body:'Not found'});}
  }
  const headers=await request.allHeaders();
  const r=request.method()==='GET'?await f.call(url.pathname+url.search,'GET',undefined,null,headers):await f.callRaw(url.pathname+url.search,request.postData()||'',null,headers,request.method());
  await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});
 });
 context.on('page',page=>{
  page.on('pageerror',e=>errors.push(e.name));
  page.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|Refused|Executing inline/.test(m.text()))errors.push('CSP violation');});
 });
 return context;
}
async function ready(page,label){await page.waitForFunction(text=>[...document.querySelectorAll('button')].some(el=>el.textContent===text&&!el.disabled),label);}
const fill=(page,name,value)=>page.locator(`[name=${name}]`).fill(value);
async function signupFields(page){for(const [name,value] of Object.entries({name:'Persona de prueba',email:'browser@example.test',username:'browser.person',password:ownerPassword,confirm:ownerPassword}))await fill(page,name,value);for(const name of ['adult','consent'])await page.locator(`[name=${name}]`).check();}
try{
 const owner=await context(),page=await owner.newPage();
 await page.goto('https://example.test/admin/activar#codigo='+'c'.repeat(64));await ready(page,'Guardar y entrar');assert.equal(new URL(page.url()).hash,'');
 await page.reload();await ready(page,'Guardar y entrar');
 await fill(page,'username','owner');await fill(page,'password',ownerPassword);await fill(page,'confirmation',ownerPassword);
 await page.locator('form.staff-form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await page.waitForURL('**/admin/cuenta');assert.equal(traffic.filter(x=>x.path==='/api/admin/access/activate'&&x.method==='POST').length,1);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('apj:activation:code')),null);
 console.log('PASS activation survives reload, submits once, creates owner session and clears the code');await owner.close();

 const participant=await context({viewport:{width:390,height:844}}),signup=await participant.newPage();
 await signup.goto('https://example.test/crear-cuenta?comision=cultura');await ready(signup,'Crear mi cuenta');
 await signup.evaluate(()=>window.__testChallenge['expired-callback']());assert.equal(await signup.getByRole('button',{name:'Crear mi cuenta',exact:true}).isEnabled(),false);
 await signup.getByRole('button',{name:'Reintentar verificación'}).click();await ready(signup,'Crear mi cuenta');
 await signupFields(signup);
 await signup.locator('form.staff-form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await signup.waitForURL('**/confirmar-correo');assert.equal(traffic.filter(x=>x.path==='/api/registro-cuenta'&&x.method==='POST').length,1);
 assert.equal((await participant.cookies()).some(c=>c.name==='__Host-apjt_session'),false);
 assert.equal(f.db.prepare("SELECT email_verified_at FROM staff_accounts WHERE email='browser@example.test'").get().email_verified_at,null);
 const token=f.mail.at(-1).text.match(/#codigo=([a-f0-9]{64})/)[1];
 await signup.goto('https://example.test/confirmar-correo#codigo='+token);await ready(signup,'Confirmar mi correo');assert.equal(new URL(signup.url()).hash,'');
 await signup.reload();await ready(signup,'Confirmar mi correo');await signup.getByRole('button',{name:'Confirmar mi correo',exact:true}).click();
 await signup.getByRole('link',{name:'Entrar con mi usuario y contraseña'}).click();
 await fill(signup,'username','browser.person');await fill(signup,'password',ownerPassword);await signup.getByRole('button',{name:'Entrar',exact:true}).click();
 await signup.waitForURL('**/participacion?comision=cultura#registro');
 assert.ok(f.db.prepare("SELECT email_verified_at FROM staff_accounts WHERE email='browser@example.test'").get().email_verified_at);
 console.log('PASS mobile signup, expired challenge retry, no premature session, confirmation after reload and password sign-in');await participant.close();

 const blocked=await context({javaScriptEnabled:false}),plain=await blocked.newPage();
 for(const [path,api] of [['/ingresar','/api/admin/access/login'],['/crear-cuenta','/api/registro-cuenta']]){
  await plain.goto('https://example.test'+path);
  if(path==='/ingresar'){await fill(plain,'username','synthetic');await fill(plain,'password',ownerPassword);}else await signupFields(plain);
  const response=plain.waitForResponse(r=>new URL(r.url()).pathname===api&&r.request().method()==='POST');
  await plain.locator('form.staff-form').evaluate(form=>form.requestSubmit());assert.equal((await response).status(),415);
  assert.equal(new URL(plain.url()).search,'');assert.match(await plain.locator('main').innerText(),/JavaScript/);
 }
 console.log('PASS JavaScript-disabled forms use POST, show a useful fallback and never place passwords in URLs');await blocked.close();

 const storageBlocked=await context();await storageBlocked.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
 const recovery=await storageBlocked.newPage();await recovery.goto('https://example.test/admin/activar#codigo='+'d'.repeat(64));await ready(recovery,'Guardar y entrar');assert.ok(new URL(recovery.url()).hash);await recovery.reload();await ready(recovery,'Guardar y entrar');await storageBlocked.close();
 assert.deepEqual(errors,[]);console.log('PASS blocked browser storage remains recoverable; no page errors or CSP violations');
}finally{await browser.close();f.close();}
