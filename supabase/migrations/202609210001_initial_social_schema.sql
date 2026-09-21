-- MyGirl: fresh Supabase project ONLY. Review and apply to a NEW MyGirl project.
-- This migration has NOT been executed against any remote database.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  city text check (char_length(city) <= 100),
  bio text check (char_length(bio) <= 500),
  avatar_path text check (char_length(avatar_path) <= 500),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_interests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  interest text not null check (char_length(interest) between 1 and 40),
  primary key (profile_id, interest)
);

create table public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint cannot_block_self check (blocker_id <> blocked_id)
);

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint cannot_invite_self check (sender_id <> recipient_id),
  constraint unique_direction unique (sender_id, recipient_id)
);
create unique index friend_requests_one_per_pair on public.friend_requests
  (least(sender_id, recipient_id), greatest(sender_id, recipient_id));
create index friend_requests_recipient_idx on public.friend_requests(recipient_id, created_at desc);

create function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created_mygirl
  after insert on auth.users for each row execute function public.create_profile_for_new_user();

create function public.set_profile_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_profile_updated_at();

alter table public.profiles enable row level security;
alter table public.profile_interests enable row level security;
alter table public.blocks enable row level security;
alter table public.friend_requests enable row level security;

-- Discover only completed profiles, excluding any mutual block. Own profile always visible.
create policy profiles_read on public.profiles for select to authenticated using (
  id = (select auth.uid()) or
  (onboarding_complete and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = profiles.id)
       or (b.blocked_id = (select auth.uid()) and b.blocker_id = profiles.id)
  ))
);
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy interests_read on public.profile_interests for select to authenticated using (
  exists (select 1 from public.profiles p where p.id = profile_id)
);
create policy interests_insert_own on public.profile_interests for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy interests_delete_own on public.profile_interests for delete to authenticated
  using (profile_id = (select auth.uid()));

-- Block lists are private; participants only see their own blocked list.
create policy blocks_read_own on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy blocks_insert_own on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy blocks_delete_own on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create policy friend_requests_read_participants on public.friend_requests for select to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));
create policy friend_requests_send on public.friend_requests for insert to authenticated
  with check (
    sender_id = (select auth.uid()) and recipient_id <> (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = recipient_id and p.onboarding_complete)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = sender_id and b.blocked_id = recipient_id)
         or (b.blocker_id = recipient_id and b.blocked_id = sender_id)
    )
  );
create policy friend_requests_delete_participants on public.friend_requests for delete to authenticated
  using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

-- No UPDATE/ACCEPT policy yet: accepting invitations and chat require separate, reviewed migrations.
-- Before live users: test policies as two separate authenticated users, audit report/block,
-- verify photo bucket permissions, age rules and account deletion. Do NOT disable RLS.
