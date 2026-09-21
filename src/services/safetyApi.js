// Production API adapter. The current app deliberately runs in DEMO mode and does
// NOT call these functions until a separate MyGirl Supabase project and real auth
// session have been configured and tested. Never pass a service_role key to Expo.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REASONS=['harassment','hate','sexual','spam','impersonation','other'];
const requireId=id=>{if(typeof id!=='string'||!UUID.test(id))throw new Error('Invalid record identifier');return id;};
async function identity(supabase){
  if(!supabase)throw new Error('MyGirl Supabase is not connected');
  const {data,error}=await supabase.auth.getUser();
  if(error||!data?.user)throw new Error('Sign in required');
  return data.user.id;
}
export async function reportProfile(supabase,profileId,reason,details=''){
  const reporter_id=await identity(supabase);
  if(!REASONS.includes(reason))throw new Error('Select a report reason');
  const {error}=await supabase.from('reports').insert({reporter_id,target_profile_id:requireId(profileId),reason,details:details.slice(0,1000)});
  if(error)throw error;
}
export async function reportPost(supabase,postId,reason,details=''){
  const reporter_id=await identity(supabase);
  if(!REASONS.includes(reason))throw new Error('Select a report reason');
  const {error}=await supabase.from('reports').insert({reporter_id,target_post_id:requireId(postId),reason,details:details.slice(0,1000)});
  if(error)throw error;
}
export async function blockProfile(supabase,profileId){
  const blocker_id=await identity(supabase);
  const {error}=await supabase.from('blocks').insert({blocker_id,blocked_id:requireId(profileId)});
  if(error)throw error;
}
export async function unblockProfile(supabase,profileId){
  const blocker_id=await identity(supabase);
  const {error}=await supabase.from('blocks').delete().eq('blocker_id',blocker_id).eq('blocked_id',requireId(profileId));
  if(error)throw error;
}
export async function deleteOwnPost(supabase,postId){
  const author_id=await identity(supabase);
  const {data,error}=await supabase.from('posts').delete().eq('id',requireId(postId)).eq('author_id',author_id).select('id');
  if(error)throw error;
  if(!data?.length)throw new Error('Post was not found or cannot be deleted');
}
export async function deleteMyAccount(supabase){
  await identity(supabase);
  const {error}=await supabase.functions.invoke('delete-account',{body:{confirm:'DELETE_MY_ACCOUNT'}});
  if(error)throw error;
  const {error:signOutError}=await supabase.auth.signOut();
  if(signOutError)throw signOutError;
}
