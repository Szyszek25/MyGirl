// Copy this file's values after creating a SEPARATE MyGirl Supabase project.
// The publishable/anon key is intended for clients, but RLS and column grants
// MUST be verified first. NEVER put service_role, secret keys or passwords here.
export const config = Object.freeze({
  supabaseUrl: 'https://YOUR-MYGIRL-PROJECT.supabase.co',
  supabasePublishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  privacyNoticeVersion: 'draft-2026-09-21',
  termsVersion: 'draft-2026-09-21',
});
export const configured = !config.supabaseUrl.includes('YOUR-') && !config.supabasePublishableKey.includes('YOUR_');
