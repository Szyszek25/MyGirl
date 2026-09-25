import {supabase} from '../lib/supabase';

export async function loadDiscounts(){
  const {data:rows,error}=await supabase.from('discounts')
    .select('id,title,description,code,destination_url,starts_at,ends_at,business_accounts(name,city,verified)')
    .eq('is_active',true)
    .order('created_at',{ascending:false})
    .limit(80);
  if(error)throw error;
  return (rows||[]).map(row=>({
    id:row.id,
    title:row.title,
    description:row.description||'',
    code:row.code||null,
    url:row.destination_url||null,
    business:row.business_accounts?.name||'Partner Polki',
    city:row.business_accounts?.city||null,
    verified:!!row.business_accounts?.verified
  }));
}
