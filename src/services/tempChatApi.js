import {supabase} from '../lib/supabase';

export async function ensureTemporaryRoom({userId,title,contextType='group',contextId=null,hours=24}){
  if(contextId){
    const {data:existing,error:eError}=await supabase.from('temporary_rooms')
      .select('id,title,context_type,context_id,expires_at')
      .eq('context_type',contextType)
      .eq('context_id',contextId)
      .gt('expires_at',new Date().toISOString())
      .order('created_at',{ascending:false})
      .limit(1)
      .maybeSingle();
    if(eError)throw eError;
    if(existing)return existing;
  }
  const expiresAt=new Date(Date.now()+hours*3600000).toISOString();
  const {data,error}=await supabase.from('temporary_rooms').insert({
    owner_id:userId,title,context_type:contextType,context_id:contextId,expires_at:expiresAt
  }).select('id,title,context_type,context_id,expires_at').single();
  if(error)throw error;
  return data;
}

export async function joinTemporaryRoom(roomId,userId,alias){
  const clean=(alias||'Anonimowa uczestniczka').trim().slice(0,40);
  const {error}=await supabase.from('temporary_room_members')
    .upsert({room_id:roomId,user_id:userId,public_alias:clean},{onConflict:'room_id,user_id'});
  if(error)throw error;
}

export async function loadTemporaryMessages(roomId,before=null){
  const {data,error}=await supabase.rpc('polka_temp_messages',{p_room:roomId,p_before:before});
  if(error)throw error;
  return (data||[]).reverse();
}

export async function sendTemporaryMessage(roomId,body){
  const {data,error}=await supabase.rpc('polka_temp_send',{p_room:roomId,p_body:body.trim()});
  if(error)throw error;
  return data;
}
