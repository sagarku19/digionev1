// Service-role helpers for the storage_files metadata table. Routes use these so
// the table stays write-restricted to the server. `sumOwnerBytes` is the spec's
// `sumBytes` (a Supabase read, not an R2 op).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { storage } from './index';

type Db = SupabaseClient<Database>;
type FileRow = Database['public']['Tables']['storage_files']['Row'];
type FileInsert = Database['public']['Tables']['storage_files']['Insert'];

export async function insertFile(db: Db, row: FileInsert): Promise<FileRow> {
  const { data, error } = await db.from('storage_files').insert(row).select('*').single();
  if (error || !data) throw new Error(`[files] insert failed: ${error?.message}`);
  return data;
}

// Spec's sumBytes: live bytes for one owner+bucket. Replaces the quota RPC.
export async function sumOwnerBytes(db: Db, ownerId: string, bucket: string): Promise<number> {
  const { data, error } = await db
    .from('storage_files')
    .select('size')
    .eq('owner_id', ownerId)
    .eq('bucket', bucket)
    .is('deleted_at', null);
  if (error) throw new Error(`[files] sum failed: ${error.message}`);
  return (data ?? []).reduce((acc, r) => acc + Number(r.size ?? 0), 0);
}

// Resolve a live row by its (bucket, object_key). Used to map a placement URL
// back to its storage_files row for re-crop / replace.
export async function findLiveByKey(db: Db, bucket: string, objectKey: string): Promise<FileRow | null> {
  const { data } = await db.from('storage_files').select('*')
    .eq('bucket', bucket).eq('object_key', objectKey).is('deleted_at', null).maybeSingle();
  return data ?? null;
}

// ownerId is required and chained into the update so a service-role caller can
// never soft-delete a file it doesn't own, even with an unverified fileId.
export async function softDelete(db: Db, fileId: string, ownerId: string): Promise<void> {
  const { error } = await db.from('storage_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', fileId).eq('owner_id', ownerId);
  if (error) throw new Error(`[files] soft-delete failed: ${error.message}`);
}

// Hard cascade: delete an original + every derivative (R2 objects then rows).
// Returns how many objects were removed. Used by Media Library delete.
export async function hardDeleteCascade(db: Db, fileId: string): Promise<{ removed: number }> {
  const { data: original } = await db.from('storage_files').select('*').eq('id', fileId).maybeSingle();
  if (!original) return { removed: 0 };
  const { data: derivatives } = await db.from('storage_files').select('*').eq('parent_file_id', fileId);
  const all: FileRow[] = [original, ...(derivatives ?? [])];
  for (const f of all) {
    try { await storage.delete({ bucket: f.bucket, objectKey: f.object_key }); }
    catch { /* object already gone — proceed to remove the row */ }
  }
  await db.from('storage_files').delete().eq('parent_file_id', fileId);
  await db.from('storage_files').delete().eq('id', fileId);
  return { removed: all.length };
}
