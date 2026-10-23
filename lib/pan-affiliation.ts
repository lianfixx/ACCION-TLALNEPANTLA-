export const panLinks={
 android:'https://play.google.com/store/apps/details?id=org.pan.partidoAccionNacional&hl=es_MX',
 iphone:'https://apps.apple.com/mx/app/partido-accion-nacional/id6749108433',
 portal:'https://afiliacion.pan.org.mx/',
} as const;
export const affiliationDocumentHelp={
 affiliation:'Comparte el documento o la confirmación emitidos por el PAN donde se lean tu nombre y tu afiliación. Puede ser el archivo original o una imagen legible. La INE y las constancias de cursos o eventos no sustituyen esa confirmación.',
 affiliation_receipt:'Comparte el acuse que te entregó el PAN al iniciar el trámite. El último paso seguirá pendiente hasta que entregues el comprobante de afiliación y administración lo revise.',
} as const;
export const isAffiliationCategory=(value:string)=>value==='affiliation'||value==='affiliation_receipt';
