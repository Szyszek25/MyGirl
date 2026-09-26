import {supabase} from '../lib/supabase';
import {extensionForContentType,uriToUploadPayload} from './storageHelper';

export async function loadRemoteProfile(userId){
  if(!userId)return null;
  const {data,error}=await supabase.from('profiles')
    .select('id,display_name,city,bio,avatar_path,onboarding_complete,goal,adult_confirmed_at,headline,subtitle,instagram_handle,tiktok_handle,spotify_url')
    .eq('id',userId).maybeSingle();
  if(error)throw error;
  if(!data)return null;

  const [{data:interestRows,error:interestError},{data:photoRows,error:photoError}]=await Promise.all([
    supabase.from('profile_interests').select('interest').eq('profile_id',userId),
    supabase.from('profile_photos').select('storage_path,source_url,position').eq('user_id',userId).order('position',{ascending:true})
  ]);
  if(interestError)throw interestError;
  if(photoError)throw photoError;

  let photo=null;
  if(data.avatar_path){
    if(/^https?:\/\//i.test(data.avatar_path)) photo=data.avatar_path;
    else { const {data:signed}=await supabase.storage.from('polka-avatars').createSignedUrl(data.avatar_path,60*60); photo=signed?.signedUrl||null; }
  }

  const galleryPhotos=(await Promise.all((photoRows||[]).map(async row=>{
    if(row.source_url)return {path:row.storage_path,url:row.source_url,sourceUrl:row.source_url};
    const {data:signed,error:signedError}=await supabase.storage.from('polka-profile-photos').createSignedUrl(row.storage_path,60*60);
    if(signedError||!signed?.signedUrl)return null;
    return {path:row.storage_path,url:signed.signedUrl,sourceUrl:null};
  }))).filter(Boolean);

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
    galleryPhotos,
    adultConfirmed:!!data.adult_confirmed_at,
    onboardingComplete:!!data.onboarding_complete,
    answers:{}
  };
}


async function uploadAvatar(userId,uri){
  if(!uri||uri.startsWith('http'))return null;
  const {buffer,contentType}=await uriToUploadPayload(uri,'image/jpeg');
  const ext=extensionForContentType(contentType);
  const path=`${userId}/avatar-${Date.now()}.${ext}`;
  const {error}=await supabase.storage.from('polka-avatars').upload(path,buffer,{contentType,upsert:true});
  if(error)throw error;
  return path;
}
async function uploadProfilePhoto(userId,uri,index){
  const {buffer,contentType}=await uriToUploadPayload(uri,'image/jpeg');
  const ext=extensionForContentType(contentType);
  const path=`${userId}/profile-${Date.now()}-${index}.${ext}`;
  const {error}=await supabase.storage.from('polka-profile-photos').upload(path,buffer,{contentType,upsert:false});
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

  const currentGallery=Array.isArray(profile.galleryPhotos)?profile.galleryPhotos.slice(0,9):[];
  const {data:oldPhotoRows,error:oldPhotoError}=await supabase.from('profile_photos')
    .select('storage_path').eq('user_id',userId);
  if(oldPhotoError)throw oldPhotoError;
  const resolvedGallery=[];
  for(let i=0;i<currentGallery.length;i+=1){
    const item=currentGallery[i];
    if(item?.path&&item?.url?.startsWith('http')){
      resolvedGallery.push({path:item.path,url:item.url,sourceUrl:item.sourceUrl||null});
      continue;
    }
    const uri=typeof item==='string'?item:item?.url;
    if(!uri)continue;
    const path=await uploadProfilePhoto(userId,uri,i);
    resolvedGallery.push({path,url:uri,sourceUrl:null});
  }
  const {error:deletePhotosError}=await supabase.from('profile_photos').delete().eq('user_id',userId);
  if(deletePhotosError)throw deletePhotosError;
  if(resolvedGallery.length){
    const {error:insertPhotosError}=await supabase.from('profile_photos').insert(
      resolvedGallery.map((item,position)=>({user_id:userId,storage_path:item.path,source_url:item.sourceUrl||null,position}))
    );
    if(insertPhotosError)throw insertPhotosError;
  }
  const keepPaths=new Set(resolvedGallery.map(item=>item.path));
  const removedPaths=(oldPhotoRows||[]).map(row=>row.storage_path).filter(path=>!keepPaths.has(path));
  if(removedPaths.length)await supabase.storage.from('polka-profile-photos').remove(removedPaths);

  const {error:delError}=await supabase.from('profile_interests').delete().eq('profile_id',userId);
  if(delError)throw delError;
  if(profile.interests?.length){
    const rows=[...new Set(profile.interests)].map(interest=>({profile_id:userId,interest}));
    const {error:insertError}=await supabase.from('profile_interests').insert(rows);
    if(insertError)throw insertError;
  }
  return loadRemoteProfile(userId);
}
