-- Polka flexible plans and temporary/anonymous room chats.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(char_length(btrim(title)) between 3 and 120),
  city text not null check(char_length(city)<=100),
  category text not null default 'Wyjścia' check(char_length(category)<=50),
  timing_label text not null default 'Termin do ustalenia' check(char_length(timing_label)<=120),
  details text check(details is null or char_length(details)<=1200),
  capacity integer not null default 6 check(capacity between 2 and 100),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '14 days')
);
create index if not exists plans_city_created_idx on public.plans(city,created_at desc);
create index if not exists plans_host_idx on public.plans(host_id,created_at desc);
alter table public.plans enable row level security;
grant select,insert,update,delete on public.plans to authenticated;
create policy plans_read on public.plans for select to authenticated
using(expires_at>now() and not public.has_mutual_block((select auth.uid()),host_id));
create policy plans_insert_own on public.plans for insert to authenticated
with check(host_id=(select auth.uid()));
create policy plans_update_own_or_admin on public.plans for update to authenticated
using(host_id=(select auth.uid()) or public.polka_is_admin())
with check(host_id=(select auth.uid()) or public.polka_is_admin());
create policy plans_delete_own_or_admin on public.plans for delete to authenticated
using(host_id=(select auth.uid()) or public.polka_is_admin());

create table if not exists public.plan_members (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(plan_id,user_id)
);
create index if not exists plan_members_user_idx on public.plan_members(user_id,joined_at desc);
alter table public.plan_members enable row level security;
grant select,insert,delete on public.plan_members to authenticated;
create policy plan_members_read on public.plan_members for select to authenticated using(true);
create policy plan_members_join on public.plan_members for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.plans p where p.id=plan_id and p.expires_at>now()));
create policy plan_members_leave on public.plan_members for delete to authenticated
using(user_id=(select auth.uid()));

create table if not exists public.temporary_rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(char_length(title) between 2 and 120),
  context_type text not null check(context_type in ('sport','meetup','group','support','other')),
  context_id uuid,
  expires_at timestamptz not null default (now()+interval '24 hours'),
  created_at timestamptz not null default now()
);
create index if not exists temporary_rooms_expiry_idx on public.temporary_rooms(expires_at);
alter table public.temporary_rooms enable row level security;
grant select,insert,delete on public.temporary_rooms to authenticated;
create policy temp_rooms_read on public.temporary_rooms for select to authenticated
using(expires_at>now());
create policy temp_rooms_create on public.temporary_rooms for insert to authenticated
with check(owner_id=(select auth.uid()));
create policy temp_rooms_delete_owner_admin on public.temporary_rooms for delete to authenticated
using(owner_id=(select auth.uid()) or public.polka_is_admin());

create table if not exists public.temporary_room_members (
  room_id uuid not null references public.temporary_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  public_alias text not null check(char_length(public_alias) between 2 and 40),
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
alter table public.temporary_room_members enable row level security;
grant select,insert,update,delete on public.temporary_room_members to authenticated;
create policy temp_members_read on public.temporary_room_members for select to authenticated
using(user_id=(select auth.uid()) or exists(select 1 from public.temporary_room_members me where me.room_id=temporary_room_members.room_id and me.user_id=(select auth.uid())));
create policy temp_members_join on public.temporary_room_members for insert to authenticated
with check(user_id=(select auth.uid()) and exists(select 1 from public.temporary_rooms r where r.id=room_id and r.expires_at>now()));
create policy temp_members_update_own on public.temporary_room_members for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy temp_members_leave on public.temporary_room_members for delete to authenticated
using(user_id=(select auth.uid()));

create table if not exists public.temporary_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.temporary_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  alias_snapshot text not null check(char_length(alias_snapshot) between 2 and 40),
  body text not null check(char_length(btrim(body)) between 1 and 1600),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists temporary_messages_room_idx on public.temporary_messages(room_id,created_at);
alter table public.temporary_messages enable row level security;
revoke all on public.temporary_messages from public,anon,authenticated;

create or replace function public.polka_temp_send(p_room uuid,p_body text)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  me uuid:=(select auth.uid());
  alias text;
  expiry timestamptz;
  new_id uuid;
begin
  select m.public_alias,r.expires_at into alias,expiry
  from public.temporary_room_members m
  join public.temporary_rooms r on r.id=m.room_id
  where m.room_id=p_room and m.user_id=me and r.expires_at>now();
  if alias is null then raise exception 'join room first'; end if;
  insert into public.temporary_messages(room_id,sender_id,alias_snapshot,body,expires_at)
  values(p_room,me,alias,left(btrim(p_body),1600),expiry)
  returning id into new_id;
  return new_id;
end
$$;
revoke all on function public.polka_temp_send(uuid,text) from public,anon;
grant execute on function public.polka_temp_send(uuid,text) to authenticated;

create or replace function public.polka_temp_messages(p_room uuid,p_before timestamptz default null)
returns table(id uuid,alias text,body text,created_at timestamptz,mine boolean)
language sql stable security definer set search_path='' as $$
  select m.id,m.alias_snapshot,m.body,m.created_at,(m.sender_id=(select auth.uid())) as mine
  from public.temporary_messages m
  where m.room_id=p_room
    and m.expires_at>now()
    and exists(select 1 from public.temporary_room_members rm where rm.room_id=p_room and rm.user_id=(select auth.uid()))
    and (p_before is null or m.created_at<p_before)
  order by m.created_at desc
  limit 60
$$;
revoke all on function public.polka_temp_messages(uuid,timestamptz) from public,anon;
grant execute on function public.polka_temp_messages(uuid,timestamptz) to authenticated;
