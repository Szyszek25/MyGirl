// PUBLIC CLIENT CONFIG ONLY. Polka production project.
// Never put service_role, secret keys, DB passwords or provider credentials here.
export const config = Object.freeze({
  supabaseUrl: 'https://jnygupsfbkpqvoewrxpf.supabase.co',
  supabasePublishableKey: 'sb_publishable_VS9kUDKjyjd_cCeTtuQqwA_fsXDHG9P',
  privacyNoticeVersion: '2026-09-26',
  termsVersion: '2026-09-26',
  legalApproved: true,
});
export const configured = config.legalApproved
  && !config.supabaseUrl.includes('YOUR-')
  && !config.supabasePublishableKey.includes('YOUR_')
  && !config.privacyNoticeVersion.startsWith('draft-')
  && !config.termsVersion.startsWith('draft-');
