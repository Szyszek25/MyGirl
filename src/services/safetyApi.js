import {supabase} from '../lib/supabase';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASONS=['harassment','hate','sexual','spam','impersonation','other'];
const requireId=id=>{if(typeof id!=='string'||!UUID.test(id))throw new Error('Nieprawidłowy identyfikator.');return id;};

async function identity(){
  const {data,error}=await supabase.auth.getUser();
  if(error||!data?.user)throw new Error('Zaloguj się, aby wykonać tę operację.');
  return data.user.id;
}

const targetColumn={
  profile:'target_profile_id',
  post:'target_post_id',
  message:'target_message_id',
  group:'target_group_id',
  meetup:'target_meetup_id',
  story:'target_story_id',
  chat:'target_conversation_id'
};

export async function reportTarget(target,reason,details=''){
  const reporter_id=await identity();
  if(!REASONS.includes(reason))throw new Error('Wybierz powód zgłoszenia.');
  const column=targetColumn[target?.kind];
  if(!column)throw new Error('Tego typu treści nie można jeszcze zgłosić online.');
  const payload={
    reporter_id,
    [column]:requireId(target.id),
    reason,
    details:String(details||'').slice(0,1000)
  };
  const {error}=await supabase.from('reports').insert(payload);
  if(error)throw error;
}

export async function blockProfile(profileId){
  const blocker_id=await identity();
  const {error}=await supabase.from('blocks').upsert({
    blocker_id,
    blocked_id:requireId(profileId)
  },{onConflict:'blocker_id,blocked_id'});
  if(error)throw error;
}

export async function unblockProfile(profileId){
  const blocker_id=await identity();
  const {error}=await supabase.from('blocks')
    .delete().eq('blocker_id',blocker_id).eq('blocked_id',requireId(profileId));
  if(error)throw error;
}

export async function loadMyBlocks(){
  const userId=await identity();
  const {data,error}=await supabase.from('blocks').select('blocked_id').eq('blocker_id',userId);
  if(error)throw error;
  return (data||[]).map(row=>row.blocked_id);
}

export async function loadMyReports(){
  await identity();
  const {data,error}=await supabase.from('reports')
    .select('id,reason,status,created_at,target_profile_id,target_post_id,target_message_id,target_group_id,target_meetup_id,target_story_id,target_conversation_id')
    .order('created_at',{ascending:false}).limit(50);
  if(error)throw error;
  return data||[];
}

export async function deleteMyAccount(){
  await identity();
  const {error}=await supabase.functions.invoke('delete-account',{body:{confirm:'DELETE_MY_ACCOUNT'}});
  if(error)throw error;
  const {error:signOutError}=await supabase.auth.signOut();
  if(signOutError)throw signOutError;
}
