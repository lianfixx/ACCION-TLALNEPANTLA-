import {redirect} from 'next/navigation';
import {currentAuthorizedUser} from '@/lib/authz';
import {isCommission} from '@/lib/commissions';
import {siteContent} from '@/lib/site-content';
import {CommissionCatalogProvider} from '@/app/CommissionCatalog';
import Workspace from '@/app/mi-comision/Workspace';
import AdminHeader from '../AdminHeader';
import {workspaceTab} from '@/lib/workspace-navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Administrar comisiones',robots:{index:false,follow:false,noarchive:true}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const q=await searchParams;const a=await currentAuthorizedUser();if(!a||a.role!=='admin')redirect('/admin');const area=isCommission(q.commission)?q.commission:'',tab=workspaceTab(q.tab);const content=await siteContent();return <><AdminHeader current="comisiones" email={a.email} role={a.role} accountId={a.accountId} /><CommissionCatalogProvider commissions={content.commissions} steps={content.steps}><Workspace accountId={a.accountId} key={`${a.accountId}:${tab}:${area}`} adminView initialArea={area} initialTab={tab}/></CommissionCatalogProvider></>}
