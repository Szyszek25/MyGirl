import {supabase} from '../lib/supabase';

export async function loadRemoteProfile(userId){
  if(!userId)return null;
  const {data,error}=await supabase.from('profiles')
    .select('id,display_name,city,bio,avatar_path,onboarding_complete,goal,adult_confirmed_at')
    .eq('id',userId).maybeSingle();
  if(error)throw error;
  if(!data)return null;

  const {data:interestRows,error:interestError}=await supabase.from('profile_interests')
    .select('interest').eq('profile_id',userId);
  if(interestError)throw interestError;

  let photo=null;
  if(data.avatar_path){
    const {data:signed}=await supabase.storage.from('polka-avatars').createSignedUrl(data.avatar_path,60*60);
    photo=signed?.signedUrl||null;
  }

  return {
    id:data.id,
    name:data.display_name||'',
    city:data.city||'Warszawa',
    bio:data.bio||'',
    goal:data.goal||'Nowe znajomości',
    interests:(interestRows||[]).map(row=>row.interest),
    photo,
    avatarPath:data.avatar_path||null,
    adultConfirmed:!!data.adult_confirmed_at,
    onboardingComplete:!!data.onboarding_complete,
    answers:{}
  };
}

async function uploadAvatar(userId,uri){
  if(!uri||uri.startsWith('http'))return null;
  const response=await fetch(uri);
  const blob=await response.blob();
  const type=blob.type||'image/jpeg';
  const ext=type.includes('png')?'png':type.includes('webp')?'webp':'jpg';
  const path=`${userId}/avatar-${Date.now()}.${ext}`;
  const {error}=await supabase.storage.from('polka-avatars').upload(path,blob,{contentType:type,upsert:false});
  if(error)throw error;
  return path;
}

export async function saveRemoteProfile(userId,profile){
  if(!userId)throw new Error('Brak aktywnej sesji.');
  let avatarPath=profile.avatarPath||null;
  if(profile.photo&&!profile.photo.startsWith('http')){
    avatarPath=await uploadAvatar(userId,profile.photo);
  }
  const payload={
    id:userId,
    display_name:profile.name.trim(),
    city:profile.city||null,
    bio:profile.bio||null,
    avatar_path:avatarPath,
    goal:profile.goal||null,
    adult_confirmed_at:profile.adultConfirmed?new Date().toISOString():null,
    onboarding_complete:true
  };
  const {error}=await supabase.from('profiles').upsert(payload,{onConflict:'id'});
  if(error)throw error;

  const {error:delError}=await supabase.from('profile_interests').delete().eq('profile_id',userId);
  if(delError)throw delError;
  if(profile.interests?.length){
    const rows=[...new Set(profile.interests)].map(interest=>({profile_id:userId,interest}));
    const {error:insertError}=await supabase.from('profile_interests').insert(rows);
    if(insertError)throw insertError;
  }
  return loadRemoteProfile(userId);
}
