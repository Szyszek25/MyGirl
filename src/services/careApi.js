import {supabase} from '../lib/supabase';

export async function loadPublishedCareArticles(){
  const {data:rows,error}=await supabase.from('care_articles')
    .select('id,slug,category,title,summary,body,icon,published_at,care_article_sources(source_name,source_url,sort_order)')
    .eq('is_published',true)
    .order('published_at',{ascending:false});
  if(error)throw error;
  return (rows||[]).map(row=>({
    id:row.slug||row.id,
    remoteId:row.id,
    category:row.category,
    title:row.title,
    summary:row.summary,
    body:Array.isArray(row.body)?row.body:[],
    icon:row.icon||'book-outline',
    source:row.care_article_sources?.[0]?.source_name||'Polka Care',
    url:row.care_article_sources?.[0]?.source_url||null,
    image:null,
    remote:true
  }));
}

export async function isCareAdmin(){
  const {data,error}=await supabase.rpc('polka_is_admin');
  if(error)return false;
  return !!data;
}

export async function saveCareArticle(article){
  const payload={
    slug:article.slug.trim(),
    category:article.category.trim(),
    title:article.title.trim(),
    summary:article.summary.trim(),
    body:article.body,
    icon:article.icon||'book-outline',
    is_published:!!article.isPublished,
    reviewed_at:article.isPublished?new Date().toISOString():null,
    published_at:article.isPublished?new Date().toISOString():null,
    updated_at:new Date().toISOString()
  };
  const {data,error}=await supabase.from('care_articles').upsert(payload,{onConflict:'slug'}).select('id').single();
  if(error)throw error;
  return data;
}
