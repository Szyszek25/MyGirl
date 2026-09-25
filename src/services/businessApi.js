import {supabase} from '../lib/supabase';

export async function loadBusinessAccount(userId){
  if(!userId)return null;
  const {data,error}=await supabase.from('business_accounts')
    .select('id,owner_id,name,city,description,website_url,instagram_handle,verified')
    .eq('owner_id',userId).maybeSingle();
  if(error)throw error;
  return data;
}

export async function saveBusinessAccount(userId,draft){
  if(!userId)throw new Error('Zaloguj się, aby utworzyć konto organizacji.');
  const payload={
    owner_id:userId,
    name:draft.name.trim(),
    city:draft.city.trim()||null,
    description:draft.about.trim()||null
  };
  const current=await loadBusinessAccount(userId);
  const query=current
    ? supabase.from('business_accounts').update(payload).eq('id',current.id)
    : supabase.from('business_accounts').insert(payload);
  const {data,error}=await query.select('id,owner_id,name,city,description,website_url,instagram_handle,verified').single();
  if(error)throw error;
  return data;
}

export async function saveBusinessDiscount(userId,businessId,{title,description,code,destinationUrl}){
  if(!userId||!businessId)throw new Error('Brak konta organizacji.');
  if(!title?.trim())return null;
  const {data,error}=await supabase.from('discounts').insert({
    business_id:businessId,
    title:title.trim(),
    description:description?.trim()||null,
    code:code?.trim()||null,
    destination_url:destinationUrl?.trim()||null
  }).select('id').single();
  if(error)throw error;
  return data;
}
