-- Seed data for Polka

do $$
declare
  v_demo_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_p record;
begin
  -- ensure demo profile exists
  insert into public.profiles (id, display_name, city, bio, onboarding_complete, adult_confirmed_at)
  values (v_demo_id, 'Polka Community', 'Warszawa', 'Oficjalna społeczność dziewczyn w Polce ✨', true, now())
  on conflict (id) do nothing;
end $$;

-- Initial Posts
do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Maja' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Maja', 'Warszawa', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Kto ma ochotę dziś po 18 na matchę w centrum?', 'approved', null, now() - interval '21 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Laura' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Laura', 'Warszawa', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Czy ktoś zna naprawdę dobry second hand na Mokotowie? Chcę zrobić rundkę w sobotę 👀', 'approved', null, now() - interval '17 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Zuzia' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Zuzia', 'Warszawa', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Mam ochotę na pilates + brunch w weekend. Ktoś też?', 'approved', null, now() - interval '3 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Mia' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Mia', 'Warszawa', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Girls night w piątek? Myślę karaoke albo coś z muzyką na żywo 🪩', 'approved', null, now() - interval '18 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Daria' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Daria', 'Warszawa', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Szukam kogoś na foto-spacer po Pradze w złotej godzinie 📸', 'approved', null, now() - interval '16 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Klara' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Klara', 'Warszawa', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Gdzie chodzicie pracować z laptopem, kiedy nie chce się siedzieć w domu?', 'approved', null, now() - interval '13 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Malwina' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Malwina', 'Warszawa', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Czy tylko ja mam milion pomysłów na projekty i zero ludzi do odbijania ich na żywo? 😅', 'approved', null, now() - interval '7 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Nadia' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Nadia', 'Warszawa', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Ktoś na spontaniczną kawę dzisiaj po 19?', 'approved', null, now() - interval '6 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Ola' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Ola', 'Kraków', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Szukam 2–3 dziewczyn na kino w piątek 🎬', 'approved', null, now() - interval '19 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Sonia' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Sonia', 'Kraków', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Kazimierz + kawa + spacer bez planu w sobotę?', 'approved', null, now() - interval '20 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Hania' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Hania', 'Kraków', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Macie sprawdzone miejsca na brunch, gdzie da się długo siedzieć?', 'approved', null, now() - interval '5 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Natalia' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Natalia', 'Gdańsk', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Spacer nad morzem + kawa w sobotę?', 'approved', null, now() - interval '19 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Sara' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Sara', 'Gdańsk', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Robimy mały book club. Bez spiny, jedna książka miesięcznie. Kto chce?', 'approved', null, now() - interval '19 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Ania' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Ania', 'Gdańsk', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Któraś chce wyskoczyć dziś na kawę we Wrzeszczu?', 'approved', null, now() - interval '12 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Julia' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Julia', 'Wrocław', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Ktoś chętny na pilates i brunch w niedzielę?', 'approved', null, now() - interval '3 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Nela' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Nela', 'Wrocław', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Szukam dziewczyn na luźny wine bar wieczorem 🍷', 'approved', null, now() - interval '17 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Iga' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Iga', 'Wrocław', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Polecicie fajne galerie albo wystawy na ten weekend?', 'approved', null, now() - interval '13 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Kasia' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Kasia', 'Poznań', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Polecicie fajny second hand na Jeżycach?', 'approved', null, now() - interval '9 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Kornelia' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Kornelia', 'Poznań', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Ktoś na mały koncert albo live set w piątek?', 'approved', null, now() - interval '16 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Wiktoria' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Wiktoria', 'Łódź', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Girls night w sobotę — mamy jeszcze 2 miejsca 🪩', 'approved', null, now() - interval '2 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Bianka' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Bianka', 'Łódź', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'OFF Piotrkowska dziś wieczorem? Mogę zebrać małą ekipę.', 'approved', null, now() - interval '14 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Martyna' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Martyna', 'Katowice', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Ktoś wybiera się na koncert w przyszłym tygodniu?', 'approved', null, now() - interval '13 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Dominika' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Dominika', 'Katowice', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Nikiszowiec + kawa + spacer w sobotę po południu?', 'approved', null, now() - interval '18 hours')
  on conflict do nothing;
end $$;

do $$
declare
  v_author_id uuid;
begin
  -- find or create profile
  select id into v_author_id from public.profiles where display_name = 'Rita' limit 1;
  if v_author_id is null then
    v_author_id := gen_random_uuid();
    insert into public.profiles (id, display_name, city, onboarding_complete, adult_confirmed_at)
    values (v_author_id, 'Rita', 'Katowice', true, now())
    on conflict do nothing;
  end if;

  insert into public.posts (author_id, body, moderation_status, spotify_url, created_at)
  values (v_author_id, 'Szukam spokojnej ekipy na książki, kawę i czasem kino.', 'approved', null, now() - interval '18 hours')
  on conflict do nothing;
end $$;

-- Stories Seed
do $$
declare
  v_maja_id uuid;
  v_ola_id uuid;
  v_natalia_id uuid;
  v_klara_id uuid;
begin
  select id into v_maja_id from public.profiles where display_name = 'Maja' limit 1;
  select id into v_ola_id from public.profiles where display_name = 'Ola' limit 1;
  select id into v_natalia_id from public.profiles where display_name = 'Natalia' limit 1;
  select id into v_klara_id from public.profiles where display_name = 'Klara' limit 1;

  if v_maja_id is not null then
    insert into public.stories (author_id, media_path, media_type, caption, expires_at)
    values (v_maja_id, 'demo/story-matcha.jpg', 'image', 'matcha run ☕ · Warszawa', now() + interval '24 hours')
    on conflict do nothing;
  end if;

  if v_ola_id is not null then
    insert into public.stories (author_id, media_path, media_type, caption, expires_at)
    values (v_ola_id, 'demo/story-walk.jpg', 'image', 'spacer po mieście 🌸', now() + interval '24 hours')
    on conflict do nothing;
  end if;

  if v_natalia_id is not null then
    insert into public.stories (author_id, media_path, media_type, caption, expires_at)
    values (v_natalia_id, 'demo/story-girls.jpg', 'image', 'girls night ✨ · Gdańsk', now() + interval '24 hours')
    on conflict do nothing;
  end if;

  if v_klara_id is not null then
    insert into public.stories (author_id, media_path, media_type, caption, expires_at)
    values (v_klara_id, 'demo/story-book.jpg', 'image', 'book club 📚', now() + interval '24 hours')
    on conflict do nothing;
  end if;
end $$;


