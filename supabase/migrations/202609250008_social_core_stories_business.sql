-- Polka social core: friendships, stories, comments, groups/meetups, business accounts and admin roles.

create table if not exists public.app_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'member' check(role in ('member','moderator','admin','business')),
  created_at timestamptz not null default now()
);
alter table public.app_roles enable row level security;
grant select on public.app_roles to authenticated;
create policy app_roles_read_own on public.app_roles for select to authenticated
using(user_id=(select auth.uid()));

create or replace function public.polka_is_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(
    select 1 from public.app_roles r
    where r.user_id=(select auth.uid()) and r.role in ('admin','moderator')
  )
$$;
revoke all on function public.polka_is_admin() from public,anon;
grant execute on function public.polka_is_admin() to authenticated;

alter table public.profiles
  add column if not exists headline text check(headline is null or char_length(headline)<=80),
  add column if not exists subtitle text check(subtitle is null or char_length(subtitle)<=120),
  add column if not exists instagram_handle text check(instagram_handle is null or char_length(instagram_handle)<=50),
  add column if not exists tiktok_handle text check(tiktok_handle is null or char_length(tiktok_handle)<=50),
  add column if not exists spotify_url text check(spotify_url is null or char_length(spotify_url)<=500);

create policy profiles_admin_update on public.profiles for update to authenticated
using(public.polka_is_admin()) with check(public.polka_is_admin());

create table if not exists public.friendships (
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_a,user_b),
  check(user_a < user_b)
);
create index if not exists friendships_user_b_idx on public.friendships(user_b,created_at desc);
alter table public.friendships enable row level security;
grant select,insert,delete on public.friendships to authenticated;
create policy friendships_read_participants on public.friendships for select to authenticated
using(user_a=(select auth.uid()) or user_b=(select auth.uid()));
create policy friendships_insert_participant on public.friendships for insert to authenticated
with check(
  (user_a=(select auth.uid()) or user_b=(select auth.uid()))
  and not public.has_mutual_block(user_a,user_b)
);
create policy friendships_delete_participant on public.friendships for delete to authenticated
using(user_a=(select auth.uid()) or user_b=(select auth.uid()));

create or replace function public.polka_accept_friend_request(p_request uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
  r public.friend_requests;
  a uuid;
  b uuid;
begin
  select * into r from public.friend_requests where id=p_request for update;
  if r.id is null or r.recipient_id<>(select auth.uid()) then raise exception 'request unavailable'; end if;
  a:=least(r.sender_id,r.recipient_id); b:=greatest(r.sender_id,r.recipient_id);
  if public.has_mutual_block(a,b) then raise exception 'friendship unavailable'; end if;
  insert into public.friendships(user_a,user_b) values(a,b) on conflict do nothing;
  delete from public.friend_requests where id=p_request;
end
$$;
revoke all on function public.polka_accept_friend_request(uuid) from public,anon;
grant execute on function public.polka_accept_friend_request(uuid) to authenticated;

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(post_id,user_id)
);
alter table public.post_likes enable row level security;
grant select,insert,delete on public.post_likes to authenticated;
create policy post_likes_read on public.post_likes for select to authenticated using(true);
create policy post_likes_insert_own on public.post_likes for insert to authenticated with check(user_id=(select auth.uid()));
create policy post_likes_delete_own on public.post_likes for delete to authenticated using(user_id=(select auth.uid()));

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check(char_length(btrim(body)) between 1 and 1200),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists comments_post_created_idx on public.comments(post_id,created_at);
create index if not exists comments_author_idx on public.comments(author_id,created_at desc);
alter table public.comments enable row level security;
grant select,insert,update,delete on public.comments to authenticated;
create policy comments_read on public.comments for select to authenticated
using(not public.has_mutual_block((select auth.uid()),author_id));
create policy comments_insert_own on public.comments for insert to authenticated
with check(author_id=(select auth.uid()) and not public.has_mutual_block((select auth.uid()),author_id));
create policy comments_update_own_or_admin on public.comments for update to authenticated
using(author_id=(select auth.uid()) or public.polka_is_admin())
with check(author_id=(select auth.uid()) or public.polka_is_admin());
create policy comments_delete_own_or_admin on public.comments for delete to authenticated
using(author_id=(select auth.uid()) or public.polka_is_admin());

alter table public.posts
  add column if not exists media_type text check(media_type is null or media_type in ('image','video','audio')),
  add column if not exists audio_path text check(audio_path is null or char_length(audio_path)<=500),
  add column if not exists spotify_url text check(spotify_url is null or char_length(spotify_url)<=500),
  add column if not exists edited_at timestamptz;

create policy posts_admin_update on public.posts for update to authenticated
using(public.polka_is_admin()) with check(public.polka_is_admin());
create policy posts_admin_delete on public.posts for delete to authenticated
using(public.polka_is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('polka-story-media','polka-story-media',false,15728640,array['image/jpeg','image/png','image/webp','video/mp4']),
  ('polka-audio','polka-audio',false,15728640,array['audio/m4a','audio/mp4','audio/mpeg','audio/aac'])
on conflict(id) do update set
  public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_path text not null check(char_length(media_path)<=500),
  media_type text not null check(media_type in ('image','video')),
  caption text check(caption is null or char_length(caption)<=300),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '24 hours')
);
create index if not exists stories_expires_idx on public.stories(expires_at desc);
create index if not exists stories_author_idx on public.stories(author_id,created_at desc);
alter table public.stories enable row level security;
grant select,insert,delete on public.stories to authenticated;
create policy stories_read on public.stories for select to authenticated
using(expires_at>now() and not public.has_mutual_block((select auth.uid()),author_id));
create policy stories_insert_own on public.stories for insert to authenticated with check(author_id=(select auth.uid()));
create policy stories_delete_own_or_admin on public.stories for delete to authenticated
using(author_id=(select auth.uid()) or public.polka_is_admin());

create table if not exists public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key(story_id,viewer_id)
);
alter table public.story_views enable row level security;
grant select,insert on public.story_views to authenticated;
create policy story_views_insert_own on public.story_views for insert to authenticated with check(viewer_id=(select auth.uid()));
create policy story_views_read_author_or_self on public.story_views for select to authenticated
using(viewer_id=(select auth.uid()) or exists(select 1 from public.stories s where s.id=story_id and s.author_id=(select auth.uid())));

create policy polka_story_media_insert on storage.objects for insert to authenticated
with check(bucket_id='polka-story-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy polka_story_media_select on storage.objects for select to authenticated
using(
  bucket_id='polka-story-media' and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or exists(select 1 from public.stories s where s.media_path=storage.objects.name and s.expires_at>now())
  )
);
create policy polka_story_media_delete on storage.objects for delete to authenticated
using(bucket_id='polka-story-media' and (storage.foldername(name))[1]=(select auth.uid())::text);

create policy polka_audio_insert on storage.objects for insert to authenticated
with check(bucket_id='polka-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy polka_audio_select on storage.objects for select to authenticated
using(bucket_id='polka-audio');
create policy polka_audio_delete on storage.objects for delete to authenticated
using(bucket_id='polka-audio' and (storage.foldername(name))[1]=(select auth.uid())::text);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(char_length(btrim(name)) between 2 and 100),
  description text not null default '' check(char_length(description)<=1000),
  city text not null check(char_length(city)<=100),
  category text not null default 'inne' check(char_length(category)<=50),
  cover_path text,
  created_at timestamptz not null default now()
);
create index if not exists groups_city_idx on public.groups(city,created_at desc);
alter table public.groups enable row level security;
grant select,insert,update,delete on public.groups to authenticated;
create policy groups_read on public.groups for select to authenticated using(true);
create policy groups_insert_own on public.groups for insert to authenticated with check(owner_id=(select auth.uid()));
create policy groups_update_own_or_admin on public.groups for update to authenticated using(owner_id=(select auth.uid()) or public.polka_is_admin()) with check(owner_id=(select auth.uid()) or public.polka_is_admin());
create policy groups_delete_own_or_admin on public.groups for delete to authenticated using(owner_id=(select auth.uid()) or public.polka_is_admin());

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check(role in ('member','moderator','owner')),
  joined_at timestamptz not null default now(),
  primary key(group_id,user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id,joined_at desc);
alter table public.group_members enable row level security;
grant select,insert,delete on public.group_members to authenticated;
create policy group_members_read on public.group_members for select to authenticated using(true);
create policy group_members_join on public.group_members for insert to authenticated with check(user_id=(select auth.uid()));
create policy group_members_leave on public.group_members for delete to authenticated using(user_id=(select auth.uid()) or public.polka_is_admin());

create table if not exists public.meetups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  title text not null check(char_length(btrim(title)) between 3 and 120),
  description text not null default '' check(char_length(description)<=1500),
  city text not null check(char_length(city)<=100),
  venue_name text check(venue_name is null or char_length(venue_name)<=150),
  maps_url text check(maps_url is null or char_length(maps_url)<=1000),
  starts_at timestamptz not null,
  capacity integer not null default 12 check(capacity between 2 and 200),
  created_at timestamptz not null default now()
);
create index if not exists meetups_city_date_idx on public.meetups(city,starts_at);
alter table public.meetups enable row level security;
grant select,insert,update,delete on public.meetups to authenticated;
create policy meetups_read on public.meetups for select to authenticated using(starts_at>now()-interval '1 day');
create policy meetups_insert_own on public.meetups for insert to authenticated with check(host_id=(select auth.uid()));
create policy meetups_update_own_or_admin on public.meetups for update to authenticated using(host_id=(select auth.uid()) or public.polka_is_admin()) with check(host_id=(select auth.uid()) or public.polka_is_admin());
create policy meetups_delete_own_or_admin on public.meetups for delete to authenticated using(host_id=(select auth.uid()) or public.polka_is_admin());

create table if not exists public.meetup_rsvps (
  meetup_id uuid not null references public.meetups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going' check(status in ('interested','going')),
  created_at timestamptz not null default now(),
  primary key(meetup_id,user_id)
);
alter table public.meetup_rsvps enable row level security;
grant select,insert,update,delete on public.meetup_rsvps to authenticated;
create policy meetup_rsvps_read on public.meetup_rsvps for select to authenticated using(true);
create policy meetup_rsvps_write_own on public.meetup_rsvps for insert to authenticated with check(user_id=(select auth.uid()));
create policy meetup_rsvps_update_own on public.meetup_rsvps for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy meetup_rsvps_delete_own on public.meetup_rsvps for delete to authenticated using(user_id=(select auth.uid()));

create table if not exists public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(char_length(btrim(name)) between 2 and 120),
  city text check(city is null or char_length(city)<=100),
  description text check(description is null or char_length(description)<=1000),
  website_url text check(website_url is null or char_length(website_url)<=500),
  instagram_handle text check(instagram_handle is null or char_length(instagram_handle)<=50),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.business_accounts enable row level security;
grant select,insert,update,delete on public.business_accounts to authenticated;
create policy business_read on public.business_accounts for select to authenticated using(true);
create policy business_insert_own on public.business_accounts for insert to authenticated with check(owner_id=(select auth.uid()));
create policy business_update_own_or_admin on public.business_accounts for update to authenticated using(owner_id=(select auth.uid()) or public.polka_is_admin()) with check(owner_id=(select auth.uid()) or public.polka_is_admin());
create policy business_delete_own_or_admin on public.business_accounts for delete to authenticated using(owner_id=(select auth.uid()) or public.polka_is_admin());

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id) on delete cascade,
  title text not null check(char_length(title)<=140),
  description text check(description is null or char_length(description)<=1000),
  code text check(code is null or char_length(code)<=60),
  destination_url text check(destination_url is null or char_length(destination_url)<=1000),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists discounts_active_idx on public.discounts(is_active,ends_at);
alter table public.discounts enable row level security;
grant select,insert,update,delete on public.discounts to authenticated;
create policy discounts_read on public.discounts for select to authenticated using(is_active and (ends_at is null or ends_at>now()));
create policy discounts_owner_insert on public.discounts for insert to authenticated
with check(exists(select 1 from public.business_accounts b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.polka_is_admin())));
create policy discounts_owner_update on public.discounts for update to authenticated
using(exists(select 1 from public.business_accounts b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.polka_is_admin())))
with check(exists(select 1 from public.business_accounts b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.polka_is_admin())));
create policy discounts_owner_delete on public.discounts for delete to authenticated
using(exists(select 1 from public.business_accounts b where b.id=business_id and (b.owner_id=(select auth.uid()) or public.polka_is_admin())));

create policy care_articles_admin_all on public.care_articles for all to authenticated
using(public.polka_is_admin()) with check(public.polka_is_admin());
create policy care_sources_admin_all on public.care_article_sources for all to authenticated
using(public.polka_is_admin()) with check(public.polka_is_admin());

alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.stories;
alter publication supabase_realtime add table public.post_likes;
