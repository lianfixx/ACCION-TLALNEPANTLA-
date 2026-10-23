"use client";
export default function PrintButton(){return <div className="print-control"><button className="button button-primary" onClick={()=>window.print()}>Imprimir o guardar como PDF</button><p>El PDF guarda los datos de este formato. Descarga los adjuntos por separado y consulta la conversación en la actividad.</p></div>}
