import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! 
);

export async function GET(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const resolvedParams = await params;
    const { orderId } = resolvedParams;

    const { data: order, error } = await supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ status: order.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
