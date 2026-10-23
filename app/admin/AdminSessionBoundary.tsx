"use client";
import {createContext,useCallback,useContext,type ReactNode} from 'react';

const AdminAccount=createContext('');

/** The server keys this boundary by account, so drafts cannot migrate between users. */
export default function AdminSessionBoundary({accountId,children}:{accountId:string;children:ReactNode}){
 return <AdminAccount.Provider value={accountId}>{children}</AdminAccount.Provider>;
}

export function useAdminFetch(){
 const accountId=useContext(AdminAccount);
 return useCallback((input:RequestInfo|URL,init?:RequestInit)=>{
  if(!accountId)return Promise.reject(new Error('Vuelve a entrar al panel para continuar.'));
  const headers=new Headers(init?.headers);headers.set('X-Expected-Account-Id',accountId);
  return fetch(input,{...init,headers,cache:'no-store'});
 },[accountId]);
}
