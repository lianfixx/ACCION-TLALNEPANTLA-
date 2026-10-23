"use client";
import {useAdminFetch} from "./AdminSessionBoundary";
import { useEffect, useRef, useState } from 'react';
import {editorialPosts,editorialPhotos} from "@/lib/editorial-post";
import { useVersionedChange } from './VersionedForm';
type Item={id:string;fileName:string;altText:string;visibility:string};
export default function MediaPicker({defaultValue=''}:{defaultValue?:string}) {
  const accountFetch=useAdminFetch();
  const changed = useVersionedChange();
  const input = useRef<HTMLInputElement>(null);
  const originals=editorialPhotos.map(photo=>({id:photo.id,fileName:editorialPosts.find(post=>post.coverMediaId===photo.id)?.title??'Fotografía de la publicación',altText:photo.alt,visibility:'public'}));
  const [selected,setSelected]=useState(defaultValue),[items,setItems]=useState<Item[]>(originals),[q,setQ]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(() => { const form=input.current?.form;const reset=()=>setSelected(defaultValue);form?.addEventListener("reset",reset);return()=>form?.removeEventListener("reset",reset); }, [defaultValue]);
  async function search(){if(busy)return;setBusy(true);try{const response=await accountFetch(`/api/admin/media/search?q=${encodeURIComponent(q)}`);const data=await response.json() as {items:Item[];error?:string};if(!response.ok)throw new Error(data.error);const combined=[...originals.filter(original=>(original.fileName+original.altText).toLocaleLowerCase().includes(q.toLocaleLowerCase())),...data.items];setItems(combined);setMessage(combined.length?'':'No encontramos imágenes públicas que coincidan con la búsqueda.');}catch(error){setMessage(error instanceof Error?error.message:'No se pudo buscar.');}finally{setBusy(false);}}
  return <div className="media-picker"><label>Portada<input ref={input} type="hidden" name="coverMediaId" value={selected}/><span>{selected?items.find(item=>item.id===selected)?.fileName??'Imagen seleccionada':'Sin portada'}</span></label><div className="media-picker-search"><input aria-label="Buscar imagen de portada" value={q} onChange={event=>{event.stopPropagation();setQ(event.target.value);}} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();void search();}}} placeholder="Buscar por nombre o descripción" maxLength={120}/><button type="button" className="button button-secondary" disabled={busy} onClick={()=>void search()}>{busy?'Buscando…':'Buscar'}</button></div>{selected&&<button type="button" className="post-read-link" onClick={()=>{setSelected('');changed();}}>Quitar portada</button>}<div className="media-picker-results">{items.map(item=><button type="button" key={item.id} aria-pressed={selected===item.id} onClick={()=>{setSelected(item.id);changed();}}><strong>{item.fileName}</strong><span>{item.altText}</span></button>)}</div><p role="status">{message}</p></div>;
}
