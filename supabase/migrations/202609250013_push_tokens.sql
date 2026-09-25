-- Polka push notification device registrations.

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null check(char_length(expo_push_token) between 20 and 300),
  platform text not null check(platform in ('ios','android')),
  device_label text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,expo_push_token)
);

create index if not exists push_tokens_user_active_idx
  on public.push_tokens(user_id,active);

alter table public.push_tokens enable row level security;
grant select,insert,update,delete on public.push_tokens to authenticated;

create policy push_tokens_read_own on public.push_tokens for select to authenticated
using(user_id=(select auth.uid()));

create policy push_tokens_insert_own on public.push_tokens for insert to authenticated
with check(user_id=(select auth.uid()));

create policy push_tokens_update_own on public.push_tokens for update to authenticated
using(user_id=(select auth.uid()))
with check(user_id=(select auth.uid()));

create policy push_tokens_delete_own on public.push_tokens for delete to authenticated
using(user_id=(select auth.uid()));

create or replace function public.touch_push_token_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin
  new.updated_at=now();
  return new;
end $$;

drop trigger if exists trg_push_tokens_updated_at on public.push_tokens;
create trigger trg_push_tokens_updated_at
before update on public.push_tokens
for each row execute function public.touch_push_token_updated_at();
