-- Polka: private menstrual cycle + wellbeing model.
-- This migration is a DESIGN/IMPLEMENTATION TARGET and has not been applied remotely by this commit.
-- Cycle data is sensitive health-related information: keep it owner-only under RLS.
-- Do not reuse these tables for discover, ads, recommendations to other users, or public profile fields.

create table public.cycle_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  average_cycle_length smallint not null default 28 check (average_cycle_length between 21 and 40),
  average_period_length smallint not null default 5 check (average_period_length between 2 and 10),
  last_period_start date,
  reminders_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.cycle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null,
  cycle_day smallint check (cycle_day between 1 and 60),
  mood smallint check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  bleeding text check (bleeding in ('none','spotting','light','medium','heavy')),
  symptoms text[] not null default '{}',
  note text check (char_length(note) <= 1000),
  is_period_start boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date),
  constraint cycle_entries_symptoms_limit check (cardinality(symptoms) <= 30)
);

create index cycle_entries_user_date_idx
  on public.cycle_entries(user_id, entry_date desc);

create or replace function public.set_cycle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cycle_settings_updated_at
before update on public.cycle_settings
for each row execute function public.set_cycle_updated_at();

create trigger cycle_entries_updated_at
before update on public.cycle_entries
for each row execute function public.set_cycle_updated_at();

alter table public.cycle_settings enable row level security;
alter table public.cycle_entries enable row level security;

-- Settings are strictly private to their owner.
create policy cycle_settings_select_own
on public.cycle_settings for select to authenticated
using (user_id = (select auth.uid()));

create policy cycle_settings_insert_own
on public.cycle_settings for insert to authenticated
with check (user_id = (select auth.uid()));

create policy cycle_settings_update_own
on public.cycle_settings for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy cycle_settings_delete_own
on public.cycle_settings for delete to authenticated
using (user_id = (select auth.uid()));

-- Daily cycle/wellbeing entries are also strictly private.
create policy cycle_entries_select_own
on public.cycle_entries for select to authenticated
using (user_id = (select auth.uid()));

create policy cycle_entries_insert_own
on public.cycle_entries for insert to authenticated
with check (user_id = (select auth.uid()));

create policy cycle_entries_update_own
on public.cycle_entries for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy cycle_entries_delete_own
on public.cycle_entries for delete to authenticated
using (user_id = (select auth.uid()));

-- No public read policy by design.
-- No group/community query should ever join directly to these tables.
-- Social discussion posts remain ordinary community content and must not expose cycle_entries.
