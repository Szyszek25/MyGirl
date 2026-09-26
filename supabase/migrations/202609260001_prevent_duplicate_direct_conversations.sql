-- Prevent concurrent creation of duplicate direct chat rooms for the same pair.
create or replace function public.polka_start_direct_conversation(p_other_user uuid)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare
  me uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
  lock_key bigint;
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

  lock_key := hashtextextended(
    least(me::text,p_other_user::text) || ':' || greatest(me::text,p_other_user::text),
    0
  );
  perform pg_advisory_xact_lock(lock_key);

  select c.id into existing_id
  from public.conversations c
  where c.kind='direct'
    and public.polka_is_conversation_member(c.id,me)
    and public.polka_is_conversation_member(c.id,p_other_user)
    and (select count(*) from public.conversation_members cm where cm.conversation_id=c.id)=2
  order by c.created_at asc
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
