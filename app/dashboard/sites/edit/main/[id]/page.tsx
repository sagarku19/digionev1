'use client';
// Edit page: Main Store — visual editor with sections, products, and live preview.

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SiteVisualEditor from '@/components/dashboard/site-edit/SiteVisualEditor';
import SectionManager from '@/components/dashboard/site-edit/SectionManager';
import ProductAssigner from '@/components/dashboard/site-edit/ProductAssigner';
import { Store, Layers, Package } from 'lucide-react';
import type { Section } from '@/components/dashboard/site-edit/section-defs';

const INPUT = 'w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

export default function EditMainStorePage() {
  const params = useParams();
  const siteId = params.id as string;
  const supabase = createClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [contentTab, setContentTab] = useState<'info' | 'sections' | 'products'>('sections');

  // Load type-specific data
  useEffect(() => {
    const load = async () => {
      const [{ data: sm }, { data: config }, { data: asgn }] = await Promise.all([
        supabase.from('site_main').select('title, meta_description').eq('site_id', siteId).maybeSingle(),
        supabase.from('site_sections_config').select('sections').eq('site_id', siteId).maybeSingle(),
        supabase.from('site_product_assignments').select('product_id').eq('site_id', siteId),
      ]);
      setTitle(sm?.title ?? '');
      setDescription(sm?.meta_description ?? '');
      const raw = config?.sections as Section[] | null;
      if (raw) setSections([...raw].sort((a, b) => a.sort_order - b.sort_order));
      setAssigned(new Set((asgn ?? []).map((a: any) => a.product_id)));
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  const handleTypeSave = async () => {
    // Save title/description
    const { data: existing } = await supabase.from('site_main').select('site_id').eq('site_id', siteId).maybeSingle();
    const payload = { title, meta_description: description };
    if (existing) {
      await supabase.from('site_main').update(payload).eq('site_id', siteId);
    } else {
      await supabase.from('site_main').insert({ site_id: siteId, ...payload });
    }

    // Save sections
    const { data: configExists } = await supabase.from('site_sections_config').select('site_id').eq('site_id', siteId).maybeSingle();
    if (configExists) {
      await supabase.from('site_sections_config').update({ sections: sections as any }).eq('site_id', siteId);
    } else {
      await supabase.from('site_sections_config').insert({ site_id: siteId, site_type: 'main', sections: sections as any });
    }

    // Save product assignments
    await supabase.from('site_product_assignments').delete().eq('site_id', siteId);
    if (assigned.size > 0) {
      const rows = Array.from(assigned).map((product_id, i) => ({ site_id: siteId, product_id, sort_order: i + 1 }));
      await supabase.from('site_product_assignments').insert(rows);
    }
  };

  return (
    <SiteVisualEditor
      siteId={siteId}
      typeLabel="Main Store"
      typeIcon={Store}
      typeIconColor="text-indigo-500"
      onTypeSave={handleTypeSave}
      showSlug={true}
    >
      {() => (
        <div className="space-y-5">
          {/* Sub-tab switcher */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
            {[
              { id: 'sections' as const, label: 'Sections', icon: Layers },
              { id: 'products' as const, label: 'Products', icon: Package },
              { id: 'info' as const,     label: 'Store Info', icon: Store },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setContentTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                  contentTab === t.id
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {contentTab === 'sections' && (
            <SectionManager sections={sections} onChange={setSections} />
          )}

          {contentTab === 'products' && (
            <ProductAssigner siteId={siteId} assigned={assigned} onChange={setAssigned} />
          )}

          {contentTab === 'info' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Store Info</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Basic information shown to visitors</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Store Name</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={INPUT} placeholder="My awesome store" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                    <span className={`text-xs tabular-nums ${description.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>{description.length}/200</span>
                  </div>
                  <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
                    className={`${INPUT} resize-none`} placeholder="What your store is about..." />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </SiteVisualEditor>
  );
}
