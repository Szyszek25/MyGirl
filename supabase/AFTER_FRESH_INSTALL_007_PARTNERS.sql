-- MyGirl 007: FUTURE partner/organization model; NOT deployed.
-- Apply only to the dedicated MyGirl Supabase project after 001/fresh + 004,005,006.
-- The native PartnerPanel currently stores an OFFLINE draft only. Do not connect
-- client writes until organization verification and moderation are implemented.
BEGIN;

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK(char_length(btrim(name)) BETWEEN 2 AND 80),
  slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  kind text NOT NULL CHECK(kind IN ('business','nonprofit','student_club','community','other')),
  city text NOT NULL CHECK(char_length(btrim(city)) BETWEEN 2 AND 100),
  description text NOT NULL DEFAULT '' CHECK(char_length(description)<=1000),
  logo_path text CHECK(char_length(logo_path)<=500),
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK(moderation_status IN ('pending','approved','rejected','suspended')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(verified_at IS NULL OR moderation_status IN ('approved','suspended'))
);
CREATE INDEX organizations_visible_city_idx ON public.organizations(city,kind)
  WHERE moderation_status='approved';

-- ONLY a trusted endpoint may grant or change roles after verifying a person's
-- right to manage the business/club. Never trust a user-supplied owner_id.
CREATE TABLE public.organization_members (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK(role IN ('owner','manager','editor')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(organization_id,user_id)
);
CREATE INDEX organization_members_user_idx ON public.organization_members(user_id);

CREATE TABLE public.partner_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('event','discount','partnership','announcement')),
  title text NOT NULL CHECK(char_length(btrim(title)) BETWEEN 3 AND 100),
  description text NOT NULL DEFAULT '' CHECK(char_length(description)<=2000),
  city text NOT NULL CHECK(char_length(btrim(city)) BETWEEN 2 AND 100),
  starts_at timestamptz,
  ends_at timestamptz,
  moderation_status text NOT NULL DEFAULT 'pending'
    CHECK(moderation_status IN ('pending','approved','rejected','archived')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(starts_at IS NULL OR ends_at IS NULL OR ends_at>starts_at),
  CHECK(approved_at IS NULL OR moderation_status IN ('approved','archived'))
);
CREATE INDEX partner_offers_feed_idx ON public.partner_offers(city,created_at DESC)
  WHERE moderation_status='approved';
CREATE INDEX partner_offers_org_idx ON public.partner_offers(organization_id,created_at DESC);

-- Separate partner reports instead of widening the already versioned reports
-- constraint from migration 006. Deleted targets may become NULL for audit.
CREATE TABLE public.partner_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.partner_offers(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK(reason IN ('harassment','hate','sexual','spam','impersonation','misleading','other')),
  details text CHECK(char_length(details)<=1000),
  status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CHECK(num_nonnulls(organization_id,offer_id)<=1)
);
CREATE INDEX partner_reports_open_idx ON public.partner_reports(created_at) WHERE status='open';

CREATE FUNCTION public.mygirl_is_org_member(p_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id=p_org AND om.user_id=(SELECT auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.mygirl_is_org_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mygirl_is_org_member(uuid) TO authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organizations,public.organization_members,public.partner_offers,public.partner_reports
  FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.organizations,public.organization_members,public.partner_offers TO authenticated;
GRANT SELECT,INSERT ON public.partner_reports TO authenticated;

CREATE POLICY org_read ON public.organizations FOR SELECT TO authenticated USING (
  moderation_status='approved' OR public.mygirl_is_org_member(id)
);
CREATE POLICY org_members_read_self ON public.organization_members FOR SELECT TO authenticated USING (
  user_id=(SELECT auth.uid())
);
CREATE POLICY partner_offers_read ON public.partner_offers FOR SELECT TO authenticated USING (
  public.mygirl_is_org_member(organization_id)
  OR (moderation_status='approved' AND EXISTS(
    SELECT 1 FROM public.organizations o
    WHERE o.id=organization_id AND o.moderation_status='approved'))
);
CREATE POLICY partner_reports_read_own ON public.partner_reports FOR SELECT TO authenticated
  USING(reporter_id=(SELECT auth.uid()));
CREATE POLICY partner_reports_submit ON public.partner_reports FOR INSERT TO authenticated WITH CHECK (
  reporter_id=(SELECT auth.uid()) AND status='open' AND reviewed_at IS NULL
  AND num_nonnulls(organization_id,offer_id)=1
  AND (organization_id IS NULL OR EXISTS(
    SELECT 1 FROM public.organizations o
    WHERE o.id=organization_id AND o.moderation_status='approved'))
  AND (offer_id IS NULL OR EXISTS(
    SELECT 1 FROM public.partner_offers p
    JOIN public.organizations o ON o.id=p.organization_id
    WHERE p.id=offer_id AND p.moderation_status='approved' AND o.moderation_status='approved'))
);

-- No client INSERT/UPDATE/DELETE on organizations, members, or offers. A
-- trusted service must verify ownership, assign roles, moderate content,
-- enforce rate limits and publish offers. Service keys NEVER go in Expo.
COMMIT;
