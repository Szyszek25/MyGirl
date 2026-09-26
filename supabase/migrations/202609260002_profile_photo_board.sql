create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  source_url text,
  position smallint not null default 0 check (position between 0 and 8),
  created_at timestamptz not null default now(),
  unique(user_id, position),
  unique(storage_path)
);

alter table public.profile_photos enable row level security;
grant select, insert, update, delete on public.profile_photos to authenticated;

drop policy if exists profile_photos_read on public.profile_photos;
create policy profile_photos_read
on public.profile_photos for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.profiles p
    where p.id = profile_photos.user_id
      and p.onboarding_complete
      and not public.has_mutual_block((select auth.uid()), p.id)
  )
);

drop policy if exists profile_photos_insert_own on public.profile_photos;
create policy profile_photos_insert_own
on public.profile_photos for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists profile_photos_update_own on public.profile_photos;
create policy profile_photos_update_own
on public.profile_photos for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists profile_photos_delete_own on public.profile_photos;
create policy profile_photos_delete_own
on public.profile_photos for delete to authenticated
using (user_id = (select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('polka-profile-photos','polka-profile-photos',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists polka_profile_photos_insert on storage.objects;
create policy polka_profile_photos_insert
on storage.objects for insert to authenticated
with check (
  bucket_id='polka-profile-photos'
  and (storage.foldername(name))[1] = ((select auth.uid()))::text
);

drop policy if exists polka_profile_photos_select on storage.objects;
create policy polka_profile_photos_select
on storage.objects for select to authenticated
using (
  bucket_id='polka-profile-photos'
  and (
    (storage.foldername(name))[1] = ((select auth.uid()))::text
    or exists (
      select 1 from public.profile_photos pp
      join public.profiles p on p.id=pp.user_id
      where pp.storage_path=objects.name
        and p.onboarding_complete
        and not public.has_mutual_block((select auth.uid()), p.id)
    )
  )
);

drop policy if exists polka_profile_photos_delete on storage.objects;
create policy polka_profile_photos_delete
on storage.objects for delete to authenticated
using (
  bucket_id='polka-profile-photos'
  and (storage.foldername(name))[1] = ((select auth.uid()))::text
);

create index if not exists profile_photos_user_position_idx
on public.profile_photos(user_id, position);
