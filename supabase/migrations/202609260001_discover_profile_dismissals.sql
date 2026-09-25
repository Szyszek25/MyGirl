create table if not exists public.profile_dismissals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  dismissed_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  primary key (user_id, dismissed_user_id),
  constraint profile_dismissals_not_self check (user_id <> dismissed_user_id)
);

alter table public.profile_dismissals enable row level security;

grant select, insert, update, delete on public.profile_dismissals to authenticated;

drop policy if exists profile_dismissals_read_own on public.profile_dismissals;
create policy profile_dismissals_read_own
on public.profile_dismissals for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists profile_dismissals_insert_own on public.profile_dismissals;
create policy profile_dismissals_insert_own
on public.profile_dismissals for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and dismissed_user_id <> (select auth.uid())
);

drop policy if exists profile_dismissals_update_own on public.profile_dismissals;
create policy profile_dismissals_update_own
on public.profile_dismissals for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists profile_dismissals_delete_own on public.profile_dismissals;
create policy profile_dismissals_delete_own
on public.profile_dismissals for delete
to authenticated
using (user_id = (select auth.uid()));

create index if not exists profile_dismissals_active_idx
  on public.profile_dismissals (user_id, expires_at desc);
