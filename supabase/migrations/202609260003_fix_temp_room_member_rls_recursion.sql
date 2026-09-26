drop policy if exists temp_members_read on public.temporary_room_members;

create policy temp_members_read
on public.temporary_room_members
for select
to authenticated
using (user_id = (select auth.uid()));
