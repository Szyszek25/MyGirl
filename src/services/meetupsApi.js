import {supabase} from '../lib/supabase';

export async function loadMeetups(city,userId){
  const {data:rows,error}=await supabase.from('meetups')
    .select('id,host_id,business_id,group_id,title,description,city,venue_name,maps_url,cover_photo_url,starts_at,capacity,created_at')
    .eq('city',city).gte('starts_at',new Date(Date.now()-86400000).toISOString())
    .order('starts_at',{ascending:true}).limit(80);
  if(error)throw error;
  if(!rows?.length)return [];
  const {data:rsvps,error:rError}=await supabase.from('meetup_rsvps').select('meetup_id,user_id,status').in('meetup_id',rows.map(r=>r.id));
  if(rError)throw rError;
  const hostIds=[...new Set(rows.map(r=>r.host_id))];
  const participantIds=[...new Set((rsvps||[]).filter(r=>r.status==='going').map(r=>r.user_id))];
  const profileIds=[...new Set([...hostIds,...participantIds])];
  const {data:profiles,error:pError}=await supabase.from('profiles').select('id,display_name,avatar_path').in('id',profileIds);
  if(pError)throw pError;
  const businessIds=[...new Set(rows.map(r=>r.business_id).filter(Boolean))];
  const {data:businesses,error:bError}=businessIds.length?await supabase.from('business_accounts').select('id,name,city,verified').in('id',businessIds):{data:[],error:null};
  if(bError)throw bError;
  const bmap=new Map((businesses||[]).map(b=>[b.id,b]));
  const pmap=new Map((profiles||[]).map(p=>[p.id,p]));
  const signedAvatars=new Map();
  await Promise.all((profiles||[]).filter(p=>p.avatar_path).map(async p=>{if(/^https?:\/\//i.test(p.avatar_path)){signedAvatars.set(p.id,p.avatar_path);return;}const {data}=await supabase.storage.from('polka-avatars').createSignedUrl(p.avatar_path,3600);if(data?.signedUrl)signedAvatars.set(p.id,data.signedUrl);}));
  return rows.map(row=>{
    const host=pmap.get(row.host_id)||{};
    const business=row.business_id?bmap.get(row.business_id):null;
    const rs=(rsvps||[]).filter(r=>r.meetup_id===row.id&&r.status==='going');
    const participants=rs.map(r=>{const p=pmap.get(r.user_id)||{};return {id:r.user_id,name:p.display_name||'Uczestniczka',photo:signedAvatars.get(r.user_id)||null};});
    return {
      id:row.id,category:'Spotkanie',title:row.title,city:row.city,when:row.starts_at,
      place:row.venue_name||row.city,description:row.description,spots:row.capacity,
      joined:rs.length,participants,host:business?.name||host.display_name||'Polka',
      hostPhoto:signedAvatars.get(row.host_id)||null,businessId:business?.id||null,isBusiness:!!business,
      mapsUrl:row.maps_url||null,coverPhotoUrl:row.cover_photo_url||null,hostId:row.host_id,remote:true,
      joinedByMe:!!userId&&rs.some(r=>r.user_id===userId&&r.status==='going')
    };
  });
}

export async function setMeetupRsvp(meetupId,userId,going){
  if(going){
    const {error}=await supabase.from('meetup_rsvps').upsert({meetup_id:meetupId,user_id:userId,status:'going'},{onConflict:'meetup_id,user_id'});
    if(error)throw error;
  }else{
    const {error}=await supabase.from('meetup_rsvps').delete().eq('meetup_id',meetupId).eq('user_id',userId);
    if(error)throw error;
  }
}


export async function createMeetup(userId,{title,description='',city,venueName,startsAt,capacity=6,businessId=null}){
  if(!userId)throw new Error('Zaloguj się, aby utworzyć spotkanie.');
  const cleanTitle=String(title||'').trim();
  const cleanVenue=String(venueName||'').trim();
  if(cleanTitle.length<4)throw new Error('Dodaj nazwę spotkania.');
  if(!cleanVenue)throw new Error('Dodaj miejsce spotkania.');
  const iso=new Date(startsAt).toISOString();
  const cap=Math.max(2,Math.min(50,Number(capacity)||6));
  const {data,error}=await supabase.from('meetups').insert({
    host_id:userId,
    business_id:businessId||null,
    title:cleanTitle.slice(0,120),
    description:String(description||'').trim().slice(0,1200),
    city,
    venue_name:cleanVenue.slice(0,160),
    starts_at:iso,
    capacity:cap
  }).select('id').single();
  if(error)throw error;
  return data;
}


export async function updateMeetup(meetupId,userId,{title,description='',city,venueName,startsAt,capacity=6}){
  if(!meetupId||!userId)throw new Error('Brak danych spotkania.');
  const cleanTitle=String(title||'').trim();
  const cleanVenue=String(venueName||'').trim();
  if(cleanTitle.length<4)throw new Error('Dodaj nazwę spotkania.');
  if(!cleanVenue)throw new Error('Dodaj miejsce spotkania.');
  const {data,error}=await supabase.from('meetups').update({
    title:cleanTitle.slice(0,120),
    description:String(description||'').trim().slice(0,1200),
    city,
    venue_name:cleanVenue.slice(0,160),
    starts_at:new Date(startsAt).toISOString(),
    capacity:Math.max(2,Math.min(50,Number(capacity)||6))
  }).eq('id',meetupId).eq('host_id',userId).select('id').maybeSingle();
  if(error)throw error;
  if(!data)throw new Error('Nie możesz edytować tego spotkania.');
  return data;
}

export async function deleteMeetup(meetupId,userId){
  if(!meetupId||!userId)throw new Error('Brak danych spotkania.');
  const {data,error}=await supabase.from('meetups').delete().eq('id',meetupId).eq('host_id',userId).select('id').maybeSingle();
  if(error)throw error;
  if(!data)throw new Error('Nie możesz usunąć tego spotkania.');
  return data;
}
