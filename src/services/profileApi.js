import {File} from 'expo-file-system';
import {supabase} from '../lib/supabase';

export async function loadRemoteProfile(userId){
  if(!userId)return null;
  const {data,error}=await supabase.from('profiles')
    .select('id,display_name,city,bio,avatar_path,onboarding_complete,goal,adult_confirmed_at,headline,subtitle,instagram_handle,tiktok_handle,spotify_url')
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
    headline:data.headline||'',
    subtitle:data.subtitle||'',
    instagramHandle:data.instagram_handle||'',
    tiktokHandle:data.tiktok_handle||'',
    spotifyUrl:data.spotify_url||'',
    goal:data.goal||'Nowe znajomości',
    interests:(interestRows||[]).map(row=>row.interest),
    photo,
    avatarPath:data.avatar_path||null,
    adultConfirmed:!!data.adult_confirmed_at,
    onboardingComplete:!!data.onboarding_complete,
    answers:{}
  };
}

function imageMimeFromUri(uri,fileType=''){
  const normalized=(fileType||'').toLowerCase();
  if(normalized.startsWith('image/'))return normalized;
  const clean=(uri||'').split('?')[0].toLowerCase();
  if(clean.endsWith('.png'))return 'image/png';
  if(clean.endsWith('.webp'))return 'image/webp';
  return 'image/jpeg';
}

async function uploadAvatar(userId,uri){
  if(!uri||uri.startsWith('http'))return null;
  const file=new File(uri);
  const bytes=await file.arrayBuffer();
  if(!bytes.byteLength)throw new Error('Nie udało się odczytać zdjęcia profilowego.');
  const type=imageMimeFromUri(uri,file.type);
  const ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
  const path=`${userId}/avatar-${Date.now()}.${ext}`;
  const {error}=await supabase.storage.from('polka-avatars').upload(path,bytes,{contentType:type,upsert:false});
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
    headline:profile.headline||null,
    subtitle:profile.subtitle||null,
    instagram_handle:profile.instagramHandle||null,
    tiktok_handle:profile.tiktokHandle||null,
    spotify_url:profile.spotifyUrl||null,
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
