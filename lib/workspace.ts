import {secretHash} from './staff-auth';
import {getRuntimeEnv} from './runtime-env';
import {getStaffIdentity,type StaffIdentity} from './staff-auth';
import {currentAuthorizedUser,isConfiguredOwner} from './authz';
import {sessionWriteGuard} from './session-write-guard';
import {membershipConfiguration,membershipJson} from './membership';
import {workspaceConsent,workspaceNotice,workspaceVersion,type WorkItem} from './workspace-shared';
import {personalDocumentsGuard} from './onboarding-documents';
export type WorkspaceActor=StaffIdentity & {admin:boolean};
export async function workspaceActor():Promise<WorkspaceActor|null>{const a=await getStaffIdentity();if(!a)return null;const r=await currentAuthorizedUser();return{...a,admin:r?.role==='admin'};}
export const wsdb=()=>getRuntimeEnv().DB!;
export const wsReply=membershipJson;
export const wsError=(error:string,status=400)=>wsReply({error},{status});
export function guard(a:WorkspaceActor,admin=false){const g=sessionWriteGuard(a);return{sql:g.sql+(admin&&!isConfiguredOwner(a.email)?" AND EXISTS (SELECT 1 FROM user_roles WHERE email=? AND role='admin' AND revoked_at IS NULL)":""),values:[...g.values,...(admin&&!isConfiguredOwner(a.email)?[a.email]:[])]};}
export function memberSQL(a:WorkspaceActor,commission:string,coordinator=false){return{sql:"EXISTS (SELECT 1 FROM commission_members cm WHERE cm.account_id=? AND cm.commission=? AND cm.active=1"+(coordinator?" AND cm.role='coordinator'":"")+")",values:[a.accountId,commission]};}
export async function member(a:WorkspaceActor,commission:string){return wsdb().prepare('SELECT role FROM commission_members WHERE account_id=? AND commission=? AND active=1').bind(a.accountId,commission).first<{role:string}>();}
export async function accessibleItem(id:string,a:WorkspaceActor){
 const live=guard(a,a.admin),now=Date.now();
 const scope=a.admin?'':" AND (current_item.owner_id=? OR current_item.status<>'draft') AND EXISTS (SELECT 1 FROM commission_members current_member WHERE current_member.account_id=? AND current_member.commission=current_item.commission AND current_member.active=1)";
 return wsdb().prepare('SELECT current_item.* FROM commission_items current_item WHERE current_item.id=? AND current_item.retention_until>? AND '+live.sql+scope).bind(id,now,...live.values,...(a.admin?[]:[a.accountId,a.accountId])).first<WorkItem>();
}
export function itemGuard(a:WorkspaceActor,item:WorkItem,write=false){if(a.admin)return guard(a,true);const g=guard(a),m=memberSQL(a,item.commission);return{sql:g.sql+' AND '+m.sql+" AND EXISTS (SELECT 1 FROM commission_items current WHERE current.id=? AND current.retention_until>? AND (current.status<>'draft' OR current.owner_id=?))"+(write&&item.owner_id!==a.accountId?" AND 0":""),values:[...g.values,...m.values,item.id,Date.now(),a.accountId]};}
export async function workspaceSnapshot(){const c=await membershipConfiguration();const snapshot=JSON.stringify({version:workspaceVersion,controller:c.notice.controller,address:c.notice.address,email:c.notice.email,legalBasis:c.notice.legalBasis,rightsProcedure:c.notice.rightsProcedure,transparencyAddress:c.transparencyAddress,consent:workspaceConsent,sections:workspaceNotice});return{enabled:c.ready,snapshot,token:await secretHash(snapshot),notice:c.notice};}
export async function hasWorkspaceConsent(a:WorkspaceActor){const c=await workspaceSnapshot();const row=await wsdb().prepare('SELECT snapshot FROM workspace_consents WHERE account_id=? AND snapshot=?').bind(a.accountId,c.snapshot).first<{snapshot:string}>();return c.enabled&&row?.snapshot===c.snapshot;}
export function auditStatement(a:WorkspaceActor,action:string,id:string,now:number){return wsdb().prepare("INSERT INTO audit_logs(id,actor_email,action,entity_type,entity_id,created_at) SELECT ?,?,?,'commission',?,? WHERE changes()>0").bind(crypto.randomUUID(),a.email,action,id,now);}

export function enrollmentGuard(a:WorkspaceActor){return{sql:"(EXISTS (SELECT 1 FROM membership_applications ma WHERE ma.owner_email=? AND ma.status IN ('submitted','in_review','accepted') AND ma.retention_until>?) OR EXISTS (SELECT 1 FROM commission_members cm WHERE cm.account_id=? AND cm.active=1))",values:[a.email,Date.now(),a.accountId]};}
// PAN follow-up is the last onboarding step, after the commission confirms access.
// The same condition is checked again inside the database write, including uploads.
export function affiliationGuard(a:WorkspaceActor){const documents=personalDocumentsGuard(a.accountId);return{sql:"EXISTS (SELECT 1 FROM commission_members cm WHERE cm.account_id=? AND cm.active=1) AND "+documents.sql,values:[a.accountId,...documents.values]};}
export async function consentGuard(a:WorkspaceActor){const cfg=await workspaceSnapshot();return{sql:cfg.enabled?"EXISTS (SELECT 1 FROM workspace_consents WHERE account_id=? AND snapshot=?)":"0",values:cfg.enabled?[a.accountId,cfg.snapshot]:[]};}
export function combineGuards(...guards:{sql:string;values:readonly unknown[]}[]){return{sql:guards.map(g=>'('+g.sql+')').join(' AND '),values:guards.flatMap(g=>[...g.values])};}
