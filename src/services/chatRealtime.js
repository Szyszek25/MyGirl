import {extensionForContentType,uriToUploadPayload} from './storageHelper';
const PAGE_SIZE=30;

export function newClientMessageId(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.floor(Math.random()*16);
    const v=c==='x'?r:(r&0x3)|0x8;
    return v.toString(16);
  });
}

export function createChatRealtime(client){
  if(!client)throw new Error('Authenticated Supabase client required');

  const resolveAvatarUrl=async path=>{
    if(!path)return null;
    if(/^https?:\/\//i.test(path))return path;
    const {data}=await client.storage.from('polka-avatars').createSignedUrl(path,3600);
    return data?.signedUrl||null;
  };

  const hydrateMedia=async message=>{
    if(!message?.media_path)return message;
    const {data,error}=await client.storage.from('polka-chat-media').createSignedUrl(message.media_path,60*60);
    if(error)return message;
    return {...message,media_url:data?.signedUrl||null};
  };
  let channel=null;
  let activeRoom=null;
  let generation=0;

  const stop=async()=>{
    generation+=1;
    activeRoom=null;
    const old=channel;
    channel=null;
    if(old)await client.removeChannel(old);
  };

  const listConversations=async(userId)=>{
    if(!userId)return [];
    const {data:memberRows,error:memberError}=await client.from('conversation_members')
      .select('conversation_id').eq('user_id',userId);
    if(memberError)throw memberError;
    const ids=(memberRows||[]).map(row=>row.conversation_id);
    if(!ids.length)return [];

    const [{data:rooms,error:roomError},{data:members,error:membersError},{data:lastMessages,error:messageError}]=await Promise.all([
      client.from('conversations').select('id,kind,title,created_by,updated_at,created_at,meetup_id,group_id').in('id',ids).order('updated_at',{ascending:false}),
      client.from('conversation_members').select('conversation_id,user_id').in('conversation_id',ids),
      client.from('messages').select('id,conversation_id,sender_id,body,created_at').in('conversation_id',ids).is('deleted_at',null).order('created_at',{ascending:false}).limit(150)
    ]);
    if(roomError)throw roomError;
    if(membersError)throw membersError;
    if(messageError)throw messageError;

    const otherIds=[...new Set((members||[]).filter(row=>row.user_id!==userId).map(row=>row.user_id))];
    let profiles=[];
    if(otherIds.length){
      const result=await client.from('profiles').select('id,display_name,avatar_path,last_active_at').in('id',otherIds);
      if(result.error)throw result.error;
      profiles=result.data||[];
    }
    const profileEntries=await Promise.all(profiles.map(async profile=>[profile.id,{...profile,avatar_url:await resolveAvatarUrl(profile.avatar_path)}]));
    const profileMap=new Map(profileEntries);
    const groupIds=[...new Set((rooms||[]).map(room=>room.group_id).filter(Boolean))];
    const groupMap=new Map();
    if(groupIds.length){
      const {data:groupRows,error:groupError}=await client.from('groups').select('id,cover_path').in('id',groupIds);
      if(groupError)throw groupError;
      await Promise.all((groupRows||[]).map(async group=>{if(!group.cover_path)return;const {data}=await client.storage.from('polka-group-covers').createSignedUrl(group.cover_path,3600);if(data?.signedUrl)groupMap.set(group.id,data.signedUrl);}));
    }

    const latest=new Map();
    for(const message of lastMessages||[])if(!latest.has(message.conversation_id))latest.set(message.conversation_id,message);

    return (rooms||[]).map(room=>{
      const roomMembers=(members||[]).filter(row=>row.conversation_id===room.id);
      const other=profileMap.get(roomMembers.find(row=>row.user_id!==userId)?.user_id);
      const last=latest.get(room.id);
      return {
        ...room,
        name:room.kind==='group'?(room.title||'Grupa'):(other?.display_name||'Rozmowa'),
        otherUserId:other?.id||null,
        avatarPath:other?.avatar_path||null,
        avatarUrl:room.group_id?groupMap.get(room.group_id)||null:(other?.avatar_url||null),
        meetupId:room.meetup_id||null,
        groupId:room.group_id||null,
        lastActiveAt:other?.last_active_at||null,
        last:last?.body||'Nowa rozmowa',
        time:last?.created_at||room.updated_at||room.created_at
      };
    });
  };

  const history=async(roomId,{before,limit=PAGE_SIZE}={})=>{
    if(!roomId)throw new Error('Room ID required');
    let q=client.from('messages')
      .select('id,conversation_id,sender_id,body,created_at,client_message_id,media_path,message_type,duration_ms')
      .eq('conversation_id',roomId)
      .is('deleted_at',null)
      .order('created_at',{ascending:false})
      .limit(Math.min(limit,50));
    if(before?.created_at)q=q.lt('created_at',before.created_at);
    const {data,error}=await q;
    if(error)throw error;
    return Promise.all((data||[]).reverse().map(hydrateMedia));
  };

  const watch=async(roomId,onMessage,onState=()=>{})=>{
    if(typeof onMessage!=='function')throw new Error('onMessage required');
    await stop();
    if(!roomId)return ()=>{};
    activeRoom=roomId;
    const thisGeneration=generation;
    const next=client.channel(`polka-room-${roomId}`);
    channel=next;
    next.on('postgres_changes',{
      event:'*',schema:'public',table:'messages',filter:`conversation_id=eq.${roomId}`
    },payload=>{
      if(activeRoom!==roomId||generation!==thisGeneration)return;
      if(payload.eventType==='INSERT'&&payload.new)void hydrateMedia(payload.new).then(onMessage);
      if(payload.eventType==='DELETE'&&payload.old?.id)onMessage({id:payload.old.id,deleted:true});
    }).subscribe(status=>{if(generation===thisGeneration)onState(status)});
    return ()=>{if(activeRoom===roomId)void stop()};
  };

  const send=async({roomId,senderId,body,clientMessageId=newClientMessageId()})=>{
    if(!roomId||!senderId||!body?.trim())throw new Error('Missing message fields');
    const payload={
      conversation_id:roomId,
      sender_id:senderId,
      body:body.trim().slice(0,4000),
      client_message_id:clientMessageId
    };
    const {data,error}=await client.from('messages').insert(payload)
      .select('id,conversation_id,sender_id,body,created_at,client_message_id,media_path,message_type,duration_ms').single();
    if(error?.code==='23505'){
      const existing=await client.from('messages')
.select('id,conversation_id,sender_id,body,created_at,client_message_id,media_path,message_type,duration_ms')
        .eq('sender_id',senderId).eq('client_message_id',clientMessageId).single();
      if(existing.error)throw existing.error;
      return existing.data;
    }
    if(error)throw error;
    return data;
  };

  const sendImage=async({roomId,senderId,uri,clientMessageId=newClientMessageId()})=>{
    if(!roomId||!senderId||!uri)throw new Error('Missing image message fields');
    const {buffer,contentType}=await uriToUploadPayload(uri,'image/jpeg');
    if(!String(contentType).startsWith('image/'))throw new Error('Wybierz zdjęcie.');
    const ext=extensionForContentType(contentType);
    const mediaPath=`${senderId}/image-${Date.now()}-${clientMessageId.slice(0,8)}.${ext}`;
    const upload=await client.storage.from('polka-chat-media').upload(mediaPath,buffer,{contentType,upsert:false});
    if(upload.error)throw upload.error;
    const payload={
      conversation_id:roomId,
      sender_id:senderId,
      body:'Zdjęcie',
      client_message_id:clientMessageId,
      media_path:mediaPath,
      message_type:'image'
    };
    const {data,error}=await client.from('messages').insert(payload)
      .select('id,conversation_id,sender_id,body,created_at,client_message_id,media_path,message_type,duration_ms').single();
    if(error){
      await client.storage.from('polka-chat-media').remove([mediaPath]).catch(()=>{});
      throw error;
    }
    return hydrateMedia(data);
  };

  const sendVoice=async({roomId,senderId,uri,durationMs,clientMessageId=newClientMessageId()})=>{
    if(!roomId||!senderId||!uri)throw new Error('Missing voice message fields');
    const {buffer,contentType}=await uriToUploadPayload(uri,'audio/m4a');
    const ext=extensionForContentType(contentType);
    const mediaPath=`${senderId}/voice-${Date.now()}-${clientMessageId.slice(0,8)}.${ext}`;
    const upload=await client.storage.from('polka-chat-media').upload(mediaPath,buffer,{contentType,upsert:false});
    if(upload.error)throw upload.error;
    const payload={
      conversation_id:roomId,
      sender_id:senderId,
      body:'Wiadomość głosowa',
      client_message_id:clientMessageId,
      media_path:mediaPath,
      message_type:'voice',
      duration_ms:Math.max(250,Math.min(600000,Math.round(durationMs||0)))
    };
    const {data,error}=await client.from('messages').insert(payload)
      .select('id,conversation_id,sender_id,body,created_at,client_message_id,media_path,message_type,duration_ms').single();
    if(error){
      await client.storage.from('polka-chat-media').remove([mediaPath]).catch(()=>{});
      throw error;
    }
    return hydrateMedia(data);
  };

  const startDirect=async(otherUserId)=>{
    const {data,error}=await client.rpc('polka_start_direct_conversation',{p_other_user:otherUserId});
    if(error)throw error;
    return data;
  };

  return {listConversations,history,watch,send,sendImage,sendVoice,startDirect,stop};
}
