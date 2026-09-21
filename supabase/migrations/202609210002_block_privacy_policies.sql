-- Apply immediately after initial migration, before inviting users.
-- A normal RLS query of blocks sees only one's own rows; a scoped SECURITY DEFINER
-- helper lets discovery/invitations respect blocks created by either participant.
create function public.has_mutual_block(p_first uuid, p_second uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when (select auth.uid()) is null then true
    when (select auth.uid()) not in (p_first, p_second) then true
    else exists (
      select 1 from public.blocks b
      where (b.blocker_id = p_first and b.blocked_id = p_second)
         or (b.blocker_id = p_second and b.blocked_id = p_first)
    )
  end;
$$;
revoke all on function public.has_mutual_block(uuid, uuid) from public;
grant execute on function public.has_mutual_block(uuid, uuid) to authenticated;

drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (
  id = (select auth.uid()) or
  (onboarding_complete and not public.has_mutual_block((select auth.uid()), id))
);

drop policy friend_requests_send on public.friend_requests;
create policy friend_requests_send on public.friend_requests for insert to authenticated
  with check (
    sender_id = (select auth.uid()) and recipient_id <> (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = recipient_id and p.onboarding_complete)
    and not public.has_mutual_block(sender_id, recipient_id)
  );

-- Existing requests must not remain viewable after either party blocks the other.
drop policy friend_requests_read_participants on public.friend_requests;
create policy friend_requests_read_participants on public.friend_requests for select to authenticated
  using ((sender_id = (select auth.uid()) or recipient_id = (select auth.uid()))
         and not public.has_mutual_block(sender_id, recipient_id));

-- Reminder: execute migrations as a set on the NEW project; test with two auth identities.
