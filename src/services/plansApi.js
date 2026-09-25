import {supabase} from '../lib/supabase';

export async function loadPlans(city,userId){
  const {data:rows,error}=await supabase.from('plans')
    .select('id,host_id,title,city,category,timing_label,details,capacity,created_at,expires_at')
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
      const signed=await supabase.storage.from('polka-avatars').createSignedUrl(p.avatar_path,3600);
      photo=signed.data?.signedUrl||null;
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
      photo:photo||'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=80',
      host:p.display_name||'Polka',
      hostId:row.host_id,
      details:row.details||'',
      remote:true,
      joinedByMe:!!userId&&joined.some(m=>m.user_id===userId)
    };
  }));
}

export async function createPlan(userId,{title,city,category,timingLabel,details,capacity=6}){
  const {data,error}=await supabase.from('plans').insert({
    host_id:userId,title:title.trim(),city,category,timing_label:timingLabel||'Termin do ustalenia',
    details:details?.trim()||null,capacity
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
