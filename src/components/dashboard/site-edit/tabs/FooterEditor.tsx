'use client';
// FooterEditor — edit footer social links, legal toggles, contact info, copyright.

import React from 'react';

const INPUT = 'w-full px-3 py-2.5 bg-white dark:bg-[var(--bg-secondary)] border border-gray-200 dark:border-[var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[var(--accent)] outline-none text-[var(--text-primary)] placeholder-gray-400 transition shadow-sm';

export type FooterData = {
  social: Record<string, string>;
  legal: Record<string, boolean>;
  contactEmail: string;
  contactPhone: string;
  copyrightText: string;
};

export default function FooterEditor({
  data,
  onChange,
}: {
  data: FooterData;
  onChange: (data: FooterData) => void;
}) {
  const set = <K extends keyof FooterData>(key: K, val: FooterData[K]) =>
    onChange({ ...data, [key]: val });

  const setSocial = (platform: string, val: string) =>
    set('social', { ...data.social, [platform]: val });

  const setLegal = (key: string, val: boolean) =>
    set('legal', { ...data.legal, [key]: val });

  return (
    <div className="space-y-6">
      {/* Social Links */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Social Links</h3>
          <p className="text-xs text-gray-500 mt-0.5">Shown in your site footer and about section</p>
        </div>
        {(['instagram', 'youtube', 'twitter', 'linkedin'] as const).map(platform => (
          <div key={platform}>
            <label className="block text-xs font-medium text-gray-600 dark:text-[var(--text-secondary)] mb-1.5 capitalize">{platform}</label>
            <input type="url" value={data.social[platform] ?? ''}
              onChange={e => setSocial(platform, e.target.value)}
              className={INPUT} placeholder={`https://${platform}.com/yourhandle`} />
          </div>
        ))}
      </div>

      {/* Legal Pages */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Legal Pages</h3>
          <p className="text-xs text-gray-500 mt-0.5">Enable these to show links in your site footer</p>
        </div>
        {[
          { key: 'about',   label: 'About us',       desc: 'Story and mission of your brand' },
          { key: 'terms',   label: 'Terms of use',   desc: 'Conditions for using your products' },
          { key: 'privacy', label: 'Privacy policy', desc: 'How you handle buyer data' },
          { key: 'refund',  label: 'Refund policy',  desc: 'Your refund and cancellation policy' },
        ].map(({ key, label, desc }) => (
          <div key={key}
            className="flex items-center justify-between px-4 py-3.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] hover:border-gray-300 dark:hover:border-gray-700 transition">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input type="checkbox" className="sr-only peer"
                checked={data.legal[key] ?? false}
                onChange={e => setLegal(key, e.target.checked)} />
              <div className="w-10 h-[22px] bg-gray-300 dark:bg-gray-700 peer-checked:bg-[var(--accent)] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-[18px] after:w-[18px] after:transition-all peer-checked:after:translate-x-[18px] shadow-inner" />
            </label>
          </div>
        ))}
      </div>

      {/* Contact Info */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contact Info</h3>
          <p className="text-xs text-gray-500 mt-0.5">Displayed in your footer for customer inquiries</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-[var(--text-secondary)] mb-1.5">Contact Email</label>
          <input type="email" value={data.contactEmail} onChange={e => set('contactEmail', e.target.value)}
            className={INPUT} placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-[var(--text-secondary)] mb-1.5">Phone Number</label>
          <input type="tel" value={data.contactPhone} onChange={e => set('contactPhone', e.target.value)}
            className={INPUT} placeholder="+91 98765 43210" />
        </div>
      </div>

      {/* Copyright */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Copyright Text</h3>
          <p className="text-xs text-gray-500 mt-0.5">Footer bottom text (leave empty for default)</p>
        </div>
        <input type="text" value={data.copyrightText} onChange={e => set('copyrightText', e.target.value)}
          className={INPUT} placeholder="&copy; 2025 My Brand. All rights reserved." />
      </div>
    </div>
  );
}
