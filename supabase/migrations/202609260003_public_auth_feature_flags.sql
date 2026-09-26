create table if not exists public.app_feature_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.app_feature_flags enable row level security;

revoke all on public.app_feature_flags from public, anon, authenticated;
grant select on public.app_feature_flags to anon, authenticated;

drop policy if exists app_feature_flags_public_read on public.app_feature_flags;
create policy app_feature_flags_public_read
on public.app_feature_flags
for select
to anon, authenticated
using (true);

insert into public.app_feature_flags(key,enabled)
values
  ('auth_google',false),
  ('auth_apple',false)
on conflict(key) do update set enabled=excluded.enabled, updated_at=now();
