"use client";
import {useAdminFetch} from "./AdminSessionBoundary";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SettingsRecord, SettingKey } from "@/lib/site-settings";
import VersionedForm from "./VersionedForm";

const legalFields: Array<[SettingKey,string,string,number]> = [["DATA_CONTROLLER_NAME","Responsable del tratamiento","text",180],["DATA_CONTROLLER_ADDRESS","Domicilio del responsable","text",500],["ARCO_EMAIL","Correo de privacidad","email",254],["PRIVACY_NOTICE_VERSION","Versión del aviso aprobado","text",80],["CONTACT_RETENTION_DAYS","Conservación de mensajes de contacto · días","number",3],["COMMENTS_RETENTION_DAYS","Conservación de opiniones · días","number",3]];
const networks: Array<[SettingKey,string]> = [["SOCIAL_INSTAGRAM","Instagram"],["SOCIAL_FACEBOOK","Facebook"],["SOCIAL_X","X"],["SOCIAL_YOUTUBE","YouTube"],["SOCIAL_WHATSAPP","WhatsApp"]];
const membershipFields: SettingKey[] = ["MEMBERSHIP_ENABLED","MEMBERSHIP_RETENTION_DAYS","MEMBERSHIP_NOTICE_APPROVED","MEMBERSHIP_DIRECT_CONSENT","DATA_CONTROLLER_REGIME","DATA_CONTROLLER_LEGAL_BASIS","TRANSPARENCY_ADDRESS","RIGHTS_PROCEDURE"];
export default function SettingsManager({ record }: { record: SettingsRecord }) {
  const accountFetch=useAdminFetch();
  const [busy,setBusy]=useState(false), [message,setMessage]=useState("");
  const router=useRouter();
  return <div className="settings-manager"><VersionedForm record={record} onSubmit={async(event,snapshot)=>{
    if (busy) return false;
    setBusy(true);setMessage("");
    const form=new FormData(event.currentTarget);const values=Object.fromEntries([...legalFields.map(([key])=>key),...networks.map(([key])=>key),...membershipFields].map(key=>[key,String(form.get(key)??(["MEMBERSHIP_ENABLED","MEMBERSHIP_NOTICE_APPROVED","MEMBERSHIP_DIRECT_CONSENT"].includes(key)?"0":""))]));
    try {
      const response=await accountFetch('/api/admin/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({values,expectedUpdatedAt:snapshot.updatedAt})});
      const result=await response.json() as {error?:string;message?:string};setMessage(result.error??result.message??"Configuración guardada.");
      if(response.ok||response.status===409)router.refresh();return response.ok;
    } catch {setMessage("No pudimos guardar los cambios. Lo que escribiste sigue aquí.");return false;} finally{setBusy(false);}
  }}>{snapshot=><><fieldset disabled={busy}><legend>Datos del aviso</legend><div className="settings-grid">{legalFields.map(([key,label,type,max])=><label key={key}>{label}<input name={key} type={type} maxLength={max} min={type==='number'?1:undefined} max={type==='number'?365:undefined} defaultValue={snapshot.values[key]} /></label>)}</div></fieldset>
    <fieldset disabled={busy} className="membership-settings" id="registro"><legend>Recepción de incorporaciones</legend><p>El registro se administra aquí. Completa los datos reales del responsable y revisa el <a href="/privacidad/registro" target="_blank" rel="noreferrer">aviso del registro</a> antes de abrir la recepción. Guardar una incorporación nunca asigna acceso al panel ni acredita militancia.</p>
      <label>Quién es responsable del registro<select name="DATA_CONTROLLER_REGIME" defaultValue={snapshot.values.DATA_CONTROLLER_REGIME}><option value="">Por confirmar</option><option value="private">Persona o asociación privada</option><option value="party">El partido, como sujeto obligado</option></select></label>
      <label>Conservación de incorporaciones · días<input name="MEMBERSHIP_RETENTION_DAYS" type="number" min={1} max={365} defaultValue={snapshot.values.MEMBERSHIP_RETENTION_DAYS}/></label>
      <label>Cómo se atenderán los derechos sobre datos personales<textarea name="RIGHTS_PROCEDURE" rows={5} maxLength={3000} defaultValue={snapshot.values.RIGHTS_PROCEDURE} placeholder="Indica quién atenderá las solicitudes, cómo presentarlas, qué requisitos se pedirán y cuáles son los plazos aplicables."/></label>
      <details open={snapshot.values.DATA_CONTROLLER_REGIME==='party'}><summary>Datos requeridos cuando el responsable es el PAN</summary><label>Fundamento de las atribuciones<textarea name="DATA_CONTROLLER_LEGAL_BASIS" rows={4} maxLength={2000} defaultValue={snapshot.values.DATA_CONTROLLER_LEGAL_BASIS}/></label><label>Domicilio de la Unidad de Transparencia<input name="TRANSPARENCY_ADDRESS" maxLength={500} defaultValue={snapshot.values.TRANSPARENCY_ADDRESS}/></label></details>
      <label className="settings-check"><input type="checkbox" name="MEMBERSHIP_DIRECT_CONSENT" value="1" defaultChecked={snapshot.values.MEMBERSHIP_DIRECT_CONSENT==='1'}/><span>Habilitar el procedimiento de consentimiento directo para personas que declaren 18 años cumplidos. El registro con representante queda pendiente de un procedimiento específico.</span></label>
      <label className="settings-check"><input type="checkbox" name="MEMBERSHIP_NOTICE_APPROVED" value="1" defaultChecked={snapshot.values.MEMBERSHIP_NOTICE_APPROVED==='1'}/><span>El responsable revisó el aviso, su procedimiento de derechos, conservación y mecanismo de consentimiento, y autoriza este tratamiento.</span></label>
      <label className="settings-check"><input type="checkbox" name="MEMBERSHIP_ENABLED" value="1" defaultChecked={snapshot.values.MEMBERSHIP_ENABLED==='1'}/><span>Abrir la recepción de solicitudes internas al guardar.</span></label>
      <p>Cerrar la recepción detiene nuevos envíos y correcciones. Las personas conservan acceso a su expediente y pueden retirarlo; administración puede continuar su seguimiento durante el plazo de conservación.</p>
    </fieldset>
    <fieldset disabled={busy}><legend>Redes de la organización</legend><p>Solo aparecen los enlaces que guardes. Deja vacío lo que todavía no tenga un perfil propio.</p>{networks.map(([key,label])=><label key={key}>{label}<input type="url" name={key} maxLength={500} placeholder="https://" defaultValue={snapshot.values[key]} /></label>)}</fieldset><p>Guardar actualiza el aviso y el registro interno. Contacto y opiniones conservan su activación independiente.</p><button className="button button-primary" disabled={busy}>{busy?"Guardando…":"Guardar configuración"}</button></>}</VersionedForm><p role="status" aria-live="polite">{message}</p></div>;
}
