import { and,desc,eq,or,inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {media,posts} from "@/db/schema";
import {editorialPost,editorialPosts} from "./editorial-post";
const selection={id:posts.id,slug:posts.slug,title:posts.title,excerpt:posts.excerpt,body:posts.body,coverMediaId:posts.coverMediaId,coverAltText:media.altText,publishedAt:posts.publishedAt,updatedAt:posts.updatedAt};
export async function availableEditorialPosts(){
 const records=await getDb().select({id:posts.id,slug:posts.slug}).from(posts).where(or(inArray(posts.id,editorialPosts.map(post=>post.id)),inArray(posts.slug,editorialPosts.map(post=>post.slug))));
 return editorialPosts.filter(post=>!records.some(record=>record.id===post.id||record.slug===post.slug)).map(post=>({...post,coverAltText:null,isEditorialFallback:true}));
}
export async function availableEditorialPost(id=editorialPost.id){
 return (await availableEditorialPosts()).find(post=>post.id===id)??null;
}
export async function publishedPosts(limit=30){
 try{
  const db=getDb();
  const [rows,source]=await Promise.all([db.select(selection).from(posts).leftJoin(media,and(eq(posts.coverMediaId,media.id),eq(media.visibility,"public"))).where(eq(posts.status,"published")).orderBy(desc(posts.publishedAt)).limit(limit),availableEditorialPosts()]);
  return {items:[...rows.map(row=>({...row,isEditorialFallback:false})),...source].sort((a,b)=>(b.publishedAt??0)-(a.publishedAt??0)).slice(0,limit),unavailable:false};
 }catch{return {items:[],unavailable:true};}
}
export async function publishedPost(value:string,by:"slug"|"id"="slug"){
 try{
  const [row]=await getDb().select(selection).from(posts).leftJoin(media,and(eq(posts.coverMediaId,media.id),eq(media.visibility,"public"))).where(and(eq(posts.status,"published"),eq(by==='id'?posts.id:posts.slug,value))).limit(1);
  if(row)return {item:{...row,isEditorialFallback:false},unavailable:false};
  const original=editorialPosts.find(post=>post[by]===value);
  const source=original?await availableEditorialPost(original.id):null;
  return {item:source,unavailable:false};
 }catch{return {item:null,unavailable:true};}
}
