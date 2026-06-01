// POST /api/auth/finalize-signup
// Idempotent. Mirrors public.users.role → auth.users.raw_app_meta_data.role
// so proxy.ts can trust the role from the JWT.
//
// One-shot: refuses to overwrite an existing app_metadata.role. Changing role
// is an admin action, not a self-service endpoint. See
// docs/superpowers/specs/2026-06-01-proxy-perf-and-role-storage-design.md.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.app_metadata?.role) {
    return NextResponse.json({ already_set: true, role: user.app_metadata.role });
  }

  const admin = createServiceClient();
  const { data: pub } = await admin
    .from('users')
    .select('role')
    .eq('auth_provider_id', user.id)
    .maybeSingle();

  // Resolution order:
  //   1. public.users.role (canonical, server-managed)
  //   2. auth.users.raw_user_meta_data.role (signup-time selection, untrusted but the
  //      best signal we have if the trigger hasn't run yet)
  //   3. 'buyer' (safe default — buyers can't reach /dashboard)
  const role =
    (pub?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined) ??
    'buyer';

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ role });
}
