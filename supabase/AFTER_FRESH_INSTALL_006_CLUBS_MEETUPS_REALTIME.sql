-- MyGirl extension 006: apply only to a NEW MyGirl Supabase project AFTER
-- MYGIRL_FRESH_INSTALL.sql, AFTER_FRESH_INSTALL_004... and 005...
-- Never execute on MyCampus. NOT TESTED against a live database.
BEGIN;

-- Existing public.groups are clubs. Creation stays pending for moderation;
-- clients cannot self-approve clubs (existing group INSERT policy).
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'inne'
 CHECK (category IN ('kawa','sport','ksiazki','podroze','jedzenie','muzyka','studia','inne'));
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS rules text CHECK (char_length(rules) <= 2000);
CREATE INDEX IF NOT EXISTS mygirl_groups_category_idx ON public.groups(category,city)
 WHERE moderation_status = 'approved';

CREATE TABLE public.meetups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 club_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
 title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 100),
 description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
 city text NOT NULL CHECK (char_length(btrim(city)) BETWEEN 2 AND 100),
 -- Avoid publishing the precise home address; venue details may be shared
 -- privately in a moderated group chat after accepted attendance.
 venue_name text CHECK (char_length(venue_name) <= 120),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL,
 capacity integer NOT NULL DEFAULT 12 CHECK (capacity BETWEEN 2 AND 100),
 moderation_status text NOT NULL DEFAULT 'pending'
  CHECK (moderation_status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (ends_at > starts_at)
);
CREATE INDEX meetups_city_date_idx ON public.meetups(city,starts_at)
 WHERE moderation_status = 'approved';
CREATE INDEX meetups_club_idx ON public.meetups(club_id,starts_at);
CREATE INDEX meetups_host_idx ON public.meetups(host_id,starts_at);

CREATE TABLE public.meetup_rsvps (
 meetup_id uuid NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'interested' CHECK (status IN ('interested','going')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(meetup_id,user_id)
);
CREATE INDEX meetup_rsvps_user_idx ON public.meetup_rsvps(user_id);

-- Reporting events: extends reports without removing existing targets.
ALTER TABLE public.reports ADD COLUMN meetup_id uuid REFERENCES public.meetups(id) ON DELETE SET NULL;
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_check;
-- Find the existing auto-generated check constraint by its expression if needed;
-- old constraint limits only five existing targets, and adding meetup_id does not
-- affect that check for a meetup-only report (0 <= 1).
ALTER TABLE public.reports ADD CONSTRAINT mygirl_reports_max_one_target
 CHECK (num_nonnulls(profile_id,post_id,comment_id,group_id,message_id,meetup_id) <= 1);

ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_rsvps ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,DELETE ON public.meetups,public.meetup_rsvps TO authenticated;
REVOKE ALL ON public.meetups,public.meetup_rsvps FROM anon;
-- Host can inspect drafts. Others see moderated, discoverable public events only.
CREATE POLICY meetups_read ON public.meetups FOR SELECT TO authenticated USING (
 host_id = (SELECT auth.uid()) OR (
 moderation_status='approved'
 AND starts_at > now() - interval '1 day'
 AND NOT public.mygirl_mutual_block((SELECT auth.uid()),host_id)
 AND (club_id IS NULL OR EXISTS (
   SELECT 1 FROM public.groups g WHERE g.id=club_id AND g.moderation_status='approved'
 ))));
CREATE POLICY meetups_create ON public.meetups FOR INSERT TO authenticated WITH CHECK (
 host_id=(SELECT auth.uid()) AND moderation_status='pending'
 AND starts_at > now()
 AND starts_at < now() + interval '1 year'
 AND (club_id IS NULL OR EXISTS (
  SELECT 1 FROM public.groups g WHERE g.id=club_id
  AND g.moderation_status='approved'
  AND EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id=g.id AND gm.user_id=(SELECT auth.uid()))
 )));
CREATE POLICY meetups_delete_own ON public.meetups FOR DELETE TO authenticated
 USING (host_id=(SELECT auth.uid()));
-- No client UPDATE/approve: dates, host, capacity and moderation status cannot
-- be manipulated from an untrusted mobile client.
CREATE POLICY rsvps_read ON public.meetup_rsvps FOR SELECT TO authenticated USING (
 user_id=(SELECT auth.uid()) OR EXISTS (
  SELECT 1 FROM public.meetups m WHERE m.id=meetup_id
  AND m.host_id=(SELECT auth.uid())
  AND NOT public.mygirl_mutual_block((SELECT auth.uid()),user_id)));
CREATE POLICY rsvps_insert ON public.meetup_rsvps FOR INSERT TO authenticated WITH CHECK (
 user_id=(SELECT auth.uid()) AND status='interested'
 AND EXISTS (SELECT 1 FROM public.meetups m WHERE m.id=meetup_id
   AND m.moderation_status='approved' AND m.starts_at > now()
   AND NOT public.mygirl_mutual_block((SELECT auth.uid()),m.host_id)
   AND (m.club_id IS NULL OR EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id=m.club_id AND gm.user_id=(SELECT auth.uid())))));
CREATE POLICY rsvps_delete_own ON public.meetup_rsvps FOR DELETE TO authenticated
 USING (user_id=(SELECT auth.uid()));
-- 'going' requires a separate trusted, transactional capacity-check endpoint.
-- Prevent concurrent oversubscription: lock meetups row FOR UPDATE and count
-- accepted reservations inside the same transaction. No client UPDATE grants.

-- Message retry deduplication: send a stable UUID per client attempt, and reuse
-- it after reconnect. This alone does not implement chat delivery or realtime.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_message_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS mygirl_messages_sender_dedupe_idx
 ON public.messages(sender_id,client_message_id)
 WHERE client_message_id IS NOT NULL;

-- Reporting policy must explicitly allow meetup targets. Old policy remains
-- in place; replace it with a combined rule to prevent unintended OR grants.
DROP POLICY IF EXISTS reports_insert ON public.reports;
CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated WITH CHECK (
 reporter_id=(SELECT auth.uid()) AND status='open' AND reviewed_at IS NULL
 AND num_nonnulls(profile_id,post_id,comment_id,group_id,message_id,meetup_id)=1
 AND (profile_id IS NULL OR profile_id<>(SELECT auth.uid()))
 AND (post_id IS NULL OR EXISTS(SELECT 1 FROM public.posts p WHERE p.id=post_id AND p.author_id<>(SELECT auth.uid())))
 AND (comment_id IS NULL OR EXISTS(SELECT 1 FROM public.comments c WHERE c.id=comment_id AND c.author_id<>(SELECT auth.uid())))
 AND (group_id IS NULL OR EXISTS(SELECT 1 FROM public.groups g WHERE g.id=group_id AND g.owner_id<>(SELECT auth.uid())))
 AND (message_id IS NULL OR EXISTS(SELECT 1 FROM public.messages m WHERE m.id=message_id
   AND m.sender_id<>(SELECT auth.uid()) AND public.mygirl_is_participant(m.conversation_id)))
 AND (meetup_id IS NULL OR EXISTS(SELECT 1 FROM public.meetups e WHERE e.id=meetup_id AND e.host_id<>(SELECT auth.uid())))
);
-- Realtime: subscribe once per active room, unsubscribe on blur; request
-- missing messages from DB after reconnect. Do not expose service_role.
-- Private chat delivery requires a reviewed Supabase Realtime authorization
-- strategy and server moderation (messages default to pending in base schema).
COMMIT;
