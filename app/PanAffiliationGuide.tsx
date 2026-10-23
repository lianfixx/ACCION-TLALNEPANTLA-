import {panLinks} from '@/lib/pan-affiliation';

export default function PanAffiliationGuide(){return <>
 <p>Tu cuenta y tu comisión ya están listas. Para terminar, realiza tu trámite en la app del PAN y entrega aquí el comprobante. Si ya estás afiliado, puedes subirlo directamente.</p>
 <ol className="workspace-steps pan-guide-steps">
  <li><strong>Haz el trámite en la app</strong><p>Entra en <strong>Quiero afiliarme</strong> y sigue las indicaciones del PAN. Si aún no la tienes, elige la versión para tu celular.</p><div className="workspace-actions"><a href={panLinks.android} target="_blank" rel="noreferrer">App para Android</a><a href={panLinks.iphone} target="_blank" rel="noreferrer">App para iPhone</a></div></li>
  <li><strong>Sube tu comprobante</strong><p>Cuando el PAN confirme tu afiliación, vuelve a esta pantalla y adjunta el documento que la acredita. Puedes subir un PDF o una foto legible del papel.</p></li>
  <li><strong>Consulta la respuesta</strong><p>El archivo llega directamente a administración. Cuando revisen tu comprobante, este paso aparecerá como completado. Si hace falta corregir algo, verás aquí qué te piden.</p></li>
 </ol>
 <p className="workspace-help">El PAN resuelve la afiliación. En esta página das seguimiento y entregas tu comprobante. También puedes consultar el <a href={panLinks.portal} target="_blank" rel="noreferrer">portal oficial del PAN</a>.</p>
 </>;}
