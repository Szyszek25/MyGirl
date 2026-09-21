// Infrastructure module only: pass ONE shared authenticated Supabase client.
// Not wired into demo until Auth, reviewed RLS/moderation and new project exist.
// A single client owns one WebSocket for many channels; do not create a client
// in every React screen or in a render callback.
const PAGE_SIZE=30;
export function createChatRealtime(client){
  if(!client)throw new Error('Authenticated Supabase client required');
  let channel=null;
  let activeRoom=null;
  let generation=0;
  const stop=async()=>{
    generation+=1;activeRoom=null;
    const old=channel;channel=null;
    if(old)await client.removeChannel(old);
  };
  const history=async(roomId,{before,limit=PAGE_SIZE}={})=>{
    if(!roomId)throw new Error('Room ID required');
    let q=client.from('messages').select('id,conversation_id,sender_id,body,created_at,client_message_id')
      .eq('conversation_id',roomId).eq('moderation_status','approved')
      .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(Math.min(limit,50));
    if(before?.created_at)q=q.lt('created_at',before.created_at);
    const {data,error}=await q;
    if(error)throw error;
    return (data||[]).reverse();
  };
  const watch=async(roomId,onMessage,onState=()=>{})=>{
    if(typeof onMessage!=='function')throw new Error('onMessage required');
    await stop();
    if(!roomId)return ()=>{};
    activeRoom=roomId;
    const thisGeneration=generation;
    const next=client.channel(`mygirl-room-${roomId}`);
    channel=next;
    next.on('postgres_changes',{
      event:'*',schema:'public',table:'messages',filter:`conversation_id=eq.${roomId}`
    },payload=>{
      if(activeRoom!==roomId||generation!==thisGeneration)return;
      // Only RLS-visible APPROVED messages should be published. A moderator
      // may transition a pending row to approved via UPDATE.
      if(payload.new?.moderation_status==='approved')onMessage(payload.new);
      if(payload.eventType==='DELETE'&&payload.old?.id)onMessage({id:payload.old.id,deleted:true});
    }).subscribe(status=>{
      if(generation===thisGeneration){
        onState(status);
        // On SUBSCRIBED/reconnect refetch history and merge by UUID in UI.
        // Realtime events are not durable offline delivery.
      }
    });
    return ()=>{if(activeRoom===roomId)void stop()};
  };
  const send=async({roomId,senderId,body,clientMessageId})=>{
    if(!roomId||!senderId||!clientMessageId||!body?.trim())throw new Error('Missing message fields');
    // Generate clientMessageId ONCE on send button press, reuse it on retry.
    // Unique(sender_id, client_message_id) in SQL prevents duplicate inserts.
    const payload={conversation_id:roomId,sender_id:senderId,body:body.trim().slice(0,4000),client_message_id:clientMessageId};
    const {data,error}=await client.from('messages').insert(payload).select('id,created_at,moderation_status').single();
    if(error?.code==='23505'){
      const existing=await client.from('messages').select('id,created_at,moderation_status')
        .eq('sender_id',senderId).eq('client_message_id',clientMessageId).single();
      if(existing.error)throw existing.error;
      return existing.data;
    }
    if(error)throw error;
    // Base SQL marks new messages PENDING, so receiver cannot see them until
    // trusted server-side moderation approves. Never bypass this on client.
    return data;
  };
  return {history,watch,send,stop};
}
