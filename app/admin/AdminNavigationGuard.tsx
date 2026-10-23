'use client';
import { useEffect } from 'react';

const hasDraft=()=>Boolean(document.querySelector('form[data-dirty="true"]'));
let skipUnload=false;
export function allowNextAdminUnload(){skipUnload=true;}
export function confirmAdminExit() {
  return !hasDraft()||window.confirm('Hay cambios sin guardar. ¿Quieres salir de este borrador?');
}

export default function AdminNavigationGuard() {
  useEffect(()=>{
    function click(event:MouseEvent) {
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=(event.target as Element)?.closest?.('a');
      if(!link||link.hasAttribute('download')||(link.target&&link.target!=='_self'))return;
      const target=new URL(link.href,location.href),current=new URL(location.href);
      if(!['http:','https:'].includes(target.protocol)||target.origin===current.origin&&target.pathname===current.pathname&&target.search===current.search)return;
      if(!confirmAdminExit()){event.preventDefault();event.stopPropagation();}
      else {skipUnload=true;setTimeout(()=>{skipUnload=false;},1000);}
    }
    function submit(event:Event) {
      const form=event.target as HTMLFormElement;
      if(form.getAttribute('method')?.toLowerCase()!=='get')return;
      if(!confirmAdminExit()){event.preventDefault();event.stopPropagation();}
      else {skipUnload=true;setTimeout(()=>{skipUnload=false;},1000);}
    }
    function unload(event:BeforeUnloadEvent){if(!skipUnload&&hasDraft()){event.preventDefault();event.returnValue='';}}
    const navigation=(window as unknown as {navigation?:EventTarget}).navigation;
    function traverse(event:Event){if((event as Event&{navigationType?:string}).navigationType==='traverse'&&event.cancelable&&!confirmAdminExit())event.preventDefault();}
    document.addEventListener('click',click,true);document.addEventListener('submit',submit,true);window.addEventListener('beforeunload',unload);navigation?.addEventListener('navigate',traverse);
    return()=>{document.removeEventListener('click',click,true);document.removeEventListener('submit',submit,true);window.removeEventListener('beforeunload',unload);navigation?.removeEventListener('navigate',traverse);skipUnload=false;};
  },[]);
  return null;
}
