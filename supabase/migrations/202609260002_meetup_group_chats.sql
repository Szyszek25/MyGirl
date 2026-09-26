alter table public.conversations
  add column if not exists meetup_id uuid references public.meetups(id) on delete cascade;

create unique index if not exists conversations_unique_meetup_idx
  on public.conversations(meetup_id)
  where meetup_id is not null;

create or replace function public.polka_join_meetup_chat(p_meetup uuid)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  me uuid := auth.uid();
  room uuid;
  meetup_title text;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select m.title into meetup_title
  from public.meetups m
  where m.id=p_meetup
    and m.starts_at > now()-interval '1 day'
    and (
      m.host_id=me
      or exists(
        select 1 from public.meetup_rsvps r
        where r.meetup_id=m.id and r.user_id=me and r.status='going'
      )
    );

  if meetup_title is null then
    raise exception 'join the meetup first';
  end if;

  select c.id into room
  from public.conversations c
  where c.meetup_id=p_meetup
  limit 1;

  if room is null then
    insert into public.conversations(kind,title,created_by,meetup_id)
    values('group',left(meetup_title,120),me,p_meetup)
    returning id into room;
  end if;

  insert into public.conversation_members(conversation_id,user_id)
  values(room,me)
  on conflict do nothing;

  return room;
end
$$;

revoke all on function public.polka_join_meetup_chat(uuid) from public,anon;
grant execute on function public.polka_join_meetup_chat(uuid) to authenticated;
