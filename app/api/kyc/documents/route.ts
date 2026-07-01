import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { resolveBucket } from '@/lib/storage';
import { isUuid } from '@/lib/upload-validators';

const DOC_TYPES = ['pan_card', 'bank_proof', 'aadhaar'];

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileId = (body as { fileId?: string }).fileId;
    const docType = (body as { docType?: string }).docType;
    if (!fileId || !isUuid(fileId) || !docType || !DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: 'fileId (uuid) and a valid docType are required.' }, { status: 400 });
    }

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    const db = createServiceClient();
    const cfg = resolveBucket('creator-private');
    const { data: file } = await db.from('storage_files')
      .select('id, owner_id, bucket, kind').eq('id', fileId).maybeSingle();
    if (!file || file.owner_id !== profileId || file.bucket !== cfg.name || file.kind !== 'kyc') {
      return NextResponse.json({ error: 'File not found or not an owned KYC document.' }, { status: 403 });
    }

    const { data: doc, error } = await db.from('kyc_documents')
      .insert({ creator_id: profileId, file_id: fileId, doc_type: docType })
      .select('id').single();
    if (error) {
      console.error('[kyc/documents] insert failed', error.message);
      return NextResponse.json({ error: 'Failed to link document.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, documentId: doc.id });
  } catch (e) {
    console.error('[kyc/documents] error', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
