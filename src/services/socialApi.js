import {supabase} from '../lib/supabase';

async function signed(bucket,path,seconds=3600){
  if(!path)return null;
  const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,seconds);
  if(error)return null;
  return data?.signedUrl||null;
}

async function upload(bucket,userId,uri,prefix='media'){
  const response=await fetch(uri);
  const blob=await response.blob();
  const type=blob.type||'image/jpeg';
  const ext=type.includes('png')?'png':type.includes('webp')?'webp':type.includes('mp4')?'mp4':'jpg';
  const path=`${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
  const {error}=await supabase.storage.from(bucket).upload(path,blob,{contentType:type,upsert:false});
  if(error)throw error;
  return {path,type};
}

export async function loadFeed(city,userId){
  if(!userId)return [];
  const {data:rows,error}=await supabase.from('posts')
    .select('id,author_id,body,media_path,media_type,spotify_url,created_at,edited_at,moderation_status')
    .or(`moderation_status.eq.approved,author_id.eq.${userId}`)
    .order('created_at',{ascending:false})
    .limit(100);
  if(error)throw error;
  const ids=[...new Set((rows||[]).map(r=>r.author_id))];
  const {data:profiles,error:profilesError}=ids.length
    ? await supabase.from('profiles').select('id,display_name,city,avatar_path').in('id',ids)
    : {data:[],error:null};
  if(profilesError)throw profilesError;
  const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));

  const postIds=(rows||[]).map(r=>r.id);
  let likes=[],comments=[];
  if(postIds.length){
    const [l,c]=await Promise.all([
      supabase.from('post_likes').select('post_id,user_id').in('post_id',postIds),
      supabase.from('comments').select('id,post_id').in('post_id',postIds)
    ]);
    if(l.error)throw l.error;if(c.error)throw c.error;
    likes=l.data||[];comments=c.data||[];
  }

  const mapped=await Promise.all((rows||[]).map(async row=>{
    const profile=profileMap.get(row.author_id)||{};
    if(city&&profile.city&&profile.city!==city)return null;
    return {
      id:row.id,
      authorId:row.author_id,
      author:profile.display_name||'Polka',
      city:profile.city||city||'',
      body:row.body,
      image:row.media_type==='image'?await signed('polka-post-media',row.media_path):null,
      mediaPath:row.media_path||null,
      mediaType:row.media_type||null,
      spotifyUrl:row.spotify_url||null,
      createdAt:row.created_at,
      editedAt:row.edited_at,
      moderationStatus:row.moderation_status,
      likes:likes.filter(l=>l.post_id===row.id).length,
      likedByMe:likes.some(l=>l.post_id===row.id&&l.user_id===userId),
      commentsCount:comments.filter(c=>c.post_id===row.id).length,
      avatar:profile.avatar_path?await signed('polka-avatars',profile.avatar_path):null,
      remote:true
    };
  }));
  return mapped.filter(Boolean);
}

export async function createPost({userId,body,imageUri,spotifyUrl}){
  let mediaPath=null,mediaType=null;
  if(imageUri){
    const uploaded=await upload('polka-post-media',userId,imageUri,'post');
    mediaPath=uploaded.path;
    mediaType=uploaded.type.startsWith('video/')?'video':'image';
  }
  const payload={author_id:userId,body:body.trim(),media_path:mediaPath,media_type:mediaType,spotify_url:spotifyUrl?.trim()||null};
  const {data,error}=await supabase.from('posts').insert(payload).select('id,created_at,moderation_status').single();
  if(error)throw error;
  return data;
}

export async function editPost(postId,userId,body,spotifyUrl){
  const {data,error}=await supabase.from('posts')
    .update({body:body.trim(),spotify_url:spotifyUrl?.trim()||null,edited_at:new Date().toISOString()})
    .eq('id',postId)
    .eq('author_id',userId)
    .select('id').single();
  if(error)throw error;
  return data;
}

export async function deletePost(postId,userId){
  const {error}=await supabase.from('posts').delete().eq('id',postId).eq('author_id',userId);
  if(error)throw error;
}

export async function togglePostLike(postId,userId,liked){
  if(liked){
    const {error}=await supabase.from('post_likes').delete().eq('post_id',postId).eq('user_id',userId);
    if(error)throw error;
    return false;
  }
  const {error}=await supabase.from('post_likes').insert({post_id:postId,user_id:userId});
  if(error&&error.code!=='23505')throw error;
  return true;
}

export async function loadComments(postId){
  const {data:rows,error}=await supabase.from('comments')
    .select('id,author_id,body,parent_id,created_at,edited_at')
    .eq('post_id',postId).order('created_at',{ascending:true});
  if(error)throw error;
  const ids=[...new Set((rows||[]).map(r=>r.author_id))];
  const {data:profiles,error:pError}=ids.length
    ? await supabase.from('profiles').select('id,display_name,avatar_path').in('id',ids)
    : {data:[],error:null};
  if(pError)throw pError;
  const profileMap=new Map((profiles||[]).map(p=>[p.id,p]));
  return Promise.all((rows||[]).map(async row=>{
    const p=profileMap.get(row.author_id)||{};
    return {
      id:row.id,authorId:row.author_id,author:p.display_name||'Polka',body:row.body,
      parentId:row.parent_id,createdAt:row.created_at,editedAt:row.edited_at,
      photo:p.avatar_path?await signed('polka-avatars',p.avatar_path):null
    };
  }));
}

export async function addComment(postId,userId,body,parentId=null){
  const {data,error}=await supabase.from('comments')
    .insert({post_id:postId,author_id:userId,body:body.trim(),parent_id:parentId})
    .select('id,created_at').single();
  if(error)throw error;
  return data;
}

export async function loadStories(userId,city){
  if(!userId)return [];
  const {data:rows,error}=await supabase.from('stories')
    .select('id,author_id,media_path,media_type,caption,created_at,expires_at')
    .gt('expires_at',new Date().toISOString())
    .order('created_at',{ascending:false}).limit(60);
  if(error)throw error;
  const ids=[...new Set((rows||[]).map(r=>r.author_id))];
  const {data:profiles,error:pError}=ids.length
    ? await supabase.from('profiles').select('id,display_name,city,avatar_path').in('id',ids)
    : {data:[],error:null};
  if(pError)throw pError;
  const pmap=new Map((profiles||[]).map(p=>[p.id,p]));
  const mapped=await Promise.all((rows||[]).map(async row=>{
    const p=pmap.get(row.author_id)||{};
    if(city&&p.city&&p.city!==city)return null;
    return {
      id:row.id,authorId:row.author_id,name:p.display_name||'Polka',caption:row.caption,
      mediaType:row.media_type,createdAt:row.created_at,
      mediaUrl:await signed('polka-story-media',row.media_path),
      avatar:p.avatar_path?await signed('polka-avatars',p.avatar_path):null
    };
  }));
  return mapped.filter(Boolean);
}

export async function createStory({userId,uri,caption=''}) {
  const uploaded=await upload('polka-story-media',userId,uri,'story');
  const mediaType=uploaded.type.startsWith('video/')?'video':'image';
  const {data,error}=await supabase.from('stories')
    .insert({author_id:userId,media_path:uploaded.path,media_type:mediaType,caption:caption.trim()||null})
    .select('id').single();
  if(error)throw error;
  return data;
}

export async function markStoryViewed(storyId,userId){
  const {error}=await supabase.from('story_views').upsert({story_id:storyId,viewer_id:userId},{onConflict:'story_id,viewer_id'});
  if(error)throw error;
}
