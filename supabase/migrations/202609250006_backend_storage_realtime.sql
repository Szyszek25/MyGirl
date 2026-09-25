-- Polka: production backend bridge for Auth, Storage and Realtime chat.
-- Safe for the dedicated Polka project created from migrations 001-005.

create index if not exists blocks_blocked_id_idx on public.blocks(blocked_id);
create index if not exists reports_target_post_idx on public.reports(target_post_id) where target_post_id is not null;
create index if not exists reports_target_profile_idx on public.reports(target_profile_id) where target_profile_id is not null;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;

alter table public.profiles
  add column if not exists goal text check (goal is null or char_length(goal) <= 100),
  add column if not exists adult_confirmed_at timestamptz;

alter table public.posts add column if not exists media_path text
  check (media_path is null or char_length(media_path)<=500);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('polka-avatars','polka-avatars',false,5242880,array['image/jpeg','image/png','image/webp']),
  ('polka-post-media','polka-post-media',false,8388608,array['image/jpeg','image/png','image/webp']),
  ('polka-chat-media','polka-chat-media',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy polka_avatars_insert on storage.objects for insert to authenticated
with check (
  bucket_id='polka-avatars'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy polka_avatars_select on storage.objects for select to authenticated
using (
  bucket_id='polka-avatars' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists(select 1 from public.profiles p where p.avatar_path=storage.objects.name and p.onboarding_complete)
  )
);
create policy polka_avatars_delete on storage.objects for delete to authenticated
using (bucket_id='polka-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy polka_posts_insert on storage.objects for insert to authenticated
with check (bucket_id='polka-post-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy polka_posts_select on storage.objects for select to authenticated
using (
  bucket_id='polka-post-media' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists(select 1 from public.posts p where p.author_id=(select auth.uid()) and p.media_path=storage.objects.name)
  )
);
create policy polka_posts_delete on storage.objects for delete to authenticated
using (bucket_id='polka-post-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy polka_chat_media_insert on storage.objects for insert to authenticated
with check (bucket_id='polka-chat-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy polka_chat_media_select on storage.objects for select to authenticated
using (bucket_id='polka-chat-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy polka_chat_media_delete on storage.objects for delete to authenticated
using (bucket_id='polka-chat-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'direct' check(kind in ('direct','group')),
  title text check(title is null or char_length(title)<=120),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(conversation_id,user_id)
);
create index if not exists conversation_members_user_idx on public.conversation_members(user_id,joined_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(char_length(btrim(body)) between 1 and 4000),
  client_message_id uuid not null,
  media_path text check(media_path is null or char_length(media_path)<=500),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique(sender_id,client_message_id)
);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id,created_at desc);
create index if not exists messages_sender_idx on public.messages(sender_id,created_at desc);

create or replace function public.polka_is_conversation_member(p_conversation uuid,p_user uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.conversation_members cm
    where cm.conversation_id=p_conversation and cm.user_id=p_user
  )
$$;
revoke all on function public.polka_is_conversation_member(uuid,uuid) from public,anon;
grant execute on function public.polka_is_conversation_member(uuid,uuid) to authenticated;

create or replace function public.polka_start_direct_conversation(p_other_user uuid)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  me uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
begin
  if me is null or p_other_user is null or me=p_other_user then
    raise exception 'invalid participant';
  end if;
  if not exists(select 1 from public.profiles p where p.id=p_other_user and p.onboarding_complete) then
    raise exception 'profile unavailable';
  end if;
  if public.has_mutual_block(me,p_other_user) then
    raise exception 'conversation unavailable';
  end if;

  select c.id into existing_id
  from public.conversations c
  where c.kind='direct'
    and public.polka_is_conversation_member(c.id,me)
    and public.polka_is_conversation_member(c.id,p_other_user)
    and (select count(*) from public.conversation_members cm where cm.conversation_id=c.id)=2
  limit 1;

  if existing_id is not null then return existing_id; end if;

  insert into public.conversations(kind,created_by) values('direct',me) returning id into new_id;
  insert into public.conversation_members(conversation_id,user_id)
  values(new_id,me),(new_id,p_other_user);
  return new_id;
end
$$;
revoke all on function public.polka_start_direct_conversation(uuid) from public,anon;
grant execute on function public.polka_start_direct_conversation(uuid) to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy conversations_read_members on public.conversations for select to authenticated
using(public.polka_is_conversation_member(id,(select auth.uid())));

create policy members_read_same_conversation on public.conversation_members for select to authenticated
using(public.polka_is_conversation_member(conversation_id,(select auth.uid())));

create policy messages_read_members on public.messages for select to authenticated
using(public.polka_is_conversation_member(conversation_id,(select auth.uid())));

create policy messages_insert_members on public.messages for insert to authenticated
with check(
  sender_id=(select auth.uid())
  and public.polka_is_conversation_member(conversation_id,(select auth.uid()))
  and media_path is null
);

create policy messages_delete_own on public.messages for delete to authenticated
using(sender_id=(select auth.uid()));

grant select on public.conversations,public.conversation_members,public.messages to authenticated;
grant insert,delete on public.messages to authenticated;
grant execute on function public.polka_start_direct_conversation(uuid) to authenticated;

alter publication supabase_realtime add table public.messages;
