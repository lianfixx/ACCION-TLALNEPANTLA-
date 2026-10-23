import type { NoticeSection } from "@/lib/membership-notice";
export default function ConsentRecord({snapshot}:{snapshot:string}){
  let sections:NoticeSection[]=[];
  try{const parsed=JSON.parse(snapshot);if(Array.isArray(parsed.sections))sections=parsed.sections.filter((s:NoticeSection)=>typeof s.title==='string'&&Array.isArray(s.paragraphs)&&s.paragraphs.every(p=>typeof p==='string'));}catch{}
  return <details className="membership-consent-proof"><summary>Aviso conservado con esta solicitud</summary>{sections.map(section=><div key={section.title}><h3>{section.title}</h3>{section.paragraphs.map((paragraph,index)=><p className="legal-preserve-lines" key={index}>{paragraph}</p>)}</div>)}</details>;
}
