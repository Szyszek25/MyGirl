// PUBLIC CLIENT CONFIG ONLY. A separate MyGirl project is required.
// Never put service_role, secret keys, DB passwords or provider credentials here.
// legalApproved must be switched on ONLY after verified controller identity,
// reviewed/published privacy + terms, legal_documents rows, working unsubscribe,
// tested RLS and storage policies, and configured Supabase email OTP template.
export const config = Object.freeze({
  supabaseUrl: 'https://YOUR-MYGIRL-PROJECT.supabase.co',
  supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  privacyNoticeVersion: 'draft-2026-09-21',
  termsVersion: 'draft-2026-09-21',
  legalApproved: false,
});
export const configured = config.legalApproved
  && !config.supabaseUrl.includes('YOUR-')
  && !config.supabasePublishableKey.includes('YOUR_')
  && !config.privacyNoticeVersion.startsWith('draft-')
  && !config.termsVersion.startsWith('draft-');
