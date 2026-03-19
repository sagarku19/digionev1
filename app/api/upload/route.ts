import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const { filename, bucket = 'products' } = await req.json();
    
    if (!filename) {
      return NextResponse.json({ error: "Filename required" }, { status: 400 });
    }

    const filePath = `${Date.now()}_${filename.replace(/\s+/g, '_')}`;

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
