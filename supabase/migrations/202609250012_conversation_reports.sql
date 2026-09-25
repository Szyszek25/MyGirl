-- Polka: allow reporting a conversation without exposing message sender identity.

alter table public.reports
  add column if not exists target_conversation_id uuid references public.conversations(id) on delete cascade;

alter table public.reports drop constraint if exists exactly_one_report_target;
alter table public.reports add constraint exactly_one_report_target check(
  num_nonnulls(
    target_profile_id,target_post_id,target_message_id,target_group_id,
    target_meetup_id,target_story_id,target_conversation_id
  )=1
);

create index if not exists reports_target_conversation_idx
  on public.reports(target_conversation_id) where target_conversation_id is not null;

drop policy if exists reports_insert_own on public.reports;
create policy reports_insert_own on public.reports for insert to authenticated
with check(
  reporter_id=(select auth.uid())
  and status='open'
  and reviewed_at is null
  and (target_profile_id is null or target_profile_id<>(select auth.uid()))
  and (target_post_id is null or exists(select 1 from public.posts p where p.id=target_post_id and p.author_id<>(select auth.uid())))
  and (target_message_id is null or exists(select 1 from public.messages m where m.id=target_message_id and m.sender_id<>(select auth.uid())))
  and (target_group_id is null or exists(select 1 from public.groups g where g.id=target_group_id and g.owner_id<>(select auth.uid())))
  and (target_meetup_id is null or exists(select 1 from public.meetups m where m.id=target_meetup_id and m.host_id<>(select auth.uid())))
  and (target_story_id is null or exists(select 1 from public.stories s where s.id=target_story_id and s.author_id<>(select auth.uid())))
  and (target_conversation_id is null or public.polka_is_conversation_member(target_conversation_id,(select auth.uid())))
);
