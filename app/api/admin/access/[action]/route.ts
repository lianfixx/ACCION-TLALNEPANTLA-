import {sessionWriteGuard} from '@/lib/session-write-guard';
import {accountFailure,accountJsonRequired} from '@/lib/account-feedback';
import { currentAuthorizedUser, canManageRoles, isConfiguredOwner } from '@/lib/authz';
import { manageStaffAccess } from '@/lib/staff-management';
import { activateOwner } from '@/lib/owner-activation';
import { safeReturnTo } from '@/lib/account-paths';
import { getRuntimeEnv } from '@/lib/runtime-env';
import { cleanEmail, jsonBodyErrorResponse, noStoreJson, readJsonBody, requestHasJsonContentType, requestIsSameOrigin, matchesExpectedAccount } from '@/lib/security';
import { consumeRateLimit, requestNetworkIdentity } from '@/lib/rate-limit';
import { cleanUsername, getStaffIdentity, createStaffSession, hashPassword, passwordValid, secretHash, sessionToken, setSessionCookie, verifyPassword, StaffCapacityError } from '@/lib/staff-auth';

type Account = { id:string;email:string;username:string|null;name:string;password_hash:string|null;credential_version:number;disabled_at:number|null;updated_at:number;activation_hash:string|null;activation_expires_at:number|null;email_verification_required:number;email_verified_at:number|null };
type Context={params:Promise<{action:string}>};
const reply=(error:string,status=400)=>noStoreJson({error},{status});
const denied=()=>reply('No tienes acceso a esta función.',403);
async function landing(email:string) {
  const role=isConfiguredOwner(email)||await getRuntimeEnv().DB!.prepare('SELECT 1 FROM user_roles WHERE email=? AND revoked_at IS NULL').bind(email).first();
  return role?'/admin':'/mi-comision';
}
export async function POST(request:Request,{params}:Context) {
  if(!requestHasJsonContentType(request))return accountJsonRequired(request);
  if(!requestIsSameOrigin(request))return reply('No pudimos comprobar el origen de la solicitud.',403);
  const {action}=await params;
  if(!['login','logout','activate','password','create','reset','revoke','role'].includes(action))return reply('Esta función no está disponible.',404);
  let input:Record<string,unknown>;
  try{input=await readJsonBody(request,5000);}catch(error){return jsonBodyErrorResponse(error);}
  if(!input||typeof input!=='object'||Array.isArray(input))return reply('Revisa los datos del formulario.');
  const db=getRuntimeEnv().DB;if(!db)return accountFailure(action,'database-binding');
  let stage='rate-limit';
  try {
    if(action==='logout') {
      const actor=await getStaffIdentity();
      if(actor&&!matchesExpectedAccount(request,actor.accountId))return reply('La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario.',412);
      const token=sessionToken(request.headers.get('cookie'));
      if(token)await db.prepare('DELETE FROM staff_sessions WHERE token_hash=?').bind(await secretHash(token)).run();
      return setSessionCookie(noStoreJson({redirect:'/ingresar'}),'',0);
    }
    if(action==='login'||action==='activate') {
      if(!await consumeRateLimit('staff-access-network',requestNetworkIdentity(request)||'unknown-network',30,10*60_000))return reply('Has realizado varios intentos. Espera unos minutos antes de volver a entrar.',429);
      if(action==='login') {
        stage='login-validation';
        const identifier=typeof input.username==='string'?input.username.trim().toLowerCase():cleanEmail(input.email);
        if(!identifier||identifier.length>254||typeof input.password!=='string'||Array.from(input.password).length<1||Array.from(input.password).length>128)return reply('Revisa el usuario y la contraseña.');
        const account=await db.prepare('SELECT * FROM staff_accounts WHERE username=? OR (username IS NULL AND email=?)').bind(identifier,identifier).first<Account>();
        if(!await consumeRateLimit('staff-login-account',account?.id??identifier,10,10*60_000))return reply('Has realizado varios intentos. Espera unos minutos antes de volver a entrar.',429);
        const valid=await verifyPassword(input.password,account?.password_hash??null);
        if(!valid||!account||account.disabled_at)return reply('El usuario o la contraseña no coinciden. Revisa ambos e inténtalo de nuevo.',401);
        if(account.email_verification_required && !account.email_verified_at)return reply('Confirma tu correo antes de entrar. Si no recibiste el mensaje, solicita otro enlace en Confirmar mi correo.',403);
        stage='login-session';
        const token=await createStaffSession(account.id,account.credential_version);
        await audit(account.email,'staff.login',account.id);
        return setSessionCookie(noStoreJson({redirect:safeReturnTo(input.returnTo)||await landing(account.email)}),token);
      }
      if(typeof input.token!=='string'||!/^[a-f0-9]{64}$/.test(input.token))return reply('Falta el código de activación. Vuelve a abrir el enlace privado completo.');
      if(!cleanUsername(input.username))return reply('Elige un usuario de 3 a 40 letras, números, puntos o guiones.');
      if(!passwordValid(input.password))return reply('Elige una contraseña de 15 a 128 caracteres. Puedes usar una frase.');
      stage='activation';
      const owner=await activateOwner(input);
      if(owner&&'conflict' in owner)return reply('Ese usuario no está disponible. Elige otro; tu enlace sigue vigente.',409);
      if(owner)return setSessionCookie(noStoreJson({redirect:'/admin/cuenta'}),await createStaffSession(owner.id,owner.credential_version));
      const tokenHash=await secretHash(input.token),now=Date.now(),username=cleanUsername(input.username);
      const account=await db.prepare('SELECT * FROM staff_accounts WHERE activation_hash=? AND activation_expires_at>? AND disabled_at IS NULL').bind(tokenHash,now).first<Account>();
      if(!account)return reply('Este enlace ya se utilizó o venció. Solicita un nuevo acceso a la administración.',410);
      if(await db.prepare('SELECT 1 FROM staff_accounts WHERE username=? AND id<>?').bind(username,account.id).first())return reply('Ese usuario no está disponible. Elige otro.',409);
      const password=await hashPassword(input.password),changedAt=Math.max(Date.now(),account.updated_at+1);
      const [updated]=await db.batch([
        db.prepare('UPDATE staff_accounts SET username=?,password_hash=?,activation_hash=NULL,activation_expires_at=NULL,credential_version=credential_version+1,updated_at=? WHERE id=? AND activation_hash=? AND activation_expires_at>? AND disabled_at IS NULL AND credential_version=?').bind(username,password,changedAt,account.id,tokenHash,Date.now(),account.credential_version),
        auditChange(account.email,'staff.activated',account.id,changedAt),
      ]);
      if(!updated.meta.changes)return reply('La cuenta cambió mientras guardabas. Inténtalo de nuevo.',409);
      return setSessionCookie(noStoreJson({redirect:await landing(account.email)}),await createStaffSession(account.id,account.credential_version+1));
    }
    stage='account-management';
    const actor=await getStaffIdentity();if(!actor)return denied();
    if(!matchesExpectedAccount(request,actor.accountId))return reply('La sesión corresponde a otra cuenta. Vuelve a entrar con la cuenta de este formulario.',412);
    if(!await consumeRateLimit('staff-account-management',actor.email,15,10*60_000))return reply('Has realizado varios cambios. Espera unos minutos para continuar.',429);
    const authorized=action==='password'?null:await currentAuthorizedUser();
    if(action!=='password'&&(!authorized||!canManageRoles(authorized.email)))return denied();
    const self=await db.prepare('SELECT * FROM staff_accounts WHERE id=?').bind(actor.accountId).first<Account>();
    if(!self||!await verifyPassword(input.currentPassword,self.password_hash))return reply('Escribe tu contraseña actual para confirmar este cambio.',401);
    if(action==='password') {
      if(!passwordValid(input.password))return reply('Elige una contraseña de 15 a 128 caracteres. Puedes usar varias palabras.');
      const sg=sessionWriteGuard(actor);
      const hash=await hashPassword(input.password),now=Math.max(Date.now(),self.updated_at+1);
      const [updated]=await db.batch([
        db.prepare('UPDATE staff_accounts SET password_hash=?,credential_version=credential_version+1,activation_hash=NULL,activation_expires_at=NULL,updated_at=? WHERE id=? AND credential_version=? AND disabled_at IS NULL AND '+sg.sql).bind(hash,now,self.id,self.credential_version,...sg.values),
        auditChange(actor.email,'staff.password_changed',self.id,now),
        db.prepare('DELETE FROM staff_sessions WHERE account_id=? AND credential_version<? AND EXISTS (SELECT 1 FROM staff_accounts WHERE id=? AND credential_version=? AND updated_at=?)').bind(self.id,self.credential_version+1,self.id,self.credential_version+1,now),
      ]);
      if(!updated.meta.changes)return reply('La cuenta cambió mientras guardabas. Vuelve a entrar.',409);
      return setSessionCookie(noStoreJson({message:'Tu contraseña quedó guardada. Las sesiones anteriores se cerraron.'}),await createStaffSession(self.id,self.credential_version+1));
    }
    return await manageStaffAccess(action,input,authorized!.email,self.credential_version,actor);
  }catch(error){
    if(error instanceof StaffCapacityError)return reply('Estamos comprobando otro acceso. Espera unos segundos e inténtalo de nuevo.',429);
    return accountFailure(action,stage);
  }
}
async function audit(email:string,action:string,id:string){await getRuntimeEnv().DB!.prepare('INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,created_at) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),email,action,'staff_account',id,Date.now()).run();}
function auditChange(email:string,action:string,id:string,updatedAt:number){return getRuntimeEnv().DB!.prepare("INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,created_at) SELECT ?,?,?,'staff_account',?,? WHERE changes()>0").bind(crypto.randomUUID(),email,action,id,updatedAt);}
