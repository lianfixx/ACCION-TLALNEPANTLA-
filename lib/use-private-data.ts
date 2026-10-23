"use client";
import {useEffect,useState} from 'react';

// Keep drafts mounted while refreshing the same view. Never reuse results
// from a different commission, record or page; late responses are cancelled.
export function usePrivateData<T>(url:string,revision:number|string=0,accountId:string){
 const [attempt,setAttempt]=useState(0);
 const key=JSON.stringify([url,revision,attempt,accountId]);
 const [result,setResult]=useState<{key:string;url:string;accountId:string;data:T|null;error:string}|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  let live=true;
  void (async()=>{try{
   const response=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{'X-Expected-Account-Id':accountId}});
   const data=await response.json() as T & {error?:string};
   if(!response.ok)throw new PrivateResponseError(data.error||'No pudimos cargar la información.',response.status);
   if(live)setResult({key,url,accountId,data,error:''});
  }catch(e){if(live)setResult(previous=>({key,url,accountId,data:previous?.url===url&&previous.accountId===accountId&&!(e instanceof PrivateResponseError&&[401,403,404,412].includes(e.status))?previous.data:null,error:e instanceof Error?e.message:'No pudimos cargar la información.'}));}})();
  return()=>{live=false;controller.abort();};
 },[url,key,accountId]);
 const current=result?.url===url&&result.accountId===accountId?result:null;
 return {data:current?.data??null,error:current?.error??'',retry:()=>setAttempt(v=>v+1)};
}

class PrivateResponseError extends Error{
 constructor(message:string,public status:number){super(message);}
}
