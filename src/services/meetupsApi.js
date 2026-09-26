import {supabase} from '../lib/supabase';

export async function loadMeetups(city,userId){
  const {data:rows,error}=await supabase.from('meetups')
    .select('id,host_id,business_id,group_id,title,description,city,venue_name,maps_url,starts_at,capacity,created_at')
    .eq('city',city).gte('starts_at',new Date(Date.now()-86400000).toISOString())
    .order('starts_at',{ascending:true}).limit(80);
  if(error)throw error;
  if(!rows?.length)return [];
  const hostIds=[...new Set(rows.map(r=>r.host_id))];
  const {data:profiles,error:pError}=await supabase.from('profiles').select('id,display_name,avatar_path').in('id',hostIds);
  if(pError)throw pError;
  const businessIds=[...new Set(rows.map(r=>r.business_id).filter(Boolean))];
  const {data:businesses,error:bError}=businessIds.length?await supabase.from('business_accounts').select('id,name,city,verified').in('id',businessIds):{data:[],error:null};
  if(bError)throw bError;
  const bmap=new Map((businesses||[]).map(b=>[b.id,b]));
  const {data:rsvps,error:rError}=await supabase.from('meetup_rsvps').select('meetup_id,user_id,status').in('meetup_id',rows.map(r=>r.id));
  if(rError)throw rError;
  const pmap=new Map((profiles||[]).map(p=>[p.id,p]));
  const signedAvatars=new Map();
  await Promise.all((profiles||[]).filter(p=>p.avatar_path).map(async p=>{const {data}=await supabase.storage.from('polka-avatars').createSignedUrl(p.avatar_path,3600);if(data?.signedUrl)signedAvatars.set(p.id,data.signedUrl);}));
  return rows.map(row=>{
    const host=pmap.get(row.host_id)||{};
    const business=row.business_id?bmap.get(row.business_id):null;
    const rs=(rsvps||[]).filter(r=>r.meetup_id===row.id);
    return {
      id:row.id,category:'Spotkanie',title:row.title,city:row.city,when:row.starts_at,
      place:row.venue_name||row.city,description:row.description,spots:row.capacity,
      joined:rs.filter(r=>r.status==='going').length,host:business?.name||host.display_name||'Polka',
      hostPhoto:signedAvatars.get(row.host_id)||null,businessId:business?.id||null,isBusiness:!!business,
      mapsUrl:row.maps_url||null,hostId:row.host_id,remote:true,
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
