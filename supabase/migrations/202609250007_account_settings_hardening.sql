-- Polka account settings, chat activity and backend hardening.

create index if not exists conversations_created_by_idx on public.conversations(created_by,created_at desc);

revoke execute on function public.has_mutual_block(uuid,uuid) from anon;

alter table public.profiles
  drop constraint if exists profiles_online_adult_confirmation;
alter table public.profiles
  add constraint profiles_online_adult_confirmation
  check (not onboarding_complete or adult_confirmed_at is not null);

drop policy if exists polka_posts_select on storage.objects;
create policy polka_posts_select on storage.objects for select to authenticated
using (
  bucket_id='polka-post-media' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists(
      select 1 from public.posts p
      where p.media_path=storage.objects.name
        and p.moderation_status='approved'
        and not public.has_mutual_block((select auth.uid()),p.author_id)
    )
  )
);

create table if not exists public.account_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_enabled boolean not null default true,
  plans_notifications boolean not null default true,
  messages_notifications boolean not null default true,
  profile_visibility text not null default 'community' check(profile_visibility in ('community','contacts')),
  dm_policy text not null default 'community' check(dm_policy in ('community','contacts','nobody')),
  city_privacy text not null default 'city_only' check(city_privacy in ('city_only','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_account_settings_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin
  new.updated_at=now();
  return new;
end
$$;

drop trigger if exists account_settings_updated_at on public.account_settings;
create trigger account_settings_updated_at before update on public.account_settings
for each row execute function public.set_account_settings_updated_at();

alter table public.account_settings enable row level security;
grant select,insert,update on public.account_settings to authenticated;
revoke all on public.account_settings from anon;

create policy account_settings_select_own on public.account_settings for select to authenticated
using(user_id=(select auth.uid()));
create policy account_settings_insert_own on public.account_settings for insert to authenticated
with check(user_id=(select auth.uid()));
create policy account_settings_update_own on public.account_settings for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create or replace function public.touch_conversation_after_message()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.conversations set updated_at=now() where id=new.conversation_id;
  return new;
end
$$;
revoke all on function public.touch_conversation_after_message() from public,anon,authenticated;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation after insert on public.messages
for each row execute function public.touch_conversation_after_message();
