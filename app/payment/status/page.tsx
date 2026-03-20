import { createClient } from '@supabase/supabase-js';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import Link from 'next/link';

// Use service role for database updates in this server component since it's verifying checkout
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! 
);

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; sub?: string }>;
}) {
  const { order_id, sub } = await searchParams;

  if (!order_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A1A]">
        <div className="text-center p-8 bg-white dark:bg-[#121226] rounded-2xl shadow-xl max-w-sm w-full mx-4">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invalid Request</h1>
          <p className="text-sm text-gray-500 mb-6">Missing order information.</p>
          <Link href="/" className="text-indigo-600 font-medium hover:underline">Return home</Link>
        </div>
      </div>
    );
  }

  // 1. Check Cashfree API directly for definitive order status
  const CASHFREE_ENV = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.cashfree.com/pg'
    : 'https://sandbox.cashfree.com/pg';

  let orderStatus = 'PENDING';
  
  try {
    const res = await fetch(`${CASHFREE_ENV}/orders/${order_id}`, {
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID!,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
      },
      cache: 'no-store'
    });
    
    if (res.ok) {
      const data = await res.json();
      orderStatus = data.order_status; // 'PAID', 'ACTIVE', 'DROPPED', 'USER_DROPPED'
    } else {
      orderStatus = 'FAILED';
    }
  } catch (err) {
    orderStatus = 'PENDING';
  }

  // 2. Sync status to database depending on checkout type
  if (sub) {
    // Payment Link submission
    let dbStatus = 'pending';
    if (orderStatus === 'PAID') dbStatus = 'success';
    else if (orderStatus === 'DROPPED' || orderStatus === 'USER_DROPPED' || orderStatus === 'FAILED') dbStatus = 'failed';
    
    if (dbStatus !== 'pending') {
      await supabase.from('payment_submissions').update({ payment_status: dbStatus }).eq('id', sub);
    }
  } else {
    // Standard Product Checkout
    let dbStatus = 'pending';
    if (orderStatus === 'PAID') {
       dbStatus = 'success';
       await supabase.from('orders').update({ status: 'success' }).eq('id', order_id);
    }
    else if (orderStatus === 'DROPPED' || orderStatus === 'USER_DROPPED' || orderStatus === 'FAILED') {
       dbStatus = 'failed';
       await supabase.from('orders').update({ status: 'failed' }).eq('id', order_id);
    }
  }

  // 3. Render Status UI
  const isSuccess = orderStatus === 'PAID';
  const isFailed = orderStatus === 'FAILED' || orderStatus === 'DROPPED' || orderStatus === 'USER_DROPPED';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A1A]">
      <div className="text-center p-8 bg-white dark:bg-[#121226] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl max-w-sm w-full mx-4 relative overflow-hidden">
        {/* Subtle background glow */}
        {isSuccess && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-emerald-500/20 blur-[50px] pointer-events-none" />
        )}
        {isFailed && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-red-500/20 blur-[50px] pointer-events-none" />
        )}
        
        <div className="flex justify-center mb-6 relative z-10">
          {isSuccess ? (
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
          ) : isFailed ? (
            <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center shadow-lg shadow-red-500/10">
              <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
          )}
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 relative z-10">
          {isSuccess ? 'Payment Successful!' : isFailed ? 'Payment Failed' : 'Payment Processing'}
        </h1>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed relative z-10">
          {isSuccess 
            ? 'Thank you for your purchase. Your transaction was completed successfully and the creator has been notified.'
            : isFailed
            ? 'We were unable to process your payment. Please try again or use a different payment method.'
            : 'We are currently verifying your payment with the gateway. This page will automatically refresh.'}
        </p>

        <div className="space-y-3 relative z-10">
          <Link 
            href="/" 
            className={`block w-full py-3.5 text-white font-semibold rounded-xl transition shadow-lg ${
              isSuccess 
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
            }`}
          >
            {isSuccess ? 'Return to homepage' : 'Try again'}
          </Link>

          {isSuccess && (
            <a 
              href={`/payment/receipt?order_id=${order_id}${sub ? `&sub=${sub}` : ''}`}
              target="_blank"
              rel="noreferrer"
              className="block flex items-center justify-center gap-2 w-full py-3.5 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 font-semibold rounded-xl transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
              Download Receipt
            </a>
          )}
          
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
            Order ID: <span className="font-mono">{order_id}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
