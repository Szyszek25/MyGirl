-- MyGirl addon 004: run ONLY on a NEW MyGirl Supabase project AFTER
-- supabase/MYGIRL_FRESH_INSTALL.sql. Do not also apply migrations 001-003.
-- Not run remotely; test with two authenticated users before launch.
BEGIN;

-- Images stay private. They are served only to the owner or where a completed
-- visible profile / approved post / approved group permits viewing via RLS.
ALTER TABLE public.posts ADD COLUMN media_path text
  CHECK (media_path IS NULL OR (char_length(media_path) <= 500 AND media_path LIKE author_id::text || '/%'));
ALTER TABLE public.groups ADD COLUMN cover_path text
  CHECK (cover_path IS NULL OR (char_length(cover_path) <= 500 AND cover_path LIKE owner_id::text || '/%'));
-- Existing column-specific INSERT/UPDATE grants on profiles intentionally remain unchanged.
-- The base install previously gave broad table grants for posts/groups; correct them
-- to prevent clients from setting status or moving media on already moderated rows.
REVOKE ALL ON TABLE public.posts, public.groups FROM anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.posts, public.groups TO authenticated;
GRANT INSERT(author_id, body, media_path) ON TABLE public.posts TO authenticated;
GRANT INSERT(owner_id, name, description, city, cover_path) ON TABLE public.groups TO authenticated;
-- Do not permit client UPDATE on moderated records. Server moderation only.

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES
 ('mygirl-avatars','mygirl-avatars',false,5242880,ARRAY['image/jpeg','image/png','image/webp']),
 ('mygirl-post-media','mygirl-post-media',false,8388608,ARRAY['image/jpeg','image/png','image/webp']),
 ('mygirl-group-media','mygirl-group-media',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- A filename must be userId/random-or-generated-filename.ext. Only the authenticated
-- owner may upload/delete; no UPDATE/UPSERT, so an approved image cannot be replaced.
CREATE POLICY mygirl_avatars_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='mygirl-avatars'
 AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
 AND name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,100}\.(jpg|jpeg|png|webp)$');
CREATE POLICY mygirl_avatars_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='mygirl-avatars' AND (
 (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
 EXISTS (SELECT 1 FROM public.profiles p WHERE p.avatar_path=storage.objects.name)
));
CREATE POLICY mygirl_avatars_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='mygirl-avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY mygirl_posts_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='mygirl-post-media'
 AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
 AND name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,100}\.(jpg|jpeg|png|webp)$');
CREATE POLICY mygirl_posts_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='mygirl-post-media' AND (
 (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
 EXISTS (SELECT 1 FROM public.posts p WHERE p.media_path=storage.objects.name AND p.moderation_status='approved')
));
CREATE POLICY mygirl_posts_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='mygirl-post-media' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE POLICY mygirl_groups_upload ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='mygirl-group-media'
 AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
 AND name ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{8,100}\.(jpg|jpeg|png|webp)$');
CREATE POLICY mygirl_groups_read ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='mygirl-group-media' AND (
 (storage.foldername(name))[1] = (SELECT auth.uid())::text OR
 EXISTS (SELECT 1 FROM public.groups g WHERE g.cover_path=storage.objects.name AND g.moderation_status='approved')
));
CREATE POLICY mygirl_groups_delete ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='mygirl-group-media' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

-- Waitlist: users verify email with Supabase Auth OTP BEFORE inserting a row.
-- No public INSERT endpoint, no public list, no plaintext emails duplicated here.
CREATE TABLE public.waitlist (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 city text NOT NULL CHECK(char_length(btrim(city)) BETWEEN 2 AND 100),
 goal text CHECK(goal IS NULL OR char_length(goal)<=100),
 status text NOT NULL DEFAULT 'waiting' CHECK(status IN ('waiting','invited','removed')),
 privacy_notice_version text NOT NULL CHECK(char_length(privacy_notice_version) BETWEEN 1 AND 30),
 terms_version text NOT NULL CHECK(char_length(terms_version) BETWEEN 1 AND 30),
 marketing_opt_in boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), invited_at timestamptz,
 CHECK (status <> 'waiting' OR invited_at IS NULL)
);
CREATE INDEX mygirl_waitlist_city_idx ON public.waitlist(city, created_at DESC);
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.waitlist FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.waitlist TO authenticated;
GRANT INSERT(user_id,city,goal,privacy_notice_version,terms_version,marketing_opt_in) ON TABLE public.waitlist TO authenticated;
GRANT UPDATE(city,goal,marketing_opt_in) ON TABLE public.waitlist TO authenticated;
CREATE POLICY mygirl_waitlist_read ON public.waitlist FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()));
CREATE POLICY mygirl_waitlist_insert ON public.waitlist FOR INSERT TO authenticated
 WITH CHECK(user_id=(SELECT auth.uid()) AND status='waiting' AND invited_at IS NULL
 AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id=(SELECT auth.uid()) AND u.email_confirmed_at IS NOT NULL));
CREATE POLICY mygirl_waitlist_update ON public.waitlist FOR UPDATE TO authenticated
 USING(user_id=(SELECT auth.uid()) AND status='waiting')
 WITH CHECK(user_id=(SELECT auth.uid()) AND status='waiting');
CREATE POLICY mygirl_waitlist_delete ON public.waitlist FOR DELETE TO authenticated
 USING(user_id=(SELECT auth.uid()));
-- Admin invitations via trusted server only. Never expose service_role to web/app.
-- Delete account via authenticated server action: remove owned Storage objects,
-- revoke provider tokens when applicable, then auth.admin.deleteUser(uid).
COMMIT;
