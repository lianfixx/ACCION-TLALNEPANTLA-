import { cleanText } from "./security";

export const residenceStates = ["Aguascalientes","Baja California","Baja California Sur","Campeche","Chiapas","Chihuahua","Ciudad de México","Coahuila","Colima","Durango","Estado de México","Guanajuato","Guerrero","Hidalgo","Jalisco","Michoacán","Morelos","Nayarit","Nuevo León","Oaxaca","Puebla","Querétaro","Quintana Roo","San Luis Potosí","Sinaloa","Sonora","Tabasco","Tamaulipas","Tlaxcala","Veracruz","Yucatán","Zacatecas"] as const;
export type InitialProject = { title:string; proposal:string; firstStep:string; needs:string; timeframe:string; result:string };
export type MembershipProfile = { version:1; participation:"collaborate"|"coordinate"; state:string; municipality:string; activity:string; experience:string; availability:string; projects:InitialProject[] };
export const projectQuestions: Array<{key:keyof InitialProject;label:string;hint:string;max:number;min:number}> = [
  {key:"title",label:"Nombre del proyecto",hint:"Un nombre breve que permita reconocer la idea.",min:3,max:100},
  {key:"proposal",label:"Qué te gustaría hacer",hint:"Explica la idea, a quién estaría dirigida y qué quieres resolver.",min:20,max:700},
  {key:"firstStep",label:"Cómo empezarías",hint:"Cuéntanos cuál sería tu primera acción y qué tendrías que confirmar.",min:10,max:400},
  {key:"needs",label:"Qué necesitarías",hint:"Personas, espacio, materiales o presupuesto. Puedes señalar lo que aún no sabes.",min:5,max:400},
  {key:"timeframe",label:"En cuánto tiempo",hint:"Un plazo aproximado desde su autorización. También puedes escribir por definir.",min:3,max:100},
  {key:"result",label:"Qué resultado entregarías",hint:"Algo concreto que permita revisar si se hizo lo previsto.",min:10,max:400},
];
export const emptyProject=():InitialProject=>({title:"",proposal:"",firstStep:"",needs:"",timeframe:"",result:""});
export const emptyProfile=():MembershipProfile=>({version:1,participation:"collaborate",state:"",municipality:"",activity:"",experience:"",availability:"",projects:[]});

function field(value:unknown,label:string,max:number,min=0){
  if(value===undefined&&min===0)return "";
  if(typeof value!=="string"||value.length>max)throw new Error(`${label} admite hasta ${max} caracteres.`);
  const text=cleanText(value,max);
  if(text.length<min)throw new Error(`Completa ${label.toLocaleLowerCase('es-MX')} con al menos ${min} caracteres.`);
  return text;
}
export function parseMembershipProfile(value:unknown):MembershipProfile{
  if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Completa tus datos de participación.");
  const p=value as Record<string,unknown>;
  if(p.participation!=="collaborate"&&p.participation!=="coordinate")throw new Error("Elige cómo quieres participar.");
  if(!residenceStates.includes(p.state as typeof residenceStates[number]))throw new Error("Selecciona el estado donde vives.");
  const participation=p.participation;
  const profile:MembershipProfile={version:1,participation,state:p.state as string,municipality:field(p.municipality,"Municipio o alcaldía",100,2),activity:field(p.activity,"Tu actividad actual",200),experience:field(p.experience,"Tu experiencia",800,participation==="coordinate"?10:0),availability:field(p.availability,"Tu disponibilidad",200,5),projects:[]};
  if(participation==="coordinate"){
    if(!Array.isArray(p.projects)||p.projects.length!==3)throw new Error("Comparte tus tres primeras propuestas.");
    profile.projects=p.projects.map((project,index)=>{
      if(!project||typeof project!=="object"||Array.isArray(project))throw new Error(`Revisa el proyecto ${index+1}.`);
      const output={} as InitialProject;
      for(const q of projectQuestions)output[q.key]=field((project as Record<string,unknown>)[q.key],`${q.label} del proyecto ${index+1}`,q.max,q.min);
      return output;
    });
    if(new Set(profile.projects.map(project=>project.title.toLocaleLowerCase('es-MX'))).size!==3)throw new Error("Da a cada propuesta un nombre distinto para poder identificarlas.");
  }
  return profile;
}
/** Old applications deliberately remain readable without adding data to their consent. */
export function readMembershipProfile(json?:string|null):MembershipProfile|null{
  if(!json)return null;
  try{return parseMembershipProfile(JSON.parse(json));}catch{return null;}
}
