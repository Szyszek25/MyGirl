-- Polka voice notes in direct/group conversations.

alter table public.messages
  add column if not exists message_type text not null default 'text'
    check(message_type in ('text','voice','image','video')),
  add column if not exists duration_ms integer
    check(duration_ms is null or duration_ms between 250 and 600000);

update storage.buckets
set allowed_mime_types=array[
  'image/jpeg','image/png','image/webp',
  'audio/m4a','audio/mp4','audio/mpeg','audio/aac','audio/webm'
]
where id='polka-chat-media';

drop policy if exists messages_insert_members on public.messages;
create policy messages_insert_members on public.messages for insert to authenticated
with check(
  sender_id=(select auth.uid())
  and public.polka_is_conversation_member(conversation_id,(select auth.uid()))
  and (
    media_path is null
    or media_path like (select auth.uid())::text || '/%'
  )
);

drop policy if exists polka_chat_media_insert on storage.objects;
create policy polka_chat_media_insert on storage.objects for insert to authenticated
with check(
  bucket_id='polka-chat-media'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists polka_chat_media_select on storage.objects;
create policy polka_chat_media_select on storage.objects for select to authenticated
using(
  bucket_id='polka-chat-media'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists(
      select 1
      from public.messages m
      where m.media_path=storage.objects.name
        and public.polka_is_conversation_member(m.conversation_id,(select auth.uid()))
    )
  )
);

drop policy if exists polka_chat_media_delete on storage.objects;
create policy polka_chat_media_delete on storage.objects for delete to authenticated
using(
  bucket_id='polka-chat-media'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
