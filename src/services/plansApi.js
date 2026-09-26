import {supabase} from '../lib/supabase';
import {File} from 'expo-file-system';

export async function loadPlans(city,userId){
  const {data:rows,error}=await supabase.from('plans')
    .select('id,host_id,title,city,category,timing_label,details,capacity,cover_photo_url,created_at,expires_at')
    .eq('city',city)
    .gt('expires_at',new Date().toISOString())
    .order('created_at',{ascending:false})
    .limit(80);
  if(error)throw error;
  if(!rows?.length)return [];
  const ids=[...new Set(rows.map(r=>r.host_id))];
  const [{data:profiles,error:pError},{data:members,error:mError}]=await Promise.all([
    supabase.from('profiles').select('id,display_name,avatar_path').in('id',ids),
    supabase.from('plan_members').select('plan_id,user_id').in('plan_id',rows.map(r=>r.id))
  ]);
  if(pError)throw pError;if(mError)throw mError;
  const pmap=new Map((profiles||[]).map(p=>[p.id,p]));
  return Promise.all(rows.map(async row=>{
    const p=pmap.get(row.host_id)||{};
    let photo=null;
    if(p.avatar_path){
      if(/^https?:\/\//i.test(p.avatar_path)) photo=p.avatar_path;
      else { const signed=await supabase.storage.from('polka-avatars').createSignedUrl(p.avatar_path,3600); photo=signed.data?.signedUrl||null; }
    }
    const joined=(members||[]).filter(m=>m.plan_id===row.id);
    return {
      id:row.id,
      title:row.title,
      city:row.city,
      when:row.timing_label,
      spots:`${joined.length}/${row.capacity}`,
      joinedCount:joined.length,
      capacity:row.capacity,
      category:row.category,
      photo:row.cover_photo_url||photo,
      hostPhoto:photo,
      host:p.display_name||'Polka',
      hostId:row.host_id,
      details:row.details||'',
      coverPhotoUrl:row.cover_photo_url||null,
      remote:true,
      joinedByMe:!!userId&&joined.some(m=>m.user_id===userId)
    };
  }));
}

async function uploadPlanCover(userId,uri){
  if(!uri)return null;
  const ext=(uri.split('.').pop()||'jpg').split('?')[0].toLowerCase();
  const contentType=ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';
  const file=new File(uri);
  const buffer=await file.arrayBuffer();
  const path=`${userId}/cover-${Date.now()}.${ext}`;
  const {error}=await supabase.storage.from('polka-plan-covers').upload(path,buffer,{contentType,upsert:false});
  if(error)throw error;
  const signed=await supabase.storage.from('polka-plan-covers').createSignedUrl(path,60*60*24*7);
  if(signed.error)throw signed.error;
  return signed.data?.signedUrl||null;
}

export async function createPlan(userId,{title,city,category,timingLabel,details,capacity=6,coverUri=null}){
  const coverPhotoUrl=coverUri?await uploadPlanCover(userId,coverUri):null;
  const {data,error}=await supabase.from('plans').insert({
    host_id:userId,title:title.trim(),city,category,timing_label:timingLabel||'Termin do ustalenia',
    details:details?.trim()||null,capacity,cover_photo_url:coverPhotoUrl
  }).select('id').single();
  if(error)throw error;
  await supabase.from('plan_members').insert({plan_id:data.id,user_id:userId});
  return data;
}

export async function setPlanJoined(planId,userId,joined){
  if(joined){
    const {error}=await supabase.from('plan_members').upsert({plan_id:planId,user_id:userId},{onConflict:'plan_id,user_id'});
    if(error)throw error;
  }else{
    const {error}=await supabase.from('plan_members').delete().eq('plan_id',planId).eq('user_id',userId);
    if(error)throw error;
  }
}

export async function updatePlan(planId,userId,patch){
  const payload={};
  if(patch.title!=null)payload.title=patch.title.trim();
  if(patch.city!=null)payload.city=patch.city;
  if(patch.category!=null)payload.category=patch.category;
  if(patch.timingLabel!=null)payload.timing_label=patch.timingLabel;
  if(patch.details!=null)payload.details=patch.details.trim()||null;
  if(patch.capacity!=null)payload.capacity=Math.max(2,Number(patch.capacity)||6);
  if(patch.coverUri)payload.cover_photo_url=await uploadPlanCover(userId,patch.coverUri);
  const {error}=await supabase.from('plans').update(payload).eq('id',planId).eq('host_id',userId);
  if(error)throw error;
}

export async function deletePlan(planId,userId){
  const {error}=await supabase.from('plans').delete().eq('id',planId).eq('host_id',userId);
  if(error)throw error;
}
