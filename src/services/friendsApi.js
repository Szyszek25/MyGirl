import {supabase} from '../lib/supabase';

async function avatarUrl(path){
  if(!path)return null;
  const {data}=await supabase.storage.from('polka-avatars').createSignedUrl(path,3600);
  return data?.signedUrl||null;
}

export async function searchPeople(query,userId,city){
  const term=query.trim();
  if(term.length<2)return [];
  let q=supabase.from('profiles')
    .select('id,display_name,city,bio,avatar_path,headline,subtitle')
    .eq('onboarding_complete',true)
    .neq('id',userId)
    .ilike('display_name',`%${term}%`)
    .limit(20);
  if(city)q=q.eq('city',city);
  const {data,error}=await q;
  if(error)throw error;
  return Promise.all((data||[]).map(async p=>({
    id:p.id,name:p.display_name,city:p.city,bio:p.bio||'',headline:p.headline||'',subtitle:p.subtitle||'',
    photo:await avatarUrl(p.avatar_path),remote:true
  })));
}

export async function sendFriendRequest(senderId,recipientId){
  const {data,error}=await supabase.from('friend_requests')
    .insert({sender_id:senderId,recipient_id:recipientId})
    .select('id').single();
  if(error?.code==='23505')return null;
  if(error)throw error;
  return data;
}

export async function loadFriendRequests(userId){
  const {data:rows,error}=await supabase.from('friend_requests')
    .select('id,sender_id,recipient_id,created_at')
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at',{ascending:false});
  if(error)throw error;
  const ids=[...new Set((rows||[]).flatMap(r=>[r.sender_id,r.recipient_id]).filter(id=>id!==userId))];
  const {data:profiles,error:pError}=ids.length?await supabase.from('profiles').select('id,display_name,city,avatar_path').in('id',ids):{data:[],error:null};
  if(pError)throw pError;
  const pmap=new Map((profiles||[]).map(p=>[p.id,p]));
  return Promise.all((rows||[]).map(async row=>{
    const otherId=row.sender_id===userId?row.recipient_id:row.sender_id;
    const p=pmap.get(otherId)||{};
    return {...row,direction:row.recipient_id===userId?'incoming':'outgoing',otherId,name:p.display_name||'Polka',city:p.city||'',photo:await avatarUrl(p.avatar_path)};
  }));
}

export async function acceptFriendRequest(requestId){
  const {error}=await supabase.rpc('polka_accept_friend_request',{p_request:requestId});
  if(error)throw error;
}

export async function removeFriendRequest(requestId){
  const {error}=await supabase.from('friend_requests').delete().eq('id',requestId);
  if(error)throw error;
}

export async function loadFriends(userId){
  const {data:rows,error}=await supabase.from('friendships')
    .select('user_a,user_b,created_at')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('created_at',{ascending:false});
  if(error)throw error;
  const ids=(rows||[]).map(r=>r.user_a===userId?r.user_b:r.user_a);
  const {data:profiles,error:pError}=ids.length?await supabase.from('profiles').select('id,display_name,city,avatar_path').in('id',ids):{data:[],error:null};
  if(pError)throw pError;
  return Promise.all((profiles||[]).map(async p=>({id:p.id,name:p.display_name,city:p.city,photo:await avatarUrl(p.avatar_path)})));
}
