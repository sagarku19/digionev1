import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: Request) {
  try {
    const supabase = createServiceClient();
    const { filename, bucket = 'products', creatorId } = await req.json() as {
      filename?: string;
      bucket?: 'products' | 'public-asset';
      creatorId?: string;
    };

    if (!filename) {
      return NextResponse.json({ error: 'Filename required' }, { status: 400 });
    }
    if (bucket !== 'products' && bucket !== 'public-asset') {
      return NextResponse.json({ error: 'Invalid bucket' }, { status: 400 });
    }
    if (bucket === 'products' && !creatorId) {
      return NextResponse.json({ error: 'creatorId required for products bucket' }, { status: 400 });
    }

    const safeName = filename.replace(/\s+/g, '_');
    const ts = Date.now();
    const filePath =
      bucket === 'public-asset'
        ? `linkinbio/${ts}_${safeName}`
        : `${creatorId}/${ts}_${safeName}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    return NextResponse.json({
      signedUrl: data.signedUrl,
      path: data.path,
      publicUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${data.path}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
