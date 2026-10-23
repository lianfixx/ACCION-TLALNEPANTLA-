import {redirect} from 'next/navigation';
import {getStaffIdentity} from '@/lib/staff-auth';
import Workspace from './Workspace';
import {workspaceTab} from '@/lib/workspace-navigation';
import {isCommission} from '@/lib/commissions';
export const dynamic='force-dynamic';
export const metadata={title:'Mi comisión',robots:{index:false,follow:false,noarchive:true}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const q=await searchParams,tab=workspaceTab(q.tab),area=isCommission(q.commission)?q.commission:'';const search=new URLSearchParams();if(tab)search.set('tab',tab);if(area)search.set('commission',area);const user=await getStaffIdentity();if(!user)redirect('/ingresar?returnTo='+encodeURIComponent('/mi-comision'+(search.size?'?'+search.toString():'')));return <Workspace accountId={user.accountId} key={`${user.accountId}:${tab}:${area}`} initialTab={tab} initialArea={area}/>}
