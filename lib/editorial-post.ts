/** Owner-supplied photographs and publications requested in this conversation.
 * The source edition is replaced by the first authenticated editorial change.
 * Any DB record with its ID or original slug suppresses this edition, including
 * drafts and archives. Reading a public page never writes to the database.
 */
export const editorialPhoto={id:"apj-encuentro-comite-original",src:"/images/actualidad/encuentro-comite-tlalnepantla.jpg",alt:"Fotografía grupal de un encuentro en el Comité Directivo Municipal del PAN en Tlalnepantla; varias personas sostienen reconocimientos.",width:1280,height:696};
export const editorialPost={
 id:"apj-encuentro-comite-2026",
 slug:"nuestro-encuentro-en-el-comite",
 title:"Nuestro encuentro en el Comité",
 excerpt:"Cafecito Juvenil reunió a sus participantes el 1 de septiembre en el Comité de Tlalnepantla. Esta es la memoria del encuentro y de su preparación.",
 body:[
  "El 1 de septiembre de 2026 realizamos Cafecito Juvenil en el Comité Directivo Municipal del PAN en Tlalnepantla. El encuentro se preparó para presentar el proyecto, conversar sobre participación en la vida pública y compartir ideas que pudieran convertirse en actividades para la comunidad.",
  "La organización estuvo a cargo de Yohualli Emiliano García Milla. El trabajo comenzó antes de reunirnos, con la preparación del programa, las invitaciones y la atención a quienes se registraron. También se solicitó transporte de ida y vuelta y se dio seguimiento a la confirmación del servicio, el horario y el punto de salida. Resolver cómo llegar y regresar formó parte de la planeación.",
  "El programa incluyó la ponencia del Dr. Jesús Aguirre, la presentación del proyecto y espacios de conversación y preguntas. Durante el encuentro hubo box lunch y todas las personas asistentes recibieron su constancia de participación.",
  "Para la difusión se creó el flyer que conservamos aquí, junto con una mascota que acompañó los avisos del evento. El ajolote pertenece a aquella primera etapa. Más adelante desarrollamos el cacomixtle que hoy forma parte de la identidad de Acción Política Juvenil y de este sitio.",
  "Gracias a quienes asistieron y a quienes colaboraron en la preparación. Conservamos la fotografía y los materiales originales como parte de la memoria de este encuentro.",
  "[[flyer-cafecito-juvenil]]",
  "[[aviso-transporte-box-lunch]]",
 ].join("\n\n"),
 coverMediaId:editorialPhoto.id,
 status:"published" as const,
 createdAt:Date.parse("2026-10-05T22:29:55Z"),
 updatedAt:Date.parse("2026-10-05T23:41:00Z"),
 publishedAt:Date.parse("2026-10-05T22:29:55Z"),
};
export const domicilioPhoto={id:"apj-cambio-domicilio-sondon-original",src:"/images/actualidad/cambio-domicilio-sondon.jpg",alt:"Fotografía compartida por Emiliano durante su trámite de cambio de domicilio, acompañado por el Lic. Víctor Hugo Sondón.",width:864,height:1536};
export const domicilioPost={
 id:"apj-cambio-domicilio-sondon-2026",
 slug:"cambio-de-domicilio-con-victor-hugo-sondon",
 title:"Mi cambio de domicilio con el Lic. Víctor Hugo Sondón",
 excerpt:"Tuve el gusto de que el Lic. Víctor Hugo Sondón me acompañara a realizar mi cambio de domicilio. Gracias, licenciado, por su tiempo y por el apoyo que me ha brindado.",
 body:"Me da mucho gusto compartir este momento y seguir trabajando con el equipo de Acción Nacional en Tlalnepantla. Hay mucho por aprender y por hacer, y quiero aportar con la misma disposición con la que he comenzado este camino.",
 coverMediaId:domicilioPhoto.id,
 status:"published" as const,
 createdAt:Date.parse("2026-10-08T20:42:13Z"),
 updatedAt:Date.parse("2026-10-08T20:42:13Z"),
 publishedAt:Date.parse("2026-10-08T20:42:13Z"),
};
export const editorialPosts=[editorialPost,domicilioPost];
export const editorialPhotos=[editorialPhoto,domicilioPhoto];
export const isEditorialPhoto=(id:string|null|undefined)=>editorialPhotos.some(photo=>photo.id===id);
export function postCover(post:{coverMediaId:string|null;coverAltText?:string|null}){
 const supplied=editorialPhotos.find(photo=>photo.id===post.coverMediaId);
 if(supplied)return supplied;
 return post.coverMediaId&&post.coverAltText?{src:`/api/media/${post.coverMediaId}`,alt:post.coverAltText,width:1200,height:800}:null;
}
