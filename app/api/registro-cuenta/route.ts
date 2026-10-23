import {cleanEmail,cleanText,requestIsSameOrigin,requestHasJsonContentType,readJsonBody,jsonBodyErrorResponse} from '@/lib/security';
import {cleanUsername,passwordValid,hashPassword,StaffCapacityError,secretHash} from '@/lib/staff-auth';
import {accountFailure,accountJsonRequired} from '@/lib/account-feedback';
import {registrationServices,verifyRegistrationChallenge,sendRegistrationConfirmation,RegistrationServiceError} from '@/lib/registration-verification';
import {getRuntimeEnv} from '@/lib/runtime-env';
import {isCommission} from '@/lib/commissions';
import {isConfiguredOwner} from '@/lib/authz';
import {consumeRateLimit,requestNetworkIdentity} from '@/lib/rate-limit';
import {membershipConfiguration,membershipJson} from '@/lib/membership';
export async function POST(r:Request){const error=(s:string,n=400)=>membershipJson({error:s},{status:n});
 if(!requestHasJsonContentType(r))return accountJsonRequired(r);if(!requestIsSameOrigin(r))return error('No pudimos comprobar el origen de la solicitud.',403);
 let x:Record<string,unknown>;try{x=await readJsonBody(r,9000);}catch(e){return jsonBodyErrorResponse(e);}if(!x||typeof x!=='object'||Array.isArray(x))return error('Revisa el formulario.');
 try{const cfg=await membershipConfiguration();if(!cfg.enabled)return error('El registro no está abierto en este momento.',503);
 if(!registrationServices().ready)return error('El registro está pendiente de configurar la confirmación de correo y la verificación antiabuso. Inténtalo más tarde.',503);
 const db=getRuntimeEnv().DB!;if(!await consumeRateLimit('self-register-network',requestNetworkIdentity(r)||'unknown',120,3600000))return error('Espera un momento antes de volver a intentarlo.',429);
 const email=cleanEmail(x.email),username=cleanUsername(x.username),name=cleanText(x.name,120);if(!email||!username||name.length<4||!passwordValid(x.password)||x.adult!==true||x.consent!==true)return error('Completa tus datos y confirma el aviso. La contraseña debe tener al menos 15 caracteres.');
 if(!await consumeRateLimit('self-register-email',email,5,3600000)||!await consumeRateLimit('self-register-username',username,5,3600000))return error('Espera unos minutos antes de volver a registrar esos datos.',429);
 if(x.noticeToken!==cfg.noticeToken)return error('El aviso cambió. Recarga la página para leerlo.',409);
 if(!await verifyRegistrationChallenge(x['cf-turnstile-response'],requestNetworkIdentity(r)))return error('Completa de nuevo la verificación antiabuso.');
 const unavailable=()=>error('No pudimos registrar esos datos. Si ya creaste tu cuenta, entra o solicita otro correo de confirmación. Si recibiste un enlace privado de activación, úsalo para abrir tu cuenta.',409);
 if(isConfiguredOwner(email))return unavailable();
 if(await db.prepare('SELECT 1 WHERE EXISTS (SELECT 1 FROM staff_accounts WHERE email=? OR username=?) OR EXISTS (SELECT 1 FROM user_roles WHERE email=?) OR EXISTS (SELECT 1 FROM membership_applications WHERE owner_email=?)').bind(email,username,email,email).first())return unavailable();
 const id=crypto.randomUUID(),now=Date.now(),hash=await hashPassword(x.password);
 const windowStartedAt=Math.floor(Date.now()/3600000)*3600000,quotaId=`self-register-created:site:${windowStartedAt}`;
 // Both statements commit together. Only an inserted account consumes capacity,
 // and the conditional insert serializes competing requests for the final place.
 const [result]=await db.batch([
  db.prepare("INSERT INTO staff_accounts(id,email,name,username,password_hash,self_registered,email_verification_required,registration_notice,registration_consent_at,created_at,updated_at) SELECT ?,?,?,?,?,1,1,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM staff_accounts WHERE email=? OR username=?) AND NOT EXISTS (SELECT 1 FROM user_roles WHERE email=?) AND NOT EXISTS (SELECT 1 FROM membership_applications WHERE owner_email=?) AND COALESCE((SELECT count FROM rate_limits WHERE id=?),0)<100").bind(id,email,name,username,hash,cfg.snapshot,now,now,now,email,username,email,email,quotaId),
  db.prepare("INSERT INTO rate_limits(id,scope,identity_hash,window_started_at,count,expires_at) SELECT ?,'self-register-created',?,?,1,? WHERE changes()>0 ON CONFLICT(id) DO UPDATE SET count=count+1").bind(quotaId,await secretHash('site'),windowStartedAt,windowStartedAt+7200000),
 ]);
 if(!result.meta.changes){
  const quota=await db.prepare('SELECT count FROM rate_limits WHERE id=?').bind(quotaId).first<{count:number}>();
  return quota&&quota.count>=100?error('La recepción de cuentas alcanzó su límite temporal. Inténtalo más tarde.',429):unavailable();
 }
 await sendRegistrationConfirmation(id,isCommission(x.commission)?`/participacion?comision=${x.commission}#registro`:'/participacion#registro');
 return membershipJson({redirect:'/confirmar-correo',requiresEmailConfirmation:true,message:'Tu cuenta está pendiente de confirmar el correo. Revisa tu bandeja de entrada.'},{status:201});
 }catch(e){if(e instanceof StaffCapacityError)return error('Espera unos segundos e inténtalo de nuevo.',429);if(e instanceof RegistrationServiceError&&e.stage==='email')return accountFailure('registration','email','Tu cuenta quedó pendiente. No pudimos enviar el correo. Usa Solicitar otro correo de confirmación para intentarlo de nuevo.');return accountFailure('registration',e instanceof RegistrationServiceError?e.stage:'account-creation');}
}
