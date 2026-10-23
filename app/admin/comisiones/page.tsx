import {redirect} from 'next/navigation';
import {currentAuthorizedUser} from '@/lib/authz';
import {isCommission} from '@/lib/commissions';
import Workspace from '@/app/mi-comision/Workspace';
import {workspaceTab} from '@/lib/workspace-navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Administrar comisiones',robots:{index:false,follow:false,noarchive:true}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const q=await searchParams;const a=await currentAuthorizedUser();if(!a||a.role!=='admin')redirect('/admin');const area=isCommission(q.commission)?q.commission:'',tab=workspaceTab(q.tab);return <Workspace accountId={a.accountId} key={`${a.accountId}:${tab}:${area}`} adminView initialArea={area} initialTab={tab}/>}
