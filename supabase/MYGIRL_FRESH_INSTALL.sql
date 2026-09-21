-- MYGIRL: ONE-SHOT BOOTSTRAP FOR A NEW, EMPTY SUPABASE PROJECT ONLY.
-- Do NOT execute after migrations/001-003: this file REPLACES them on fresh projects.
-- Do NOT execute on MyCampus or any existing populated database.
-- Run in Supabase SQL Editor as project owner. Not executed remotely or integration-tested yet.
-- Requires Supabase auth, storage, pgcrypto. Never expose service_role in mobile code.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users and discovery
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name)<=60),
 city text CHECK (char_length(city)<=100),
 bio text CHECK (char_length(bio)<=500),
 avatar_path text CHECK (char_length(avatar_path)<=500),
 birth_date date, -- PRIVATE; do not select birth_date for other people in app: use public_profiles view/RPC
 onboarding_complete boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.profile_interests (
 profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 interest text NOT NULL CHECK (char_length(interest) BETWEEN 1 AND 40),
 PRIMARY KEY(profile_id,interest)
);
CREATE TABLE public.blocks (
 blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(blocker_id,blocked_id), CHECK(blocker_id<>blocked_id)
);
CREATE INDEX blocks_blocked_idx ON public.blocks(blocked_id);
CREATE TABLE public.friend_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(sender_id<>recipient_id), UNIQUE(sender_id,recipient_id)
);
CREATE UNIQUE INDEX requests_pair_idx ON public.friend_requests(least(sender_id,recipient_id),greatest(sender_id,recipient_id));
CREATE INDEX requests_recipient_idx ON public.friend_requests(recipient_id,created_at DESC);

-- Community. All UGC starts pending until reviewed server-side.
CREATE TABLE public.posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
 moderation_status text NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX posts_feed_idx ON public.posts(created_at DESC) WHERE moderation_status='approved';
CREATE INDEX posts_author_idx ON public.posts(author_id,created_at DESC);
CREATE TABLE public.post_likes (
 post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(post_id,user_id)
);
CREATE INDEX post_likes_user_idx ON public.post_likes(user_id);
CREATE TABLE public.comments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
 moderation_status text NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX comments_post_idx ON public.comments(post_id,created_at);

-- Groups and membership: new groups are pending; owner can manage own membership only.
CREATE TABLE public.groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(char_length(btrim(name)) BETWEEN 2 AND 80),
 description text CHECK(char_length(description)<=500),
 city text CHECK(char_length(city)<=100),
 moderation_status text NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX groups_city_idx ON public.groups(city) WHERE moderation_status='approved';
CREATE TABLE public.group_members (
 group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(group_id,user_id)
);
CREATE INDEX group_members_user_idx ON public.group_members(user_id);

-- Direct/group conversations. Participants are created by trusted server-side operations;
-- a client cannot arbitrarily add somebody to a conversation.
CREATE TABLE public.conversations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK(kind IN ('direct','group')),
 group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='direct' AND group_id IS NULL) OR (kind='group' AND group_id IS NOT NULL))
);
CREATE UNIQUE INDEX conversation_group_unique ON public.conversations(group_id) WHERE group_id IS NOT NULL;
CREATE TABLE public.conversation_participants (
 conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(conversation_id,user_id)
);
CREATE INDEX conversation_participants_user_idx ON public.conversation_participants(user_id);
CREATE TABLE public.messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
 sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 body text NOT NULL CHECK(char_length(btrim(body)) BETWEEN 1 AND 4000),
 moderation_status text NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,conversation_id)
);
CREATE INDEX messages_room_idx ON public.messages(conversation_id,created_at DESC);

-- Reports remain private to the reporter and to trusted moderation tooling.
CREATE TABLE public.reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
 comment_id uuid REFERENCES public.comments(id) ON DELETE SET NULL,
 group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
 message_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
 reason text NOT NULL CHECK(reason IN ('harassment','hate','sexual','spam','impersonation','other')),
 details text CHECK(char_length(details)<=1000),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
 created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
 CHECK(num_nonnulls(profile_id,post_id,comment_id,group_id,message_id)=1)
);
CREATE INDEX reports_queue_idx ON public.reports(created_at) WHERE status='open';
CREATE INDEX reports_reporter_idx ON public.reports(reporter_id,created_at DESC);

-- Profiles are created automatically upon real Supabase Auth registration.
CREATE FUNCTION public.mygirl_create_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN INSERT INTO public.profiles(id) VALUES(new.id) ON CONFLICT(id) DO NOTHING; RETURN new; END $$;
CREATE TRIGGER mygirl_auth_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.mygirl_create_profile();
CREATE FUNCTION public.mygirl_touch_profile() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN new.updated_at=now(); RETURN new; END $$;
CREATE TRIGGER mygirl_profile_timestamp BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.mygirl_touch_profile();

-- SECURITY DEFINER helpers avoid RLS recursion and inaccessible reverse block rows.
CREATE FUNCTION public.mygirl_mutual_block(a uuid,b uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN (SELECT auth.uid()) IS NULL OR (SELECT auth.uid()) NOT IN (a,b) THEN true
 ELSE EXISTS(SELECT 1 FROM public.blocks x WHERE (x.blocker_id=a AND x.blocked_id=b) OR (x.blocker_id=b AND x.blocked_id=a)) END $$;
REVOKE ALL ON FUNCTION public.mygirl_mutual_block(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mygirl_mutual_block(uuid,uuid) TO authenticated;

-- Returns ONLY membership of the currently authenticated user; does not expose members.
CREATE FUNCTION public.mygirl_is_participant(room uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id=room AND cp.user_id=(SELECT auth.uid())) $$;
REVOKE ALL ON FUNCTION public.mygirl_is_participant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mygirl_is_participant(uuid) TO authenticated;

-- Prevent direct messages to blocked peers, even if an old conversation survives.
CREATE FUNCTION public.mygirl_room_allowed(room uuid) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS(
 SELECT 1 FROM public.conversations co WHERE co.id=room AND (
 (co.kind='group' AND EXISTS(SELECT 1 FROM public.group_members gm WHERE gm.group_id=co.group_id AND gm.user_id=(SELECT auth.uid()))) OR
 (co.kind='direct' AND NOT EXISTS(
 SELECT 1 FROM public.conversation_participants other
 JOIN public.blocks b ON (b.blocker_id=(SELECT auth.uid()) AND b.blocked_id=other.user_id)
                         OR (b.blocked_id=(SELECT auth.uid()) AND b.blocker_id=other.user_id)
 WHERE other.conversation_id=room AND other.user_id<>(SELECT auth.uid())
 )))) $$;
REVOKE ALL ON FUNCTION public.mygirl_room_allowed(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mygirl_room_allowed(uuid) TO authenticated;

-- RLS always on for all user-facing tables.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Birth date should not be public: grant per-column reads rather than SELECT *.
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT(id,display_name,city,bio,avatar_path,onboarding_complete,created_at,updated_at) ON public.profiles TO authenticated;
GRANT INSERT(id,display_name,city,bio,avatar_path,birth_date,onboarding_complete) ON public.profiles TO authenticated;
GRANT UPDATE(display_name,city,bio,avatar_path,birth_date,onboarding_complete) ON public.profiles TO authenticated;
-- Users fetch/edit their own birth_date through restricted RPC only, to avoid SELECT grant exposing other users' dates.
CREATE FUNCTION public.mygirl_my_birth_date() RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT birth_date FROM public.profiles WHERE id=(SELECT auth.uid()) $$;
REVOKE ALL ON FUNCTION public.mygirl_my_birth_date() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mygirl_my_birth_date() TO authenticated;
CREATE POLICY profile_read ON public.profiles FOR SELECT TO authenticated USING (
 id=(SELECT auth.uid()) OR (onboarding_complete AND NOT public.mygirl_mutual_block((SELECT auth.uid()),id)));
CREATE POLICY profile_insert ON public.profiles FOR INSERT TO authenticated WITH CHECK(id=(SELECT auth.uid()));
CREATE POLICY profile_update ON public.profiles FOR UPDATE TO authenticated USING(id=(SELECT auth.uid())) WITH CHECK(id=(SELECT auth.uid()));
CREATE POLICY interests_read ON public.profile_interests FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=profile_id));
CREATE POLICY interests_insert ON public.profile_interests FOR INSERT TO authenticated WITH CHECK(profile_id=(SELECT auth.uid()));
CREATE POLICY interests_delete ON public.profile_interests FOR DELETE TO authenticated USING(profile_id=(SELECT auth.uid()));
CREATE POLICY blocks_read ON public.blocks FOR SELECT TO authenticated USING(blocker_id=(SELECT auth.uid()));
CREATE POLICY blocks_insert ON public.blocks FOR INSERT TO authenticated WITH CHECK(blocker_id=(SELECT auth.uid()));
CREATE POLICY blocks_delete ON public.blocks FOR DELETE TO authenticated USING(blocker_id=(SELECT auth.uid()));
CREATE POLICY requests_read ON public.friend_requests FOR SELECT TO authenticated USING(
 (sender_id=(SELECT auth.uid()) OR recipient_id=(SELECT auth.uid())) AND NOT public.mygirl_mutual_block(sender_id,recipient_id));
CREATE POLICY requests_insert ON public.friend_requests FOR INSERT TO authenticated WITH CHECK(
 sender_id=(SELECT auth.uid()) AND recipient_id<>(SELECT auth.uid())
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=recipient_id AND p.onboarding_complete)
 AND NOT public.mygirl_mutual_block(sender_id,recipient_id));
CREATE POLICY requests_delete ON public.friend_requests FOR DELETE TO authenticated USING(sender_id=(SELECT auth.uid()) OR recipient_id=(SELECT auth.uid()));

CREATE POLICY posts_read ON public.posts FOR SELECT TO authenticated USING(
 author_id=(SELECT auth.uid()) OR (moderation_status='approved' AND
 EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=author_id AND p.onboarding_complete)
 AND NOT public.mygirl_mutual_block((SELECT auth.uid()),author_id)));
CREATE POLICY posts_insert ON public.posts FOR INSERT TO authenticated WITH CHECK(author_id=(SELECT auth.uid()) AND moderation_status='pending');
CREATE POLICY posts_delete ON public.posts FOR DELETE TO authenticated USING(author_id=(SELECT auth.uid()));
CREATE POLICY likes_read ON public.post_likes FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.posts p WHERE p.id=post_id));
CREATE POLICY likes_insert ON public.post_likes FOR INSERT TO authenticated WITH CHECK(
 user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.posts p WHERE p.id=post_id AND p.moderation_status='approved' AND NOT public.mygirl_mutual_block((SELECT auth.uid()),p.author_id)));
CREATE POLICY likes_delete ON public.post_likes FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY comments_read ON public.comments FOR SELECT TO authenticated USING(
 author_id=(SELECT auth.uid()) OR (moderation_status='approved' AND EXISTS(SELECT 1 FROM public.posts p WHERE p.id=post_id AND p.moderation_status='approved') AND NOT public.mygirl_mutual_block((SELECT auth.uid()),author_id)));
CREATE POLICY comments_insert ON public.comments FOR INSERT TO authenticated WITH CHECK(
 author_id=(SELECT auth.uid()) AND moderation_status='pending' AND EXISTS(SELECT 1 FROM public.posts p WHERE p.id=post_id AND p.moderation_status='approved' AND NOT public.mygirl_mutual_block((SELECT auth.uid()),p.author_id)));
CREATE POLICY comments_delete ON public.comments FOR DELETE TO authenticated USING(author_id=(SELECT auth.uid()));
CREATE POLICY groups_read ON public.groups FOR SELECT TO authenticated USING(
 owner_id=(SELECT auth.uid()) OR (moderation_status='approved' AND NOT public.mygirl_mutual_block((SELECT auth.uid()),owner_id)));
CREATE POLICY groups_insert ON public.groups FOR INSERT TO authenticated WITH CHECK(owner_id=(SELECT auth.uid()) AND moderation_status='pending');
CREATE POLICY groups_delete ON public.groups FOR DELETE TO authenticated USING(owner_id=(SELECT auth.uid()));
CREATE POLICY members_read ON public.group_members FOR SELECT TO authenticated USING(
 user_id=(SELECT auth.uid()) OR EXISTS(SELECT 1 FROM public.groups g WHERE g.id=group_id AND g.moderation_status='approved'));
CREATE POLICY members_insert ON public.group_members FOR INSERT TO authenticated WITH CHECK(
 user_id=(SELECT auth.uid()) AND EXISTS(SELECT 1 FROM public.groups g WHERE g.id=group_id AND g.moderation_status='approved' AND NOT public.mygirl_mutual_block((SELECT auth.uid()),g.owner_id)));
CREATE POLICY members_delete ON public.group_members FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY rooms_read ON public.conversations FOR SELECT TO authenticated USING(public.mygirl_is_participant(id) AND public.mygirl_room_allowed(id));
CREATE POLICY participants_read ON public.conversation_participants FOR SELECT TO authenticated USING(public.mygirl_is_participant(conversation_id) AND public.mygirl_room_allowed(conversation_id));
-- No room/participant client INSERT: create via trusted authenticated server endpoint.
CREATE POLICY messages_read ON public.messages FOR SELECT TO authenticated USING(
 public.mygirl_is_participant(conversation_id) AND public.mygirl_room_allowed(conversation_id)
 AND (sender_id=(SELECT auth.uid()) OR moderation_status='approved'));
CREATE POLICY messages_insert ON public.messages FOR INSERT TO authenticated WITH CHECK(
 sender_id=(SELECT auth.uid()) AND moderation_status='pending'
 AND public.mygirl_is_participant(conversation_id) AND public.mygirl_room_allowed(conversation_id));
CREATE POLICY messages_delete ON public.messages FOR DELETE TO authenticated USING(sender_id=(SELECT auth.uid()));
CREATE POLICY reports_insert ON public.reports FOR INSERT TO authenticated WITH CHECK(
 reporter_id=(SELECT auth.uid()) AND status='open' AND reviewed_at IS NULL
 AND (profile_id IS NULL OR profile_id<>(SELECT auth.uid()))
 AND (post_id IS NULL OR EXISTS(SELECT 1 FROM public.posts p WHERE p.id=post_id AND p.author_id<>(SELECT auth.uid())))
 AND (comment_id IS NULL OR EXISTS(SELECT 1 FROM public.comments c WHERE c.id=comment_id AND c.author_id<>(SELECT auth.uid())))
 AND (group_id IS NULL OR EXISTS(SELECT 1 FROM public.groups g WHERE g.id=group_id AND g.owner_id<>(SELECT auth.uid())))
 AND (message_id IS NULL OR EXISTS(SELECT 1 FROM public.messages m WHERE m.id=message_id AND m.sender_id<>(SELECT auth.uid()) AND public.mygirl_is_participant(m.conversation_id)))
 );
CREATE POLICY reports_read ON public.reports FOR SELECT TO authenticated USING(reporter_id=(SELECT auth.uid()));
-- No client UPDATE of moderation_status, reports.status, room participation or account deletion.
-- Deleting auth.users must happen server-side with verified JWT, storage cleanup and provider token revocation.
-- Supabase SQL cannot alone implement a full deletion flow or human moderation queue.
COMMIT;
