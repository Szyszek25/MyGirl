-- MyGirl addon 005: run ONLY on a fresh MyGirl project AFTER
-- MYGIRL_FRESH_INSTALL.sql and AFTER_FRESH_INSTALL_004_STORAGE_WAITLIST.sql.
-- Not executed remotely. Never apply to MyCampus. Review with an RLS test suite.
BEGIN;

-- Prevent an account from publishing somebody else's private avatar filename.
ALTER TABLE public.profiles
 ADD CONSTRAINT mygirl_avatar_owner_path CHECK (
   avatar_path IS NULL OR (
     char_length(avatar_path) <= 500 AND avatar_path LIKE id::text || '/%'
   )
 );
-- A production profile may be published only for an adult with a supplied birth date.
-- This is a date check, NOT identity/age verification; collect the DOB privately.
ALTER TABLE public.profiles ADD CONSTRAINT mygirl_completed_profile_adult CHECK (
 NOT onboarding_complete OR
 (birth_date IS NOT NULL AND birth_date <= (CURRENT_DATE - INTERVAL '18 years')::date)
);

-- The 004 policy must not query auth.users as the API's authenticated role.
-- Read auth.users only inside a narrowly scoped SECURITY DEFINER helper.
CREATE FUNCTION public.mygirl_has_verified_email() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS (
   SELECT 1 FROM auth.users u
   WHERE u.id = (SELECT auth.uid()) AND u.email_confirmed_at IS NOT NULL
 )
$$;
REVOKE ALL ON FUNCTION public.mygirl_has_verified_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mygirl_has_verified_email() TO authenticated;

-- Publish legal versions ONLY after real controller identity and docs are approved.
-- The database starts with ZERO published documents by design: registrations fail closed.
CREATE TABLE public.legal_documents (
 kind text NOT NULL CHECK (kind IN ('privacy','terms')),
 version text NOT NULL CHECK (char_length(version) BETWEEN 1 AND 30),
 document_url text NOT NULL CHECK (char_length(document_url) BETWEEN 1 AND 500),
 sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
 published_at timestamptz NOT NULL,
 PRIMARY KEY (kind,version)
);
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_documents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_documents TO anon, authenticated;
CREATE POLICY mygirl_legal_published_read ON public.legal_documents
 FOR SELECT TO anon,authenticated USING (published_at <= now());

-- Immutable evidence of document-version acknowledgement, generated only from the
-- waitlist trigger. No app/browser grant to manually insert, rewrite or erase rows.
CREATE TABLE public.legal_acceptances (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 kind text NOT NULL,
 version text NOT NULL,
 accepted_at timestamptz NOT NULL DEFAULT now(),
 source text NOT NULL DEFAULT 'website_waitlist' CHECK(source IN ('website_waitlist','mobile_onboarding')),
 PRIMARY KEY(user_id,kind,version),
 FOREIGN KEY(kind,version) REFERENCES public.legal_documents(kind,version)
);
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_acceptances FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.legal_acceptances TO authenticated;
CREATE POLICY mygirl_my_legal_ack ON public.legal_acceptances
 FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));

-- Marketing consent must be independent of terms and its changes append events.
CREATE TABLE public.consent_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK (purpose IN ('marketing_email')),
 granted boolean NOT NULL,
 notice_version text NOT NULL CHECK (char_length(notice_version) BETWEEN 1 AND 30),
 source text NOT NULL CHECK (source IN ('website_waitlist','account_settings')),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mygirl_consent_events_user_idx ON public.consent_events(user_id,recorded_at DESC);
ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.consent_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.consent_events TO authenticated;
CREATE POLICY mygirl_my_consent_events ON public.consent_events
 FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));

DROP POLICY mygirl_waitlist_insert ON public.waitlist;
CREATE POLICY mygirl_waitlist_insert ON public.waitlist FOR INSERT TO authenticated
WITH CHECK (
 user_id=(SELECT auth.uid()) AND status='waiting' AND invited_at IS NULL
 AND public.mygirl_has_verified_email()
 AND EXISTS(SELECT 1 FROM public.legal_documents d
   WHERE d.kind='privacy' AND d.version=privacy_notice_version AND d.published_at<=now())
 AND EXISTS(SELECT 1 FROM public.legal_documents d
   WHERE d.kind='terms' AND d.version=terms_version AND d.published_at<=now())
);

CREATE FUNCTION public.mygirl_waitlist_record_acceptance() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.legal_acceptances(user_id,kind,version,source)
 VALUES (NEW.user_id,'privacy',NEW.privacy_notice_version,'website_waitlist'),
        (NEW.user_id,'terms',NEW.terms_version,'website_waitlist');
 INSERT INTO public.consent_events(user_id,purpose,granted,notice_version,source)
 VALUES (NEW.user_id,'marketing_email',NEW.marketing_opt_in,NEW.privacy_notice_version,'website_waitlist');
 RETURN NEW;
END;
$$;
CREATE TRIGGER mygirl_waitlist_ack AFTER INSERT ON public.waitlist
 FOR EACH ROW EXECUTE FUNCTION public.mygirl_waitlist_record_acceptance();
CREATE FUNCTION public.mygirl_waitlist_record_consent_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.marketing_opt_in IS DISTINCT FROM OLD.marketing_opt_in THEN
  INSERT INTO public.consent_events(user_id,purpose,granted,notice_version,source)
  VALUES (NEW.user_id,'marketing_email',NEW.marketing_opt_in,NEW.privacy_notice_version,'account_settings');
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER mygirl_waitlist_consent_change AFTER UPDATE ON public.waitlist
 FOR EACH ROW EXECUTE FUNCTION public.mygirl_waitlist_record_consent_change();

-- A deletion request is just a queue entry: a protected service MUST actually
-- remove owned Storage objects and delete the Supabase Auth user (cascades DB).
CREATE TABLE public.account_deletion_requests (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','processing','failed','completed')),
 requested_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 error_code text CHECK(char_length(error_code)<=100)
);
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.account_deletion_requests TO authenticated;
GRANT INSERT(user_id) ON public.account_deletion_requests TO authenticated;
CREATE POLICY mygirl_deletion_request_read ON public.account_deletion_requests
 FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY mygirl_deletion_request_insert ON public.account_deletion_requests
 FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()) AND status='requested');
-- Server-side deletion and moderation require a separate trusted worker, retention
-- decisions, and App Store review testing. Never include service_role in clients.
COMMIT;
