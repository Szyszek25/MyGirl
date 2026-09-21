-- MyGirl: apply ONLY to the new MyGirl Supabase project, after migrations 001 and 002.
-- Not executed remotely. All user posts start PENDING and are invisible to other members
-- until reviewed by the service-side moderation process; no client approval capability.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index posts_approved_feed_idx on public.posts(created_at desc) where moderation_status = 'approved';
create index posts_author_idx on public.posts(author_id, created_at desc);
alter table public.posts enable row level security;
-- Authors can see their own submissions and deletion state; everyone else sees reviewed
-- posts only, and only if the author is discoverable and neither side is blocked.
create policy posts_select on public.posts for select to authenticated using (
  author_id = (select auth.uid()) or (
    moderation_status = 'approved'
    and exists (select 1 from public.profiles p
      where p.id = posts.author_id and p.onboarding_complete)
    and not public.has_mutual_block((select auth.uid()), author_id)
  )
);
create policy posts_insert_own on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and moderation_status = 'pending');
create policy posts_delete_own on public.posts for delete to authenticated
  using (author_id = (select auth.uid()));
-- No UPDATE policy: users cannot approve/reject posts, change authors or alter content
-- after moderation. A separate server-side moderator using service_role may review.

-- One report row targets exactly one profile OR one post. Reporter identity is fixed
-- by RLS and report status cannot be changed by app clients.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_profile_id uuid references public.profiles(id) on delete set null,
  target_post_id uuid references public.posts(id) on delete set null,
  reason text not null check (reason in ('harassment','hate','sexual','spam','impersonation','other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint exactly_one_report_target check (num_nonnulls(target_profile_id,target_post_id) = 1)
);
create index reports_open_idx on public.reports(created_at) where status = 'open';
create index reports_reporter_idx on public.reports(reporter_id, created_at desc);
create unique index reports_unique_profile on public.reports(reporter_id,target_profile_id) where target_profile_id is not null;
create unique index reports_unique_post on public.reports(reporter_id,target_post_id) where target_post_id is not null;
alter table public.reports enable row level security;
create policy reports_insert_own on public.reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid()) and status = 'open' and reviewed_at is null
    and (target_profile_id is null or target_profile_id <> (select auth.uid()))
    and (target_post_id is null or exists (
      select 1 from public.posts p where p.id = target_post_id
      and p.author_id <> (select auth.uid())
    ))
  );
create policy reports_read_own on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()));
-- No direct UPDATE/DELETE policies. Moderation queue is accessible only on the server
-- with service_role. Protect that key; NEVER ship it in the Expo bundle.

-- Profile deletion through auth.admin.deleteUser() cascades profiles -> posts,
-- interests, blocks and friendship requests; reports by this account cascade too.
-- Account deletion MUST run on an authenticated server endpoint, revoke Apple tokens
-- when applicable, and remove all owned Storage objects before deleting auth.users.
-- Confirm retention rules, audit reports referencing deleted targets and test with
-- two authenticated users before opening registration.
