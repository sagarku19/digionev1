'use client';
// Edit page: Payment Link — visual editor with live preview.

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SiteVisualEditor from '@/components/dashboard/site-edit/SiteVisualEditor';
import { CreditCard, Globe, IndianRupee, ToggleLeft } from 'lucide-react';

const INPUT = 'w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

export default function EditPaymentPage() {
  const params = useParams();
  const siteId = params.id as string;
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [isFlexible, setIsFlexible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: sm } = await supabase
        .from('site_main')
        .select('title, meta_description')
        .eq('site_id', siteId)
        .maybeSingle();
      setTitle(sm?.title ?? '');
      setDescription(sm?.meta_description ?? '');
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const handleTypeSave = async () => {
    const { data: existing } = await supabase.from('site_main').select('site_id').eq('site_id', siteId).maybeSingle();
    const payload = { title, meta_description: description };
    if (existing) {
      await supabase.from('site_main').update(payload).eq('site_id', siteId);
    } else {
      await supabase.from('site_main').insert({ site_id: siteId, ...payload });
    }
  };

  return (
    <SiteVisualEditor
      siteId={siteId}
      typeLabel="Payment Link"
      typeIcon={CreditCard}
      typeIconColor="text-emerald-500"
      onTypeSave={handleTypeSave}
      showSlug={false}
    >
      {() => (
        <div className="space-y-5">
          {/* Payment Info */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Payment Info</h3>
              <p className="text-xs text-gray-500 mt-0.5">Details shown to buyers on the payment page</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Service Name</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className={INPUT} placeholder="e.g. 1-on-1 Mentorship Session" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                <span className={`text-xs tabular-nums ${description.length > 300 ? 'text-red-500' : 'text-gray-400'}`}>{description.length}/300</span>
              </div>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                className={`${INPUT} resize-none`}
                placeholder="What does the buyer get? How long is the session?" />
            </div>
          </div>

          {/* Amount */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Pricing</h3>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Flexible amount</p>
                <p className="text-xs text-gray-500">Let buyer choose how much to pay</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input type="checkbox" className="sr-only peer" checked={isFlexible} onChange={e => setIsFlexible(e.target.checked)} />
                <div className="w-10 h-[22px] bg-gray-300 dark:bg-gray-700 peer-checked:bg-emerald-600 rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-[18px] shadow-inner" />
              </label>
            </div>
            {!isFlexible && (
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Fixed Amount ({'\u20B9'})</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                  className={INPUT} placeholder="e.g. 999" min={0} />
              </div>
            )}
          </div>

          {/* Payment URL */}
          <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Payment URL</h3>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
              <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400 truncate">
                digione.in/pay/{siteId.substring(0, 8)}...
              </span>
            </div>
            <p className="text-xs text-gray-500">
              This URL is auto-generated and permanent. Share it with clients to collect payments.
            </p>
          </div>
        </div>
      )}
    </SiteVisualEditor>
  );
}
