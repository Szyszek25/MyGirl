// MyGirl account deletion. NOT DEPLOYED until a dedicated Supabase project is connected.
// Requires a verified user JWT, explicit confirmation and server-only service_role.
// All future user media must be stored under <auth.uid()>/ in each Storage bucket.
// Apple Sign In token revocation must be integrated BEFORE enabling Apple login.
import { createClient } from 'npm:@supabase/supabase-js@2';

const reply = (status: number, message: string) => new Response(JSON.stringify({ message }), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return reply(405, 'Method not allowed');
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return reply(503, 'Server not configured');

  const authorization = request.headers.get('Authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401, 'Sign in required');
  let body: { confirm?: string };
  try { body = await request.json(); } catch { return reply(400, 'Invalid request'); }
  if (body?.confirm !== 'DELETE_MY_ACCOUNT') return reply(400, 'Confirmation required');

  const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) return reply(401, 'Session expired');

  // Apple's token revocation is required when Sign in with Apple is activated.
  // Fail closed rather than silently leaving an Apple authorization active.
  if (user.identities?.some(identity => identity.provider === 'apple')) {
    return reply(409, 'Apple token revocation must be configured before account deletion');
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('avatar_path').eq('id', user.id).maybeSingle();
  if (profileError) return reply(503, 'Unable to verify account data');
  if (profile?.avatar_path && !profile.avatar_path.startsWith(`${user.id}/`)) {
    return reply(409, 'Legacy media path needs a deletion migration');
  }

  // Storage objects are removed BEFORE deleting auth.users so the caller remains
  // identifiable on failure. No public/client service-role credentials are used.
  const { data: buckets, error: bucketsError } = await admin.storage.listBuckets();
  if (bucketsError) return reply(503, 'Unable to check uploaded media');
  async function clearFolder(bucket: string, prefix: string, depth = 0): Promise<void> {
    if (depth > 12) throw new Error('Unexpected media folder depth');
    while (true) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 100 });
      if (error) throw error;
      if (!data?.length) break;
      const files: string[] = [];
      for (const entry of data) {
        const path = `${prefix}/${entry.name}`;
        if (entry.id) files.push(path);
        else await clearFolder(bucket, path, depth + 1);
      }
      if (files.length) {
        const { error: removeError } = await admin.storage.from(bucket).remove(files);
        if (removeError) throw removeError;
      }
      // Re-list at offset 0 after deletions; never skip objects during pagination.
      if (!files.length && data.length === 0) break;
    }
  }
  try {
    for (const bucket of buckets || []) await clearFolder(bucket.id, user.id);
  } catch {
    return reply(503, 'Media deletion failed; account retained');
  }

  // FK ON DELETE CASCADE clears profiles, posts, interests, blocks, invitations
  // and reports; verify all newly added account-owned tables in every migration.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);
  if (deleteError) return reply(503, 'Account deletion failed; please retry');
  return reply(200, 'Account deleted');
});
