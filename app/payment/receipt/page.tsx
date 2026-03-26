import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { PrintButton } from './PrintButton';

export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Bypass RLS to fetch secure order details
);

export default async function ReceiptPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; sub?: string }>;
}) {
  const { order_id, sub } = await searchParams;

  if (!order_id) return notFound();

  let details = {
    date: '',
    amount: 0,
    customerName: 'Customer',
    customerEmail: '',
    itemName: 'Digital Product / Service',
    orderId: order_id
  };

  if (sub) {
    // Payment Link submission
    const { data: submission, error: subErr } = await supabase
      .from('payment_submissions')
      .select('*')
      .eq('id', sub)
      .single();

    if (subErr) {
       console.error("Receipt sub fetch err:", subErr);
       return (
         <div className="p-8 text-red-500">Error loading receipt: {subErr.message}</div>
       );
    }
    if (!submission) return notFound();

    let title = 'Payment';
    if (submission.payment_request_id) {
        const { data: pr } = await supabase
            .from('payment_requests')
            .select('title')
            .eq('id', submission.payment_request_id)
            .maybeSingle();
        if (pr?.title) title = pr.title;
    }

    details = {
      date: new Date(submission.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
      amount: submission.amount,
      customerName: submission.customer_name || 'Customer',
      customerEmail: submission.customer_email || '',
      itemName: title,
      orderId: submission.gateway_order_id || order_id
    };
  } else {
    // Standard Checkout Order — order_id can be a UUID or a gateway order id (ord_...)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(order_id);
    const col = isUUID ? 'id' : 'gateway_order_id';
    const { data: order } = await (supabase
      .from('orders')
      .select('*, order_items(products(name))') as any)
      .eq(col, order_id)
      .single();

    if (!order) return notFound();

    // Try to fetch buyer details safely
    let buyerName = order.customer_name || 'Customer';
    let buyerEmail = order.customer_email || '';
    if (order.user_id && buyerName === 'Customer') {
       const { data: buyer } = await supabase.from('profiles').select('*').eq('id', order.user_id).maybeSingle();
       if (buyer) {
          buyerName = buyer.full_name || 'Customer';
       }
    }

    const itemNames = order.order_items?.map((i: any) => i.products?.name).filter(Boolean).join(', ');

    details = {
      date: new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }),
      amount: order.total_amount,
      customerName: buyerName,
      customerEmail: buyerEmail,
      itemName: itemNames || 'Digital Products',
      orderId: order.id
    };
  }

  return (
    <div className="bg-white text-gray-900 font-sans antialiased min-h-screen p-8">
      <div className="max-w-2xl mx-auto border border-gray-200 p-10 rounded-xl relative bg-white shadow-sm">
          
          <div className="flex items-start justify-between border-b border-gray-100 pb-8 mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2.5 rounded-xl">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">DigiOne</h1>
                <p className="text-sm text-gray-500">Receipt / Invoice</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Receipt Number</div>
              <div className="font-mono text-sm text-gray-900">{details.orderId}</div>
              <div className="text-sm text-gray-500 mt-2">{details.date}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
             <div>
                <h3 className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-2">Billed To</h3>
                <p className="font-medium text-gray-900">{details.customerName}</p>
                {details.customerEmail && <p className="text-gray-500 text-sm">{details.customerEmail}</p>}
             </div>
             <div className="text-right">
                <h3 className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-2">Amount Paid</h3>
                <p className="text-3xl font-extrabold text-indigo-600">₹{details.amount.toLocaleString('en-IN')}</p>
             </div>
          </div>

          <table className="w-full text-left mb-12">
            <thead>
              <tr className="border-y border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                <th className="py-3 font-semibold">Description</th>
                <th className="py-3 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 last:border-0">
                <td className="py-4 font-medium text-gray-900">{details.itemName}</td>
                <td className="py-4 font-medium text-gray-900 text-right">₹{details.amount.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="pt-4 font-bold text-gray-900 text-right">Total Paid</td>
                <td className="pt-4 font-bold text-gray-900 text-right text-lg">₹{details.amount.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>

          <div className="text-center text-sm text-gray-400 mt-16 pt-8 border-t border-gray-100">
            <p>If you have any questions about this receipt, please contact support.</p>
            <p className="mt-1">Powered by DigiOne securely with Cashfree.</p>
          </div>
          
          
        </div>

        <PrintButton />
    </div>
  );
}
