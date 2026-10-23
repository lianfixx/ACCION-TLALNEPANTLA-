import {sql} from 'drizzle-orm';
import {isConfiguredOwner,type SiteRole} from './authz';
import {sessionWriteGuard} from './session-write-guard';
import type {StaffIdentity} from './staff-auth';

/** Check the exact session and current role in the committing statement. */
export function adminWriteGuard(actor:StaffIdentity,roles:readonly SiteRole[]){
 const session=sessionWriteGuard(actor);
 const owner=isConfiguredOwner(actor.email)&&!actor.selfRegistered;
 return {sql:session.sql+(owner?'':roles.length?` AND EXISTS (SELECT 1 FROM user_roles live_role WHERE live_role.email=? AND live_role.revoked_at IS NULL AND live_role.role IN (${roles.map(()=>'?').join(',')}))`:' AND 0'),values:[...session.values,...(owner?[]:roles.length?[actor.email,...roles]:[])]};
}

export function adminWriteCondition(actor:StaffIdentity,roles:readonly SiteRole[]){
 const guard=adminWriteGuard(actor,roles);
 // Only trusted SQL syntax goes into raw fragments; values stay bound.
 return sql.join(guard.sql.split('?').flatMap((part,index)=>index<guard.values.length?[sql.raw(part),sql`${guard.values[index]}`]:[sql.raw(part)]),sql.raw(''));
}
