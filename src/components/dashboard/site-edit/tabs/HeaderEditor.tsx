'use client';
// HeaderEditor — edit header logo, nav items, and toggles.

import React from 'react';
import { Plus, X, GripVertical } from 'lucide-react';

const INPUT = 'w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none text-gray-900 dark:text-white placeholder-gray-400 transition shadow-sm';

export type HeaderData = {
  logoUrl: string;
  logoAlt: string;
  navItems: { label: string; url: string }[];
  showSearch: boolean;
  showCart: boolean;
  stickyHeader: boolean;
};

export default function HeaderEditor({
  data,
  onChange,
}: {
  data: HeaderData;
  onChange: (data: HeaderData) => void;
}) {
  const set = <K extends keyof HeaderData>(key: K, val: HeaderData[K]) =>
    onChange({ ...data, [key]: val });

  const updateNav = (i: number, field: 'label' | 'url', val: string) => {
    const next = [...data.navItems];
    next[i] = { ...next[i], [field]: val };
    set('navItems', next);
  };

  const addNav = () => set('navItems', [...data.navItems, { label: '', url: '' }]);
  const removeNav = (i: number) => set('navItems', data.navItems.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Logo</h3>
          <p className="text-xs text-gray-500 mt-0.5">Your brand logo shown in the header</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Logo Image URL</label>
          <input type="url" value={data.logoUrl} onChange={e => set('logoUrl', e.target.value)}
            className={INPUT} placeholder="https://..." />
        </div>
        {data.logoUrl && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <img src={data.logoUrl} alt="Logo preview" className="w-10 h-10 rounded-lg object-contain bg-white dark:bg-gray-800" />
            <span className="text-xs text-gray-500 truncate flex-1">{data.logoUrl}</span>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Alt Text</label>
          <input type="text" value={data.logoAlt} onChange={e => set('logoAlt', e.target.value)}
            className={INPUT} placeholder="My Store" />
        </div>
      </div>

      {/* Navigation Links */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Navigation Links</h3>
          <p className="text-xs text-gray-500 mt-0.5">Links shown in your storefront header</p>
        </div>
        <div className="space-y-2.5">
          {data.navItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <GripVertical className="w-4 h-4 text-gray-300 dark:text-gray-700 shrink-0" />
              <input type="text" value={item.label} onChange={e => updateNav(i, 'label', e.target.value)}
                placeholder="Label" className={`${INPUT} flex-1`} />
              <input type="text" value={item.url} onChange={e => updateNav(i, 'url', e.target.value)}
                placeholder="/shop or #section" className={`${INPUT} flex-1`} />
              <button onClick={() => removeNav(i)}
                className="p-2 text-gray-400 hover:text-red-500 transition shrink-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {data.navItems.length === 0 && (
          <p className="text-xs text-gray-400">No nav links yet. Add links like &quot;Home&quot;, &quot;Products&quot;, etc.</p>
        )}
        <button onClick={addNav}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)] hover:text-[var(--text-primary)] transition">
          <Plus className="w-4 h-4" /> Add nav link
        </button>
      </div>

      {/* Header Options */}
      <div className="bg-white dark:bg-[#0A0A1A] border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Header Options</h3>
          <p className="text-xs text-gray-500 mt-0.5">Configure header behavior and features</p>
        </div>
        {[
          { key: 'showSearch' as const,   label: 'Show Search',   desc: 'Search bar in the header' },
          { key: 'showCart' as const,      label: 'Show Cart Icon', desc: 'Shopping cart icon with badge' },
          { key: 'stickyHeader' as const,  label: 'Sticky Header',  desc: 'Header stays fixed on scroll' },
        ].map(opt => (
          <div key={opt.key} className="flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input type="checkbox" className="sr-only peer"
                checked={data[opt.key]}
                onChange={e => set(opt.key, e.target.checked)} />
              <div className="w-10 h-[22px] bg-gray-300 dark:bg-gray-700 peer-checked:bg-[var(--accent)] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-[18px] shadow-inner" />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
