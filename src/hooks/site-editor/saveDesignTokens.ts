'use client';
// Single writer for site_design_tokens.color_palette used by every editor save.
// Update when the row exists; otherwise insert with a resolved creator_id
// (falls back to the authenticated user — fixes the payment editor which used
// to omit creator_id on insert).
import { supabase } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/current-user';

export async function saveDesignTokens(
  siteId: string,
  palette: Record<string, string>,
  creatorId?: string | null,
) {
  if (Object.keys(palette).length === 0) return;

  const { data: existing, error: selErr } = await supabase
    .from('site_design_tokens').select('id').eq('site_id', siteId).maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error } = await supabase
      .from('site_design_tokens').update({ color_palette: palette }).eq('id', existing.id);
    if (error) throw error;
    return;
  }

  let cid = creatorId ?? null;
  if (!cid) {
    const user = await getCurrentUser();
    cid = user?.id ?? null;
  }
  if (!cid) throw new Error('Cannot resolve creator for design tokens');

  const { error } = await supabase.from('site_design_tokens').insert({
    site_id: siteId, creator_id: cid, color_palette: palette,
    spacing_scale: {}, typography: {}, border_radius_scale: {},
  });
  if (error) throw error;
}
