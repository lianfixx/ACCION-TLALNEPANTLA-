import {cleanEmail,cleanText,requestIsSameOrigin,requestHasJsonContentType,readJsonBody,jsonBodyErrorResponse} from '@/lib/security';
import {cleanUsername,passwordValid,hashPassword,createStaffSession,setSessionCookie,StaffCapacityError,secretHash} from '@/lib/staff-auth';
import {getRuntimeEnv} from '@/lib/runtime-env';
import {isCommission} from '@/lib/commissions';
import {isConfiguredOwner} from '@/lib/authz';
import {consumeRateLimit,requestNetworkIdentity} from '@/lib/rate-limit';
import {membershipConfiguration,membershipJson} from '@/lib/membership';
export async function POST(r:Request){const error=(s:string,n=400)=>membershipJson({error:s},{status:n});
 if(!requestIsSameOrigin(r))return error('No pudimos comprobar el origen de la solicitud.',403);if(!requestHasJsonContentType(r))return error('No pudimos leer los datos.',415);
 let x:Record<string,unknown>;try{x=await readJsonBody(r,6000);}catch(e){return jsonBodyErrorResponse(e);}if(!x||typeof x!=='object')return error('Revisa el formulario.');
 try{const cfg=await membershipConfiguration();if(!cfg.enabled)return error('El registro no está abierto en este momento.',503);
 const db=getRuntimeEnv().DB!;if(!await consumeRateLimit('self-register-network',requestNetworkIdentity(r)||'unknown',120,3600000))return error('Espera un momento antes de volver a intentarlo.',429);
 const email=cleanEmail(x.email),username=cleanUsername(x.username),name=cleanText(x.name,120);if(!email||!username||name.length<4||!passwordValid(x.password)||x.adult!==true||x.consent!==true)return error('Completa tus datos y confirma el aviso. La contraseña debe tener al menos 15 caracteres.');
 if(!await consumeRateLimit('self-register-email',email,5,3600000)||!await consumeRateLimit('self-register-username',username,5,3600000))return error('Espera unos minutos antes de volver a registrar esos datos.',429);
 if(x.noticeToken!==cfg.noticeToken)return error('El aviso cambió. Recarga la página para leerlo.',409);
 const unavailable=()=>error('No pudimos registrar esos datos. Usa otro usuario o consulta con administración si ya tienes una cuenta.',409);
 if(isConfiguredOwner(email))return unavailable();
 if(await db.prepare('SELECT 1 WHERE EXISTS (SELECT 1 FROM staff_accounts WHERE email=? OR username=?) OR EXISTS (SELECT 1 FROM user_roles WHERE email=?) OR EXISTS (SELECT 1 FROM membership_applications WHERE owner_email=?)').bind(email,username,email,email).first())return unavailable();
 const id=crypto.randomUUID(),now=Date.now(),hash=await hashPassword(x.password);
 const windowStartedAt=Math.floor(Date.now()/3600000)*3600000,quotaId=`self-register-created:site:${windowStartedAt}`;
 // Both statements commit together. Only an inserted account consumes capacity,
 // and the conditional insert serializes competing requests for the final place.
 const [result]=await db.batch([
  db.prepare("INSERT INTO staff_accounts(id,email,name,username,password_hash,self_registered,registration_notice,registration_consent_at,created_at,updated_at) SELECT ?,?,?,?,?,1,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM staff_accounts WHERE email=? OR username=?) AND NOT EXISTS (SELECT 1 FROM user_roles WHERE email=?) AND NOT EXISTS (SELECT 1 FROM membership_applications WHERE owner_email=?) AND COALESCE((SELECT count FROM rate_limits WHERE id=?),0)<100").bind(id,email,name,username,hash,cfg.snapshot,now,now,now,email,username,email,email,quotaId),
  db.prepare("INSERT INTO rate_limits(id,scope,identity_hash,window_started_at,count,expires_at) SELECT ?,'self-register-created',?,?,1,? WHERE changes()>0 ON CONFLICT(id) DO UPDATE SET count=count+1").bind(quotaId,await secretHash('site'),windowStartedAt,windowStartedAt+7200000),
 ]);
 if(!result.meta.changes){
  const quota=await db.prepare('SELECT count FROM rate_limits WHERE id=?').bind(quotaId).first<{count:number}>();
  return quota&&quota.count>=100?error('La recepción de cuentas alcanzó su límite temporal. Inténtalo más tarde.',429):unavailable();
 }
 return setSessionCookie(membershipJson({redirect:isCommission(x.commission)?`/participacion?comision=${x.commission}#registro`:'/participacion#registro'},{status:201}),await createStaffSession(id,1));
 }catch(e){if(e instanceof StaffCapacityError)return error('Espera unos segundos e inténtalo de nuevo.',429);return error('No pudimos crear la cuenta. Si ya la creaste, entra con tu usuario.',503);}
}
