import {supabase} from '../lib/supabase';

export const defaultAccountSettings={
  push_enabled:true,
  plans_notifications:true,
  messages_notifications:true,
  profile_visibility:'community',
  dm_policy:'community',
  city_privacy:'city_only'
};

export async function loadAccountSettings(userId){
  if(!userId)return defaultAccountSettings;
  const {data,error}=await supabase.from('account_settings')
    .select('push_enabled,plans_notifications,messages_notifications,profile_visibility,dm_policy,city_privacy')
    .eq('user_id',userId).maybeSingle();
  if(error)throw error;
  if(data)return {...defaultAccountSettings,...data};

  const {data:created,error:createError}=await supabase.from('account_settings')
    .insert({user_id:userId})
    .select('push_enabled,plans_notifications,messages_notifications,profile_visibility,dm_policy,city_privacy')
    .single();
  if(createError)throw createError;
  return {...defaultAccountSettings,...created};
}

export async function updateAccountSettings(userId,patch){
  if(!userId)return {...defaultAccountSettings,...patch};
  const payload={user_id:userId,...patch};
  const {data,error}=await supabase.from('account_settings')
    .upsert(payload,{onConflict:'user_id'})
    .select('push_enabled,plans_notifications,messages_notifications,profile_visibility,dm_policy,city_privacy')
    .single();
  if(error)throw error;
  return {...defaultAccountSettings,...data};
}
