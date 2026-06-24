// Promotes a logged-in buyer to creator. Updates BOTH role stores: the JWT's
// app_metadata.role (proxy.ts dashboard gate) and public.users.role (login /
// reset redirect resolution). Creator verification is currently minimal — match
// whatever the creator path requires today; phone verification is deferred.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createServiceClient();

  const { error: roleErr } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role: 'creator' },
  });
  if (roleErr) {
    console.error('[upgrade-to-creator] app_metadata update failed:', roleErr.message);
    return NextResponse.json({ error: 'Could not upgrade account' }, { status: 500 });
  }

  // Keep the DB role in sync (login/reset redirect read public.users.role).
  const { error: dbRoleErr } = await admin
    .from('users')
    .update({ role: 'creator' })
    .eq('id', user.id);
  if (dbRoleErr) {
    console.error('[upgrade-to-creator] users.role update failed:', dbRoleErr.message);
  }

  // Ensure a profiles row exists (handle_new_user normally creates it).
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) {
    await admin.from('profiles').insert({
      user_id: user.id,
      full_name: (user.user_metadata?.full_name as string) ?? user.email?.split('@')[0] ?? 'Creator',
      email: user.email ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
