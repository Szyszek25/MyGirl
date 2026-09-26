import {supabase} from '../lib/supabase';
import {extensionForContentType,uriToUploadPayload} from './storageHelper';

async function signed(bucket,path,seconds=3600){
  if(!path)return null;
  const {data,error}=await supabase.storage.from(bucket).createSignedUrl(path,seconds);
  if(error)return null;
  return data?.signedUrl||null;
}

async function upload(bucket,userId,uri,prefix='media'){
  const {buffer,contentType}=await uriToUploadPayload(uri,'image/jpeg');
  const ext=extensionForContentType(contentType);
  const path=`${userId}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
  const {error}=await supabase.storage.from(bucket).upload(path,buffer,{contentType,upsert:false});
  if(error)throw error;
  return {path,type:contentType};
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
  let likes=[],comments=[],reactions=[];
  if(postIds.length){
    const [l,c,rx]=await Promise.all([
      supabase.from('post_likes').select('post_id,user_id').in('post_id',postIds),
      supabase.from('comments').select('id,post_id').in('post_id',postIds),
      supabase.from('post_reactions').select('post_id,user_id,reaction').in('post_id',postIds)
    ]);
    if(l.error)throw l.error;if(c.error)throw c.error;if(rx.error)throw rx.error;
    likes=l.data||[];comments=c.data||[];reactions=rx.data||[];
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
      reactions:reactions.filter(r=>r.post_id===row.id).reduce((acc,r)=>({...acc,[r.reaction]:(acc[r.reaction]||0)+1}),{}),
      myReaction:reactions.find(r=>r.post_id===row.id&&r.user_id===userId)?.reaction||null,
      avatar:profile.avatar_path?await signed('polka-avatars',profile.avatar_path):null,
      aspectRatio: (/matcha|pilates|spacer|vintage|second hand/i.test(row.body || '') || (row.media_path || '').includes('matcha')) ? '4:5' : '16:9',
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

export async function editPost(postId,userId,body,spotifyUrl,media){
  const updatePayload={
    body:body.trim(),
    spotify_url:spotifyUrl?.trim()||null,
    edited_at:new Date().toISOString()
  };
  if(media===null||!media?.uri){
    updatePayload.media_path=null;
    updatePayload.media_type=null;
  }else if(media.mediaPath&&typeof media.uri==='string'&&media.uri.startsWith('http')){
    updatePayload.media_path=media.mediaPath;
    updatePayload.media_type=media.mediaType||'image';
  }else if(media?.uri){
    const uploaded=await upload('polka-post-media',userId,media.uri,'post');
    updatePayload.media_path=uploaded.path;
    updatePayload.media_type=uploaded.type.startsWith('video/')?'video':'image';
  }
  const {data,error}=await supabase.from('posts')
    .update(updatePayload)
    .eq('id',postId)
    .select('id').single();
  if(error)throw error;
  return data;
}

export async function deletePost(postId,userId){
  const {error}=await supabase.from('posts').delete().eq('id',postId);
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
  const storyIds=(rows||[]).map(row=>row.id);
  let viewedIds=new Set();
  if(storyIds.length){
    const {data:views,error:vError}=await supabase.from('story_views')
      .select('story_id')
      .eq('viewer_id',userId)
      .in('story_id',storyIds);
    if(vError)throw vError;
    viewedIds=new Set((views||[]).map(view=>view.story_id));
  }
  const mapped=await Promise.all((rows||[]).map(async row=>{
    const p=pmap.get(row.author_id)||{};
    if(city&&p.city&&p.city!==city)return null;
    return {
      id:row.id,authorId:row.author_id,name:p.display_name||'Polka',caption:row.caption,
      mediaType:row.media_type,createdAt:row.created_at,viewed:viewedIds.has(row.id),
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

export async function deleteStory(storyId,userId){
  const {error}=await supabase.from('stories').delete().eq('id',storyId).eq('author_id',userId);
  if(error)throw error;
}

export async function setPostReaction(postId,userId,reaction,currentReaction=null){
  if(currentReaction===reaction){
    const {error}=await supabase.from('post_reactions').delete().eq('post_id',postId).eq('user_id',userId);
    if(error)throw error;
    return null;
  }
  const {error}=await supabase.from('post_reactions').upsert({post_id:postId,user_id:userId,reaction},{onConflict:'post_id,user_id'});
  if(error)throw error;
  return reaction;
}
