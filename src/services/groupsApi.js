import {supabase} from '../lib/supabase';

export async function loadGroups(city,userId){
  const {data:rows,error}=await supabase.from('groups')
    .select('id,owner_id,name,description,city,category,cover_path,created_at')
    .or(`city.eq.${city},city.eq.Polska`)
    .order('created_at',{ascending:false})
    .limit(80);
  if(error)throw error;
  if(!rows?.length)return [];
  const {data:members,error:mError}=await supabase.from('group_members')
    .select('group_id,user_id,role')
    .in('group_id',rows.map(r=>r.id));
  if(mError)throw mError;
  return rows.map(row=>({
    id:row.id,
    ownerId:row.owner_id,
    name:row.name,
    city:row.city,
    description:row.description||'',
    category:row.category||'Inne',
    icon:'people-outline',
    members:(members||[]).filter(m=>m.group_id===row.id).length,
    joinedByMe:!!userId&&(members||[]).some(m=>m.group_id===row.id&&m.user_id===userId),
    owned:row.owner_id===userId,
    remote:true
  }));
}

export async function createGroup(userId,{name,description,city,category}){
  const {data,error}=await supabase.from('groups').insert({
    owner_id:userId,name:name.trim(),description:description.trim(),city,category
  }).select('id').single();
  if(error)throw error;
  const {error:memberError}=await supabase.from('group_members')
    .insert({group_id:data.id,user_id:userId,role:'owner'});
  if(memberError)throw memberError;
  return data;
}

export async function setGroupJoined(groupId,userId,joined){
  if(joined){
    const {error}=await supabase.from('group_members')
      .upsert({group_id:groupId,user_id:userId,role:'member'},{onConflict:'group_id,user_id'});
    if(error)throw error;
  }else{
    const {error}=await supabase.from('group_members')
      .delete().eq('group_id',groupId).eq('user_id',userId);
    if(error)throw error;
  }
}

export async function deleteGroup(groupId,userId){
  const {error}=await supabase.from('groups').delete().eq('id',groupId).eq('owner_id',userId);
  if(error)throw error;
}
